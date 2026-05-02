import React, { useEffect, useState, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/router';
import Link from 'next/link';
import axios from 'axios';
import { IconUserPlus, IconMusic, IconPencil, IconX, IconCheck, IconPlayerPlay, IconPlayerPause, IconSearch, IconLoader2, IconChevronLeft, IconChevronRight } from '@tabler/icons-react';
import { useRecoilState } from 'recoil';
import { loginState } from '@/state';
import clsx from 'clsx';

interface NewMember {
  userid: string;
  username: string;
  picture?: string | null;
  joinDate: string;
  introNote?: string | null;
  introSong?: string | null;
}

interface SongData {
  title: string;
  artist: string;
  artwork: string;
  previewUrl: string;
}

interface TrackResult {
  id: number;
  title: string;
  artist: string;
  artwork: string;
  previewUrl: string;
}

function parseSong(raw: string | null | undefined): SongData | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    if (parsed && parsed.previewUrl) return parsed as SongData;
  } catch {}
  return null;
}

function proxyUrl(previewUrl: string): string {
  return `/api/music/preview?url=${encodeURIComponent(previewUrl)}`;
}

function slotWidthPx(): number {
  return 120 + 24;
}

export default function NewToTeam() {
  const router = useRouter();
  const { id: workspaceId } = router.query;
  const [login] = useRecoilState(loginState);
  const [members, setMembers] = useState<NewMember[]>([]);
  const [loading, setLoading] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);
  const [page, setPage] = useState(0);
  const [perPage, setPerPage] = useState(6);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [playingId, setPlayingId] = useState<string | null>(null);

  const [editOpen, setEditOpen] = useState(false);
  const [editNote, setEditNote] = useState('');
  const [editSong, setEditSong] = useState<SongData | null>(null);
  const [saving, setSaving] = useState(false);

  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<TrackResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [previewingId, setPreviewingId] = useState<number | null>(null);
  const searchAudioRef = useRef<HTMLAudioElement | null>(null);
  const searchDebounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!workspaceId) return;
    setLoading(true);
    axios.get(`/api/workspace/${workspaceId}/home/new-members?days=7`).then(r => {
      if (r.status === 200 && r.data.success) setMembers(r.data.members || []);
    }).finally(() => setLoading(false));
  }, [workspaceId]);

  useEffect(() => {
    const calc = () => {
      if (!cardRef.current) return;
      const w = cardRef.current.offsetWidth;
      const reservePadding = 28;
      const slot = slotWidthPx();
      const baseInner = Math.max(0, w - reservePadding);
      let n = Math.max(3, Math.floor(baseInner / slot));
      const pagesOneRow = Math.ceil(members.length / n);
      if (pagesOneRow > 1) {
        const reserveArrows = 96;
        const inner = Math.max(0, w - reservePadding - reserveArrows);
        n = Math.max(3, Math.floor(inner / slot));
      }
      setPerPage(n);
    };
    calc();
    window.addEventListener("resize", calc);
    return () => window.removeEventListener("resize", calc);
  }, [members.length]);

  useEffect(() => {
    const pages = Math.max(1, Math.ceil(members.length / Math.max(perPage, 1)));
    setPage((p) => Math.min(p, pages - 1));
  }, [perPage, members.length]);

  useEffect(() => {
    setPage(0);
  }, [workspaceId]);

  const stopMainAudio = () => {
    if (audioRef.current) {
      audioRef.current.onended = null;
      audioRef.current.pause();
      audioRef.current = null;
    }
    setPlayingId(null);
  };

  const togglePlay = (member: NewMember) => {
    const song = parseSong(member.introSong);
    if (!song?.previewUrl) return;

    if (audioRef.current) {
      audioRef.current.onended = null;
      audioRef.current.pause();
      audioRef.current = null;
    }

    if (playingId === member.userid) {
      setPlayingId(null);
      return;
    }

    const audio = new Audio(proxyUrl(song.previewUrl));
    audioRef.current = audio;
    audio.onended = () => { audioRef.current = null; setPlayingId(null); };
    setPlayingId(member.userid);
    audio.play().catch((err) => {
      console.error('[NewToTeam] play() rejected:', err);
      audioRef.current = null;
      setPlayingId(null);
    });
  };

  useEffect(() => () => { stopMainAudio(); }, []);

  const myMember = members.find(m => m.userid === String(login?.userId));

  const openEdit = () => {
    const currentSong = parseSong(myMember?.introSong);
    setEditNote(myMember?.introNote ?? '');
    setEditSong(currentSong);
    setSearchQuery('');
    setSearchResults([]);
    setEditOpen(true);
  };

  const closeEdit = () => {
    if (searchAudioRef.current) {
      searchAudioRef.current.onended = null;
      searchAudioRef.current.pause();
      searchAudioRef.current = null;
    }
    setPreviewingId(null);
    setEditOpen(false);
  };

  const doSearch = useCallback(async (q: string) => {
    if (!q.trim()) { setSearchResults([]); return; }
    setSearching(true);
    try {
      const r = await axios.get(`/api/music/search?q=${encodeURIComponent(q)}`);
      setSearchResults(r.data.results ?? []);
    } catch {
      setSearchResults([]);
    } finally {
      setSearching(false);
    }
  }, []);

  const onSearchChange = (val: string) => {
    setSearchQuery(val);
    if (searchDebounce.current) clearTimeout(searchDebounce.current);
    searchDebounce.current = setTimeout(() => doSearch(val), 400);
  };

  const toggleSearchPreview = (track: TrackResult) => {
    if (searchAudioRef.current) {
      searchAudioRef.current.onended = null;
      searchAudioRef.current.pause();
      searchAudioRef.current = null;
    }
    if (previewingId === track.id) {
      setPreviewingId(null);
      return;
    }
    const audio = new Audio(proxyUrl(track.previewUrl));
    searchAudioRef.current = audio;
    audio.onended = () => { searchAudioRef.current = null; setPreviewingId(null); };
    audio.play().then(() => setPreviewingId(track.id)).catch(() => setPreviewingId(null));
  };

  const selectTrack = (track: TrackResult) => {
    if (searchAudioRef.current) {
      searchAudioRef.current.pause();
      searchAudioRef.current.src = '';
    }
    setPreviewingId(null);
    setEditSong({ title: track.title, artist: track.artist, artwork: track.artwork, previewUrl: track.previewUrl });
    setSearchQuery('');
    setSearchResults([]);
  };

  const saveIntro = async () => {
    if (!workspaceId) return;
    setSaving(true);
    const songJson = editSong ? JSON.stringify(editSong) : null;
    try {
      await axios.patch(`/api/workspace/${workspaceId}/member/intro`, { introNote: editNote, introSong: songJson });
      setMembers(prev => prev.map(m =>
        m.userid === String(login?.userId)
          ? { ...m, introNote: editNote || null, introSong: songJson }
          : m
      ));
      if (playingId === String(login?.userId)) stopMainAudio();
      closeEdit();
    } finally {
      setSaving(false);
    }
  };

  if (loading) return null;
  if (!members.length) return null;

  const totalPages = Math.max(1, Math.ceil(members.length / perPage));
  const safePage = Math.min(page, totalPages - 1);
  const rowMembers = members.slice(safePage * perPage, safePage * perPage + perPage);
  const showArrows = totalPages > 1;

  const goPrev = () => setPage((p) => Math.max(0, p - 1));
  const goNext = () => setPage((p) => Math.min(totalPages - 1, p + 1));

  return (
    <>
      <div ref={cardRef} className="z-0 bg-white dark:bg-zinc-800 border border-zinc-100 dark:border-zinc-700 rounded-xl shadow-sm p-4 flex flex-col gap-3 mb-6 relative">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-8 h-8 shrink-0 rounded-full bg-primary/10 flex items-center justify-center">
              <IconUserPlus className="w-5 h-5 text-primary" />
            </div>
            <span className="text-lg font-medium text-zinc-900 dark:text-white truncate">New to the Team</span>
          </div>
          {myMember && (
            <button
              onClick={openEdit}
              className="inline-flex items-center justify-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-lg border border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-700 transition-colors shrink-0 self-start sm:self-auto"
            >
              <IconPencil className="w-3 h-3" />
              Edit intro
            </button>
          )}
        </div>

        <div className="flex w-full items-center gap-2 sm:gap-3">
          {showArrows ? (
            <button
              type="button"
              aria-label="Show previous people"
              disabled={safePage <= 0}
              onClick={goPrev}
              className="shrink-0 flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-full border border-zinc-200 dark:border-zinc-600 bg-zinc-50 dark:bg-zinc-700/80 text-zinc-700 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-600 disabled:opacity-30 disabled:pointer-events-none transition-colors"
            >
              <IconChevronLeft className="w-5 h-5" stroke={2} />
            </button>
          ) : null}

          <div className="flex-1 min-w-0 py-0.5">
            <div className="flex w-full min-w-0 flex-nowrap items-start justify-start gap-x-5 sm:gap-x-6">
              {rowMembers.map((m) => {
            const isMe = m.userid === String(login?.userId);
            const song = parseSong(m.introSong);
            const isPlaying = playingId === m.userid;
            const hasStatus = Boolean(song || m.introNote);
            return (
              <div key={m.userid} className="flex max-w-[7.5rem] flex-col items-start min-w-0 shrink-0">
                <div className="relative h-16 w-16 shrink-0">
                  <Link href={`/workspace/${workspaceId}/profile/${m.userid}`}>
                    <div className="flex h-16 w-16 cursor-pointer items-center justify-center overflow-hidden rounded-full bg-primary/10 ring-2 ring-transparent transition hover:ring-primary">
                      <img
                        src={`/api/workspace/${workspaceId}/avatar/${m.userid}`}
                        alt={m.username}
                        className="h-16 w-16 rounded-full border-2 border-white object-cover"
                        loading="lazy"
                      />
                    </div>
                  </Link>
                  {isMe && (
                    <button
                      onClick={openEdit}
                      className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-primary shadow-sm transition-colors hover:bg-primary/90"
                      title="Edit your intro"
                    >
                      <IconPencil className="h-2.5 w-2.5 text-white" />
                    </button>
                  )}
                </div>
                <div
                  className={clsx(
                    "w-full truncate text-left text-xs font-medium text-zinc-700 dark:text-zinc-300",
                    hasStatus ? "mt-2" : "mt-3",
                  )}
                  title={m.username}
                >
                  {m.username}
                </div>
                {hasStatus ? (
                  <div className="mt-1 flex w-full min-w-0 items-start gap-1.5">
                    {song ? (
                      <button
                        type="button"
                        onClick={() => togglePlay(m)}
                        className={clsx(
                          "group/play relative shrink-0 rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 dark:focus-visible:ring-offset-zinc-800",
                          isPlaying && "ring-1 ring-primary/50 ring-offset-2 ring-offset-white dark:ring-offset-zinc-800",
                        )}
                        aria-label={isPlaying ? "Pause preview" : `Play preview: ${song.title}`}
                      >
                        <span className="relative block h-6 w-6">
                          <img
                            src={song.artwork}
                            alt=""
                            className="h-6 w-6 rounded-full object-cover ring-1 ring-zinc-200 dark:ring-zinc-600"
                          />
                          <span className="absolute -bottom-px -right-px flex h-3.5 w-3.5 items-center justify-center rounded-full bg-primary shadow-sm">
                            {isPlaying ? (
                              <IconPlayerPause className="h-2 w-2 text-white" stroke={2} />
                            ) : (
                              <IconPlayerPlay className="h-2 w-2 translate-x-px text-white" stroke={2} />
                            )}
                          </span>
                        </span>
                        <span className="pointer-events-none invisible absolute bottom-full left-1/2 z-20 mb-1 w-max max-w-[11rem] -translate-x-1/2 rounded-md bg-zinc-900 px-2 py-1 text-left text-[10px] text-white opacity-0 shadow-lg transition-all group-hover/play:visible group-hover/play:opacity-100 dark:bg-zinc-950">
                          <span className="block truncate font-medium">{song.title}</span>
                          <span className="block truncate text-zinc-400">{song.artist}</span>
                        </span>
                      </button>
                    ) : (
                      <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 ring-1 ring-primary/20">
                        <IconMusic className="h-3 w-3 text-primary" />
                      </span>
                    )}
                    {m.introNote ? (
                      <p
                        className="min-w-0 flex-1 text-left text-[10px] leading-snug text-zinc-500 dark:text-zinc-400 line-clamp-3"
                        title={m.introNote}
                      >
                        {m.introNote}
                      </p>
                    ) : song ? (
                      <span className="sr-only">
                        {song.title} – {song.artist}
                      </span>
                    ) : null}
                  </div>
                ) : null}
              </div>
            );
            })}
            </div>
          </div>

          {showArrows ? (
            <button
              type="button"
              aria-label="Show next people"
              disabled={safePage >= totalPages - 1}
              onClick={goNext}
              className="shrink-0 flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-full border border-zinc-200 dark:border-zinc-600 bg-zinc-50 dark:bg-zinc-700/80 text-zinc-700 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-600 disabled:opacity-30 disabled:pointer-events-none transition-colors"
            >
              <IconChevronRight className="w-5 h-5" stroke={2} />
            </button>
          ) : null}
        </div>

        {showArrows ? (
          <p className="text-center text-[11px] text-zinc-400 dark:text-zinc-500 -mt-1 pb-0.5">
            {safePage + 1} / {totalPages}
          </p>
        ) : null}
      </div>

      {editOpen && createPortal(
        <div className="fixed inset-0 bg-zinc-950/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-2xl shadow-2xl w-full max-w-sm flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-zinc-100 dark:border-zinc-700/60 shrink-0">
              <div>
                <h2 className="text-base font-semibold text-zinc-900 dark:text-white">Your intro</h2>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">Shown on your new-to-team card</p>
              </div>
              <button onClick={closeEdit} className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-colors">
                <IconX className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4 overflow-y-auto">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 flex items-center gap-1.5">
                    <span className="w-4 h-4 rounded-md bg-primary/10 flex items-center justify-center">
                      <IconMusic className="w-2.5 h-2.5 text-primary" />
                    </span>
                    Music preview
                  </label>
                  <span className="text-[10px] text-zinc-400">30-sec iTunes preview</span>
                </div>

                {editSong ? (
                  <div className="flex items-center gap-3 p-3 rounded-xl bg-primary/5 border border-primary/20">
                    <div className="relative shrink-0">
                      <img src={editSong.artwork} alt="" className="w-11 h-11 rounded-lg object-cover shadow-sm" />
                      <div className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-primary flex items-center justify-center shadow">
                        <IconMusic className="w-2 h-2 text-white" />
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-zinc-900 dark:text-white truncate">{editSong.title}</p>
                      <p className="text-xs text-zinc-500 truncate">{editSong.artist}</p>
                    </div>
                    <button
                      onClick={() => setEditSong(null)}
                      className="shrink-0 p-1.5 rounded-lg text-zinc-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
                      title="Remove song"
                    >
                      <IconX className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ) : (
                  <div className="relative">
                    <div className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl border-2 border-zinc-200 dark:border-zinc-600 bg-white dark:bg-zinc-900/50 focus-within:border-primary transition-colors shadow-sm">
                      {searching ? (
                        <IconLoader2 className="w-4 h-4 text-primary shrink-0 animate-spin" />
                      ) : (
                        <IconSearch className="w-4 h-4 text-zinc-400 shrink-0" />
                      )}
                      <input
                        type="text"
                        value={searchQuery}
                        onChange={e => onSearchChange(e.target.value)}
                        placeholder="Search for a song…"
                        className="flex-1 bg-transparent text-sm text-zinc-900 dark:text-white placeholder-zinc-400 focus:outline-none"
                        autoComplete="off"
                      />
                    </div>
                    {searchResults.length > 0 && (
                      <div className="absolute left-0 right-0 top-full mt-2 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl shadow-xl z-10 overflow-hidden max-h-60 overflow-y-auto divide-y divide-zinc-100 dark:divide-zinc-700/50">
                        {searchResults.map(track => (
                          <div
                            key={track.id}
                            className="flex items-center gap-3 px-3 py-2.5 hover:bg-zinc-50 dark:hover:bg-zinc-700/40 transition-colors group cursor-pointer"
                            onClick={() => selectTrack(track)}
                          >
                            <button
                              type="button"
                              onClick={e => { e.stopPropagation(); toggleSearchPreview(track); }}
                              className="w-10 h-10 rounded-lg overflow-hidden shrink-0 relative shadow-sm"
                            >
                              <img src={track.artwork} alt="" className="w-full h-full object-cover" />
                              <div className={`absolute inset-0 flex items-center justify-center transition-opacity ${previewingId === track.id ? 'bg-zinc-900/60 opacity-100' : 'bg-zinc-900/40 opacity-0 group-hover:opacity-100'}`}>
                                {previewingId === track.id
                                  ? <IconPlayerPause className="w-4 h-4 text-white" />
                                  : <IconPlayerPlay className="w-4 h-4 text-white" />
                                }
                              </div>
                            </button>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-zinc-900 dark:text-white truncate">{track.title}</p>
                              <p className="text-xs text-zinc-500 dark:text-zinc-400 truncate">{track.artist}</p>
                            </div>
                            <span className="shrink-0 text-xs font-medium text-primary opacity-0 group-hover:opacity-100 transition-opacity pr-1">
                              Select
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-1.5">Note</label>
                <input
                  type="text"
                  value={editNote}
                  onChange={e => setEditNote(e.target.value)}
                  maxLength={15}
                  placeholder="Say something to the team…"
                  className="w-full px-3 py-2 text-sm border border-zinc-200 dark:border-zinc-600 bg-zinc-50 dark:bg-zinc-900/50 text-zinc-900 dark:text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-colors placeholder-zinc-400"
                />
              </div>
            </div>

            <div className="flex gap-2 px-5 pb-5 shrink-0">
              <button
                onClick={closeEdit}
                className="flex-1 px-4 py-2 text-sm font-medium rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-700 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={saveIntro}
                disabled={saving}
                className="flex-1 px-4 py-2 text-sm font-medium rounded-xl bg-primary hover:bg-primary/90 text-white transition-colors disabled:opacity-50 inline-flex items-center justify-center gap-1.5"
              >
                {saving ? 'Saving…' : <><IconCheck className="w-3.5 h-3.5" /> Save</>}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}

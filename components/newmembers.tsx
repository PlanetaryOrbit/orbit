import React, { useEffect, useState, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/router';
import Link from 'next/link';
import axios from 'axios';
import { IconPencil, IconX, IconCheck, IconPlayerPlay, IconPlayerPause, IconSearch, IconLoader2 } from '@tabler/icons-react';
import { useRecoilState } from 'recoil';
import { loginState } from '@/state';
import clsx from 'clsx';
import { HomeSection } from '@/components/home/shell';

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

const AVATAR_BG_COLORS = [
  "bg-rose-300",
  "bg-lime-300",
  "bg-teal-200",
  "bg-amber-300",
  "bg-rose-200",
  "bg-lime-200",
  "bg-green-100",
  "bg-red-100",
  "bg-yellow-200",
  "bg-amber-200",
  "bg-emerald-300",
  "bg-green-300",
  "bg-red-300",
  "bg-emerald-200",
  "bg-green-200",
  "bg-red-200",
];

function getAvatarBg(userid: string, username?: string) {
  const key = `${userid ?? ""}:${username ?? ""}`;
  let hash = 5381;
  for (let i = 0; i < key.length; i++) {
    hash = ((hash << 5) - hash) ^ key.charCodeAt(i);
  }
  return AVATAR_BG_COLORS[(hash >>> 0) % AVATAR_BG_COLORS.length];
}

export default function NewToTeam({ embedded = false }: { embedded?: boolean }) {
  const router = useRouter();
  const { id: workspaceId } = router.query;
  const [login] = useRecoilState(loginState);
  const [members, setMembers] = useState<NewMember[]>([]);
  const [loading, setLoading] = useState(false);
  const stripRef = useRef<HTMLDivElement>(null);

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

  const memberStrip = (
    <div ref={stripRef}>
      <div className="flex items-start gap-5 overflow-x-auto overscroll-x-contain py-1 pr-1 scrollbar-hide sm:gap-6">
        {members.map((m) => {
          const isMe = m.userid === String(login?.userId);
          const song = parseSong(m.introSong);
          const isPlaying = playingId === m.userid;
          const note = m.introNote?.trim() ?? "";
          const hasNote = Boolean(note);

          return (
            <div
              key={m.userid}
              className="flex w-[4.75rem] shrink-0 flex-col items-center sm:w-20"
            >
              <div className="relative">
                <Link href={`/workspace/${workspaceId}/profile/${m.userid}`}>
                  <div
                    className={clsx(
                      "flex h-16 w-16 items-center justify-center overflow-hidden rounded-full shadow-sm ring-2 ring-white dark:ring-zinc-800",
                      getAvatarBg(m.userid, m.username)
                    )}
                  >
                    <img
                      src={`/api/user/${m.userid}/avatar`}
                      alt={m.username}
                      className="h-16 w-16 rounded-full border-2 border-white object-cover dark:border-zinc-800"
                      style={{ background: "transparent" }}
                      loading="lazy"
                    />
                  </div>
                </Link>
                {isMe && (
                  <button
                    type="button"
                    onClick={openEdit}
                    className="absolute bottom-0 right-0 flex h-5 w-5 items-center justify-center rounded-full bg-zinc-900 shadow-sm transition-colors hover:bg-zinc-700 dark:bg-white dark:hover:bg-zinc-100"
                    title="Edit your intro"
                  >
                    <IconPencil size={10} stroke={2.5} className="text-white dark:text-zinc-900" />
                  </button>
                )}
              </div>

              <p
                className="mt-2 max-w-full truncate text-center text-xs font-medium text-zinc-800 dark:text-zinc-200"
                title={m.username}
              >
                {m.username}
              </p>

              {song && (
                <button
                  type="button"
                  onClick={() => togglePlay(m)}
                  className={clsx(
                    "group/song relative mt-2 h-9 w-9 overflow-hidden rounded-full ring-1 ring-zinc-200/80 transition-shadow dark:ring-zinc-600",
                    isPlaying && "ring-2 ring-primary/50"
                  )}
                  aria-label={isPlaying ? "Pause preview" : `Play ${song.title} by ${song.artist}`}
                >
                  <img src={song.artwork} alt="" className="h-full w-full object-cover" />
                  <span className="absolute inset-0 flex items-center justify-center bg-black/25 transition-colors group-hover/song:bg-black/40">
                    {isPlaying ? (
                      <IconPlayerPause className="h-3.5 w-3.5 text-white" stroke={2} />
                    ) : (
                      <IconPlayerPlay className="h-3.5 w-3.5 translate-x-px text-white" stroke={2} />
                    )}
                  </span>
                </button>
              )}

              {hasNote && (
                <p
                  className="mt-1.5 max-w-[5.25rem] text-center text-[10px] leading-snug text-zinc-400 line-clamp-2 dark:text-zinc-500"
                  title={note}
                >
                  {note}
                </p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );

  const editModal = editOpen
    ? createPortal(
        <div className="fixed inset-0 z-50 flex items-end justify-center p-4 sm:items-center bg-zinc-950/50 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-3xl bg-white shadow-2xl dark:bg-zinc-900 flex flex-col overflow-hidden">

            <div className="flex items-start justify-between px-6 pt-6 pb-5">
              <div>
                <h2 className="text-lg font-bold text-zinc-900 dark:text-white">Your intro</h2>
                <p className="mt-0.5 text-sm text-zinc-400 dark:text-zinc-500">Shown on your new-to-team card</p>
              </div>
              <button
                onClick={closeEdit}
                className="mt-0.5 p-1.5 rounded-xl text-zinc-300 dark:text-zinc-600 hover:text-zinc-500 dark:hover:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
              >
                <IconX className="w-4 h-4" />
              </button>
            </div>

            <div className="px-6 pb-6 space-y-5 overflow-y-auto">

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wide">Song</label>
                  <span className="text-[10px] text-zinc-300 dark:text-zinc-600">30-sec iTunes preview</span>
                </div>

                {editSong ? (
                  <div className="flex items-center gap-3.5 rounded-2xl bg-zinc-50 dark:bg-zinc-800/60 p-3.5">
                    <div className="relative shrink-0">
                      <img src={editSong.artwork} alt="" className="w-12 h-12 rounded-xl object-cover" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-zinc-900 dark:text-white truncate leading-tight">{editSong.title}</p>
                      <p className="text-xs text-zinc-400 dark:text-zinc-500 truncate mt-0.5">{editSong.artist}</p>
                    </div>
                    <button
                      onClick={() => setEditSong(null)}
                      className="shrink-0 p-1.5 rounded-xl text-zinc-300 dark:text-zinc-600 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
                    >
                      <IconX className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ) : (
                  <div className="relative">
                    <div className="flex items-center gap-2.5 px-3.5 py-3 rounded-2xl bg-zinc-50 dark:bg-zinc-800/60 focus-within:ring-2 focus-within:ring-primary/30 transition-all">
                      {searching
                        ? <IconLoader2 className="w-4 h-4 text-zinc-400 shrink-0 animate-spin" />
                        : <IconSearch className="w-4 h-4 text-zinc-300 dark:text-zinc-600 shrink-0" />
                      }
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
                      <div className="absolute left-0 right-0 top-full mt-1.5 bg-white dark:bg-zinc-900 rounded-2xl shadow-xl shadow-zinc-200/60 dark:shadow-zinc-950/60 z-10 overflow-hidden max-h-56 overflow-y-auto border border-zinc-100 dark:border-zinc-800">
                        {searchResults.map(track => (
                          <div
                            key={track.id}
                            className="flex items-center gap-3 px-3 py-2.5 hover:bg-zinc-50 dark:hover:bg-zinc-800/60 transition-colors group cursor-pointer"
                            onClick={() => selectTrack(track)}
                          >
                            <button
                              type="button"
                              onClick={e => { e.stopPropagation(); toggleSearchPreview(track); }}
                              className="w-9 h-9 rounded-xl overflow-hidden shrink-0 relative"
                            >
                              <img src={track.artwork} alt="" className="w-full h-full object-cover" />
                              <div className={`absolute inset-0 flex items-center justify-center transition-opacity ${previewingId === track.id ? 'bg-zinc-900/60 opacity-100' : 'bg-zinc-900/40 opacity-0 group-hover:opacity-100'}`}>
                                {previewingId === track.id
                                  ? <IconPlayerPause className="w-3.5 h-3.5 text-white" />
                                  : <IconPlayerPlay className="w-3.5 h-3.5 text-white" />
                                }
                              </div>
                            </button>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-zinc-900 dark:text-white truncate">{track.title}</p>
                              <p className="text-xs text-zinc-400 dark:text-zinc-500 truncate">{track.artist}</p>
                            </div>
                            <span className="shrink-0 text-xs font-medium text-primary opacity-0 group-hover:opacity-100 transition-opacity">
                              Select
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wide">Note</label>
                  <span className="text-[10px] text-zinc-300 dark:text-zinc-600">{editNote.length}/15</span>
                </div>
                <input
                  type="text"
                  value={editNote}
                  onChange={e => setEditNote(e.target.value)}
                  maxLength={15}
                  placeholder="Say something to the team…"
                  className="w-full px-3.5 py-3 text-sm rounded-2xl bg-zinc-50 dark:bg-zinc-800/60 text-zinc-900 dark:text-white placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all"
                />
              </div>

              <div className="flex gap-2 pt-1">
                <button
                  onClick={closeEdit}
                  className="flex-1 py-3 rounded-2xl text-sm font-semibold text-zinc-500 dark:text-zinc-400 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={saveIntro}
                  disabled={saving}
                  className="flex-1 py-3 rounded-2xl text-sm font-semibold bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 hover:bg-zinc-800 dark:hover:bg-zinc-100 transition-colors disabled:opacity-40 inline-flex items-center justify-center gap-1.5"
                >
                  {saving ? 'Saving…' : <><IconCheck className="w-3.5 h-3.5" strokeWidth={2.5} /> Save</>}
                </button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )
    : null;

  if (embedded) {
    return (
      <>
        {memberStrip}
        {editModal}
      </>
    );
  }

  return (
    <>
      <HomeSection
        title="New to the team"
        action={
          myMember ? (
            <button
              type="button"
              onClick={openEdit}
              className="text-xs font-medium text-zinc-500 hover:text-primary dark:text-zinc-400"
            >
              Edit intro
            </button>
          ) : undefined
        }
        className="relative"
      >
        {memberStrip}
      </HomeSection>
      {editModal}
    </>
  );
}

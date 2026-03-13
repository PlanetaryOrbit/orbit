import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/router';
import axios from 'axios';
import { IconMusic, IconSearch, IconX, IconCheck, IconLoader2, IconVinyl, IconPlayerPlay, IconPlayerPause } from '@tabler/icons-react';

interface iTrack {
  id: string;
  name: string;
  artist: string;
  album: string;
  artwork: string | null;
  preview: string | null;
  link: string;
  duration: number;
}

interface MemberProfile {
  introMessage?: string | null;
  trackId?: string | null;
  trackName?: string | null;
  artistName?: string | null;
  artwork?: string | null;
  previewUrl?: string | null;
}

function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

interface MemberIntroEditorProps {
  onSaved?: () => void;
}

export default function MemberIntroEditor({ onSaved }: MemberIntroEditorProps = {}) {
  const router = useRouter();
  const { id: workspaceId } = router.query;

  const [profile, setProfile] = useState<MemberProfile>({});
  const [introMessage, setIntroMessage] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<iTrack[]>([]);
  const [selectedTrack, setSelectedTrack] = useState<iTrack | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const [error, setError] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const debouncedQuery = useDebounce(searchQuery, 1500);

  const CHAR_MAX = 15;

  useEffect(() => {
    return () => {
      audioRef.current?.pause();
      audioRef.current = null;
    };
  }, []);

  useEffect(() => {
    audioRef.current?.pause();
    audioRef.current = null;
    setIsPlaying(false);
  }, [selectedTrack?.id]);

  useEffect(() => {
    if (!workspaceId) return;
    axios.get(`/api/workspace/${workspaceId}/member/profile`)
      .then(res => {
        if (res.data.success && res.data.profile) {
          const p = res.data.profile;
          setProfile(p);
          setIntroMessage(p.introMessage || '');
          if (p.trackId) {
            setSelectedTrack({
              id: p.trackId,
              name: p.trackName || '',
              artist: p.artistName || '',
              album: '',
              artwork: p.artwork || null,
              preview: p.previewUrl || null,
              link: p.previewUrl || '',
              duration: 0,
            });
          }
        }
      })
      .catch(() => {});
  }, [workspaceId]);

  useEffect(() => {
    if (!debouncedQuery.trim()) {
      setSearchResults([]);
      setDropdownOpen(false);
      return;
    }
    const search = async () => {
      setIsSearching(true);
      try {
        const res = await axios.get(`/api/music/search?q=${encodeURIComponent(debouncedQuery)}`);
        const tracks = res.data.tracks || [];
        setSearchResults(tracks);
        setDropdownOpen(tracks.length > 0);
        setFocusedIndex(-1);
      } catch {
        setSearchResults([]);
        setDropdownOpen(false);
      } finally {
        setIsSearching(false);
      }
    };
    search();
  }, [debouncedQuery]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!dropdownOpen || searchResults.length === 0) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setFocusedIndex(i => Math.min(i + 1, searchResults.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setFocusedIndex(i => Math.max(i - 1, 0));
    } else if (e.key === 'Enter' && focusedIndex >= 0) {
      e.preventDefault();
      selectTrack(searchResults[focusedIndex]);
    } else if (e.key === 'Escape') {
      setDropdownOpen(false);
    }
  };

  const selectTrack = (track: iTrack) => {
    setSelectedTrack(track);
    setSearchQuery('');
    setSearchResults([]);
    setDropdownOpen(false);
    setFocusedIndex(-1);
  };

  const togglePreview = () => {
    if (!selectedTrack?.preview) return;

    if (isPlaying) {
      audioRef.current?.pause();
      setIsPlaying(false);
      return;
    }

    if (!audioRef.current) {
      const audio = new Audio(selectedTrack.preview);
      audio.volume = 0.6;
      audio.onended = () => setIsPlaying(false);
      audioRef.current = audio;
    }

    audioRef.current.play().catch(() => setIsPlaying(false));
    setIsPlaying(true);
  };

  const handleSave = async () => {
    if (!workspaceId) return;
    setIsSaving(true);
    setError(null);
    try {
      const res = await axios.put(`/api/workspace/${workspaceId}/member/profile`, {
        introMessage: introMessage.trim() || null,
        trackId: selectedTrack?.id || null,
        trackName: selectedTrack?.name || null,
        artistName: selectedTrack?.artist || null,
        artwork: selectedTrack?.artwork || null,
        previewUrl: selectedTrack?.preview || null,
      });
      if (res.data.success) {
        setProfile(res.data.profile);
        setSaved(true);
        onSaved?.();
        setTimeout(() => setSaved(false), 2500);
      }
    } catch {
      setError('Failed to save your introduction.');
    } finally {
      setIsSaving(false);
    }
  };

  const charPct = (introMessage.length / CHAR_MAX) * 100;
  const charBarColor =
    charPct >= 100 ? 'bg-red-500' : charPct >= 80 ? 'bg-amber-400' : 'bg-zinc-900 dark:bg-zinc-100';

  return (
    <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-sm border border-zinc-100 dark:border-zinc-800 p-6 w-full max-w-md">

      <div className="flex items-center gap-3 mb-6">
        <div className="w-9 h-9 rounded-xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-500 dark:text-zinc-400 shrink-0">
          <IconVinyl size={18} />
        </div>
        <div>
          <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-50 leading-tight">My Introduction</p>
          <p className="text-xs text-zinc-400 dark:text-zinc-500">How you appear to teammates</p>
        </div>
      </div>

      <div className="mb-5">
        <label className="block text-xs font-medium tracking-widest uppercase text-zinc-400 dark:text-zinc-500 mb-2">
          Intro Message
        </label>
        <textarea
          value={introMessage}
          onChange={e => setIntroMessage(e.target.value)}
          placeholder="Tell your team about yourself…"
          rows={2}
          maxLength={CHAR_MAX}
          className="w-full px-3 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-sm text-zinc-900 dark:text-zinc-50 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-900 dark:focus:ring-zinc-400 focus:border-transparent resize-none transition"
        />
        <div className="flex items-center gap-2 mt-1.5">
          <div className="flex-1 h-[3px] rounded-full bg-zinc-100 dark:bg-zinc-800 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-200 ${charBarColor}`}
              style={{ width: `${Math.min(charPct, 100)}%` }}
            />
          </div>
          <span className="text-[11px] font-mono text-zinc-400 tabular-nums">
            {introMessage.length}/{CHAR_MAX}
          </span>
        </div>
      </div>

      <div className="mb-1">
        <label className="block text-xs font-medium tracking-widest uppercase text-zinc-400 dark:text-zinc-500 mb-2">
          Favorite Song
        </label>

        {selectedTrack && (
          <div className="flex items-center gap-3 p-3 mb-3 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800">
            <button
              onClick={togglePreview}
              disabled={!selectedTrack.preview}
              className="relative w-11 h-11 rounded-lg overflow-hidden shrink-0 group/art disabled:cursor-default"
              aria-label={isPlaying ? 'Pause preview' : 'Play preview'}
            >
              {selectedTrack.artwork
                ? <img src={selectedTrack.artwork} alt={selectedTrack.name} className="w-full h-full object-cover" />
                : (
                  <div className="w-full h-full bg-zinc-200 dark:bg-zinc-700 flex items-center justify-center text-zinc-400">
                    <IconMusic size={16} />
                  </div>
                )
              }
              {isPlaying && (
                <span className="absolute inset-0 rounded-lg ring-2 ring-inset ring-white/40 animate-pulse pointer-events-none" />
              )}
              {selectedTrack.preview && (
                <span className={`absolute inset-0 flex items-center justify-center rounded-lg bg-black/50 transition-opacity duration-150 ${isPlaying ? 'opacity-100' : 'opacity-0 group-hover/art:opacity-100'}`}>
                  {isPlaying
                    ? <IconPlayerPause size={16} className="text-white" />
                    : <IconPlayerPlay size={16} className="text-white" />
                  }
                </span>
              )}
            </button>

            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-50 truncate leading-tight">{selectedTrack.name}</p>
              <p className="text-xs text-zinc-400 truncate mt-0.5">{selectedTrack.artist}</p>
            </div>
            <button
              onClick={() => setSelectedTrack(null)}
              className="ml-auto p-1.5 rounded-lg text-zinc-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition shrink-0"
              aria-label="Remove"
            >
              <IconX size={14} />
            </button>
          </div>
        )}

        <div className="relative" ref={dropdownRef}>
          <div className="flex items-center gap-2 px-3 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 focus-within:ring-2 focus-within:ring-zinc-900 dark:focus-within:ring-zinc-400 focus-within:border-transparent transition">
            <IconSearch size={15} className="text-zinc-400 shrink-0" />
            <input
              ref={inputRef}
              type="text"
              value={searchQuery}
              placeholder="Search a song…"
              autoComplete="off"
              onChange={e => {
                setSearchQuery(e.target.value);
                if (!e.target.value.trim()) {
                  setDropdownOpen(false);
                  setSearchResults([]);
                }
              }}
              onFocus={() => searchResults.length > 0 && setDropdownOpen(true)}
              onKeyDown={handleKeyDown}
              className="flex-1 py-2.5 bg-transparent text-sm text-zinc-900 dark:text-zinc-50 placeholder:text-zinc-400 focus:outline-none min-w-0"
            />
            {isSearching && (
              <IconLoader2 size={15} className="text-zinc-400 shrink-0 animate-spin" />
            )}
            {searchQuery && !isSearching && (
              <button
                onClick={() => {
                  setSearchQuery('');
                  setSearchResults([]);
                  setDropdownOpen(false);
                  inputRef.current?.focus();
                }}
                className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 transition shrink-0"
                aria-label="Clear"
              >
                <IconX size={14} />
              </button>
            )}
          </div>

          {dropdownOpen && searchResults.length > 0 && (
            <div className="absolute top-[calc(100%+6px)] left-0 right-0 z-50 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-xl shadow-lg overflow-hidden">
              <ul className="max-h-64 overflow-y-auto divide-y divide-zinc-100 dark:divide-zinc-800">
                {searchResults.map((track, i) => (
                  <li key={track.id}>
                    <button
                      onMouseEnter={() => setFocusedIndex(i)}
                      onClick={() => selectTrack(track)}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 text-left transition ${
                        i === focusedIndex ? 'bg-zinc-50 dark:bg-zinc-800' : 'hover:bg-zinc-50 dark:hover:bg-zinc-800'
                      }`}
                    >
                      {track.artwork
                        ? <img src={track.artwork} alt={track.name} className="w-10 h-10 rounded-lg object-cover shrink-0" />
                        : (
                          <div className="w-10 h-10 rounded-lg bg-zinc-100 dark:bg-zinc-700 flex items-center justify-center shrink-0 text-zinc-400">
                            <IconMusic size={14} />
                          </div>
                        )
                      }
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-zinc-900 dark:text-zinc-50 truncate leading-tight">
                          {track.name}
                        </p>
                        <p className="text-xs text-zinc-400 truncate mt-0.5">
                          {track.artist}{track.album ? ` · ${track.album}` : ''}
                        </p>
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>

      <div className="flex items-center justify-between mt-6 pt-5 border-t border-zinc-100 dark:border-zinc-800">
        <span className="text-xs text-red-500 min-h-[1rem]">{error ?? ''}</span>
        <button
          onClick={handleSave}
          disabled={isSaving}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition disabled:opacity-50 disabled:cursor-not-allowed ${
            saved
              ? 'bg-emerald-500 text-white'
              : 'bg-zinc-900 dark:bg-zinc-50 text-white dark:text-zinc-900 hover:bg-zinc-700 dark:hover:bg-zinc-200'
          }`}
        >
          {isSaving ? (
            <><IconLoader2 size={14} className="animate-spin" /> Saving…</>
          ) : saved ? (
            <><IconCheck size={14} /> Saved</>
          ) : (
            <><IconCheck size={14} /> Save changes</>
          )}
        </button>
      </div>
    </div>
  );
}
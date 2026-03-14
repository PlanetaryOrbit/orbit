import React, { useEffect, useState, useRef } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/router";
import axios from "axios";
import {
  IconSparkles,
  IconPlayerPlay,
  IconPlayerPause,
  IconPencil,
  IconX,
  IconMusic,
} from "@tabler/icons-react";
import MemberIntroEditor from "./introductions";
import { SparklesIcon } from "@heroicons/react/24/outline";

interface NewMember {
  userid: string;
  username: string;
  picture?: string | null;
  joinDate: string;
  introMessage?: string | null;
  trackId?: string | null;
  trackName?: string | null;
  artistName?: string | null;
  artwork?: string | null;
  previewUrl?: string | null;
}

const BG_COLORS = [
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

function getRandomBg(userid: string, username?: string) {
  const key = `${userid ?? ""}:${username ?? ""}`;
  let hash = 5381;
  for (let i = 0; i < key.length; i++) {
    hash = ((hash << 5) - hash) ^ key.charCodeAt(i);
  }
  return BG_COLORS[(hash >>> 0) % BG_COLORS.length];
}

function MemberCard({
  m,
  isCurrentUser,
  isPlaying,
  onEdit,
  onPlayPreview,
}: {
  m: NewMember;
  isCurrentUser: boolean;
  isPlaying: boolean;
  onEdit: () => void;
  onPlayPreview: (m: NewMember) => void;
}) {
  const hasExtra = !!(m.trackId || m.introMessage);
  const bg = getRandomBg(m.userid, m.username);

  return (
    <div
      className={`relative flex flex-col items-center shrink-0 group/card ${isCurrentUser ? "cursor-pointer" : ""}`}
      onClick={() => isCurrentUser && onEdit()}
    >
      <div className="relative p-1">

        {isPlaying && (
          <span className="absolute inset-0 rounded-full ring-2 ring-primary/50 animate-pulse pointer-events-none z-10" />
        )}

        <div className={`w-16 h-16 rounded-full flex items-center justify-center ${bg} ring-2 ring-transparent transition overflow-hidden
          ${isPlaying ? "ring-primary/60" : isCurrentUser ? "group-hover/card:ring-pink-400/70" : ""}
        `}>
          <img
            src={m.picture || "/default-avatar.jpg"}
            alt={m.username}
            className="w-16 h-16 object-cover rounded-full border-2 border-white"
            loading="lazy"
          />
        </div>

        {isCurrentUser && (
          <div className="absolute inset-0 rounded-full flex items-center justify-center bg-black/0 group-hover/card:bg-black/35 transition-all duration-200 pointer-events-none">
            <IconPencil
              size={18}
              className="text-white opacity-0 group-hover/card:opacity-100 transition-opacity duration-200 drop-shadow-md"
            />
          </div>
        )}

        {hasExtra && (
          <div className="absolute -bottom-3.5 left-1/2 -translate-x-1/2 z-20 flex items-center">

            {m.trackId && m.previewUrl && (
              <button
                onClick={(e) => { e.stopPropagation(); onPlayPreview(m); }}
                title={`${m.trackName} — ${m.artistName}`}
                className="relative w-7 h-7 shrink-0 -mr-2 z-10 group/vinyl"
              >
                <div
                  className={`w-7 h-7 rounded-full overflow-hidden shadow-md border-2 border-white dark:border-zinc-900 transition-all duration-300 ${isPlaying ? "" : "group-hover/vinyl:scale-110"}`}
                  style={isPlaying ? { animation: "spin 3s linear infinite" } : undefined}
                >
                  {m.artwork
                    ? <img src={m.artwork} alt={m.trackName || "Song"} className="w-full h-full object-cover rounded-full" />
                    : <div className="w-full h-full rounded-full bg-gradient-to-br from-pink-400 to-purple-500 flex items-center justify-center">
                        <IconMusic className="w-3 h-3 text-white/80" />
                      </div>
                  }
                </div>
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="w-2 h-2 rounded-full bg-white dark:bg-zinc-900 ring-1 ring-black/10" />
                </div>
                <div className={`absolute inset-0 rounded-full bg-black/50 flex items-center justify-center transition-opacity duration-150 ${isPlaying ? "opacity-100" : "opacity-0 group-hover/vinyl:opacity-100"}`}>
                  {isPlaying
                    ? <IconPlayerPause className="w-3 h-3 text-white" />
                    : <IconPlayerPlay className="w-3 h-3 text-white" />
                  }
                </div>
              </button>
            )}

            {(m.introMessage || m.trackName) && (
              <div className={`
                relative flex items-center h-[22px] rounded-full shadow-sm border
                text-[10px] font-medium whitespace-nowrap
                ${m.trackId ? "pl-4 pr-2.5" : "px-2.5"}
                ${isPlaying
                  ? "bg-white dark:bg-zinc-800 border-primary/30 text-zinc-700 dark:text-zinc-200"
                  : "bg-white dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 text-zinc-500 dark:text-zinc-400"
                }
              `}>
                <span className="absolute -top-[5px] left-1/2 -translate-x-1/2 w-0 h-0
                  border-l-[4px] border-l-transparent
                  border-r-[4px] border-r-transparent
                  border-b-[5px] border-b-white dark:border-b-zinc-800"
                />
                {m.introMessage
                  ? <span className="italic truncate max-w-[82px]">"{m.introMessage}"</span>
                  : <span className="truncate max-w-[82px]">♪ {m.trackName}</span>
                }
              </div>
            )}
          </div>
        )}
      </div>

      <span className={`mt-6 text-xs font-medium text-center max-w-[88px] truncate transition-colors duration-150
        ${isCurrentUser
          ? "text-zinc-700 dark:text-zinc-300 group-hover/card:text-pink-500"
          : "text-zinc-700 dark:text-zinc-300"
        }
      `}>
        {m.username}
      </span>
    </div>
  );
}

export default function NewToTeam() {
  const router = useRouter();
  const { id: workspaceId } = router.query;
  const [members, setMembers] = useState<NewMember[]>([]);
  const [loading, setLoading] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [showEditor, setShowEditor] = useState(false);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const [maxVisible, setMaxVisible] = useState(10);

  useEffect(() => {
    axios.get("/api/@me").then((r) => {
      if (r.data.user?.userId) setCurrentUserId(String(r.data.user.userId));
    }).catch(() => {});
  }, []);

  const fetchMembers = (wid: string | string[]) => {
    return axios.get(`/api/workspace/${wid}/home/new-members?days=7`).then((r) => {
      if (r.status === 200 && r.data.success) {
        let list: NewMember[] = r.data.members || [];
        if (currentUserId) {
          const idx = list.findIndex((m) => m.userid === currentUserId);
          if (idx > 0) {
            const cu = list[idx];
            list = [cu, ...list.filter((_, i) => i !== idx)];
          }
        }
        setMembers(list);
      }
    });
  };

  useEffect(() => {
    if (!workspaceId) return;
    setLoading(true);
    fetchMembers(workspaceId).finally(() => setLoading(false));
  }, [workspaceId, currentUserId]);

  useEffect(() => {
    const calc = () => {
      if (!cardRef.current) return;
      const available = cardRef.current.offsetWidth - 32;
      const itemW = 80 + 24;
      setMaxVisible(Math.max(1, Math.floor(available / itemW)));
    };
    calc();
    window.addEventListener("resize", calc);
    return () => window.removeEventListener("resize", calc);
  }, []);

  const refreshMembers = () => {
    if (workspaceId) fetchMembers(workspaceId);
  };

  const playScratch = (reverse = false) => {
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const duration = 0.35;
      const bufferSize = audioContext.sampleRate * duration;
      const buffer = audioContext.createBuffer(1, bufferSize, audioContext.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        const t = i / bufferSize;
        const freq = 350 * (1 - t * 0.6);
        const noise = (Math.random() * 2 - 1) * 0.4;
        const tone = Math.sin(2 * Math.PI * freq * (i / audioContext.sampleRate)) * 0.4;
        const envelope = Math.exp(-t * 4);
        data[i] = (noise + tone) * envelope;
      }
      if (reverse) {
        const rev = new Float32Array(bufferSize);
        for (let i = 0; i < bufferSize; i++) rev[i] = data[bufferSize - 1 - i];
        data.set(rev);
      }
      const source = audioContext.createBufferSource();
      source.buffer = buffer;
      const filter = audioContext.createBiquadFilter();
      filter.type = "lowpass";
      filter.frequency.value = 1200;
      const gain = audioContext.createGain();
      gain.gain.value = 0.5;
      source.connect(filter);
      filter.connect(gain);
      gain.connect(audioContext.destination);
      source.start();
    } catch {}
  };

  const playPreview = (member: NewMember) => {
    if (playingId === member.userid) {
      playScratch();
      audioRef.current?.pause();
      setPlayingId(null);
      return;
    }
    if (audioRef.current && playingId !== null) {
      playScratch();
      audioRef.current.pause();
    }
    if (member.previewUrl) {
      playScratch(true);
      setTimeout(() => {
        const audio = new Audio(member.previewUrl!);
        audio.volume = 0.5;
        audio.play().catch(() => {});
        audio.onended = () => { playScratch(); setPlayingId(null); };
        audioRef.current = audio;
        setPlayingId(member.userid);
      }, 200);
    }
  };

  useEffect(() => {
    if (!showEditor) return;
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") setShowEditor(false); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [showEditor]);

  useEffect(() => () => { audioRef.current?.pause(); }, []);

  if (loading) return null;
  if (!members.length) return null;

  return (
    <>
      <div ref={cardRef} className="z-0 bg-white dark:bg-zinc-800 border border-zinc-100 dark:border-zinc-700 rounded-xl shadow-sm p-4 flex flex-col gap-4 mb-6 relative">
        <div className="flex items-center gap-2 mb-2">
          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
            <SparklesIcon className="w-5 h-5 text-primary" />
          </div>
          <span className="text-lg font-medium text-zinc-900 dark:text-white">New to the Team</span>
        </div>
        <div className="flex gap-6 px-2 pb-2">
          {members.slice(0, maxVisible).map((m) => (
            <MemberCard
              key={m.userid}
              m={m}
              isCurrentUser={!!(currentUserId && m.userid === currentUserId)}
              isPlaying={playingId === m.userid}
              onEdit={() => setShowEditor(true)}
              onPlayPreview={playPreview}
            />
          ))}
        </div>
      </div>

      {showEditor && typeof document !== "undefined" && createPortal(
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
          onClick={(e) => { if (e.target === e.currentTarget) setShowEditor(false); }}
        >
          <div className="relative w-full max-w-md animate-in fade-in zoom-in-95 duration-150">
            <button
              onClick={() => setShowEditor(false)}
              className="absolute -top-3 -right-3 z-10 w-7 h-7 rounded-full bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 shadow-md flex items-center justify-center text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 transition"
              aria-label="Close"
            >
              <IconX size={14} />
            </button>
            <MemberIntroEditor onSaved={() => { setShowEditor(false); refreshMembers(); }} />
          </div>
        </div>,
        document.body,
      )}
    </>
  );
}
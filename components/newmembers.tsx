import React, { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/router';
import axios from 'axios';
import { IconUserPlus } from '@tabler/icons-react';

interface NewMember {
  userid: string;
  username: string;
  picture?: string | null;
  joinDate: string;
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
  const index = (hash >>> 0) % BG_COLORS.length;
  return BG_COLORS[index];
}

export default function NewToTeam() {
  const router = useRouter();
  const { id: workspaceId } = router.query;
  const [members, setMembers] = useState<NewMember[]>([]);
  const [loading, setLoading] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);
  const [maxVisible, setMaxVisible] = useState(10);

  useEffect(() => {
    if (!workspaceId) return;
    setLoading(true);
    axios.get(`/api/workspace/${workspaceId}/home/new-members?days=7`).then(r => {
      if (r.status === 200 && r.data.success) {
        setMembers(r.data.members || []);
      }
    }).finally(() => setLoading(false));
  }, [workspaceId]);

  useEffect(() => {
    const calculateMaxVisible = () => {
      if (!cardRef.current) return;
      const containerWidth = cardRef.current.offsetWidth;
      const padding = 32;
      const availableWidth = containerWidth - padding;
      const memberWidth = 80 + 24;
      const maxFit = Math.floor(availableWidth / memberWidth);
      setMaxVisible(Math.max(1, maxFit));
    };

    calculateMaxVisible();
    window.addEventListener('resize', calculateMaxVisible);
    return () => window.removeEventListener('resize', calculateMaxVisible);
  }, []);

  if (loading) return null;
  if (!members.length) return null;
  const visibleMembers = members.slice(0, maxVisible);

  return (
    <div ref={cardRef} className="z-0 bg-white dark:bg-zinc-800 border border-zinc-100 dark:border-zinc-700 rounded-xl shadow-sm p-4 flex flex-col gap-4 mb-6 relative">
      <div className="flex items-center gap-2 mb-2">
        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
          <IconUserPlus className="w-5 h-5 text-primary" />
        </div>
        <span className="text-lg font-medium text-zinc-900 dark:text-white">New to the Team</span>
      </div>
      <div className="flex gap-6">
        {visibleMembers.map(m => (
          <div key={m.userid} className="flex flex-col items-center shrink-0 w-20">
            <div className={`w-16 h-16 rounded-full flex items-center justify-center ${getRandomBg(m.userid)} ring-2 ring-transparent hover:ring-primary transition overflow-hidden`}>
              <img
                src={m.picture || '/default-avatar.jpg'}
                alt={m.username}
                className="w-16 h-16 object-cover rounded-full border-2 border-white"
                loading="lazy"
              />
            </div>
            <div className="mt-2 text-xs font-medium text-center text-zinc-700 dark:text-zinc-300 truncate w-full" title={m.username}>
              {m.username}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

import React, { useState, useEffect } from "react";
import type { ActivitySession, inactivityNotice } from "@prisma/client";
import {
  IconUsers,
  IconUserCheck,
  IconCalendarEvent,
  IconClock,
  IconUser,
  IconChevronDown,
  IconChevronUp,
  IconHistory,
} from "@tabler/icons-react";
import { useRouter } from "next/router";
import axios from "axios";
import { useSessionColors } from "@/hooks/useSessionColors";
import Image from "next/image";

type Props = {
  sessions: (ActivitySession & {
    user: {
      picture: string | null;
    };
  })[];
  notices: inactivityNotice[];
  adjustments: any[];
  avatar: string;
  idleTimeEnabled: boolean;
  sessionsHosted: number;
  sessionsAttended: number;
  isHistorical?: boolean;
  historicalPeriod?: {
    start: string;
    end: string;
  } | null;
};

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

export function SessionsHistory({
  sessions,
  notices,
  adjustments,
  avatar,
  idleTimeEnabled,
  sessionsHosted,
  sessionsAttended,
  isHistorical = false,
  historicalPeriod = null,
}: Props) {
  const router = useRouter();
  const [sessionHistory, setSessionHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedSessions, setExpandedSessions] = useState<Set<string>>(new Set());
  const { getSessionTypeColor, getTextColorForBackground } = useSessionColors(
    router.query.id as string
  );

  useEffect(() => {
    const fetchSessionHistory = async () => {
      try {
        let url = `/api/workspace/${router.query.id}/profile/${router.query.uid}/sessions`;
        if (isHistorical && historicalPeriod) {
          const params = new URLSearchParams({
            periodStart: historicalPeriod.start,
            periodEnd: historicalPeriod.end,
          });
          url += `?${params.toString()}`;
        }
        
        const response = await axios.get(url);
        if (response.data.success) {
          setSessionHistory(response.data.sessions);
        }
      } catch (error) {
        console.error("Failed to fetch session history:", error);
      } finally {
        setLoading(false);
      }
    };

    if (router.query.id && router.query.uid) {
      fetchSessionHistory();
    }
  }, [router.query.id, router.query.uid, isHistorical, historicalPeriod]);

  const toggleSessionExpanded = (sessionId: string) => {
    setExpandedSessions(prev => {
      const newSet = new Set(prev);
      if (newSet.has(sessionId)) {
        newSet.delete(sessionId);
      } else {
        newSet.add(sessionId);
      }
      return newSet;
    });
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const formatTime = (date: string) => {
    return new Date(date).toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  };

  return (
    <>
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="bg-zinc-50 dark:bg-zinc-800/50 rounded-xl p-4">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-primary/10 rounded-lg">
              <IconUsers className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
                Hosting
              </p>
              <h2 className="text-sm font-semibold text-zinc-900 dark:text-white">
                Sessions Hosted
              </h2>
            </div>
          </div>
          <div className="text-center">
            <div className="text-3xl md:text-4xl font-bold text-zinc-900 dark:text-white mb-1">
              {sessionsHosted}
            </div>
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              sessions hosted this period
            </p>
          </div>
        </div>

        <div className="bg-zinc-50 dark:bg-zinc-800/50 rounded-xl p-4">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-primary/10 rounded-lg">
              <IconUserCheck className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
                Attendance
              </p>
              <h2 className="text-sm font-semibold text-zinc-900 dark:text-white">
                Sessions Attended
              </h2>
            </div>
          </div>
          <div className="text-center">
            <div className="text-3xl md:text-4xl font-bold text-zinc-900 dark:text-white mb-1">
              {sessionsAttended}
            </div>
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              sessions attended this period
            </p>
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-zinc-800 rounded-xl shadow-sm overflow-hidden">
        <div className="flex items-center gap-3 p-6 border-b border-zinc-200 dark:border-zinc-700">
          <div className="p-2 bg-primary/10 rounded-lg">
            <IconHistory className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-zinc-900 dark:text-white">
              Session History
            </h2>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Sessions hosted and attended this period
            </p>
          </div>
        </div>
        <div className="p-4 md:p-6">
        
        {loading ? (
          <div className="text-center py-8 text-zinc-500 dark:text-zinc-400">
            Loading sessions...
          </div>
        ) : sessionHistory.length === 0 ? (
          <div className="text-center py-10">
            <div className="bg-zinc-50 dark:bg-zinc-800 rounded-xl p-8 max-w-md mx-auto">
              <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4">
                <IconHistory className="w-8 h-8 text-primary" />
              </div>
              <h3 className="text-lg font-medium text-zinc-900 dark:text-white mb-1">
                No Sessions
              </h3>
              <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-4">
                No session history has been recorded yet
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {sessionHistory.map((session) => {
              const isExpanded = expandedSessions.has(session.id);
              const userParticipation = session.users?.find(
                (u: any) => u.userid.toString() === router.query.uid
              );
              const userRole = userParticipation
                ? session.sessionType.slots[userParticipation.slot]
                : null;
              
              const sessionColorClass = getSessionTypeColor(session.type);
              const textColorClass = getTextColorForBackground(sessionColorClass);

              return (
                <div
                  key={session.id}
                  className="bg-white dark:bg-zinc-800 rounded-xl border border-zinc-200 dark:border-zinc-700 overflow-hidden"
                >
                  <div
                    className="p-4 cursor-pointer hover:bg-zinc-50 dark:hover:bg-zinc-700/50 transition-colors"
                    onClick={() => toggleSessionExpanded(session.id)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2">
                          <h4 className="text-base font-semibold text-zinc-900 dark:text-white truncate">
                            {session.sessionType.name}
                          </h4>
                          {session.type && (
                            <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${sessionColorClass} ${textColorClass}`}>
                              {session.type.charAt(0).toUpperCase() + session.type.slice(1)}
                            </span>
                          )}
                        </div>
                        
                        <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-zinc-600 dark:text-zinc-400">
                          <div className="flex items-center gap-1.5">
                            <IconCalendarEvent className="w-4 h-4" />
                            <span>{formatDate(session.date)}</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <IconClock className="w-4 h-4" />
                            <span>{formatTime(session.date)}</span>
                          </div>
                          {session.owner && (
                            <div className="flex items-center gap-1.5">
                              <IconUser className="w-4 h-4" />
                              <span>Host: {session.owner.username}</span>
                            </div>
                          )}
                        </div>
                      </div>
                      
                      <button className="ml-2 p-1 hover:bg-zinc-200 dark:hover:bg-zinc-600 rounded-lg transition-colors">
                        {isExpanded ? (
                          <IconChevronUp className="w-5 h-5 text-zinc-500 dark:text-zinc-400" />
                        ) : (
                          <IconChevronDown className="w-5 h-5 text-zinc-500 dark:text-zinc-400" />
                        )}
                      </button>
                    </div>
                  </div>
                  {isExpanded && (
                    <div className="px-4 pb-4 border-t border-zinc-200 dark:border-zinc-700 pt-4">
                      {userRole && (
                        <div className="mb-4 p-3 bg-primary/5 dark:bg-primary/10 rounded-lg">
                          <p className="text-sm font-medium text-zinc-900 dark:text-white">
                            Your Position: <span className="text-primary">{userRole.name}</span>
                          </p>
                        </div>
                      )}

                      <div>
                        <h5 className="text-sm font-semibold text-zinc-900 dark:text-white mb-3">
                          Participants {session.users && session.users.length > 0 && `(${session.users.length})`}
                        </h5>
                        {session.users && session.users.length > 0 ? (
                          <div className="grid grid-cols-1 gap-2">
                            {session.users.map((participant: any) => {
                              const slot = session.sessionType.slots[participant.slot];
                              const bgColor = getRandomBg(
                                participant.userid.toString(),
                                participant.user?.username
                              );
                              return (
                                <div
                                  key={`${participant.userid}-${participant.slot}`}
                                  className="flex items-center gap-3 p-2 rounded-lg bg-zinc-50 dark:bg-zinc-700/50"
                                >
                                  {participant.user?.picture ? (
                                    <div className="relative w-8 h-8 rounded-full overflow-hidden flex-shrink-0">
                                      <Image
                                        src={participant.user.picture}
                                        alt={participant.user.username || "User"}
                                        fill
                                        className="object-cover"
                                      />
                                    </div>
                                  ) : (
                                    <div
                                      className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-zinc-800 dark:text-zinc-900 flex-shrink-0 ${bgColor}`}
                                    >
                                      {participant.user?.username?.[0]?.toUpperCase() || "?"}
                                    </div>
                                  )}
                                  <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium text-zinc-900 dark:text-white truncate">
                                      {participant.user?.username || "Unknown"}
                                    </p>
                                    <p className="text-xs text-zinc-500 dark:text-zinc-400">
                                      {slot?.name || participant.roleID}
                                    </p>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        ) : (
                          <p className="text-sm text-zinc-500 dark:text-zinc-400 italic py-2">
                            No participants
                          </p>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
        </div>
      </div>
    </>
  );
}

import React, { useState, useEffect } from "react";
import type { ActivitySession, inactivityNotice } from "@prisma/client";
import {
  IconUsers,
  IconUserCheck,
  IconCalendarEvent,
  IconClock,
  IconChevronDown,
  IconChevronUp,
  IconHistory,
} from "@tabler/icons-react";
import { useRouter } from "next/router";
import axios from "axios";
import { useSessionColors } from "@/hooks/useSessionColors";
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
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3">
        <div className="relative overflow-hidden rounded-xl border border-zinc-200 dark:border-zinc-700/60 bg-white dark:bg-zinc-800/80 p-5">
          <div className="absolute top-0 left-0 right-0 h-0.5 bg-primary/70 rounded-t-xl" />
          <div className="flex items-center gap-2.5 mb-4">
            <div className="p-1.5 bg-primary/10 rounded-md">
              <IconUsers className="w-4 h-4 text-primary" />
            </div>
            <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wide">
              Hosting
            </p>
          </div>
          <div className="text-3xl font-bold text-zinc-900 dark:text-white tabular-nums">
            {sessionsHosted}
          </div>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-0.5">
            sessions hosted this period
          </p>
        </div>

        <div className="relative overflow-hidden rounded-xl border border-zinc-200 dark:border-zinc-700/60 bg-white dark:bg-zinc-800/80 p-5">
          <div className="absolute top-0 left-0 right-0 h-0.5 bg-primary/70 rounded-t-xl" />
          <div className="flex items-center gap-2.5 mb-4">
            <div className="p-1.5 bg-primary/10 rounded-md">
              <IconUserCheck className="w-4 h-4 text-primary" />
            </div>
            <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wide">
              Attendance
            </p>
          </div>
          <div className="text-3xl font-bold text-zinc-900 dark:text-white tabular-nums">
            {sessionsAttended}
          </div>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-0.5">
            sessions attended this period
          </p>
        </div>
      </div>

      <div className="rounded-xl border border-zinc-200 dark:border-zinc-700/60 bg-white dark:bg-zinc-800/80 overflow-hidden">
        <div className="flex items-center gap-3 px-5 py-4 border-b border-zinc-100 dark:border-zinc-700/60">
          <div className="p-1.5 bg-primary/10 rounded-md">
            <IconHistory className="w-4 h-4 text-primary" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-zinc-900 dark:text-white">
              Session History
            </h2>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Sessions hosted and attended this period
            </p>
          </div>
        </div>
        <div className="p-5">
          {loading ? (
            <div className="flex items-center justify-center py-12 gap-3">
              <div className="animate-spin w-5 h-5 border-2 border-zinc-200 dark:border-zinc-700 border-t-primary rounded-full" />
              <span className="text-sm text-zinc-400 dark:text-zinc-500">Loading sessions...</span>
            </div>
          ) : sessionHistory.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 gap-3">
              <div className="w-12 h-12 bg-zinc-100 dark:bg-zinc-700/50 rounded-full flex items-center justify-center">
                <IconHistory className="w-6 h-6 text-zinc-400 dark:text-zinc-500" />
              </div>
              <div className="text-center">
                <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300">No sessions yet</p>
                <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-0.5">Session history will appear here</p>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
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
                    className="rounded-xl border border-zinc-200 dark:border-zinc-700/60 bg-zinc-50 dark:bg-zinc-700/30 overflow-hidden transition-all duration-150"
                  >
                    <div
                      className="px-4 py-3 cursor-pointer hover:bg-zinc-100 dark:hover:bg-zinc-700/60 transition-colors"
                      onClick={() => toggleSessionExpanded(session.id)}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1.5">
                            <h4 className="text-sm font-semibold text-zinc-900 dark:text-white truncate">
                              {session.sessionType.name}
                            </h4>
                            {session.type && (
                              <span className={`px-1.5 py-0.5 text-xs font-medium rounded shrink-0 ${sessionColorClass} ${textColorClass}`}>
                                {session.type.charAt(0).toUpperCase() + session.type.slice(1)}
                              </span>
                            )}
                          </div>
                          <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-zinc-500 dark:text-zinc-400">
                            <div className="flex items-center gap-1">
                              <IconCalendarEvent className="w-3.5 h-3.5" />
                              <span>{formatDate(session.date)}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <IconClock className="w-3.5 h-3.5" />
                              <span>{formatTime(session.date)}</span>
                            </div>
                            {session.owner && (
                              <div className="flex items-center gap-1.5">
                                <div className="w-4 h-4 rounded-full overflow-hidden bg-primary/20 shrink-0">
                                  <img
                                    src={`/api/workspace/${router.query.id}/avatar/${session.owner.userid}`}
                                    alt={session.owner.username || "Host"}
                                    className="w-full h-full object-cover"
                                  />
                                </div>
                                <span>Host: {session.owner.username}</span>
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="shrink-0 text-zinc-400 dark:text-zinc-500">
                          {isExpanded ? (
                            <IconChevronUp className="w-4 h-4" />
                          ) : (
                            <IconChevronDown className="w-4 h-4" />
                          )}
                        </div>
                      </div>
                    </div>
                    {isExpanded && (
                      <div className="px-4 pb-4 border-t border-zinc-200 dark:border-zinc-700/60 pt-3">
                        {userRole && (
                          <div className="mb-3 px-3 py-2 bg-primary/5 dark:bg-primary/10 rounded-lg border border-primary/10">
                            <p className="text-xs font-medium text-zinc-600 dark:text-zinc-400">
                              Your position: <span className="text-primary font-semibold">{userRole.name}</span>
                            </p>
                          </div>
                        )}
                        <div>
                          <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wide mb-2">
                            Participants{session.users?.length > 0 ? ` · ${session.users.length}` : ""}
                          </p>
                          {session.users && session.users.length > 0 ? (
                            <div className="space-y-1.5">
                              {session.users.map((participant: any) => {
                                const slot = session.sessionType.slots[participant.slot];
                                return (
                                  <div
                                    key={`${participant.userid}-${participant.slot}`}
                                    className="flex items-center gap-2.5 px-3 py-2 rounded-lg bg-white dark:bg-zinc-800/60 border border-zinc-100 dark:border-zinc-700/40"
                                  >
                                <div className="relative w-7 h-7 rounded-full overflow-hidden flex-shrink-0">
                                    <img
                                      src={`/api/workspace/${router.query.id}/avatar/${participant.userid}`}
                                      alt={participant.user?.username || "User"}
                                      className="w-7 h-7 rounded-full object-cover"
                                    />
                                  </div>
                                    <div className="flex-1 min-w-0 flex items-center justify-between gap-2">
                                      <p className="text-sm font-medium text-zinc-900 dark:text-white truncate">
                                        {participant.user?.username || "Unknown"}
                                      </p>
                                      <p className="text-xs text-zinc-400 dark:text-zinc-500 shrink-0">
                                        {slot?.name || participant.roleID}
                                      </p>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          ) : (
                            <p className="text-sm text-zinc-400 dark:text-zinc-500 py-2">No participants</p>
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
    </div>
  );
}

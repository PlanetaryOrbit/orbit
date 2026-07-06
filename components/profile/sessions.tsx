import React, { useState, useEffect } from "react";
import type { ActivitySession, inactivityNotice } from "@prisma/client";
import {
  ProfileEmptyState,
  ProfileSection,
  ProfileStatCard,
} from "@/components/profile/shell";
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
        <ProfileStatCard
          icon={IconUsers}
          label="Hosting"
          value={sessionsHosted}
          description="sessions hosted this period"
        />
        <ProfileStatCard
          icon={IconUserCheck}
          label="Attendance"
          value={sessionsAttended}
          description="sessions attended this period"
        />
      </div>

      <ProfileSection
        icon={IconHistory}
        title="Session History"
        subtitle="Sessions hosted and attended this period"
      >
        {loading ? (
          <div className="flex items-center justify-center gap-3 py-12">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-zinc-200 border-t-primary dark:border-zinc-700" />
            <span className="text-sm text-zinc-400 dark:text-zinc-500">Loading sessions…</span>
          </div>
        ) : sessionHistory.length === 0 ? (
          <ProfileEmptyState
            icon={IconHistory}
            title="No sessions yet"
            description="Session history will appear here"
          />
        ) : (
          <div className="divide-y divide-zinc-100 dark:divide-zinc-800/60">
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
                <div key={session.id}>
                  <button
                    className="flex w-full items-center justify-between gap-3 py-3.5 text-left"
                    onClick={() => toggleSessionExpanded(session.id)}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="mb-1 flex items-center gap-2">
                        <span className="truncate text-sm font-medium text-zinc-900 dark:text-white">
                          {session.sessionType.name}
                        </span>
                        {session.type && (
                          <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${sessionColorClass} ${textColorClass}`}>
                            {session.type.charAt(0).toUpperCase() + session.type.slice(1)}
                          </span>
                        )}
                        {userRole && (
                          <span className="shrink-0 rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                            {userRole.name}
                          </span>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-zinc-400 dark:text-zinc-500">
                        <div className="flex items-center gap-1">
                          <IconCalendarEvent className="h-3.5 w-3.5" />
                          <span>{formatDate(session.date)}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <IconClock className="h-3.5 w-3.5" />
                          <span>{formatTime(session.date)}</span>
                        </div>
                        {session.owner && (
                          <div className="flex items-center gap-1.5">
                            <img
                              src={`/api/user/${session.owner.userid}/avatar`}
                              alt={session.owner.username || "Host"}
                              className="h-3.5 w-3.5 rounded-full object-cover"
                            />
                            <span>{session.owner.username}</span>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="shrink-0 text-zinc-400 dark:text-zinc-500">
                      {isExpanded ? (
                        <IconChevronUp className="h-4 w-4" />
                      ) : (
                        <IconChevronDown className="h-4 w-4" />
                      )}
                    </div>
                  </button>

                  {isExpanded && session.users && session.users.length > 0 && (
                    <div className="pb-3">
                      <p className="mb-2 text-[11px] font-medium uppercase tracking-wide text-zinc-400 dark:text-zinc-500">
                        Participants · {session.users.length}
                      </p>
                      <div className="divide-y divide-zinc-100 dark:divide-zinc-800/60">
                        {session.users.map((participant: any) => {
                          const slot = session.sessionType.slots[participant.slot];
                          return (
                            <div
                              key={`${participant.userid}-${participant.slot}`}
                              className="flex items-center justify-between gap-2.5 py-2"
                            >
                              <div className="flex items-center gap-2.5 min-w-0">
                                <img
                                  src={`/api/user/${participant.userid}/avatar`}
                                  alt={participant.user?.username || "User"}
                                  className="h-6 w-6 rounded-full object-cover shrink-0"
                                />
                                <span className="truncate text-sm text-zinc-900 dark:text-white">
                                  {participant.user?.username || "Unknown"}
                                </span>
                              </div>
                              <span className="shrink-0 text-xs text-zinc-400 dark:text-zinc-500">
                                {slot?.name || participant.roleID}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </ProfileSection>
    </div>
  );
}

import axios from "axios";
import React, { useState } from "react";
import type toast from "react-hot-toast";
import { useRecoilState } from "recoil";
import { workspacestate } from "@/state";
import Button from "@/components/button";
import type { Session, user } from "@/utils/database";
import { useRouter } from "next/router";
import { IconChevronRight, IconSpeakerphone } from "@tabler/icons-react";
import { getThumbnail } from "@/utils/userinfoEngine";
import { useSessionColors } from "@/hooks/useSessionColors";

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

const Sessions: React.FC = () => {
  const [activeSessions, setActiveSessions] = useState<
    (Session & {
      owner: user;
      isLive?: boolean;
    })[]
  >([]);
  const [nextSession, setNextSession] = useState<
    | (Session & {
        owner: user;
        isLive?: boolean;
      })
    | null
  >(null);
  const router = useRouter();
  const { getSessionTypeColor, getTextColorForBackground } = useSessionColors(
    router.query.id as string
  );
  React.useEffect(() => {
    const now = new Date();
    const startOfDay = new Date(now);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(now);
    endOfDay.setHours(23, 59, 59, 999);
    const startISO = startOfDay.toISOString();
    const endISO = endOfDay.toISOString();
    
    axios
      .get(`/api/workspace/${router.query.id}/home/activeSessions?startDate=${startISO}&endDate=${endISO}`)
      .then((res) => {
        if (res.status === 200) {
          const sessionsWithOwner = (res.data.sessions || []).filter((session: any) => session.owner);
          setActiveSessions(sessionsWithOwner);
          setNextSession(res.data.nextSession?.owner ? res.data.nextSession : null);
        }
      })
      .catch((err) => {
        console.error("Error fetching active sessions:", err);
      });
  }, [router.query.id]);

  const goToSessions = () => {
    router.push(`/workspace/${router.query.id}/sessions`);
  };
  
  const getCurrentStatus = (session: any) => {
    const now = new Date();
    const sessionStart = new Date(session.date);
    const sessionDuration = session.duration || 30;
    const sessionEnd = new Date(sessionStart.getTime() + sessionDuration * 60 * 1000);
    
    if (now > sessionEnd) return "Concluded";
    
    const minutesFromStart = (now.getTime() - sessionStart.getTime()) / 1000 / 60;
    const statues = (session as any).sessionType?.statues || [];
    
    const sortedStatues = [...statues].sort((a: any, b: any) => b.timeAfter - a.timeAfter);
    for (const status of sortedStatues) {
      if (minutesFromStart >= status.timeAfter) {
        return status.name;
      }
    }
    return null;
  };

  return (
    <div className="flex flex-col gap-4">
      {activeSessions.length === 0 && !nextSession ? (
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
            <IconSpeakerphone className="w-8 h-8 text-primary" />
          </div>
          <p className="text-lg font-medium text-zinc-900 dark:text-white mb-1">
            No sessions today
          </p>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-4">
            There are no sessions scheduled for today
          </p>
          <button
            onClick={goToSessions}
            className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
          >
            View Sessions
            <IconChevronRight className="w-4 h-4" />
          </button>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {activeSessions.map((session) => (
            <div
              key={session.id}
              className="bg-white dark:bg-zinc-800 rounded-lg shadow-sm hover:shadow-md transition-shadow overflow-hidden border border-zinc-200 dark:border-zinc-700"
            >
              <div className="p-4">
                <div className="flex items-start gap-3">
                  <div
                    className={`rounded-lg h-10 w-10 flex items-center justify-center ${getRandomBg(
                      session.owner?.userid?.toString() ?? undefined,
                      session.owner?.username ?? undefined
                    )}`}
                  >
                    <img
                      src={session.owner?.picture ?? "/default-avatar.jpg"}
                      alt={`${session.owner?.username || "User"}'s avatar`}
                      className="rounded-lg h-10 w-10 object-cover border-2 border-white dark:border-zinc-800"
                      onError={(e) => {
                        e.currentTarget.src = "/default-avatar.jpg";
                      }}
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="text-base font-medium text-zinc-900 dark:text-white truncate">
                        {(
                          session.name ||
                          (session as any).sessionType?.name ||
                          "Session"
                        ).length > 14
                          ? (
                              session.name ||
                              (session as any).sessionType?.name ||
                              "Session"
                            ).substring(0, 14) + "..."
                          : session.name ||
                            (session as any).sessionType?.name ||
                            "Session"}
                      </p>
                      {session.isLive && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200 animate-pulse">
                          • LIVE
                        </span>
                      )}
                      {session.type && (
                        <span
                          className={`${getSessionTypeColor(
                            session.type
                          )} ${getTextColorForBackground(
                            getSessionTypeColor(session.type)
                          )} px-2 py-0.5 rounded text-xs font-medium flex-shrink-0`}
                        >
                          {session.type.charAt(0).toUpperCase() +
                            session.type.slice(1)}
                        </span>
                      )}
                      {(() => {
                        const status = getCurrentStatus(session);
                        return status && status !== "Open" && status !== "Concluded" && (
                          <span className="bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 px-2 py-0.5 rounded text-xs font-medium">
                            {status}
                          </span>
                        );
                      })()}
                    </div>
                    <p className="text-sm text-zinc-600 dark:text-zinc-400">
                      {session.owner?.username ? `Hosted by ${session.owner.username}` : "No Host"}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          ))}
          {nextSession && activeSessions.length === 0 && (
            <div className="bg-white dark:bg-zinc-800 rounded-lg shadow-sm hover:shadow-md transition-shadow overflow-hidden border border-zinc-200 dark:border-zinc-700">
              <div className="p-4">
                <div className="flex items-start gap-3">
                  <div
                    className={`rounded-lg h-10 w-10 flex items-center justify-center ${getRandomBg(
                      nextSession.owner?.userid?.toString() ?? undefined,
                      nextSession.owner?.username ?? undefined
                    )}`}
                  >
                    <img
                      src={nextSession.owner?.picture ?? "/default-avatar.jpg"}
                      alt={`${nextSession.owner?.username || "User"}'s avatar`}
                      className="rounded-lg h-10 w-10 object-cover border-2 border-white dark:border-zinc-800"
                      onError={(e) => {
                        e.currentTarget.src = "/default-avatar.jpg";
                      }}
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="text-base font-medium text-zinc-900 dark:text-white truncate">
                        {(
                          nextSession.name ||
                          (nextSession as any).sessionType?.name ||
                          "Session"
                        ).length > 14
                          ? (
                              nextSession.name ||
                              (nextSession as any).sessionType?.name ||
                              "Session"
                            ).substring(0, 14) + "..."
                          : nextSession.name ||
                            (nextSession as any).sessionType?.name ||
                            "Session"}
                      </p>
                      {nextSession.type && (
                        <span
                          className={`${getSessionTypeColor(
                            nextSession.type
                          )} ${getTextColorForBackground(
                            getSessionTypeColor(nextSession.type)
                          )} px-2 py-0.5 rounded text-xs font-medium flex-shrink-0`}
                        >
                          {nextSession.type.charAt(0).toUpperCase() +
                            nextSession.type.slice(1)}
                        </span>
                      )}
                      {(() => {
                        const status = getCurrentStatus(nextSession);
                        return status && status !== "Open" && status !== "Concluded" && (
                          <span className="bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 px-2 py-0.5 rounded text-xs font-medium">
                            {status}
                          </span>
                        );
                      })()}
                    </div>
                    <p className="text-sm text-zinc-600 dark:text-zinc-400">
                      {new Date(nextSession.date).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}{" "}
                      • {nextSession.owner?.username ? `Hosted by ${nextSession.owner.username}` : "No Host"}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
          <button
            onClick={goToSessions}
            className="inline-flex items-center justify-center gap-2 text-sm text-primary hover:text-primary/80 transition-colors"
          >
            View all sessions
            <IconChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
};

export default Sessions;

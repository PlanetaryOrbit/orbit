import axios from "axios";
import React, { useState } from "react";
import type { Session } from "@/utils/database";
import { useRouter } from "next/router";
import { useSessionColors } from "@/hooks/useSessionColors";
import { HomeEmpty, HomeList, HomeListItem } from "@/components/home/shell";

type SessionWithRelations = Session & {
  owner: {
    username: string | null;
    picture: string | null;
    userid: bigint;
  } | null;
  sessionType: {
    name: string | null;
    statues: { timeAfter: number; name: string }[];
  } | null;
  isLive?: boolean;
};

const Sessions: React.FC = () => {
  const [activeSessions, setActiveSessions] = useState<SessionWithRelations[]>([]);
  const [nextSession, setNextSession] = useState<SessionWithRelations | null>(null);
  const router = useRouter();
  const workspaceId = router.query.id as string;
  const { getSessionTypeColor, getTextColorForBackground } = useSessionColors(workspaceId);

  React.useEffect(() => {
    const now = new Date();
    const startOfDay = new Date(now);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(now);
    endOfDay.setHours(23, 59, 59, 999);

    axios
      .get(
        `/api/workspace/${workspaceId}/home/activeSessions?startDate=${startOfDay.toISOString()}&endDate=${endOfDay.toISOString()}`
      )
      .then((res) => {
        if (res.status === 200) {
          const sessionsWithOwner = (res.data.sessions || []).filter(
            (s: SessionWithRelations) => s.owner
          );
          setActiveSessions(sessionsWithOwner);
          const next = res.data.nextSession as SessionWithRelations | null | undefined;
          setNextSession(next?.owner ? next : null);
        }
      })
      .catch(() => {});
  }, [workspaceId]);

  const sessions = activeSessions.length > 0 ? activeSessions : nextSession ? [nextSession] : [];

  if (sessions.length === 0) {
    return (
      <HomeEmpty action={{ label: "View schedule", onClick: () => router.push(`/workspace/${workspaceId}/sessions`) }}>
        Nothing on the calendar for today.
      </HomeEmpty>
    );
  }

  const getCurrentStatus = (session: SessionWithRelations) => {
    const now = new Date();
    const sessionStart = new Date(session.date);
    const sessionEnd = new Date(sessionStart.getTime() + (session.duration || 30) * 60 * 1000);
    if (now > sessionEnd) return "Concluded";
    const minutesFromStart = (now.getTime() - sessionStart.getTime()) / 1000 / 60;
    const statues = session.sessionType?.statues || [];
    const sorted = [...statues].sort((a, b) => b.timeAfter - a.timeAfter);
    for (const status of sorted) {
      if (minutesFromStart >= status.timeAfter) return status.name;
    }
    return null;
  };

  const sessionLabel = (session: SessionWithRelations) =>
    session.name || session.sessionType?.name || "Session";

  return (
    <HomeList>
      {sessions.map((session) => {
        const status = getCurrentStatus(session);
        const typeLabel = session.type
          ? session.type.charAt(0).toUpperCase() + session.type.slice(1)
          : null;
        return (
          <HomeListItem key={session.id}>
            <div className="flex items-start gap-3">
              <img
                src={session.owner?.picture ?? "/default-avatar.jpg"}
                alt=""
                className="h-9 w-9 shrink-0 rounded-md object-cover bg-zinc-100 dark:bg-zinc-700"
                onError={(e) => {
                  e.currentTarget.src = "/default-avatar.jpg";
                }}
              />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                  <p className="text-sm font-medium text-zinc-900 dark:text-white truncate">
                    {sessionLabel(session)}
                  </p>
                  {session.isLive && (
                    <span className="text-[11px] font-medium text-primary">Live</span>
                  )}
                  {typeLabel && (
                    <span
                      className={`rounded px-1.5 py-px text-[11px] font-medium ${getSessionTypeColor(session.type!)} ${getTextColorForBackground(getSessionTypeColor(session.type!))}`}
                    >
                      {typeLabel}
                    </span>
                  )}
                  {status && status !== "Open" && status !== "Concluded" && (
                    <span className="text-[11px] text-zinc-500 dark:text-zinc-400">{status}</span>
                  )}
                </div>
                <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
                  {session.owner?.username ? `Hosted by ${session.owner.username}` : "No host"}
                  {activeSessions.length === 0 && nextSession && (
                    <>
                      {" · "}
                      {new Date(session.date).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </>
                  )}
                </p>
              </div>
            </div>
          </HomeListItem>
        );
      })}
    </HomeList>
  );
};

export default Sessions;

import { useState, useEffect, useMemo, useRef } from "react";
import { ActivitySessionDetailsDialog } from "@/components/activity/ActivitySessionDetailsDialog";
import {
  ProfileEmptyState,
  ProfileSection,
  ProfileStatCard,
} from "@/components/profile/shell";
import { useRouter } from "next/router";
import axios from "axios";
import toast from "react-hot-toast";
import { Line } from "react-chartjs-2";
import { useTheme } from "next-themes";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip as ChartTooltip,
  Legend,
  ChartData,
  ScatterDataPoint,
} from "chart.js";
import {
  IconPlayerPlay,
  IconUsers,
  IconCalendarTime,
  IconClipboardList,
  IconClock,
} from "@tabler/icons-react";
import moment from "moment";
import type { ActivitySession, inactivityNotice } from "@prisma/client";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  ChartTooltip,
  Legend,
);

type TimelineItem =
  | ({ __type: "session" } & ActivitySession & {
        user: { picture: string | null };
      })
  | ({ __type: "notice" } & inactivityNotice)
  | ({ __type: "adjustment" } & any);

type Props = {
  data: any;
  displayMinutes: number;
  messages: number;
  idleTime: number;
  sessionsHosted: number;
  sessionsAttended: number;
  idleTimeEnabled: boolean;
  notices: inactivityNotice[];
  adjustments: any[];
  sessions: (ActivitySession & {
    user: {
      picture: string | null;
    };
  })[];
  avatar: string;
  onEndSession: (sessionId: string, workspaceId: string) => void;
};

export function ActivityOverview({
  data,
  displayMinutes,
  messages,
  idleTime,
  idleTimeEnabled,
  adjustments,
  sessions,
  avatar,
  onEndSession,
}: Props) {
  const router = useRouter();
  const { id } = router.query;

  const [chartData, setChartData] = useState<
    ChartData<"line", (number | ScatterDataPoint | null)[], unknown>
  >({
    datasets: [],
  });
  const [chartOptions, setChartOptions] = useState({});
  const [timeline, setTimeline] = useState<TimelineItem[]>(() => {
    const adj = adjustments.map((a) => ({ ...a, __type: "adjustment" }));
    return [...sessions.map((s) => ({ ...s, __type: "session" })), ...adj];
  });
  const [isOpen, setIsOpen] = useState(false);
  const [dialogData, setDialogData] = useState<any>({});
  const [concurrentUsers, setConcurrentUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const liveSessionTimerRef = useRef<NodeJS.Timeout | null>(null);

  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";

  const sortedTimeline = useMemo(() => {
    return [...timeline].sort((a, b) => {
      const aDate =
        a.__type === "adjustment"
          ? new Date((a as any).createdAt).getTime()
          : new Date((a as any).startTime || (a as any).createdAt).getTime();
      const bDate =
        b.__type === "adjustment"
          ? new Date((b as any).createdAt).getTime()
          : new Date((b as any).startTime || (b as any).createdAt).getTime();
      return bDate - aDate;
    });
  }, [timeline]);

  useEffect(() => {
    const hasLiveSessions = timeline.some(
      (item) =>
        item.__type === "session" &&
        (item as any).active &&
        !(item as any).endTime,
    );

    if (hasLiveSessions) {
      liveSessionTimerRef.current = setInterval(() => {
        setTimeline((prev) => [...prev]);
      }, 60000);
    } else {
      if (liveSessionTimerRef.current) {
        clearInterval(liveSessionTimerRef.current);
        liveSessionTimerRef.current = null;
      }
    }

    return () => {
      if (liveSessionTimerRef.current) {
        clearInterval(liveSessionTimerRef.current);
        liveSessionTimerRef.current = null;
      }
    };
  }, [timeline]);

  useEffect(() => {
    const adj = adjustments.map((a) => ({ ...a, __type: "adjustment" }));
    setTimeline([
      ...sessions.map((s) => ({ ...s, __type: "session" })),
      ...adj,
    ]);
  }, [sessions, adjustments]);

  const fetchSession = async (sessionId: string) => {
    setLoading(true);
    setIsOpen(true);
    setConcurrentUsers([]);

    try {
      const { data, status } = await axios.get(
        `/api/workspace/${id}/activity/${sessionId}`,
      );
      if (status !== 200) return toast.error("Could not fetch session.");
      if (!data.universe) {
        setLoading(false);
        return setDialogData({
          type: "session",
          data: data.message,
          universe: null,
        });
      }

      setDialogData({
        type: "session",
        data: data.message,
        universe: data.universe,
      });

      if (data.message?.startTime && data.message?.endTime) {
        try {
          const concurrentResponse = await axios.get(
            `/api/workspace/${id}/activity/concurrent?sessionId=${sessionId}&startTime=${data.message.startTime}&endTime=${data.message.endTime}`,
          );

          if (concurrentResponse.status === 200) {
            setConcurrentUsers(concurrentResponse.data.users || []);
          }
        } catch (error) {
          console.error("Failed to fetch concurrent users:", error);
        }
      }

      setLoading(false);
    } catch (error) {
      return toast.error("Could not fetch session.");
    }
  };

  useEffect(() => {
    setChartData({
      labels: [
        "Monday",
        "Tuesday",
        "Wednesday",
        "Thursday",
        "Friday",
        "Saturday",
        "Sunday",
      ],
      datasets: [
        {
          label: "Activity in minutes",
          data,
          borderColor: "rgb(var(--group-theme))",
          backgroundColor: "rgb(var(--group-theme))",
          tension: 0.25,
        },
      ],
    });
    setChartOptions({
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: "top",
          labels: { color: isDark ? "#fff" : "#222" },
        },
      },
      scales: {
        y: {
          beginAtZero: true,
          grid: {
            color: isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.05)",
          },
          ticks: { color: isDark ? "#fff" : "#222" },
        },
        x: {
          grid: {
            color: isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.05)",
          },
          ticks: { color: isDark ? "#fff" : "#222" },
        },
      },
    });
  }, [data, isDark]);

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        <ProfileStatCard
          icon={IconPlayerPlay}
          label="Activity"
          value={displayMinutes}
          description="minutes of activity"
        />
        <ProfileStatCard
          icon={IconUsers}
          label="Messages"
          value={messages}
          description="messages this period"
        />
        {idleTimeEnabled && (
          <ProfileStatCard
            icon={IconClock}
            label="Idle Time"
            value={idleTime}
            description="minutes idle"
          />
        )}
      </div>

      <ProfileSection
        icon={IconCalendarTime}
        title="Activity Timeline"
        subtitle="Sessions and manual adjustments"
      >
        {sortedTimeline.length === 0 ? (
          <ProfileEmptyState
            icon={IconClipboardList}
            title="No activity yet"
            description="Sessions and adjustments will appear here"
          />
        ) : (
          <ol className="relative ml-3 space-y-1 border-l border-zinc-200 dark:border-zinc-700">
            {sortedTimeline.map((item: TimelineItem) => {
              if (item.__type === "session") {
                const isLive = item.active && !item.endTime;
                const sessionDuration = isLive
                  ? Math.floor(
                      (new Date().getTime() -
                        new Date(item.startTime).getTime()) /
                        (1000 * 60),
                    )
                  : Math.floor(
                      (new Date(item.endTime || new Date()).getTime() -
                        new Date(item.startTime).getTime()) /
                        (1000 * 60),
                    );

                return (
                  <li key={`session-${item.id}`} className="mb-5 ml-5">
                    <span className="absolute -left-3 flex h-6 w-6 items-center justify-center">
                      {isLive ? (
                        <>
                          <span className="absolute h-6 w-6 animate-[ripple_1.6s_ease-out_infinite] rounded-full border-2 border-emerald-500 opacity-0" />
                          <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
                        </>
                      ) : (
                        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary ring-4 ring-zinc-50 dark:ring-zinc-800/40">
                          <img
                            className="h-full w-full rounded-full object-cover"
                            src={item.user.picture ? item.user.picture : avatar}
                            alt="timeline avatar"
                          />
                        </span>
                      )}
                    </span>
                    <div
                      onClick={() => !isLive && fetchSession(item.id)}
                      className={`rounded-xl px-4 py-3 transition-all duration-150 ${
                        isLive
                          ? "bg-emerald-500/10"
                          : "cursor-pointer bg-zinc-100 hover:bg-zinc-200/80 dark:bg-zinc-800/60 dark:hover:bg-zinc-800"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex min-w-0 items-center gap-2">
                          <p className="truncate text-sm font-medium text-zinc-900 dark:text-white">
                            Activity Session
                          </p>
                          {isLive && (
                            <span className="inline-flex shrink-0 items-center rounded-full bg-emerald-500/10 px-1.5 py-0.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                              LIVE
                            </span>
                          )}
                        </div>
                        <time className="shrink-0 text-xs tabular-nums text-zinc-400 dark:text-zinc-500">
                          {isLive ? (
                            <>
                              Started {moment(item.startTime).format("HH:mm")} ·{" "}
                              {sessionDuration}m
                            </>
                          ) : (
                            <>
                              {moment(item.startTime).format("HH:mm")}–
                              {moment(item.endTime).format("HH:mm")} ·{" "}
                              {moment(item.startTime).format("D MMM")} ·{" "}
                              {sessionDuration}m
                            </>
                          )}
                        </time>
                      </div>
                      {isLive && (
                        <div className="mt-1 flex items-center justify-between">
                          <p className="text-xs text-emerald-600 dark:text-emerald-400">
                            Currently active in game
                          </p>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onEndSession(item.id, id as string);
                            }}
                            className="text-xs px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-zinc-600 dark:text-zinc-500 dark:hover:text-zinc-300 transition-all"
                          >
                            Not in game?
                          </button>
                        </div>
                      )}
                    </div>
                  </li>
                );
              }
              if (item.__type === "adjustment") {
                const positive = item.minutes > 0;
                return (
                  <li key={`adjust-${item.id}`} className="mb-5 ml-5">
                    <span
                      className={`absolute -left-3 flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold text-white ring-4 ring-zinc-50 dark:ring-zinc-800/40 ${
                        positive ? "bg-emerald-500" : "bg-red-500"
                      }`}
                    >
                      {positive ? "+" : "−"}
                    </span>
                    <div className="rounded-xl bg-zinc-100 px-4 py-3 dark:bg-zinc-800/60">
                      <div className="flex items-start justify-between gap-3">
                        <p className="text-sm font-medium text-zinc-900 dark:text-white">
                          Manual Adjustment
                        </p>
                        <time className="shrink-0 text-xs tabular-nums text-zinc-400 dark:text-zinc-500">
                          {moment(item.createdAt).format("D MMM YYYY, HH:mm")}
                        </time>
                      </div>
                      <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                        <span
                          className={
                            positive
                              ? "font-medium text-emerald-600 dark:text-emerald-400"
                              : "font-medium text-red-600 dark:text-red-400"
                          }
                        >
                          {positive ? "+" : "−"}
                          {Math.abs(item.minutes)} min
                        </span>{" "}
                        by {item.actor?.username || "Unknown"}
                        {item.reason && (
                          <span className="text-zinc-400 dark:text-zinc-500">
                            {" "}
                            · {item.reason}
                          </span>
                        )}
                      </p>
                    </div>
                  </li>
                );
              }
            })}
          </ol>
        )}
      </ProfileSection>

      <ActivitySessionDetailsDialog
        open={isOpen}
        loading={loading}
        onClose={() => setIsOpen(false)}
        session={dialogData?.data ?? null}
        universe={dialogData?.universe}
        concurrentUsers={concurrentUsers}
        idleTimeEnabled={idleTimeEnabled}
      />
    </div>
  );
}

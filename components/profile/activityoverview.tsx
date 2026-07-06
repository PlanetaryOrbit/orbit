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
          <div className="divide-y divide-zinc-100 dark:divide-zinc-800/60">
            {sortedTimeline.map((item: TimelineItem) => {
              if (item.__type === "session") {
                const isLive = (item as any).active && !(item as any).endTime;
                const sessionDuration = isLive
                  ? Math.floor(
                      (new Date().getTime() - new Date((item as any).startTime).getTime()) / (1000 * 60),
                    )
                  : Math.floor(
                      (new Date((item as any).endTime || new Date()).getTime() -
                        new Date((item as any).startTime).getTime()) /
                        (1000 * 60),
                    );

                return (
                  <div
                    key={`session-${(item as any).id}`}
                    onClick={() => !isLive && fetchSession((item as any).id)}
                    className={`flex items-start justify-between gap-3 py-3.5 ${!isLive ? "cursor-pointer" : ""}`}
                  >
                    <div className="flex items-start gap-3 min-w-0">
                      <div className="mt-0.5 shrink-0">
                        {isLive ? (
                          <span className="relative flex h-5 w-5 items-center justify-center">
                            <span className="absolute h-5 w-5 animate-ping rounded-full bg-emerald-500 opacity-30" />
                            <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
                          </span>
                        ) : (
                          <img
                            className="h-5 w-5 rounded-full object-cover"
                            src={(item as any).user?.picture || avatar}
                            alt="avatar"
                          />
                        )}
                      </div>
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2 mb-0.5">
                          <span className="text-sm font-medium text-zinc-900 dark:text-white">
                            Activity Session
                          </span>
                          {isLive && (
                            <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                              Live
                            </span>
                          )}
                        </div>
                        {isLive ? (
                          <p className="text-xs text-emerald-600 dark:text-emerald-400">
                            Currently active · {sessionDuration}m
                          </p>
                        ) : (
                          <p className="text-xs tabular-nums text-zinc-400 dark:text-zinc-500">
                            {moment((item as any).startTime).format("HH:mm")}–{moment((item as any).endTime).format("HH:mm")} ·{" "}
                            {moment((item as any).startTime).format("D MMM")} · {sessionDuration}m
                          </p>
                        )}
                      </div>
                    </div>
                    {isLive && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onEndSession((item as any).id, id as string);
                        }}
                        className="shrink-0 rounded-lg bg-zinc-100 px-2.5 py-1.5 text-xs text-zinc-500 transition hover:bg-zinc-200 hover:text-zinc-700 dark:bg-zinc-800 dark:hover:bg-zinc-700 dark:text-zinc-400"
                      >
                        Not in game?
                      </button>
                    )}
                  </div>
                );
              }
              if (item.__type === "adjustment") {
                const positive = (item as any).minutes > 0;
                return (
                  <div key={`adjust-${(item as any).id}`} className="flex items-start justify-between gap-3 py-3.5">
                    <div className="flex items-start gap-3 min-w-0">
                      <div className={`mt-0.5 shrink-0 flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold text-white ${positive ? "bg-emerald-500" : "bg-red-500"}`}>
                        {positive ? "+" : "−"}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-zinc-900 dark:text-white">
                          Manual Adjustment
                        </p>
                        <p className="mt-0.5 text-xs text-zinc-400 dark:text-zinc-500">
                          <span className={positive ? "font-medium text-emerald-600 dark:text-emerald-400" : "font-medium text-red-600 dark:text-red-400"}>
                            {positive ? "+" : "−"}{Math.abs((item as any).minutes)} min
                          </span>{" "}
                          by {(item as any).actor?.username || "Unknown"}
                          {(item as any).reason && <> · {(item as any).reason}</>}
                        </p>
                      </div>
                    </div>
                    <time className="shrink-0 text-xs tabular-nums text-zinc-400 dark:text-zinc-500">
                      {moment((item as any).createdAt).format("D MMM, HH:mm")}
                    </time>
                  </div>
                );
              }
            })}
          </div>
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

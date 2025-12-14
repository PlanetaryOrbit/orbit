import React, { Fragment, useState, useEffect, useMemo } from "react";
import { Dialog, Transition } from "@headlessui/react";
import { useRouter } from "next/router";
import axios from "axios";
import toast from "react-hot-toast";
import { Line } from "react-chartjs-2";
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
  IconChartBar,
  IconPlayerPlay,
  IconUsers,
  IconCalendarTime,
  IconClipboardList,
  IconClock,
} from "@tabler/icons-react";
import { useRecoilValue } from "recoil";
import { themeState } from "@/state/theme";
import moment from "moment";
import type { ActivitySession, inactivityNotice } from "@prisma/client";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  ChartTooltip,
  Legend
);

const BG_COLORS = [
  "bg-red-200",
  "bg-green-200",
  "bg-emerald-200",
  "bg-red-300",
  "bg-green-300",
  "bg-emerald-300",
  "bg-amber-200",
  "bg-yellow-200",
  "bg-red-100",
  "bg-green-100",
  "bg-lime-200",
  "bg-rose-200",
  "bg-amber-300",
  "bg-teal-200",
  "bg-lime-300",
  "bg-rose-300",
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
};

export function ActivityOverview({
  data,
  displayMinutes,
  messages,
  idleTime,
  sessionsHosted,
  sessionsAttended,
  idleTimeEnabled,
  adjustments,
  sessions,
  avatar,
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
    return [
      ...sessions.map((s) => ({ ...s, __type: "session" })),
      ...adj,
    ];
  });
  const [isOpen, setIsOpen] = useState(false);
  const [dialogData, setDialogData] = useState<any>({});
  const [concurrentUsers, setConcurrentUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [liveSessionTimer, setLiveSessionTimer] = useState<NodeJS.Timeout | null>(null);

  const theme = useRecoilValue(themeState);
  const isDark = theme === "dark";

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
      (item) => item.__type === "session" && item.active && !item.endTime
    );

    if (hasLiveSessions) {
      const timer = setInterval(() => {
        setTimeline((prev) => [...prev]);
      }, 60000);

      setLiveSessionTimer(timer);

      return () => {
        clearInterval(timer);
        setLiveSessionTimer(null);
      };
    } else if (liveSessionTimer) {
      clearInterval(liveSessionTimer);
      setLiveSessionTimer(null);
    }
  }, [timeline, liveSessionTimer]);

  useEffect(() => {
    return () => {
      if (liveSessionTimer) {
        clearInterval(liveSessionTimer);
      }
    };
  }, [liveSessionTimer]);

  const fetchSession = async (sessionId: string) => {
    setLoading(true);
    setIsOpen(true);
    setConcurrentUsers([]);

    try {
      const { data, status } = await axios.get(
        `/api/workspace/${id}/activity/${sessionId}`
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
            `/api/workspace/${id}/activity/concurrent?sessionId=${sessionId}&startTime=${data.message.startTime}&endTime=${data.message.endTime}`
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
    <div className="space-y-4">
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <div className="bg-white dark:bg-zinc-700 rounded-xl shadow-sm overflow-hidden">
          <div className="flex items-center gap-3 p-4 border-b border-zinc-200 dark:border-zinc-600">
            <div className="bg-primary/10 p-2 rounded-lg">
              <IconPlayerPlay className="w-5 h-5 text-primary" />
            </div>
            <h2 className="text-lg font-medium text-zinc-900 dark:text-white">
              Activity Metrics
            </h2>
          </div>
          <div className="p-6 text-center">
            <div className="text-4xl font-bold text-zinc-900 dark:text-white mb-2">
              {displayMinutes}
            </div>
            <div className="text-sm text-zinc-600 dark:text-zinc-400">
              minutes of activity
            </div>
          </div>
        </div>
        
        <div className="bg-white dark:bg-zinc-700 rounded-xl shadow-sm overflow-hidden">
          <div className="flex items-center gap-3 p-4 border-b border-zinc-200 dark:border-zinc-600">
            <div className="bg-primary/10 p-2 rounded-lg">
              <IconUsers className="w-5 h-5 text-primary" />
            </div>
            <h2 className="text-lg font-medium text-zinc-900 dark:text-white">
              Messages Sent
            </h2>
          </div>
          <div className="p-6 text-center">
            <div className="text-4xl font-bold text-zinc-900 dark:text-white mb-2">
              {messages}
            </div>
            <div className="text-sm text-zinc-600 dark:text-zinc-400">
              messages during this period
            </div>
          </div>
        </div>
        
        {idleTimeEnabled && (
          <div className="bg-white dark:bg-zinc-700 rounded-xl shadow-sm overflow-hidden">
            <div className="flex items-center gap-3 p-4 border-b border-zinc-200 dark:border-zinc-600">
              <div className="bg-primary/10 p-2 rounded-lg">
                <IconClock className="w-5 h-5 text-primary" />
              </div>
              <h2 className="text-lg font-medium text-zinc-900 dark:text-white">
                Idle Time
              </h2>
            </div>
            <div className="p-6 text-center">
              <div className="text-4xl font-bold text-zinc-900 dark:text-white mb-2">
                {idleTime}
              </div>
              <div className="text-sm text-zinc-600 dark:text-zinc-400">
                minutes idle
              </div>
            </div>
          </div>
        )}
      </div>      <div className="bg-white dark:bg-zinc-700 rounded-xl shadow-sm overflow-hidden">
        <div className="flex items-center gap-3 p-4 border-b border-zinc-200 dark:border-zinc-600">
          <div className="bg-primary/10 p-2 rounded-lg">
            <IconCalendarTime className="w-5 h-5 text-primary" />
          </div>
          <h2 className="text-lg font-medium text-zinc-900 dark:text-white">
            Activity Timeline
          </h2>
        </div>
        <div className="p-4">
          {sortedTimeline.length === 0 ? (
            <div className="text-center py-12">
              <div className="bg-white dark:bg-zinc-700 rounded-xl p-8 max-w-md mx-auto">
                <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4">
                  <IconClipboardList className="w-8 h-8 text-primary" />
                </div>
                <h3 className="text-lg font-medium text-zinc-900 dark:text-white mb-1">
                  No Activity
                </h3>
                <p className="text-sm text-zinc-900 dark:text-white mb-4">
                  No activity or adjustments have been recorded yet
                </p>
              </div>
            </div>
          ) : (
            <ol className="relative border-l border-gray-200 ml-3 mt-3">
              {sortedTimeline.map((item: TimelineItem) => {
                if (item.__type === "session") {
                  const isLive = item.active && !item.endTime;
                  const sessionDuration = isLive
                    ? Math.floor(
                        (new Date().getTime() -
                          new Date(item.startTime).getTime()) /
                          (1000 * 60)
                      )
                    : Math.floor(
                        (new Date(item.endTime || new Date()).getTime() -
                          new Date(item.startTime).getTime()) /
                          (1000 * 60)
                      );

                  return (
                    <div key={`session-${item.id}`}>
                      <li className="mb-6 ml-6">
                        <span
                          className={`flex absolute -left-3 justify-center items-center w-6 h-6 ${
                            isLive
                              ? "bg-green-500 animate-pulse"
                              : "bg-primary"
                          } rounded-full ring-4 ring-white`}
                        >
                          {isLive ? (
                            <div className="w-3 h-3 bg-white rounded-full"></div>
                          ) : (
                            <img
                              className="rounded-full"
                              src={
                                item.user.picture ? item.user.picture : avatar
                              }
                              alt="timeline avatar"
                            />
                          )}
                        </span>
                        <div
                          onClick={() => !isLive && fetchSession(item.id)}
                          className={`p-4 ${
                            isLive
                              ? "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-700"
                              : "bg-zinc-50 dark:bg-zinc-500 border-zinc-100"
                          } rounded-lg border ${
                            !isLive
                              ? "cursor-pointer hover:bg-zinc-100 dark:hover:bg-zinc-600 transition-colors"
                              : ""
                          }`}
                        >
                          <div className="flex justify-between items-center mb-1">
                            <div className="flex items-center gap-2">
                              <p className="text-sm font-medium text-zinc-900 dark:text-white">
                                Activity Session
                              </p>
                              {isLive && (
                                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                                  LIVE
                                </span>
                              )}
                            </div>
                            <time className="text-xs text-zinc-500 dark:text-white">
                              {isLive ? (
                                <>
                                  Started at{" "}
                                  {moment(item.startTime).format("HH:mm")} •{" "}
                                  {sessionDuration}m
                                </>
                              ) : (
                                <>
                                  {moment(item.startTime).format("HH:mm")} -{" "}
                                  {moment(item.endTime).format("HH:mm")} on{" "}
                                  {moment(item.startTime).format("DD MMM YYYY")} •{" "}
                                  {sessionDuration}m
                                </>
                              )}
                            </time>
                          </div>
                          {isLive && (
                            <p className="text-xs text-zinc-600 dark:text-zinc-300">
                              Currently active in game
                            </p>
                          )}
                        </div>
                      </li>
                    </div>
                  );
                }
                if (item.__type === "notice") {
                  return (
                    <div key={`notice-${item.id}`}>
                      <li className="mb-6 ml-6">
                        <span className="flex absolute -left-3 justify-center items-center w-6 h-6 bg-primary rounded-full ring-4 ring-white">
                          <img
                            className="rounded-full"
                            src={avatar}
                            alt="timeline avatar"
                          />
                        </span>
                        <div className="p-4 bg-zinc-50 dark:bg-zinc-700 rounded-lg border border-zinc-100 dark:border-zinc-600">
                          <div className="flex justify-between items-center mb-1">
                            <p className="text-sm font-medium text-zinc-900 dark:text-white">
                              Inactivity Notice
                            </p>
                            <time className="text-xs text-zinc-500 dark:text-zinc-400">
                              {moment(item.startTime).format("DD MMM")} -{" "}
                              {moment(item.endTime).format("DD MMM YYYY")}
                            </time>
                          </div>
                          <p className="text-sm text-zinc-600 dark:text-zinc-300">
                            {item.reason}
                          </p>
                        </div>
                      </li>
                    </div>
                  );
                }
                if (item.__type === "adjustment") {
                  const positive = item.minutes > 0;
                  return (
                    <div key={`adjust-${item.id}`}>
                      <li className="mb-6 ml-6">
                        <span
                          className={`flex absolute -left-3 justify-center items-center w-6 h-6 ${
                            positive ? "bg-green-500" : "bg-red-500"
                          } rounded-full ring-4 ring-white text-white text-xs font-bold`}
                        >
                          {positive ? "+" : "-"}
                        </span>
                        <div className="p-4 bg-zinc-50 dark:bg-zinc-600 rounded-lg border border-zinc-100 dark:border-zinc-600">
                          <div className="flex justify-between items-center mb-1">
                            <p className="text-sm font-medium text-zinc-900 dark:text-white">
                              Manual Adjustment
                            </p>
                            <time className="text-xs text-zinc-500 dark:text-zinc-300">
                              {moment(item.createdAt).format(
                                "DD MMM YYYY, HH:mm"
                              )}
                            </time>
                          </div>
                          <p className="text-sm text-zinc-600 dark:text-zinc-200">
                            {positive ? "Awarded" : "Removed"}{" "}
                            {Math.abs(item.minutes)} minutes by{" "}
                            {item.actor?.username || "Unknown"}
                          </p>
                          {item.reason && (
                            <p className="text-xs italic text-zinc-500 dark:text-zinc-400 mt-1">
                              Reason: {item.reason}
                            </p>
                          )}
                        </div>
                      </li>
                    </div>
                  );
                }
              })}
            </ol>
          )}
        </div>
      </div>

      <Transition appear show={isOpen} as={Fragment}>
        <Dialog
          as="div"
          className="relative z-10"
          onClose={() => setIsOpen(false)}
        >
          <Transition.Child
            as={Fragment}
            enter="ease-out duration-300"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="ease-in duration-200"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <div className="fixed inset-0 bg-black/30 backdrop-blur-sm" />
          </Transition.Child>

          <div className="fixed inset-0 overflow-y-auto">
            <div className="flex min-h-full items-center justify-center p-4 text-center">
              <Transition.Child
                as={Fragment}
                enter="ease-out duration-300"
                enterFrom="opacity-0 scale-95"
                enterTo="opacity-100 scale-100"
                leave="ease-in duration-200"
                leaveFrom="opacity-100 scale-100"
                leaveTo="opacity-0 scale-95"
              >
                <Dialog.Panel className="w-full max-w-lg transform overflow-hidden rounded-xl bg-white dark:bg-zinc-800 text-left align-middle shadow-xl transition-all">
                  {dialogData?.universe?.thumbnail && (
                    <div className="relative h-32 bg-gradient-to-r from-blue-500 to-purple-600">
                      <img
                        src={dialogData.universe.thumbnail}
                        alt="Game thumbnail"
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 bg-black bg-opacity-20"></div>
                    </div>
                  )}

                  <div className="p-6 border-b border-zinc-200 dark:border-zinc-700">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="bg-primary/10 p-2 rounded-lg">
                        <IconClock className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <Dialog.Title
                          as="h3"
                          className="text-xl font-semibold text-zinc-900 dark:text-white"
                        >
                          {dialogData?.data?.sessionMessage ||
                            dialogData?.universe?.name ||
                            "Unknown Game"}
                        </Dialog.Title>
                        <p className="text-sm text-zinc-500 dark:text-zinc-400">
                          Activity Session Details
                        </p>
                      </div>
                    </div>
                    {concurrentUsers.length > 0 && (
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                          Played with:
                        </span>
                        <div className="flex flex-wrap gap-2">
                          {concurrentUsers.map((user: any) => (
                            <div
                              key={user.sessionId}
                              className={`w-8 h-8 rounded-full overflow-hidden ring-2 ring-white dark:ring-zinc-800 ${getRandomBg(
                                user.userId
                              )}`}
                              title={user.username}
                            >
                              <img
                                src={user.picture || "/default-avatar.jpg"}
                                alt={user.username}
                                className="w-full h-full object-cover"
                              />
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="p-6">
                    {loading ? (
                      <div className="flex items-center justify-center h-32">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 gap-4">
                        <div className="bg-zinc-50 dark:bg-zinc-700/50 rounded-lg p-4 text-center">
                          <div className="text-2xl font-bold text-zinc-900 dark:text-white mb-1">
                            {(() => {
                              const duration = moment.duration(
                                moment(dialogData.data?.endTime).diff(
                                  moment(dialogData.data?.startTime)
                                )
                              );
                              const minutes = Math.floor(duration.asMinutes());
                              return `${minutes} ${
                                minutes === 1 ? "minute" : "minutes"
                              }`;
                            })()}
                          </div>
                          <div className="text-sm text-zinc-600 dark:text-zinc-400">
                            Duration
                          </div>
                        </div>
                        <div
                          className={`grid ${
                            idleTimeEnabled ? "grid-cols-2" : "grid-cols-1"
                          } gap-4`}
                        >
                          {idleTimeEnabled && (
                            <div className="bg-zinc-50 dark:bg-zinc-700/50 rounded-lg p-4 text-center">
                              <div className="text-xl font-semibold text-zinc-900 dark:text-white mb-1">
                                {dialogData.data?.idleTime || 0}
                              </div>
                              <div className="text-sm text-zinc-600 dark:text-zinc-400">
                                Idle{" "}
                                {(dialogData.data?.idleTime || 0) === 1
                                  ? "minute"
                                  : "minutes"}
                              </div>
                            </div>
                          )}
                          <div className="bg-zinc-50 dark:bg-zinc-700/50 rounded-lg p-4 text-center">
                            <div className="text-xl font-semibold text-zinc-900 dark:text-white mb-1">
                              {dialogData.data?.messages || 0}
                            </div>
                            <div className="text-sm text-zinc-600 dark:text-zinc-400">
                              {(dialogData.data?.messages || 0) === 1
                                ? "Message"
                                : "Messages"}
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                    <div className="mt-6">
                      <button
                        type="button"
                        className="w-full justify-center rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90 transition-colors"
                        onClick={() => setIsOpen(false)}
                      >
                        Close
                      </button>
                    </div>
                  </div>
                </Dialog.Panel>
              </Transition.Child>
            </div>
          </div>
        </Dialog>
      </Transition>
    </div>
  );
}

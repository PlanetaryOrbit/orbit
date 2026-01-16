import type { pageWithLayout } from "@/layoutTypes";
import { loginState, workspacestate } from "@/state";
import Button from "@/components/button";
import Workspace from "@/layouts/workspace";
import {
  IconChevronRight,
  IconChevronLeft,
  IconCalendarEvent,
  IconPlus,
  IconTrash,
  IconArrowLeft,
  IconEdit,
  IconUsers,
  IconClock,
  IconUserCircle,
  IconX,
} from "@tabler/icons-react";
import prisma, { Session, user, SessionType } from "@/utils/database";
import { useRecoilState } from "recoil";
import { GetServerSideProps } from "next";
import { useRouter } from "next/router";
import randomText from "@/utils/randomText";
import { useState, useMemo, useEffect, Fragment } from "react";
import { useSessionColors } from "@/hooks/useSessionColors";
import axios from "axios";
import { withPermissionCheckSsr } from "@/utils/permissionsManager";
import toast, { Toaster } from "react-hot-toast";
import SessionTemplate from "@/components/sessioncard";
import PatternEditDialog from "@/components/sessionpatterns";
import { canCreateAnySession, canAddNotes, canManageSession } from "@/utils/sessionPermissions";
import { Dialog, Transition } from "@headlessui/react";
import { getConfig } from "@/utils/configEngine";

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

export const getServerSideProps = withPermissionCheckSsr(
  async ({ query, req }) => {
    const currentDate = new Date();
    const startOfToday = new Date(currentDate);
    startOfToday.setHours(0, 0, 0, 0);
    const endOfToday = new Date(currentDate);
    endOfToday.setHours(23, 59, 59, 999);
    const oneHourAgo = new Date();
    oneHourAgo.setHours(oneHourAgo.getHours() - 1);

    const allSessions = await prisma.session.findMany({
      where: {
        sessionType: {
          workspaceGroupId: parseInt(query.id as string),
        },
        date: {
          gte: oneHourAgo < startOfToday ? startOfToday : oneHourAgo,
          lte: endOfToday,
        },
      },
      include: {
        owner: true,
        sessionType: true,
        users: {
          include: {
            user: true,
          },
        },
      },
      orderBy: {
        date: "asc",
      },
    });

    let filteredSessions = allSessions;
    let isAdmin = false;
    if (req.session?.userid) {
      const userId = BigInt(req.session.userid);
      const user = await prisma.user.findFirst({
        where: { userid: userId },
        include: {
          roles: {
            where: { workspaceGroupId: parseInt(query.id as string) },
          },
          workspaceMemberships: {
            where: { workspaceGroupId: parseInt(query.id as string) },
          },
        },
      });

      const membership = user?.workspaceMemberships?.[0];
      isAdmin = membership?.isAdmin || false;

      if (user && user.roles?.[0] && !isAdmin) {
        const role = user.roles[0];
        const sessionTypes = ["shift", "training", "event", "other"];
        const visibleTypes = sessionTypes.filter(type => 
          role.permissions.includes(`sessions_${type}_see`)
        );
        
        if (visibleTypes.length > 0) {
          filteredSessions = allSessions.filter((session) =>
            visibleTypes.includes(session.type || "other")
          );
        } else {
          filteredSessions = [];
        }
      }
    }

    let userSessionMetrics = null;
    if (req.session?.userid) {
      const userId = BigInt(req.session.userid);
      const lastReset = await prisma.activityReset.findFirst({
        where: {
          workspaceGroupId: parseInt(query.id as string),
        },
        orderBy: {
          resetAt: "desc",
        },
      });

      const startDate = lastReset?.resetAt || new Date("2025-01-01");
      const ownedSessions = await prisma.session.findMany({
        where: {
          ownerId: userId,
          sessionType: {
            workspaceGroupId: parseInt(query.id as string),
          },
          date: {
            gte: startDate,
            lte: currentDate,
          },
          archived: { not: true },
        },
      });

      const allSessionParticipations = await prisma.sessionUser.findMany({
        where: {
          userid: userId,
          session: {
            sessionType: {
              workspaceGroupId: parseInt(query.id as string),
            },
            date: {
              gte: startDate,
              lte: currentDate,
            },
            archived: { not: true },
          },
          archived: { not: true },
        },
        include: {
          session: {
            select: {
              id: true,
              sessionType: {
                select: {
                  slots: true,
                  name: true,
                },
              },
            },
          },
        },
      });

      const roleBasedHostedSessions = allSessionParticipations.filter(
        (participation) => {
          const slots = participation.session.sessionType.slots as any[];
          const slotIndex = participation.slot;
          const slotName = slots[slotIndex]?.name || "";
          return (
            participation.roleID.toLowerCase().includes("host") ||
            participation.roleID.toLowerCase().includes("co-host") ||
            slotName.toLowerCase().includes("host") ||
            slotName.toLowerCase().includes("co-host")
          );
        }
      ).length;

      const sessionsHosted = ownedSessions.length + roleBasedHostedSessions;
      const ownedSessionIds = new Set(ownedSessions.map((s) => s.id));
      const sessionsAttended = allSessionParticipations.filter(
        (participation) => {
          const slots = participation.session.sessionType.slots as any[];
          const slotIndex = participation.slot;
          const slotName = slots[slotIndex]?.name || "";
          const isHosting =
            participation.roleID.toLowerCase().includes("host") ||
            participation.roleID.toLowerCase().includes("co-host") ||
            slotName.toLowerCase().includes("host") ||
            slotName.toLowerCase().includes("co-host");

          return !isHosting && !ownedSessionIds.has(participation.sessionid);
        }
      ).length;

      userSessionMetrics = {
        sessionsHosted,
        sessionsAttended,
      };
    }

    return {
      props: {
        allSessions: JSON.parse(
          JSON.stringify(filteredSessions, (key, value) =>
            typeof value === "bigint" ? value.toString() : value
          )
        ) as typeof allSessions,
        userSessionMetrics,
      },
    };
  }
);

const getMonday = (date: Date): Date => {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  d.setHours(0, 0, 0, 0);
  return d;
};

const getWeekDates = (monday: Date): Date[] => {
  const dates = [];
  for (let i = 0; i < 7; i++) {
    const date = new Date(monday);
    date.setDate(monday.getDate() + i);
    dates.push(date);
  }
  return dates;
};

const WeeklyCalendar: React.FC<{
  currentWeek: Date;
  sessions: (Session & {
    owner: user;
    sessionType: SessionType;
    users?: ({
      user: user;
    } & {
      userid: bigint;
      sessionid: string;
      roleID: string;
      slot: number;
    })[];
  })[];
  canManage?: boolean;
  onEditSession?: (sessionId: string) => void;
  onSessionClick?: (session: any) => void;
  workspaceId?: string | number;
  onWeekChange?: (newWeek: Date) => void;
  canCreateSession?: boolean;
  onCreateSession?: () => void;
  selectedDateProp?: Date;
  onSelectedDateChange?: (d: Date) => void;
  statues?: Map<string, string>;
}> = ({
  currentWeek,
  sessions,
  canManage,
  onEditSession,
  onSessionClick,
  workspaceId,
  onWeekChange,
  canCreateSession,
  onCreateSession,
  selectedDateProp,
  onSelectedDateChange,
  statues,
}) => {
  const { getSessionTypeColor, getRecurringColor, getTextColorForBackground } =
    useSessionColors(workspaceId);
  const [workspace] = useRecoilState(workspacestate);

  const [selectedDate, setSelectedDate] = useState<Date>(() => {
    const today = new Date();
    const monday = getMonday(currentWeek);
    const weekDates = getWeekDates(monday);
    const todayInWeek = weekDates.find(
      (date) => date.toDateString() === today.toDateString()
    );

    return selectedDateProp || todayInWeek || weekDates[0];
  });

  useEffect(() => {
    if (selectedDateProp) {
      setSelectedDate(new Date(selectedDateProp));
    }
  }, [selectedDateProp]);

  const sessionsByDate = sessions.reduce(
    (acc: { [key: string]: any[] }, session) => {
      const sessionDate = new Date(session.date);
      const localDateKey = sessionDate.toLocaleDateString();
      if (!acc[localDateKey]) {
        acc[localDateKey] = [];
      }
      acc[localDateKey].push(session);
      return acc;
    },
    {}
  );

  const selectedDateSessions =
    sessionsByDate[selectedDate.toLocaleDateString()] || [];
  useEffect(() => {
    const newWeekDates = getWeekDates(getMonday(currentWeek));
    const today = new Date();
    const todayInNewWeek = newWeekDates.find(
      (date) => date.toDateString() === today.toDateString()
    );

    if (selectedDateProp) {
      return;
    }

    if (todayInNewWeek) {
      setSelectedDate(todayInNewWeek);
      onSelectedDateChange?.(todayInNewWeek);
    } else {
      setSelectedDate(newWeekDates[0]);
      onSelectedDateChange?.(newWeekDates[0]);
    }
  }, [currentWeek]);

  return (
    <div className="bg-white dark:bg-zinc-800 rounded-xl shadow-sm overflow-hidden">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-4 border-b border-zinc-200 dark:border-zinc-700 gap-3">
        <div className="flex items-center justify-center gap-2">
          <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300 min-w-[120px] text-center">
            {(() => {
              const monday = getMonday(currentWeek);
              const sunday = new Date(monday);
              sunday.setDate(monday.getDate() + 6);
              return `${monday.toLocaleDateString("en-US", {
                month: "long",
                year: "numeric",
              })}`;
            })()}
          </span>
        </div>

        <div className="flex items-center justify-center gap-2">
          <button
            onClick={() => {
              const today = new Date();
              onWeekChange?.(today);
              setSelectedDate(today);
              onSelectedDateChange?.(today);
            }}
            className="px-3 py-1 text-xs font-medium bg-primary/10 text-primary hover:bg-primary/20 rounded-md transition-colors"
          >
            Today
          </button>
        </div>
      </div>

      <div className="p-4">
        {selectedDateSessions.length > 0 ? (
          <div className="relative">
            <div className="h-64 overflow-y-auto space-y-3 pr-2">
              {selectedDateSessions
                .sort(
                  (a, b) =>
                    new Date(a.date).getTime() - new Date(b.date).getTime()
                )
                .map((session: any) => {
                  const isRecurring = session.scheduleId !== null;
                  const now = new Date();
                  const sessionStart = new Date(session.date);
                  const sessionDuration = session.duration || 30;
                  const sessionEnd = new Date(
                    sessionStart.getTime() + sessionDuration * 60 * 1000
                  );
                  const isActive = now >= sessionStart && now <= sessionEnd;
                  const isConcluded = now > sessionEnd;
                  const coHost = session.users?.find((user: any) => {
                    if (user.roleID?.toLowerCase().includes("co-host"))
                      return true;
                    const slots = session.sessionType?.slots || [];
                    const userSlot = slots[user.slot];
                    if (userSlot?.name?.toLowerCase().includes("co-host"))
                      return true;
                    return false;
                  });

                  return (
                    <div
                      key={session.id}
                      className={`rounded-xl p-4 cursor-pointer transition-all group transform hover:-translate-y-0.5 shadow-sm border min-w-[260px] h-[110px] ${
                        isActive
                          ? "border-emerald-200 dark:border-emerald-600/50"
                          : "bg-white border border-zinc-200 dark:bg-zinc-900/30 dark:border-zinc-800/60"
                      } backdrop-blur-sm`}
                      onClick={() => onSessionClick?.(session)}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between w-full">
                            <h4 className="flex-1 min-w-0 font-medium text-zinc-900 dark:text-white truncate mb-0">
                              {session.name || session.sessionType.name}
                            </h4>

                            <div className="flex items-center gap-1 ml-2 z-10 flex-shrink-0 relative left-2 group-hover:left-0 transition-all">
                              {session.owner && (
                                <div
                                  className={`w-8 h-8 rounded-full flex items-center justify-center ${getRandomBg(
                                    session.owner.userid.toString()
                                  )}`}
                                >
                                  <img
                                    src={session.owner.picture}
                                    className="w-7 h-7 rounded-full object-cover border-2 border-white dark:border-zinc-800"
                                    onError={(e) => {
                                      e.currentTarget.src =
                                        "/default-avatar.jpg";
                                    }}
                                  />
                                </div>
                              )}

                              {coHost && (
                                <div
                                  className={`w-8 h-8 rounded-full flex items-center justify-center ${getRandomBg(
                                    coHost.user.userid.toString()
                                  )} ${session.owner ? "-ml-2" : ""}`}
                                >
                                  <img
                                    src={coHost.user.picture}
                                    className="w-7 h-7 rounded-full object-cover border-2 border-white dark:border-zinc-800"
                                    onError={(e) => {
                                      e.currentTarget.src =
                                        "/default-avatar.jpg";
                                    }}
                                  />
                                </div>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center gap-2 mb-2">
                            {isActive && (
                              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200 animate-pulse">
                                • LIVE
                              </span>
                            )}
                            {session.type && (
                              <span
                                className={`${getSessionTypeColor(
                                  session.type
                                )} ${getTextColorForBackground(
                                  getSessionTypeColor(session.type)
                                )} px-2 py-1 rounded text-xs font-medium`}
                              >
                                {session.type.charAt(0).toUpperCase() +
                                  session.type.slice(1)}
                              </span>
                            )}
                            {isConcluded && (
                              <span className="bg-zinc-100 text-zinc-600 dark:bg-zinc-700 dark:text-zinc-400 px-2 py-1 rounded text-xs font-medium">
                                Concluded
                              </span>
                            )}
                            {!isConcluded && statues && statues.has(session.id) && statues.get(session.id) !== "Open" && (
                              <span className="bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 px-2 py-1 rounded text-xs font-medium">
                                {statues.get(session.id)}
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-4 text-sm text-zinc-600 dark:text-zinc-400">
                            <div className="flex items-center gap-1">
                              <IconClock className="w-4 h-4" />
                              {new Date(session.date).toLocaleTimeString(
                                undefined,
                                {
                                  hour: "2-digit",
                                  minute: "2-digit",
                                  hour12: true,
                                }
                              )}
                            </div>
                            <div className="flex items-center gap-1">
                              <IconUserCircle className="w-4 h-4" />
                              {session.owner?.username || "Unclaimed"}
                            </div>
                          </div>
                        </div>

                        <div className="relative">
                          {canManageSession(workspace?.yourPermission || [], session.type) && onEditSession && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                onEditSession(session.id);
                              }}
                              className="absolute -top-2 -right-2 p-1.5 bg-zinc-900/60 text-zinc-200 hover:text-white transition-colors opacity-0 group-hover:opacity-100 rounded-full shadow-sm border border-zinc-800 z-20"
                              title="Edit session"
                            >
                              <IconEdit className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
            </div>
            <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-20 bg-gradient-to-t from-zinc-900 to-transparent" />
          </div>
        ) : (
          <div className="h-64 flex items-center justify-center">
            <div className="text-center">
              <div className="mx-auto w-12 h-12 bg-zinc-100 dark:bg-zinc-700 rounded-full flex items-center justify-center mb-4">
                <IconCalendarEvent className="w-6 h-6 text-zinc-400" />
              </div>
              <h3 className="text-sm font-medium text-zinc-900 dark:text-white mb-1">
                No Sessions Scheduled
              </h3>
              <p className="text-sm text-zinc-500 dark:text-zinc-400">
                There are no sessions scheduled for this date
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

type pageProps = {
  allSessions: (Session & {
    owner: user;
    sessionType: SessionType;
    users: ({
      user: user;
    } & {
      userid: bigint;
      sessionid: string;
      roleID: string;
      slot: number;
    })[];
  })[];
  userSessionMetrics: {
    sessionsHosted: number;
    sessionsAttended: number;
  } | null;
};

const Home: pageWithLayout<pageProps> = (props) => {
  const [login, setLogin] = useRecoilState(loginState);
  const [workspace, setWorkspace] = useRecoilState(workspacestate);
  const [currentWeek, setCurrentWeek] = useState<Date>(new Date());
  const [allSessions, setAllSessions] = useState<any[]>(props.allSessions);
  const [selectedDate, setSelectedDate] = useState<Date>(() => {
    const today = new Date();
    const monday = getMonday(currentWeek);
    const weekDates = getWeekDates(monday);
    const todayInWeek = weekDates.find(
      (date) => date.toDateString() === today.toDateString()
    );

    return todayInWeek || weekDates[0];
  });
  const [loading, setLoading] = useState(false);
  const text = useMemo(() => randomText(login.displayname), []);
  const [statues, setStatues] = useState(new Map<string, string>());
  const [selectedSession, setSelectedSession] = useState<any>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [workspaceMembers, setWorkspaceMembers] = useState<any[]>([]);
  const [isPatternEditDialogOpen, setIsPatternEditDialogOpen] = useState(false);
  const [sessionToEdit, setSessionToEdit] = useState<any>(null);
  const [showHistory, setShowHistory] = useState(false);
  const [hasInitialLoad, setHasInitialLoad] = useState(false);
  const router = useRouter();
  const workspaceIdForColors = Array.isArray(router.query.id)
    ? router.query.id[0]
    : router.query.id;
  const {
    sessionColors,
    isLoading: colorsLoading,
    getSessionTypeColor,
    getTextColorForBackground,
  } = useSessionColors(workspaceIdForColors);
  const { userSessionMetrics } = props;



  const monday = getMonday(currentWeek);
  const weekDates = getWeekDates(monday);
  const dayNamesShort = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const isTodaySelected =
    selectedDate.toDateString() === new Date().toDateString();

  const selectedDateSessions = allSessions
    .filter(
      (s: any) =>
        new Date(s.date).toDateString() === selectedDate.toDateString()
    )
    .sort(
      (a: any, b: any) =>
        new Date(a.date).getTime() - new Date(b.date).getTime()
    );

  const handleEditSession = async (sessionId: string) => {
    const session = allSessions.find(s => s.id === sessionId);
    
    if (session?.scheduleId) {
      setSessionToEdit(session);
      setIsPatternEditDialogOpen(true);
    } else {
      router.push(`/workspace/${router.query.id}/sessions/edit/${sessionId}`);
    }
  };

  const handlePatternEditConfirm = (scope: "single" | "future" | "all") => {
    if (!sessionToEdit) return;
    router.push({
      pathname: `/workspace/${router.query.id}/sessions/edit/${sessionToEdit.id}`,
      query: { scope },
    });
  };

  const handleSessionClick = (session: any) => {
    setSelectedSession(session);
    setIsModalOpen(true);
  };

  const handleDeleteSession = async (sessionId: string, deleteAll = false) => {
    try {
      await axios.delete(
        `/api/workspace/${router.query.id}/sessions/${sessionId}/delete`,
        {
          data: { deleteAll },
        }
      );

      if (deleteAll) {
        const session = allSessions.find((s) => s.id === sessionId);
        if (session?.scheduleId) {
          toast.success("All sessions in series deleted successfully");
          setAllSessions(
            allSessions.filter((s) => s.scheduleId !== session.scheduleId)
          );
        }
      } else {
        toast.success("Session deleted successfully");
        setAllSessions(allSessions.filter((s) => s.id !== sessionId));
      }
      await loadSessionsForDate(selectedDate);
    } catch (error: any) {
      console.error("Delete session error:", error);
      toast.error(error?.response?.data?.error || "Failed to delete session");
    }
  };

  const loadSessionsForDate = async (date: Date, includeHistory = showHistory) => {
    setLoading(true);
    try {
      const startOfDay = new Date(date);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(date);
      endOfDay.setHours(23, 59, 59, 999);
      const startISO = startOfDay.toISOString();
      const endISO = endOfDay.toISOString();
      const endpoint = includeHistory ? 'all' : 'upcoming';
      const response = await axios.get(
        `/api/workspace/${router.query.id}/sessions/${endpoint}?startDate=${startISO}&endDate=${endISO}`
      );
      const sessions = Array.isArray(response.data) ? response.data : [];
      setAllSessions((prevSessions) => {
        const otherDateSessions = prevSessions.filter(
          (s: any) => new Date(s.date).toDateString() !== date.toDateString()
        );
        return [...otherDateSessions, ...sessions];
      });
      
      return sessions;
    } catch (error) {
      console.error("Failed to load sessions:", error);
      return null;
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const today = new Date().toDateString();
    if (!hasInitialLoad && selectedDate.toDateString() === today && props.allSessions.length > 0) {
      setHasInitialLoad(true);
      return;
    }
    
    if (router.query.id && selectedDate && !loading) {
      loadSessionsForDate(selectedDate);
      setHasInitialLoad(true);
    }
  }, [router.query.id, selectedDate, showHistory]);
  
  useEffect(() => {
    const newWeekDates = getWeekDates(getMonday(currentWeek));
    const today = new Date();
    const todayInNewWeek = newWeekDates.find(
      (date) => date.toDateString() === today.toDateString()
    );

    if (todayInNewWeek && todayInNewWeek.toDateString() !== selectedDate.toDateString()) {
      setSelectedDate(todayInNewWeek);
    } else if (!todayInNewWeek && newWeekDates[0].toDateString() !== selectedDate.toDateString()) {
      setSelectedDate(newWeekDates[0]);
    }
  }, [currentWeek]);
  
  useEffect(() => {
    if (router.query.refresh === "true" && selectedDate) {
      loadSessionsForDate(selectedDate);
      router.replace(`/workspace/${router.query.id}/sessions`, undefined, {
        shallow: true,
      });
    }
  }, [router.query.refresh]);

  const refreshAllSessions = () => {
    loadSessionsForDate(selectedDate);
  };

  const loadWorkspaceMembers = async () => {
    try {
      const response = await axios.get(
        `/api/workspace/${router.query.id}/users`
      );
      setWorkspaceMembers(response.data);
    } catch (error) {
      console.error("Failed to load workspace members:", error);
    }
  };

  useEffect(() => {
    if (router.query.id) {
      loadWorkspaceMembers();
    }
  }, [router.query.id, workspace.yourPermission]);

  const endSession = async (id: string) => {
    const axiosPromise = axios.delete(
      `/api/workspace/${router.query.id}/sessions/manage/${id}/end`,
      {}
    );

    toast.promise(axiosPromise, {
      loading: "Ending session...",
      success: () => {
        loadSessionsForDate(selectedDate);
        return "Session ended successfully";
      },
      error: "Failed to end session",
    });
  };

  useEffect(() => {
    const getAllStatues = async () => {
      const newStatues = new Map<string, string>();
      for (const session of allSessions) {
        const sessionStart = new Date(session.date).getTime();
        const sessionDuration = session.duration || 30;
        const sessionEnd = sessionStart + (sessionDuration * 60 * 1000);
        const now = new Date().getTime();
        const minutesFromStart = (now - sessionStart) / 1000 / 60;
        if (now > sessionEnd) {
          newStatues.set(session.id, "Concluded");
        } else {
          let foundStatus = false;
          for (const e of session.sessionType.statues.sort((a: any, b: any) => {
            const object = JSON.parse(JSON.stringify(a));
            const object2 = JSON.parse(JSON.stringify(b));
            return object2.timeAfter - object.timeAfter;
          })) {
            const slot = JSON.parse(JSON.stringify(e));
            if (minutesFromStart >= slot.timeAfter) {
              newStatues.set(session.id, slot.name);
              foundStatus = true;
              break;
            }
          }
          if (!foundStatus) {
            newStatues.set(session.id, "Open");
          }
        }
      }
      setStatues(newStatues);
    };

    getAllStatues();
    const interval = setInterval(getAllStatues, 10000);

    return () => clearInterval(interval);
  }, [allSessions]);

  return (
    <div className="pagePadding">
      <Toaster position="bottom-center" />
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <div>
            <h1 className="text-2xl font-medium text-zinc-900 dark:text-white">
              Sessions
            </h1>
            <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
              Plan, schedule, and manage sessions for your staff members
            </p>
          </div>
        </div>

        <div className="mb-6">
          <div className="flex items-start justify-between gap-6">
            <div className="flex-1 flex flex-col items-center">
              <div className="flex items-center justify-center gap-3">
                <div className="w-full max-w-4xl mx-auto flex items-center gap-3">
                  <button
                    onClick={() => {
                      const previousWeek = new Date(currentWeek);
                      previousWeek.setDate(currentWeek.getDate() - 7);
                      setCurrentWeek(previousWeek);
                    }}
                    className="p-1.5 sm:p-2 rounded-md bg-white dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-800/40 text-zinc-700 dark:text-zinc-200 transition-colors"
                    title="Previous week"
                  >
                    <IconChevronLeft className="w-4 h-4" />
                  </button>

                  <div className="flex-1">
                    <div className="flex flex-wrap items-center justify-center gap-2 py-1 px-2">
                      {weekDates.map((date, index) => {
                        const isToday =
                          date.toDateString() === new Date().toDateString();
                        const isSelected =
                          date.toDateString() === selectedDate.toDateString();

                        return (
                          <button
                            key={date.toDateString()}
                            onClick={() => setSelectedDate(date)}
                            className={`flex flex-col items-center justify-center min-w-[44px] sm:min-w-[56px] py-1.5 sm:py-2 px-2 sm:px-3 rounded-xl transition-all transform hover:scale-105 focus:outline-none border ${
                              isSelected
                                ? "bg-primary text-white border-primary shadow-lg"
                                : isToday
                                ? "bg-zinc-800 text-white border-zinc-700"
                                : "bg-white dark:bg-zinc-800/50 text-zinc-900 dark:text-zinc-200 border border-zinc-200 dark:border-zinc-800/40"
                            }`}
                          >
                            <span className="text-[10px] uppercase tracking-wide opacity-80">
                              {dayNamesShort[index]}
                            </span>
                            <span
                              className={`mt-1 text-xs sm:text-sm font-semibold ${
                                isSelected
                                  ? "text-white"
                                  : "text-zinc-900 dark:text-zinc-200"
                              }`}
                            >
                              {date.getDate()}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      const nextWeek = new Date(currentWeek);
                      nextWeek.setDate(currentWeek.getDate() + 7);
                      setCurrentWeek(nextWeek);
                    }}
                    className="p-1.5 sm:p-2 rounded-md bg-white dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-800/40 text-zinc-700 dark:text-zinc-200 transition-colors"
                    title="Next week"
                  >
                    <IconChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
            <div className="flex-shrink-0" />
          </div>
        </div>

        <div className="mb-8">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="text-2xl sm:text-3xl font-semibold text-zinc-900 dark:text-white text-left">
                {isTodaySelected
                  ? "Today"
                  : selectedDate.toLocaleDateString("en-US", {
                      weekday: "long",
                      month: "long",
                      day: "numeric",
                    })}
              </div>
              <button
                onClick={() => setShowHistory(!showHistory)}
                className={`inline-flex items-center justify-center px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                  showHistory
                    ? "bg-primary text-white"
                    : "bg-zinc-100 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-600"
                }`}
                title={showHistory ? "Showing all sessions" : "Showing recent and upcoming sessions"}
              >
                {showHistory ? "Hide History" : "Show History"}
              </button>
            </div>

            <div>
              {canCreateAnySession(workspace.yourPermission) && (
                <button
                  onClick={() =>
                    router.push(`/workspace/${router.query.id}/sessions/new`)
                  }
                  className="inline-flex items-center justify-center px-4 py-2 shadow-sm text-sm font-medium rounded-md text-white bg-primary hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary transition-colors"
                >
                  <IconPlus className="w-4 h-4 sm:mr-2" />
                  <span className="hidden sm:inline">New Session</span>
                  <span className="sm:hidden">New</span>
                </button>
              )}
            </div>
          </div>

          <div className="flex flex-wrap -mx-2 gap-y-4">
            {selectedDateSessions.length > 0 ? (
              selectedDateSessions.map((session: any) => {
                const isRecurring = session.scheduleId !== null;
                const now = new Date();
                const sessionStart = new Date(session.date);
                const sessionDuration = session.duration || 30;
                const sessionEnd = new Date(
                  sessionStart.getTime() + sessionDuration * 60 * 1000
                );
                const isActive = now >= sessionStart && now <= sessionEnd;
                const isConcluded = now > sessionEnd;
                const coHost = session.users?.find((user: any) => {
                  if (user.roleID?.toLowerCase().includes("co-host"))
                    return true;
                  const slots = session.sessionType?.slots || [];
                  const userSlot = slots[user.slot];
                  if (userSlot?.name?.toLowerCase().includes("co-host"))
                    return true;
                  return false;
                });

                return (
                  <div className="px-2" key={session.id}>
                    <div
                      className={`rounded-xl p-4 cursor-pointer transition-all group transform hover:-translate-y-0.5 shadow-sm border w-[260px] h-[110px] flex flex-col overflow-hidden ${
                        isActive
                          ? "border-emerald-200 dark:border-emerald-600/50"
                          : "bg-white border border-zinc-200 dark:bg-zinc-800/50 dark:border-zinc-800/60"
                      } backdrop-blur-sm`}
                      onClick={() => handleSessionClick(session)}
                    >
                      <div className="flex items-start justify-between mb-auto overflow-hidden">
                        <div className="flex-1 min-w-0 overflow-hidden">
                          <div className="flex items-center justify-between w-full">
                            <h4 className="flex-1 min-w-0 font-medium text-zinc-900 dark:text-white truncate mb-0">
                              {session.name || session.sessionType.name}
                            </h4>
                          </div>

                          <div className="flex items-center gap-2 mb-2 min-h-[28px] flex-wrap">
                            {isActive && (
                              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200 animate-pulse flex-shrink-0">
                                • LIVE
                              </span>
                            )}
                            {session.type && (
                              <span
                                className={`${getSessionTypeColor(
                                  session.type
                                )} ${getTextColorForBackground(
                                  getSessionTypeColor(session.type)
                                )} px-2 py-1 rounded text-xs font-medium flex-shrink-0`}
                              >
                                {session.type.charAt(0).toUpperCase() +
                                  session.type.slice(1)}
                              </span>
                            )}
                            {isConcluded && (
                              <span className="bg-zinc-100 text-zinc-600 dark:bg-zinc-700 dark:text-zinc-400 px-2 py-1 rounded text-xs font-medium flex-shrink-0">
                                Concluded
                              </span>
                            )}
                            {!isConcluded && statues && statues.has(session.id) && statues.get(session.id) !== "Open" && (
                              <span className="bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 px-2 py-1 rounded text-xs font-medium flex-shrink-0">
                                {statues.get(session.id)}
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-3 text-sm text-zinc-600 dark:text-zinc-400 w-full">
                            <div className="flex items-center gap-1 flex-shrink-0">
                              <IconClock className="w-4 h-4" />
                              {new Date(session.date).toLocaleTimeString(
                                undefined,
                                {
                                  hour: "2-digit",
                                  minute: "2-digit",
                                  hour12: true,
                                }
                              )}
                            </div>
                            <div className="flex items-center gap-1 min-w-0">
                              <IconUserCircle className="w-4 h-4 flex-shrink-0" />
                              <span className="truncate">
                                {session.owner?.username || "Unclaimed"}
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="relative w-0 h-0">
                          <div className="absolute top-0 right-0 flex items-center gap-1 z-10">
                            {session.owner && (
                              <div
                                className={`w-8 h-8 min-w-[2rem] rounded-full flex items-center justify-center ring-2 ring-white dark:ring-zinc-800 ${getRandomBg(
                                  session.owner.userid.toString()
                                )}`}
                              >
                                <img
                                  src={
                                    session.owner.picture ||
                                    "/default-avatar.jpg"
                                  }
                                  className="w-7 h-7 rounded-full object-cover"
                                  onError={(e) => {
                                    e.currentTarget.src =
                                      "/default-avatar.jpg";
                                  }}
                                />
                              </div>
                            )}

                            {coHost && (
                              <div
                                className={`w-8 h-8 min-w-[2rem] rounded-full flex items-center justify-center ring-2 ring-white dark:ring-zinc-800 ${getRandomBg(
                                  coHost.user.userid.toString()
                                )} ${session.owner ? "-ml-2" : ""}`}
                              >
                                <img
                                  src={
                                    coHost.user.picture ||
                                    "/default-avatar.jpg"
                                  }
                                  className="w-7 h-7 rounded-full object-cover"
                                  onError={(e) => {
                                    e.currentTarget.src =
                                      "/default-avatar.jpg";
                                  }}
                                />
                              </div>
                            )}
                          </div>
                          {workspace.yourPermission &&
                            canManageSession(workspace.yourPermission, session.type) && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleEditSession(session.id);
                                }}
                                className="absolute -top-2 -right-2 p-1.5 bg-zinc-900/60 text-zinc-200 hover:text-white transition-colors opacity-0 group-hover:opacity-100 rounded-full shadow-sm border border-zinc-800 z-20"
                                title="Edit session"
                              >
                                <IconEdit className="w-3.5 h-3.5" />
                              </button>
                            )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="w-full h-40 flex items-center justify-center">
                <div className="text-center">
                  <div className="mx-auto w-12 h-12 bg-zinc-100 dark:bg-zinc-700 rounded-full flex items-center justify-center mb-4">
                    <IconCalendarEvent className="w-6 h-6 text-zinc-400" />
                  </div>
                  <h3 className="text-sm font-medium text-zinc-900 dark:text-white mb-1">
                    No Sessions Scheduled
                  </h3>
                  <p className="text-sm text-zinc-500 dark:text-zinc-400">
                    There are no sessions scheduled for this date
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {selectedSession && (
          <SessionTemplate
            session={selectedSession}
            isOpen={isModalOpen}
            onClose={() => {
              setIsModalOpen(false);
              setSelectedSession(null);
            }}
            onEdit={handleEditSession}
            onDelete={handleDeleteSession}
            onUpdate={async () => {
              const freshSessions = await loadSessionsForDate(selectedDate);
              if (freshSessions && selectedSession) {
                const updatedSession = freshSessions.find(
                  (s: any) => s.id === selectedSession.id
                );
                if (updatedSession) {
                  setSelectedSession(updatedSession);
                }
              }
            }}
            workspaceMembers={workspaceMembers}
            canManage={canManageSession(workspace.yourPermission || [], selectedSession?.type)}
            canAddNotes={canAddNotes(workspace.yourPermission || [], selectedSession?.type)}
            sessionColors={sessionColors}
            colorsReady={!colorsLoading}
          />
        )}



        {sessionToEdit && (
          <PatternEditDialog
            isOpen={isPatternEditDialogOpen}
            onClose={() => {
              setIsPatternEditDialogOpen(false);
              setSessionToEdit(null);
            }}
            onConfirm={handlePatternEditConfirm}
            session={sessionToEdit}
          />
        )}
      </div>
    </div>
  );
};

Home.layout = Workspace;

export default Home;

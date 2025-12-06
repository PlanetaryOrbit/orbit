import Activity from "@/components/profile/activity";
import Book from "@/components/profile/book";
import Notices from "@/components/profile/notices";
import { Toaster } from "react-hot-toast";
import { InformationPanel } from "@/components/profile/info";
import workspace from "@/layouts/workspace";
import { pageWithLayout } from "@/layoutTypes";
import { withPermissionCheckSsr } from "@/utils/permissionsManager";
import { withSessionSsr } from "@/lib/withSession";
import { loginState } from "@/state";
import { Tab } from "@headlessui/react";
import {
  getDisplayName,
  getUsername,
  getThumbnail,
} from "@/utils/userinfoEngine";
import { ActivitySession, Quota, ActivityAdjustment } from "@prisma/client";
import prisma from "@/utils/database";
import moment from "moment";
import { InferGetServerSidePropsType } from "next";
import { useRecoilState } from "recoil";
import {
  IconUserCircle,
  IconHistory,
  IconBell,
  IconBook,
  IconClipboard,
  IconChevronLeft,
  IconChevronRight,
  IconCalendar,
} from "@tabler/icons-react";
import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import axios from "axios";

export const getServerSideProps = withPermissionCheckSsr(
  async ({ query, req }) => {
    const currentUserId = req.session?.userid;
    if (!currentUserId) return { notFound: true };

    const currentUser = await prisma.user.findFirst({
      where: {
        userid: BigInt(currentUserId),
      },
      include: {
        roles: {
          where: {
            workspaceGroupId: parseInt(query.id as string),
          },
          include: {
            quotaRoles: {
              include: {
                quota: true,
              },
            },
          },
        },
      },
    });
    const hasManagePermission =
      currentUser?.roles?.some((role) =>
        role.permissions?.includes("manage_activity")
      ) ?? false;

    const hasManageMembersPermission =
      currentUser?.roles?.some((role) =>
        role.permissions?.includes("manage_members")
      ) ?? false;

    if (!hasManagePermission) {
      return { notFound: true };
    }

    const userTakingAction = await prisma.user.findFirst({
      where: {
        userid: BigInt(query.uid as string),
      },
      include: {
        roles: {
          where: {
            workspaceGroupId: parseInt(query.id as string),
          },
          orderBy: {
            isOwnerRole: "desc",
          },
          include: {
            quotaRoles: {
              include: {
                quota: true,
              },
            },
          },
        },
      },
    });

    if (!userTakingAction) return { notFound: true };

    const isAdmin = hasManagePermission;

    const currentDate = new Date();
    const lastReset = await prisma.activityReset.findFirst({
      where: {
        workspaceGroupId: parseInt(query.id as string),
      },
      orderBy: {
        resetAt: "desc",
      },
    });

    const startDate = lastReset?.resetAt || new Date("2025-01-01");

    const quotas = userTakingAction.roles
      .flatMap((role) => role.quotaRoles)
      .map((qr) => qr.quota);

    const noticesConfig = await prisma.config.findFirst({
      where: {
        workspaceGroupId: parseInt(query.id as string),
        key: "notices",
      },
    });

    let noticesEnabled = false;
    if (noticesConfig?.value) {
      let val = noticesConfig.value;
      if (typeof val === "string") {
        try {
          val = JSON.parse(val);
        } catch {
          val = {};
        }
      }
      noticesEnabled =
        typeof val === "object" && val !== null && "enabled" in val
          ? (val as { enabled?: boolean }).enabled ?? false
          : false;
    }

    const notices = await prisma.inactivityNotice.findMany({
      where: {
        userId: BigInt(query?.uid as string),
        workspaceGroupId: parseInt(query?.id as string),
      },
      orderBy: [{ startTime: "desc" }],
    });

    const sessions = await prisma.activitySession.findMany({
      where: {
        userId: BigInt(query?.uid as string),
        workspaceGroupId: parseInt(query.id as string),
        startTime: {
          gte: startDate,
          lte: currentDate,
        },
      },
      include: {
        user: {
          select: {
            picture: true,
          },
        },
      },
      orderBy: [{ active: "desc" }, { endTime: "desc" }, { startTime: "desc" }],
    });

    const adjustments = await prisma.activityAdjustment.findMany({
      where: {
        userId: BigInt(query?.uid as string),
        workspaceGroupId: parseInt(query?.id as string),
        createdAt: {
          gte: startDate,
          lte: currentDate,
        },
      },
      orderBy: { createdAt: "desc" },
      include: {
        actor: {
          select: { userid: true, username: true },
        },
      },
    });

    let timeSpent = 0;
    let totalIdleTime = 0;
    if (sessions.length) {
      const completedSessions = sessions.filter(
        (session) => !session.active && session.endTime
      );
      timeSpent = completedSessions.reduce((sum, session) => {
        const totalTime =
          (session.endTime?.getTime() ?? 0) - session.startTime.getTime();
        const idleTime = session.idleTime ? Number(session.idleTime) : 0; // Already in minutes from Roblox
        return sum + Math.max(0, totalTime - idleTime * 60000);
      }, 0);
      timeSpent = Math.round(timeSpent / 60000);
      totalIdleTime = sessions.reduce((sum, session) => {
        return sum + (session.idleTime ? Number(session.idleTime) : 0);
      }, 0);
    }
    const netAdjustment = adjustments.reduce((sum, a) => sum + a.minutes, 0);
    const displayTimeSpent = timeSpent + netAdjustment;

    const startOfWeek = moment().startOf("week").toDate();
    const endOfWeek = moment().endOf("week").toDate();

    const weeklySessions = await prisma.activitySession.findMany({
      where: {
        userId: BigInt(query?.uid as string),
        workspaceGroupId: parseInt(query.id as string),
        startTime: {
          lte: endOfWeek,
          gte: startOfWeek,
        },
      },
      orderBy: {
        startTime: "asc",
      },
    });

    const days: { day: number; ms: number[] }[] = Array.from(
      { length: 7 },
      (_, i) => ({
        day: i,
        ms: [],
      })
    );

    weeklySessions.forEach((session) => {
      const jsDay = session.startTime.getDay();
      const chartDay = jsDay === 0 ? 6 : jsDay - 1;
      let duration = 0;

      if (session.active && !session.endTime) {
        duration = Math.round(
          (new Date().getTime() - session.startTime.getTime()) / 60000
        );
      } else if (session.endTime) {
        duration = Math.round(
          (session.endTime.getTime() - session.startTime.getTime()) / 60000
        );
      }

      if (duration > 0) {
        days.find((d) => d.day === chartDay)?.ms.push(duration);
      }
    });

    const data: number[] = days.map((d) =>
      d.ms.reduce((sum, val) => sum + val, 0)
    );

    const ubook = await prisma.userBook.findMany({
      where: {
        userId: BigInt(query?.uid as string),
      },
      include: {
        admin: {
          select: {
            userid: true,
            username: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    const ownedSessions = await prisma.session.findMany({
      where: {
        ownerId: BigInt(query?.uid as string),
        sessionType: {
          workspaceGroupId: parseInt(query.id as string),
        },
        date: {
          gte: startDate,
          lte: currentDate,
        },
      },
    });

    const allSessionParticipations = await prisma.sessionUser.findMany({
      where: {
        userid: BigInt(query?.uid as string),
        session: {
          sessionType: {
            workspaceGroupId: parseInt(query.id as string),
          },
          date: {
            gte: startDate,
            lte: currentDate,
          },
        },
      },
      include: {
        session: {
          select: {
            id: true,
            date: true,
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
          participation.roleID.toLowerCase().includes("co-host") ||
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

        const isCoHost =
          participation.roleID.toLowerCase().includes("co-host") ||
          slotName.toLowerCase().includes("co-host");

        return !isCoHost && !ownedSessionIds.has(participation.sessionid);
      }
    ).length;

    const user = await prisma.user.findUnique({
      where: { userid: BigInt(query.uid as string) },
      select: {
        userid: true,
        username: true,
        registered: true,
        birthdayDay: true,
        birthdayMonth: true,
      },
    });

    const membership = await prisma.workspaceMember.findUnique({
      where: {
        workspaceGroupId_userId: {
          workspaceGroupId: parseInt(query.id as string),
          userId: BigInt(query.uid as string),
        },
      },
      select: { joinDate: true },
    });

    if (!user) {
      return { notFound: true };
    }

    return {
      props: {
        notices: JSON.parse(
          JSON.stringify(notices, (_k, v) =>
            typeof v === "bigint" ? v.toString() : v
          )
        ),
        timeSpent: displayTimeSpent,
        totalIdleTime: Math.round(totalIdleTime),
        timesPlayed: sessions.length,
        data,
        sessions: JSON.parse(
          JSON.stringify(sessions, (_k, v) =>
            typeof v === "bigint" ? v.toString() : v
          )
        ),
        adjustments: JSON.parse(
          JSON.stringify(adjustments, (_k, v) =>
            typeof v === "bigint" ? v.toString() : v
          )
        ),
        info: {
          username: await getUsername(Number(query?.uid as string)),
          displayName: await getDisplayName(Number(query?.uid as string)),
          avatar: getThumbnail(Number(query?.uid as string)),
        },
        isUser: (req as any)?.session?.userid === Number(query?.uid as string),
        isAdmin,
        sessionsHosted: sessionsHosted,
        sessionsAttended: sessionsAttended,
        quotas,
        userBook: JSON.parse(
          JSON.stringify(ubook, (_k, v) =>
            typeof v === "bigint" ? v.toString() : v
          )
        ),
        user: {
          ...JSON.parse(
            JSON.stringify(user, (_k, v) =>
              typeof v === "bigint" ? v.toString() : v
            )
          ),
          userid: user.userid.toString(),
          joinDate: membership?.joinDate
            ? membership.joinDate.toISOString()
            : null,
        },
        noticesEnabled,
        canManageMembers: hasManageMembersPermission,
      },
    };
  }
);

type pageProps = {
  notices: any;
  timeSpent: number;
  totalIdleTime: number;
  timesPlayed: number;
  data: number[];
  sessions: (ActivitySession & {
    user: {
      picture: string | null;
    };
  })[];
  adjustments: any[];
  info: {
    username: string;
    displayName: string;
    avatar: string;
  };
  userBook: any;
  quotas: Quota[];
  sessionsHosted: number;
  sessionsAttended: number;
  isUser: boolean;
  isAdmin: boolean;
  user: {
    userid: string;
    username: string;
    displayname: string;
    registered: boolean;
    birthdayDay: number;
    birthdayMonth: number;
    joinDate: string | null;
  };
  noticesEnabled: boolean;
  canManageMembers: boolean;
};
const Profile: pageWithLayout<pageProps> = ({
  notices,
  timeSpent,
  totalIdleTime,
  timesPlayed,
  data,
  sessions,
  adjustments,
  userBook: initialUserBook,
  isUser,
  info,
  sessionsHosted,
  sessionsAttended,
  quotas,
  user,
  isAdmin,
  noticesEnabled,
  canManageMembers,
}) => {
  const [login, setLogin] = useRecoilState(loginState);
  const [userBook, setUserBook] = useState(initialUserBook);
  const [selectedWeek, setSelectedWeek] = useState(0);
  const [historicalData, setHistoricalData] = useState<any>(null);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [availableHistory, setAvailableHistory] = useState<any[]>([]);
  const currentData = {
    timeSpent,
    timesPlayed,
    data,
    quotas,
    sessionsHosted,
    sessionsAttended,
    sessions,
    adjustments,
    messages: sessions.reduce(
      (acc, session) => acc + Number(session.messages || 0),
      0
    ),
    idleTime: Math.round(
      sessions.reduce((acc, session) => acc + Number(session.idleTime || 0), 0)
    ),
  };

  const router = useRouter();
  useEffect(() => {
    async function fetchAvailableHistory() {
      try {
        const response = await axios.get(
          `/api/workspace/${router.query.id}/activity/history/${router.query.uid}`
        );
        if (response.data.success && response.data.data.history) {
          const validHistory = response.data.data.history.filter(
            (h: any) =>
              h.activity.minutes > 0 ||
              h.activity.messages > 0 ||
              h.activity.sessionsHosted > 0 ||
              h.activity.sessionsAttended > 0
          );
          setAvailableHistory(validHistory);
        } else {
          setAvailableHistory([]);
        }
      } catch (error) {
        setAvailableHistory([]);
      }
    }

    if (router.query.id && router.query.uid) {
      fetchAvailableHistory();
    }
  }, [router.query.id, router.query.uid]);

  useEffect(() => {
    async function fetchHistoricalData() {
      if (selectedWeek === 0) {
        setHistoricalData(null);
        return;
      }

      if (selectedWeek > availableHistory.length) {
        return;
      }

      setLoadingHistory(true);
      try {
        const historyPeriod = availableHistory[selectedWeek - 1];
        if (historyPeriod) {
          console.log(
            "Fetching historical data for period:",
            historyPeriod.period
          );
          const response = await axios.get(
            `/api/workspace/${router.query.id}/activity/history/${router.query.uid}?periodEnd=${historyPeriod.period.end}`
          );
          console.log("Historical data response:", response.data);
          if (response.data.success) {
            console.log("Setting historical data:", response.data.data);
            console.log(
              "Activity minutes from API:",
              response.data.data.activity?.minutes
            );
            setHistoricalData(response.data.data);
          }
        }
      } catch (error) {
        console.error("Error fetching historical data:", error);
      } finally {
        setLoadingHistory(false);
      }
    }

    fetchHistoricalData();
  }, [selectedWeek, availableHistory, router.query.id, router.query.uid]);

  const getCurrentWeekLabel = () => {
    if (selectedWeek === 0) return "Current Week";
    if (selectedWeek === 1) return "Last Week";
    return `${selectedWeek} Weeks Ago`;
  };

  const canGoBack = selectedWeek < availableHistory.length;
  const canGoForward = selectedWeek > 0;

  const goToPreviousWeek = () => {
    if (canGoBack) {
      setSelectedWeek(selectedWeek + 1);
    }
  };

  const goToNextWeek = () => {
    if (canGoForward) {
      setSelectedWeek(selectedWeek - 1);
    }
  };

  const displayData =
    selectedWeek === 0
      ? currentData
      : historicalData
      ? {
          timeSpent: historicalData.activity.minutes,
          timesPlayed:
            historicalData.activity.totalSessions ||
            historicalData.activity.sessionsHosted +
              historicalData.activity.sessionsAttended,
          data: historicalData.chartData || [0, 0, 0, 0, 0, 0, 0],
          quotas: historicalData.activity.quotaProgress
            ? Object.values(historicalData.activity.quotaProgress).map(
                (qp: any) => ({
                  id: qp.id || qp.name || "",
                  name: qp.name || "",
                  type: qp.type || "",
                  value: qp.requirement || 0,
                  workspaceGroupId: parseInt(router.query.id as string),
                  currentValue: qp.value || 0,
                  percentage: qp.percentage || 0,
                })
              )
            : [],
          sessionsHosted: historicalData.activity.sessionsHosted,
          sessionsAttended: historicalData.activity.sessionsAttended,
          sessions: historicalData.sessions || [],
          adjustments: historicalData.adjustments || [],
          messages: historicalData.activity.messages || 0,
          idleTime: historicalData.activity.idleTime || 0,
        }
      : currentData;

  console.log("Display data for week", selectedWeek, ":", displayData);
  console.log("Historical data object:", historicalData);
  console.log("timeSpent value:", displayData.timeSpent);

  const refetchUserBook = async () => {
    try {
      const response = await fetch(
        `/api/workspace/${router.query.id}/userbook/${router.query.uid}`
      );
      const data = await response.json();
      setUserBook(data.userBook);
    } catch (error) {
      console.error("Error refetching userbook:", error);
    }
  };

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

  return (
    <div className="pagePadding">
      <Toaster position="bottom-center" />
      <div className="max-w-7xl mx-auto">
        <div className="bg-white dark:bg-zinc-800 rounded-xl p-6 shadow-sm mb-6">
          <div className="flex items-center gap-4">
            <div className="relative">
              <div
                className={`rounded-xl h-20 w-20 flex items-center justify-center ${getRandomBg(
                  user.userid
                )}`}
              >
                <img
                  src={info.avatar}
                  className="rounded-xl h-20 w-20 object-cover border-2 border-white"
                  alt={`${info.displayName}'s avatar`}
                  style={{ background: "transparent" }}
                />
              </div>
              <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-primary rounded-lg flex items-center justify-center">
                <IconUserCircle className="w-4 h-4 text-white" />
              </div>
            </div>
            <div>
              <h1 className="text-2xl font-medium text-zinc-900 dark:text-white">
                {info.displayName}
              </h1>
              <p className="text-sm text-zinc-500 dark:text-zinc-400">
                @{info.username}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-zinc-800 rounded-xl shadow-sm overflow-hidden">
          <Tab.Group>
            <Tab.List className="flex p-1 gap-1 bg-zinc-50 dark:bg-zinc-700 border-b dark:border-zinc-600">
              <Tab
                className={({ selected }) =>
                  `flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-lg transition-colors ${
                    selected
                      ? "bg-white dark:bg-zinc-800 text-primary shadow-sm"
                      : "text-zinc-600 dark:text-zinc-300 hover:bg-white/50 dark:hover:bg-zinc-700 hover:text-zinc-900 dark:hover:text-white"
                  }`
                }
              >
                <IconClipboard className="w-4 h-4" />
                Information
              </Tab>
              <Tab
                className={({ selected }) =>
                  `flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-lg transition-colors ${
                    selected
                      ? "bg-white dark:bg-zinc-800 text-primary shadow-sm"
                      : "text-zinc-600 dark:text-zinc-300 hover:bg-white/50 dark:hover:bg-zinc-700 hover:text-zinc-900 dark:hover:text-white"
                  }`
                }
              >
                <IconHistory className="w-4 h-4" />
                Activity
              </Tab>
              <Tab
                className={({ selected }) =>
                  `flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-lg transition-colors ${
                    selected
                      ? "bg-white dark:bg-zinc-800 text-primary shadow-sm"
                      : "text-zinc-600 dark:text-zinc-300 hover:bg-white/50 dark:hover:bg-zinc-700 hover:text-zinc-900 dark:hover:text-white"
                  }`
                }
              >
                <IconBook className="w-4 h-4" />
                Userbook
              </Tab>
              {noticesEnabled && (
                <Tab
                  className={({ selected }) =>
                    `flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-lg transition-colors ${
                      selected
                        ? "bg-white dark:bg-zinc-800 text-primary shadow-sm"
                        : "text-zinc-600 dark:text-zinc-300 hover:bg-white/50 dark:hover:bg-zinc-700 hover:text-zinc-900 dark:hover:text-white"
                    }`
                  }
                >
                  <IconBell className="w-4 h-4" />
                  Notices
                </Tab>
              )}
            </Tab.List>
            <Tab.Panels className="p-6 bg-white dark:bg-zinc-800 rounded-b-xl">
              <Tab.Panel>
                <InformationPanel
                  user={{
                    userid: String(user.userid),
                    username: user.username,
                    displayname: info.displayName,
                    registered: user.registered,
                    birthdayDay: user.birthdayDay,
                    birthdayMonth: user.birthdayMonth,
                    joinDate: user.joinDate,
                  }}
                  isUser={isUser}
                  isAdmin={isAdmin}
                />
              </Tab.Panel>
              <Tab.Panel>
                <Activity
                  timeSpent={displayData.timeSpent}
                  timesPlayed={displayData.timesPlayed}
                  data={displayData.data}
                  quotas={displayData.quotas}
                  sessionsHosted={displayData.sessionsHosted}
                  sessionsAttended={displayData.sessionsAttended}
                  avatar={info.avatar}
                  sessions={displayData.sessions}
                  adjustments={displayData.adjustments}
                  notices={notices}
                  messages={displayData.messages}
                  idleTime={displayData.idleTime}
                  isHistorical={selectedWeek > 0}
                  historicalPeriod={
                    selectedWeek > 0 && historicalData
                      ? {
                          start: historicalData.period?.start,
                          end: historicalData.period?.end,
                        }
                      : null
                  }
                  loadingHistory={loadingHistory}
                  selectedWeek={selectedWeek}
                  availableHistory={availableHistory}
                  getCurrentWeekLabel={getCurrentWeekLabel}
                  canGoBack={canGoBack}
                  canGoForward={canGoForward}
                  goToPreviousWeek={goToPreviousWeek}
                  goToNextWeek={goToNextWeek}
                />
              </Tab.Panel>
              <Tab.Panel>
                <Book userBook={userBook} onRefetch={refetchUserBook} />
              </Tab.Panel>
              {noticesEnabled && (
                <Tab.Panel>
                  <Notices
                    notices={notices}
                    canManageMembers={canManageMembers}
                    userId={user.userid}
                  />
                </Tab.Panel>
              )}
            </Tab.Panels>
          </Tab.Group>
        </div>
      </div>
    </div>
  );
};

Profile.layout = workspace;

export default Profile;

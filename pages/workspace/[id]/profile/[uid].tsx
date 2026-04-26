import Activity from "@/components/profile/activity";
import Book from "@/components/profile/book";
import Notices from "@/components/profile/notices";
import { Toaster } from "react-hot-toast";
import { InformationTab } from "@/components/profile/information";
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
  IconSun,
  IconMoon,
  IconCloud,
  IconStars,
  IconExternalLink,
  IconBeach,
} from "@tabler/icons-react";
import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import axios from "axios";
import noblox from "noblox.js";

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
        workspaceMemberships: {
          where: {
            workspaceGroupId: parseInt(query.id as string),
          },
        },
      },
    });
    const membership = currentUser?.workspaceMemberships?.[0];
    const isAdmin = membership?.isAdmin || false;
    const hasManagePermission = isAdmin || (currentUser?.roles?.some((role) => role.permissions?.includes("view_member_profiles")) ?? false);

    const hasManageMembersPermission =
      isAdmin ||
      (currentUser?.roles?.some((role) =>
        role.permissions?.includes("edit_member_details")
      ) ??
        false);

    const hasManageNoticesPermission =
      isAdmin ||
      (currentUser?.roles?.some((role) =>
        role.permissions?.includes("manage_notices")
      ) ??
        false);

    const hasApproveNoticesPermission =
      isAdmin ||
      (currentUser?.roles?.some((role) =>
        role.permissions?.includes("approve_notices")
      ) ??
        false);

    const hasRecordNoticesPermission =
      isAdmin ||
      (currentUser?.roles?.some((role) =>
        role.permissions?.includes("record_notices")
      ) ??
        false);

    const hasActivityAdjustmentsPermission =
      isAdmin ||
      (currentUser?.roles?.some((role) =>
        role.permissions?.includes("activity_adjustments")
      ) ??
        false);

    const logbookPermissions = {
      view: isAdmin || (currentUser?.roles?.some((role) => role.permissions?.includes("view_logbook")) ?? false),
      rank: isAdmin || (currentUser?.roles?.some((role) => role.permissions?.includes("rank_users")) ?? false),
      note: isAdmin || (currentUser?.roles?.some((role) => role.permissions?.includes("logbook_note")) ?? false),
      warning: isAdmin || (currentUser?.roles?.some((role) => role.permissions?.includes("logbook_warning")) ?? false),
      promotion: isAdmin || (currentUser?.roles?.some((role) => role.permissions?.includes("logbook_promotion")) ?? false),
      demotion: isAdmin || (currentUser?.roles?.some((role) => role.permissions?.includes("logbook_demotion")) ?? false),
      termination: isAdmin || (currentUser?.roles?.some((role) => role.permissions?.includes("logbook_termination")) ?? false),
      redact: isAdmin || (currentUser?.roles?.some((role) => role.permissions?.includes("logbook_redact")) ?? false),
    };

    const hasAnyLogbookPermission = Object.values(logbookPermissions).some(p => p);

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
          include: {
            quotaRoles: {
              include: {
                quota: true,
              },
            },
          },
        },
        workspaceMemberships: {
          where: {
            workspaceGroupId: parseInt(query.id as string),
          },
          include: {
            departmentMembers: {
              include: {
                department: {
                  include: {
                    quotaDepartments: {
                      include: {
                        quota: true,
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!userTakingAction) return { notFound: true };

    const currentDate = new Date();
    const lastReset = await prisma.activityReset.findFirst({
      where: {
        workspaceGroupId: parseInt(query.id as string),
      },
      orderBy: {
        resetAt: "desc",
      },
    });

    // Use last reset date, or November 30th 2024, whichever is more recent
    const nov30 = new Date("2024-11-30T00:00:00Z");
    const startDate = lastReset?.resetAt
      ? lastReset.resetAt > nov30
        ? lastReset.resetAt
        : nov30
      : nov30;

    const roleQuotasWithInfo = userTakingAction.roles.flatMap((role) =>
      role.quotaRoles.map((qr) => ({
        ...qr.quota,
        linkedVia: 'role' as const,
        linkedName: role.name,
        linkedColor: role.color,
      }))
    );

    const departmentQuotasWithInfo = userTakingAction.workspaceMemberships
      .flatMap((wm) => wm.departmentMembers)
      .flatMap((dm) =>
        dm.department.quotaDepartments.map((qd) => ({
          ...qd.quota,
          linkedVia: 'department' as const,
          linkedName: dm.department.name,
          linkedColor: dm.department.color,
        }))
      );

    const quotaMap = new Map();
    [...roleQuotasWithInfo, ...departmentQuotasWithInfo].forEach((quota) => {
      if (!quotaMap.has(quota.id)) {
        quotaMap.set(quota.id, quota);
      }
    });
    const quotas = Array.from(quotaMap.values());

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
        archived: { not: true },
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
        archived: { not: true },
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
        archived: { not: true },
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
        archived: { not: true },
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
          archived: { not: true },
        },
        archived: { not: true },
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

    const allianceVisits = await prisma.allyVisit.count({
      where: {
        OR: [
          { hostId: BigInt(query?.uid as string) },
          { participants: { has: BigInt(query?.uid as string) } },
        ],
        time: {
          gte: startDate,
          lte: currentDate,
        },
      },
    });

    const user = await prisma.user.findUnique({
      where: { userid: BigInt(query.uid as string) },
      select: {
        userid: true,
        username: true,
        registered: true,
        birthdayDay: true,
        birthdayMonth: true,
        ranks: {
          select: {
            rankId: true,
            workspaceGroupId: true,
          },
        },
      },
    });

    const targetUserMembership = await prisma.workspaceMember.findUnique({
      where: {
        workspaceGroupId_userId: {
          workspaceGroupId: parseInt(query.id as string),
          userId: BigInt(query.uid as string),
        },
      },
      select: {
        joinDate: true,
        lineManagerId: true,
        timezone: true,
        discordId: true,
        departmentMembers: {
          select: {
            department: {
              select: {
                id: true,
                name: true,
                color: true,
              },
            },
          },
        },
      },
    });

    const availableDepartments = await prisma.department.findMany({
      where: {
        workspaceGroupId: parseInt(query.id as string),
      },
      select: {
        id: true,
        name: true,
        color: true,
      },
      orderBy: {
        name: 'asc',
      },
    });

    const memberRoles = await prisma.role.findMany({
      where: {
        workspaceGroupId: parseInt(query.id as string),
        members: {
          some: {
            userid: BigInt(query.uid as string),
          },
        },
      },
      select: {
        id: true,
        name: true,
        isOwnerRole: true,
      },
      orderBy: {
        isOwnerRole: "desc",
      },
    });

    let memberRoleName: string | null = null;
    try {
      const workspaceGroupId = parseInt(query.id as string);
      const roles = await noblox.getRoles(workspaceGroupId);
      const userRankRecord =
        user?.ranks?.find(
          (r: any) => Number(r.workspaceGroupId) === workspaceGroupId
        ) || user?.ranks?.[0];

      if (userRankRecord) {
        const storedValue = Number(userRankRecord.rankId);
        if (storedValue > 255) {
          const groupRole = roles.find((r: any) => r.id === storedValue);
          if (groupRole?.name) {
            memberRoleName = groupRole.name;
          }
        } else {
          const groupRole = roles.find((r: any) => r.rank === storedValue);
          if (groupRole?.name) {
            memberRoleName = groupRole.name;
          }
        }
      }
    } catch (e) {
      console.error('Error fetching member role name:', e);
      memberRoleName = null;
    }

    let lineManager = null;
    if (targetUserMembership?.lineManagerId) {
      const manager = await prisma.user.findUnique({
        where: { userid: targetUserMembership.lineManagerId },
        select: {
          userid: true,
          username: true,
          picture: true,
        },
      });
      if (manager) {
        lineManager = {
          userid: manager.userid.toString(),
          username: manager.username,
          picture: manager.picture || "",
        };
      }
    }

    const allMembersRaw = await prisma.user.findMany({
      where: {
        roles: {
          some: {
            workspaceGroupId: parseInt(query.id as string),
          },
        },
      },
      select: {
        userid: true,
        username: true,
        picture: true,
      },
      orderBy: {
        username: 'asc',
      },
    });

    const allMembers = allMembersRaw.map((member) => ({
      userid: member.userid.toString(),
      username: member.username,
      picture: member.picture || "",
    }));

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
        allianceVisits: allianceVisits,
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
          joinDate: targetUserMembership?.joinDate
            ? targetUserMembership.joinDate.toISOString()
            : null,
        },
        memberRoleName,
        workspaceMember: targetUserMembership
          ? {
              departments: targetUserMembership.departmentMembers.map(dm => ({
                id: dm.department.id,
                name: dm.department.name,
                color: dm.department.color,
              })),
              lineManagerId:
                targetUserMembership.lineManagerId?.toString() || null,
              timezone: targetUserMembership.timezone,
              discordId: targetUserMembership.discordId,
            }
          : null,
        availableDepartments,
        lineManager,
        allMembers,
        noticesEnabled,
        canManageMembers: hasManageMembersPermission,
        canManageNotices: hasManageNoticesPermission,
        canApproveNotices: hasApproveNoticesPermission,
        canRecordNotices: hasRecordNoticesPermission,
        canAdjustActivity: hasActivityAdjustmentsPermission,
        logbookEnabled: hasAnyLogbookPermission,
        logbookPermissions,
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
  memberRoleName: string | null;
  userBook: any;
  quotas: Quota[];
  sessionsHosted: number;
  sessionsAttended: number;
  allianceVisits: number;
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
  workspaceMember: {
    departments: Array<{
      id: string;
      name: string;
      color: string | null;
    }>;
    lineManagerId: string | null;
    timezone: string | null;
    discordId: string | null;
  } | null;
  availableDepartments: Array<{
    id: string;
    name: string;
    color: string | null;
  }>;
  lineManager: {
    userid: string;
    username: string;
    picture: string;
  } | null;
  allMembers: Array<{
    userid: string;
    username: string;
    picture: string;
  }>;
  noticesEnabled: boolean;
  canManageMembers: boolean;
  canManageNotices: boolean;
  canApproveNotices: boolean;
  canRecordNotices: boolean;
  canAdjustActivity: boolean;
  logbookEnabled: boolean;
  logbookPermissions: {
    view: boolean;
    rank: boolean;
    note: boolean;
    warning: boolean;
    promotion: boolean;
    demotion: boolean;
    termination: boolean;
    redact: boolean;
  };
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
  memberRoleName,
  sessionsHosted,
  sessionsAttended,
  allianceVisits,
  quotas,
  user,
  isAdmin,
  workspaceMember,
  availableDepartments,
  lineManager,
  allMembers,
  noticesEnabled,
  canManageMembers,
  canManageNotices,
  canApproveNotices,
  canRecordNotices,
  canAdjustActivity,
  logbookEnabled,
  logbookPermissions,
}) => {
  const [login, setLogin] = useRecoilState(loginState);
  const [userBook, setUserBook] = useState(initialUserBook);
  const [selectedWeek, setSelectedWeek] = useState(0);
  const [currentTime, setCurrentTime] = useState(new Date());
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
    allianceVisits,
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
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

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
          const response = await axios.get(
            `/api/workspace/${router.query.id}/activity/history/${router.query.uid}?periodEnd=${historyPeriod.period.end}`
          );
          if (response.data.success) {
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
    if (selectedWeek === 0) return "Current Period";
    if (selectedWeek === 1) return "Last Period";
    return `${selectedWeek} Periods Ago`;
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
                  description: null,
                  sessionType: null,
                  sessionRole: null,
                  currentValue: qp.value || 0,
                  percentage: qp.percentage || 0,
                })
              )
            : [],
          sessionsHosted: historicalData.activity.sessionsHosted,
          sessionsAttended: historicalData.activity.sessionsAttended,
          allianceVisits: historicalData.activity.allianceVisits || 0,
          sessions: historicalData.sessions || [],
          adjustments: historicalData.adjustments || [],
          messages: historicalData.activity.messages || 0,
          idleTime: historicalData.activity.idleTime || 0,
        }
      : currentData;

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

  return (
    <div className="pagePadding">
      <Toaster position="bottom-center" />
      <div className="max-w-7xl mx-auto">
        <div className="mb-6 overflow-hidden rounded-2xl border border-zinc-200/80 bg-gradient-to-br from-white to-zinc-50/80 shadow-sm dark:border-zinc-600/50 dark:from-zinc-800 dark:to-zinc-800/90 dark:shadow-none">
          <div className="flex flex-col gap-5 p-5 sm:p-6 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
            <div className="flex min-w-0 flex-1 items-center gap-4 sm:gap-5">
              <div className="relative flex-shrink-0">
                <div
                  className={`relative h-[72px] w-[72px] overflow-hidden rounded-2xl shadow-lg ring-2 ring-white dark:ring-zinc-700/80 sm:h-24 sm:w-24 ${getRandomBg(
                    user.userid
                  )}`}
                >
                  <img
                    src={info.avatar}
                    className="h-full w-full object-cover"
                    alt={`${info.displayName}'s avatar`}
                    style={{ background: "transparent" }}
                  />
                </div>
                <div className="absolute -bottom-0.5 -right-0.5 flex h-6 w-6 items-center justify-center rounded-lg bg-primary shadow ring-2 ring-white dark:ring-zinc-800 sm:h-7 sm:w-7">
                  <IconUserCircle className="h-3.5 w-3.5 text-white sm:h-4 sm:w-4" />
                </div>
              </div>
              <div className="min-w-0 flex-1 space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="truncate text-xl font-semibold tracking-tight text-zinc-900 sm:text-2xl dark:text-white">
                    {info.displayName}
                  </h1>
                  {(() => {
                    const now = new Date();
                    const activeNotice = notices.find(
                      (notice: any) =>
                        notice.approved === true &&
                        notice.reviewed === true &&
                        notice.revoked === false &&
                        new Date(notice.startTime) <= now &&
                        new Date(notice.endTime) >= now
                    );
                    if (activeNotice) {
                      return (
                        <div
                          className="flex-shrink-0"
                          title={`On notice: ${activeNotice.reason || "N/A"}`}
                        >
                          <IconBeach className="h-5 w-5 text-amber-500" />
                        </div>
                      );
                    }
                    return null;
                  })()}
                </div>
                <p className="truncate text-sm text-zinc-500 dark:text-zinc-400">
                  <span className="text-zinc-400 dark:text-zinc-500">@</span>
                  {info.username}
                </p>
                {memberRoleName && (
                  <p className="pt-0.5">
                    <span className="inline-flex max-w-full items-center rounded-md border border-zinc-200/90 bg-zinc-100/90 px-2 py-0.5 text-xs font-medium text-zinc-600 dark:border-zinc-600/80 dark:bg-zinc-700/50 dark:text-zinc-200">
                      <span className="truncate">{memberRoleName}</span>
                    </span>
                  </p>
                )}
              </div>
            </div>
            <div className="flex flex-shrink-0 flex-wrap items-center gap-2 sm:justify-end sm:gap-2.5">
              {workspaceMember &&
                workspaceMember.timezone &&
                (() => {
                  const userHour = new Date().toLocaleString("en-US", {
                    timeZone: workspaceMember.timezone,
                    hour: "numeric",
                    hour12: false,
                  });
                  const hour = parseInt(userHour);
                  const isDay = hour >= 6 && hour < 18;

                  return (
                    <div className="inline-flex h-9 items-center gap-2 rounded-full border border-zinc-200/90 bg-zinc-100/90 px-3 text-zinc-800 dark:border-zinc-600/70 dark:bg-zinc-700/40 dark:text-zinc-100">
                      {isDay ? (
                        <IconSun className="h-4 w-4 shrink-0 text-amber-500" />
                      ) : (
                        <IconMoon className="h-4 w-4 shrink-0 text-sky-300" />
                      )}
                      <span className="text-xs font-medium tabular-nums sm:text-sm">
                        {currentTime.toLocaleTimeString("en-US", {
                          timeZone: workspaceMember.timezone,
                          hour: "2-digit",
                          minute: "2-digit",
                          hour12: true,
                        })}
                      </span>
                    </div>
                  );
                })()}
              <a
                href={`https://www.roblox.com/users/${user.userid}/profile`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex h-9 items-center gap-2 rounded-full bg-primary px-3.5 text-sm font-medium text-white shadow-sm transition-[filter] hover:brightness-105 active:brightness-95 sm:px-4"
              >
                <IconExternalLink className="h-4 w-4 shrink-0 opacity-95" />
                <span className="hidden sm:inline">View on Roblox</span>
                <span className="sm:hidden">Roblox</span>
              </a>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-zinc-800 rounded-xl shadow-sm overflow-hidden">
          <Tab.Group>
            <Tab.List className="flex p-1 gap-1 mx-2 sm:mx-4 mt-3 mb-2 bg-zinc-50 dark:bg-zinc-700/60 border border-zinc-200 dark:border-zinc-600 rounded-lg overflow-x-auto scrollbar-hide">
              <Tab
                className={({ selected }) =>
                  `flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 text-xs sm:text-sm font-medium rounded-md transition-colors whitespace-nowrap flex-shrink-0 ${
                    selected
                      ? "bg-white text-zinc-900 shadow-sm dark:bg-zinc-900 dark:text-white"
                      : "text-zinc-600 dark:text-zinc-300 hover:bg-white/70 dark:hover:bg-zinc-800/80"
                  }`
                }
              >
                <IconClipboard className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                Details
              </Tab>
              <Tab
                className={({ selected }) =>
                  `flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 text-xs sm:text-sm font-medium rounded-md transition-colors whitespace-nowrap flex-shrink-0 ${
                    selected
                      ? "bg-white text-zinc-900 shadow-sm dark:bg-zinc-900 dark:text-white"
                      : "text-zinc-600 dark:text-zinc-300 hover:bg-white/70 dark:hover:bg-zinc-800/80"
                  }`
                }
              >
                <IconHistory className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                Activity
              </Tab>
              {logbookEnabled && (
                <Tab
                  className={({ selected }) =>
                    `flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 text-xs sm:text-sm font-medium rounded-md transition-colors whitespace-nowrap flex-shrink-0 ${
                      selected
                        ? "bg-white text-zinc-900 shadow-sm dark:bg-zinc-900 dark:text-white"
                        : "text-zinc-600 dark:text-zinc-300 hover:bg-white/70 dark:hover:bg-zinc-800/80"
                    }`
                  }
                >
                  <IconBook className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  Logbook
                </Tab>
              )}
              {noticesEnabled && (
                <Tab
                  className={({ selected }) =>
                    `flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 text-xs sm:text-sm font-medium rounded-md transition-colors whitespace-nowrap flex-shrink-0 ${
                      selected
                        ? "bg-white text-zinc-900 shadow-sm dark:bg-zinc-900 dark:text-white"
                        : "text-zinc-600 dark:text-zinc-300 hover:bg-white/70 dark:hover:bg-zinc-800/80"
                    }`
                  }
                >
                  <IconCalendar className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  Time off
                </Tab>
              )}
            </Tab.List>
            <Tab.Panels className="p-3 sm:p-4 bg-white dark:bg-zinc-800 rounded-b-xl">
              <Tab.Panel>
                <InformationTab
                  user={{
                    userid: String(user.userid),
                    username: user.username,
                    displayname: info.displayName,
                    registered: user.registered,
                    birthdayDay: user.birthdayDay,
                    birthdayMonth: user.birthdayMonth,
                    joinDate: user.joinDate,
                  }}
                  workspaceMember={workspaceMember || undefined}
                  availableDepartments={availableDepartments}
                  lineManager={lineManager}
                  allMembers={allMembers}
                  isUser={isUser}
                  isAdmin={isAdmin}
                  canEditMembers={canManageMembers}
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
                  allianceVisits={displayData.allianceVisits}
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
                  canAdjustActivity={canAdjustActivity}
                />
              </Tab.Panel>
              {logbookEnabled && (
                <Tab.Panel>
                  <Book
                    userBook={userBook}
                    onRefetch={refetchUserBook}
                    logbookPermissions={logbookPermissions}
                  />
                </Tab.Panel>
              )}
              {noticesEnabled && (
                <Tab.Panel>
                  <Notices
                    notices={notices}
                    canManageNotices={canManageNotices}
                    canApproveNotices={canApproveNotices}
                    canRecordNotices={canRecordNotices}
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

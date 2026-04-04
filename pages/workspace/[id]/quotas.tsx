import workspace from "@/layouts/workspace";
import { pageWithLayout } from "@/layoutTypes";
import { loginState, workspacestate } from "@/state";
import axios from "axios";
import { useRouter } from "next/router";
import { useState, useMemo, Fragment } from "react";
import randomText from "@/utils/randomText";
import { useRecoilState } from "recoil";
import toast, { Toaster } from "react-hot-toast";
import { InferGetServerSidePropsType } from "next";
import { withPermissionCheckSsr } from "@/utils/permissionsManager";
import prisma from "@/utils/database";
import { Dialog, Transition } from "@headlessui/react";
import { FormProvider, SubmitHandler, useForm } from "react-hook-form";
import Input from "@/components/input";
import {
  IconTarget,
  IconPlus,
  IconTrash,
  IconUsers,
  IconClipboardList,
  IconCheck,
  IconX,
  IconTrophy,
  IconBriefcase,
  IconPencil,
} from "@tabler/icons-react";

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

function getRandomBg(userid: string) {
  let hash = 5381;
  for (let i = 0; i < userid.length; i++) {
    hash = ((hash << 5) - hash) ^ userid.charCodeAt(i);
  }
  const index = (hash >>> 0) % BG_COLORS.length;
  return BG_COLORS[index];
}

const getRandomColor = () => {
  const colors = [
    "bg-blue-500",
    "bg-green-500",
    "bg-yellow-500",
    "bg-red-500",
    "bg-purple-500",
    "bg-pink-500",
    "bg-indigo-500",
  ];
  return colors[Math.floor(Math.random() * colors.length)];
};

type Form = {
  type: string;
  requirement: number;
  name: string;
  description?: string;
  sessionType?: string;
};

export const getServerSideProps = withPermissionCheckSsr(
  async ({ req, params }) => {
    const userId = req.session?.userid;
    if (!userId) {
      return {
        props: {
          myQuotas: [],
          allQuotas: [],
          roles: [],
          departments: [],
          canManageQuotas: false,
        },
      };
    }

    const workspaceId = parseInt(params?.id as string);
    const profileData = await prisma.user.findFirst({
      where: { userid: BigInt(userId) },
      include: {
        roles: {
          where: { workspaceGroupId: workspaceId },
          include: {
            quotaRoles: {
              include: {
                quota: true,
              },
            },
          },
        },
        workspaceMemberships: {
          where: { workspaceGroupId: workspaceId },
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

    const activitySessions = await prisma.activitySession.findMany({
      where: {
        userId: BigInt(userId),
        workspaceGroupId: workspaceId,
        archived: { not: true },
      },
      select: {
        startTime: true,
        endTime: true,
        messages: true,
        idleTime: true,
      },
    });

    const adjustments = await prisma.activityAdjustment.findMany({
      where: {
        userId: BigInt(userId),
        workspaceGroupId: workspaceId,
        archived: { not: true },
      },
      select: {
        minutes: true,
      },
    });

    const lastReset = await prisma.activityReset.findFirst({
      where: {
        workspaceGroupId: workspaceId,
      },
      orderBy: {
        resetAt: "desc",
      },
    });

    const nov30 = new Date("2024-11-30T00:00:00Z");
    const startDate = lastReset?.resetAt 
      ? (lastReset.resetAt > nov30 ? lastReset.resetAt : nov30)
      : nov30;

    const currentDate = new Date();

    const ownedSessions = await prisma.session.findMany({
      where: {
        ownerId: BigInt(userId),
        sessionType: {
          workspaceGroupId: workspaceId,
        },
        date: {
          gte: startDate,
          lte: currentDate,
        },
        archived: { not: true },
      },
      select: {
        id: true,
        type: true,
        ownerId: true,
        date: true,
      },
    });

    const sessionParticipations = await prisma.sessionUser.findMany({
      where: {
        userid: BigInt(userId),
        session: {
          sessionType: {
            workspaceGroupId: workspaceId,
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
            type: true,
            ownerId: true,
            date: true,
            sessionType: {
              select: {
                slots: true,
              },
            },
          },
        },
      },
    });

    const ownedSessionIds = new Set(ownedSessions.map((s) => s.id));
    const hostedSessionsByType: Record<string, number> = {};
    ownedSessions.forEach((s) => {
      const type = s.type || 'other';
      hostedSessionsByType[type] = (hostedSessionsByType[type] || 0) + 1;
    });
    
    let roleBasedHostedSessions = 0;
    sessionParticipations.forEach((participation) => {
      const slots = participation.session.sessionType.slots as any[];
      const slotIndex = participation.slot;
      const slotName = slots[slotIndex]?.name || "";
      const isCoHost =
        participation.roleID.toLowerCase().includes("co-host") ||
        slotName.toLowerCase().includes("co-host");
      if (isCoHost) {
        roleBasedHostedSessions++;
        const type = participation.session.type || 'other';
        hostedSessionsByType[type] = (hostedSessionsByType[type] || 0) + 1;
      }
    });

    const sessionsHosted = ownedSessions.length + roleBasedHostedSessions;
    const attendedSessionsByType: Record<string, number> = {};
    const attendedParticipations = sessionParticipations.filter(
      (participation) => {
        const slots = participation.session.sessionType.slots as any[];
        const slotIndex = participation.slot;
        const slotName = slots[slotIndex]?.name || "";

        const isCoHost =
          participation.roleID.toLowerCase().includes("co-host") ||
          slotName.toLowerCase().includes("co-host");

        return !isCoHost && !ownedSessionIds.has(participation.session.id);
      }
    );
    
    attendedParticipations.forEach((participation) => {
      const type = participation.session.type || 'other';
      attendedSessionsByType[type] = (attendedSessionsByType[type] || 0) + 1;
    });

    const sessionsAttended = attendedParticipations.length;

    const sessionsLogged = [
      ...ownedSessions,
      ...sessionParticipations.map((sp) => sp.session),
    ];
    const totalSessionsLogged = new Set([
      ...ownedSessions.map(s => s.id),
      ...sessionParticipations.map(p => p.session.id)
    ]).size;

    const loggedSessionsByType: Record<string, number> = {};
    const seenSessionIds = new Set<string>();
    [...ownedSessions, ...sessionParticipations.map(sp => sp.session)].forEach((s) => {
      if (!seenSessionIds.has(s.id)) {
        seenSessionIds.add(s.id);
        const type = s.type || 'other';
        loggedSessionsByType[type] = (loggedSessionsByType[type] || 0) + 1;
      }
    });

    const activityConfig = await prisma.config.findFirst({
      where: {
        workspaceGroupId: workspaceId,
        key: "activity",
      },
    });

    let idleTimeEnabled = true;
    if (activityConfig?.value) {
      let val = activityConfig.value;
      if (typeof val === "string") {
        try {
          val = JSON.parse(val);
        } catch {
          val = {};
        }
      }
      idleTimeEnabled =
        typeof val === "object" && val !== null && "idleTimeEnabled" in val
          ? (val as { idleTimeEnabled?: boolean }).idleTimeEnabled ?? true
          : true;
    }
    let totalMinutes = 0;
    let totalMessages = 0;
    let totalIdleTime = 0;

    activitySessions.forEach((session: any) => {
      if (session.endTime) {
        const duration = Math.round(
          (new Date(session.endTime).getTime() -
            new Date(session.startTime).getTime()) /
            60000
        );
        totalMinutes += duration;
      }
      totalMessages += session.messages || 0;
      totalIdleTime += Number(session.idleTime) || 0;
    });

    totalMinutes += adjustments.reduce(
      (sum: number, adj: any) => sum + adj.minutes,
      0
    );

    const totalIdleMinutes = Math.round(totalIdleTime);
    const activeMinutes = idleTimeEnabled
      ? Math.max(0, totalMinutes - totalIdleMinutes)
      : totalMinutes;

    const allianceVisits = await prisma.allyVisit.count({
      where: {
        OR: [
          { hostId: BigInt(userId) },
          { participants: { has: BigInt(userId) } },
        ],
        time: {
          gte: startDate,
        },
      },
    });

    const userRoleIds = (profileData?.roles || []).map((r: any) => r.id);
    const userDepartmentIds = (profileData?.workspaceMemberships?.[0]?.departmentMembers || []).map((dm: any) => dm.department.id);
    
    const myQuotas = await prisma.quota.findMany({
      where: {
        workspaceGroupId: workspaceId,
        OR: [
          {
            quotaRoles: {
              some: {
                roleId: {
                  in: userRoleIds,
                },
              },
            },
          },
          {
            quotaDepartments: {
              some: {
                departmentId: {
                  in: userDepartmentIds,
                },
              },
            },
          },
        ],
      },
      include: {
        quotaRoles: {
          include: {
            role: true,
          },
        },
        quotaDepartments: {
          include: {
            department: true,
          },
        },
      },
    });

    const myQuotasWithProgress = myQuotas.map((quota: any) => {
      if (quota.type === "custom") {
        return {
          ...quota,
          currentValue:  null,
          percentage: 0,
        };
      }
      let currentValue = 0;
      let percentage = 0;

      switch (quota.type) {
        case "mins":
          currentValue = activeMinutes;
          percentage = (activeMinutes / quota.value) * 100;
          break;
        case "sessions_hosted":
          const hostedCount = quota.sessionType && quota.sessionType !== "all"
            ? hostedSessionsByType[quota.sessionType] || 0
            : sessionsHosted;
          currentValue = hostedCount;
          percentage = (hostedCount / quota.value) * 100;
          break;
        case "sessions_attended":
          const attendedCount = quota.sessionType && quota.sessionType !== "all"
            ? attendedSessionsByType[quota.sessionType] || 0
            : sessionsAttended;
          currentValue = attendedCount;
          percentage = (attendedCount / quota.value) * 100;
          break;
        case "sessions_logged":
          const loggedCount = quota.sessionType && quota.sessionType !== "all"
            ? loggedSessionsByType[quota.sessionType] || 0
            : totalSessionsLogged;
          currentValue = loggedCount;
          percentage = (loggedCount / quota.value) * 100;
          break;
        case "alliance_visits":
          currentValue = allianceVisits;
          percentage = (allianceVisits / quota.value) * 100;
          break;
      }

 return {
        ...quota,
        currentValue,
        percentage,
      };
    });

    const membership = profileData?.workspaceMemberships?.[0];
    const isAdmin = membership?.isAdmin || false;
    const hasManagePermission = isAdmin || profileData?.roles.some(
      (role: any) =>
        role.permissions.includes("create_quotas")
    );
    const hasDeletePermission = isAdmin || profileData?.roles.some(
      (role: any) =>
        role.permissions.includes("delete_quotas")
    );

    let allQuotas: any[] = [];
    let roles: any[] = [];
    let departments: any[] = [];

    if (hasManagePermission || hasDeletePermission) {
      allQuotas = await prisma.quota.findMany({
        where: {
          workspaceGroupId: workspaceId,
        },
        include: {
          quotaRoles: {
            include: {
              role: true,
            },
          },
          quotaDepartments: {
            include: {
              department: true,
            },
          },
        },
      });
    }

    if (hasManagePermission) {
      roles = await prisma.role.findMany({
        where: {
          workspaceGroupId: workspaceId,
        },
      });

      departments = await prisma.department.findMany({
        where: {
          workspaceGroupId: workspaceId,
        },
      });
    }

    return {
      props: {
        myQuotas: JSON.parse(
          JSON.stringify(myQuotasWithProgress, (_key, value) =>
            typeof value === "bigint" ? value.toString() : value
          )
        ),
        allQuotas: JSON.parse(
          JSON.stringify(allQuotas, (_key, value) =>
            typeof value === "bigint" ? value.toString() : value
          )
        ),
        roles: JSON.parse(
          JSON.stringify(roles, (_key, value) =>
            typeof value === "bigint" ? value.toString() : value
          )
        ),
        departments: JSON.parse(
          JSON.stringify(departments, (_key, value) =>
            typeof value === "bigint" ? value.toString() : value
          )
        ),
        canManageQuotas: hasManagePermission,
        canDeleteQuotas: hasDeletePermission,
      },
    };
  }
);

type pageProps = InferGetServerSidePropsType<typeof getServerSideProps>;

const Quotas: pageWithLayout<pageProps> = ({
  myQuotas: initialMyQuotas,
  allQuotas: initialAllQuotas,
  roles: initialRoles,
  departments: initialDepartments,
  canManageQuotas: canManageQuotasProp,
  canDeleteQuotas,
}) => {
  const router = useRouter();
  const { id } = router.query;
  const [login] = useRecoilState(loginState);
  const [workspace] = useRecoilState(workspacestate);
  const [myQuotas, setMyQuotas] = useState<any[]>(Array.isArray(initialMyQuotas) ? initialMyQuotas : []);
  const [allQuotas, setAllQuotas] = useState<any[]>(Array.isArray(initialAllQuotas) ? initialAllQuotas : []);
  const [activeTab, setActiveTab] = useState<"my-quotas" | "manage-quotas">(
    "my-quotas"
  );

  const text = useMemo(() => randomText(login.displayname), []);
  const canManageQuotas: boolean = !!canManageQuotasProp;
  const roles: any = initialRoles;
  const departments: any = initialDepartments;

  const [isOpen, setIsOpen] = useState(false);
  const [editingQuota, setEditingQuota] = useState<any>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [quotaToDelete, setQuotaToDelete] = useState<any>(null);
  const [selectedRoles, setSelectedRoles] = useState<string[]>([]);
  const [selectedDepartments, setSelectedDepartments] = useState<string[]>([]);
  const [sessionTypeFilter, setSessionTypeFilter] = useState<string>("all");

  const form = useForm<Form>({
    shouldUnregister: true,
    defaultValues: {
      type: "mins",
      requirement: 0,
      name: "",
      description: "",
      sessionType: "all",
    },
  });
  const { register, handleSubmit, watch, reset } = form;
  const watchedType = watch("type");

  const openCreateModal = () => {
    setEditingQuota(null);
    reset({ type: "mins", requirement: 0, name: "", description: "", sessionType: "all" });
    setSelectedRoles([]);
    setSelectedDepartments([]);
    setSessionTypeFilter("all");
    setIsOpen(true);
  };

  const openEditModal = (quota: any) => {
    setEditingQuota(quota);
    reset({
      type: quota.type,
      requirement: quota.type === "custom" ? 0 : (quota.value ?? 0),
      name: quota.name ?? "",
      description: quota.description ?? "",
      sessionType: quota.sessionType ?? "all",
    });
    setSelectedRoles((quota.quotaRoles ?? []).map((qr: any) => qr.role?.id ?? qr.roleId).filter(Boolean));
    setSelectedDepartments((quota.quotaDepartments ?? []).map((qd: any) => qd.department?.id ?? qd.departmentId).filter(Boolean));
    setSessionTypeFilter(quota.sessionType ?? "all");
    setIsOpen(true);
  };

  const types: { [key: string]: string } = {
    mins: "Minutes in game",
    sessions_hosted: "Sessions hosted",
    sessions_attended: "Sessions attended",
    sessions_logged: "Sessions logged",
    alliance_visits: "Alliance visits",
    custom: "custom",
  };

  const typeDescriptions: { [key: string]: string } = {
    mins: "Total time spent in-game during the activity period",
    sessions_hosted: "Number of sessions where the user was the host",
    sessions_attended:
      "Number of sessions the user participated in (not as host)",
    sessions_logged:
      "Total unique sessions participated in any role (host, co-host, or participant)",
    alliance_visits: "Number of alliance visits where the user was host or participant",
    custom: "Custom quota",
  };

  const sessionTypeOptions = [
    { value: "all", label: "All Session Types" },
    { value: "shift", label: "Shift" },
    { value: "training", label: "Training" },
    { value: "event", label: "Event" },
    { value: "other", label: "Other" },
  ];

  const toggleRole = async (role: string) => {
    const updatedRoles = [...selectedRoles];
    if (updatedRoles.includes(role)) {
      setSelectedRoles(updatedRoles.filter((r) => r !== role));
    } else {
      setSelectedRoles([...updatedRoles, role]);
    }
  };

  const toggleDepartment = async (departmentId: string) => {
    const updatedDepartments = [...selectedDepartments];
    if (updatedDepartments.includes(departmentId)) {
      setSelectedDepartments(updatedDepartments.filter((d) => d !== departmentId));
    } else {
      setSelectedDepartments([...updatedDepartments, departmentId]);
    }
  };

  const onSubmit: SubmitHandler<Form> = async ({
    type,
    requirement,
    name,
    description,
  }) => {
    const payload: any = {
      type,
      roles: selectedRoles,
      departments: selectedDepartments,
      name,
      description: description || null,
    };
    if (type !== "custom") {
      payload.value = Number(requirement);
    }
    if (type !== "custom" && ["sessions_hosted", "sessions_attended", "sessions_logged"].includes(type)) {
      payload.sessionType = sessionTypeFilter === "all" ? null : sessionTypeFilter;
    }

    if (editingQuota) {
      const axiosPromise = axios
        .patch(`/api/workspace/${id}/activity/quotas/${editingQuota.id}/update`, payload)
        .then((res) => {
          setAllQuotas((prev: any[]) =>
            prev.map((q: any) => (q.id === res.data.quota.id ? res.data.quota : q))
          );
          setIsOpen(false);
          setEditingQuota(null);
        });
      toast.promise(axiosPromise, {
        loading: "Saving quota...",
        success: "Quota updated!",
        error: (err) => err.response?.data?.error || "Failed to update quota.",
      });
      return;
    }

    const axiosPromise = axios
      .post(`/api/workspace/${id}/activity/quotas/new`, payload)
      .then((req) => {
        setAllQuotas([...allQuotas, req.data.quota]);
        setSelectedRoles([]);
        setSelectedDepartments([]);
        setSessionTypeFilter("all");
      });
    toast.promise(axiosPromise, {
      loading: "Creating your quota...",
      success: () => {
        setIsOpen(false);
        return "Quota created!";
      },
      error: (err) => {
        console.error("Quota creation error:", err);
        return err.response?.data?.error || "Quota was not created due to an unknown error.";
      },
    });
  };

  const deleteQuota = () => {
    if (!quotaToDelete) return;
    
    const axiosPromise = axios
      .delete(`/api/workspace/${id}/activity/quotas/${quotaToDelete.id}/delete`)
      .then(() => {
        setAllQuotas(allQuotas.filter((q: any) => q.id !== quotaToDelete.id));
        setIsDeleteModalOpen(false);
        setQuotaToDelete(null);
      });
    toast.promise(axiosPromise, {
      loading: "Deleting quota...",
      success: "Quota deleted!",
      error: "Failed to delete quota",
    });
  };

  const formatGoal = (quota: any) => {
    if (quota.type === "custom") return null;
    const unit = quota.type === "mins" ? "minutes" : quota.type === "alliance_visits" ? "visits" : "sessions";
    return `${quota.value} ${unit}`;
  };

  return (
    <>
      <div className="pagePadding">
        <div className="max-w-5xl mx-auto">
          <header className="mb-8">
            <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-white">
              Quotas
            </h1>
            <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
              {activeTab === "my-quotas"
                ? "Track your progress and see how you're doing"
                : "Create and manage quotas for your workspace"}
            </p>
          </header>

          {(canManageQuotas || (canDeleteQuotas as boolean)) && (
            <nav className="flex p-1 gap-0.5 rounded-xl bg-zinc-100 dark:bg-zinc-800/80 w-fit mb-8">
              <button
                onClick={() => setActiveTab("my-quotas")}
                className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-lg transition-all duration-200 ${
                  activeTab === "my-quotas"
                    ? "bg-white text-zinc-900 shadow-sm dark:bg-zinc-700 dark:text-white"
                    : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white"
                }`}
              >
                <IconTarget className="w-4 h-4 shrink-0" />
                <span>My Quotas</span>
              </button>
              <button
                onClick={() => setActiveTab("manage-quotas")}
                className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-lg transition-all duration-200 ${
                  activeTab === "manage-quotas"
                    ? "bg-white text-zinc-900 shadow-sm dark:bg-zinc-700 dark:text-white"
                    : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white"
                }`}
              >
                <IconClipboardList className="w-4 h-4 shrink-0" />
                <span>Manage Quotas</span>
              </button>
            </nav>
          )}

          {(!(canManageQuotas || (canDeleteQuotas as boolean)) || activeTab === "my-quotas") && (
            <div>
              {myQuotas.length === 0 ? (
                <div className="rounded-2xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/50 p-12 text-center max-w-md mx-auto">
                  <div className="mx-auto w-14 h-14 rounded-2xl bg-zinc-200 dark:bg-zinc-700 flex items-center justify-center mb-4">
                    <IconTarget className="w-7 h-7 text-zinc-500 dark:text-zinc-400" />
                  </div>
                  <h3 className="text-base font-semibold text-zinc-900 dark:text-white mb-1">
                    No quotas assigned
                  </h3>
                  <p className="text-sm text-zinc-500 dark:text-zinc-400">
                    You don't have any activity quotas yet. When your roles or departments are assigned quotas, they'll show up here.
                  </p>
                </div>
              ) : (
                <div className="space-y-5">
                  {myQuotas.map((quota: any) => {
                    const isComplete = quota.type !== "custom" && quota.percentage >= 100;
                    const barWidth = quota.type === "custom" ? 0 : Math.min(quota.percentage, 100);
                    return (
                      <div
                        key={quota.id}
                        className="rounded-2xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800/50 overflow-hidden transition-shadow hover:shadow-md dark:hover:shadow-none"
                      >
                        <div className="p-6">
                          <div className="flex items-start gap-4">
                            <div className={`shrink-0 w-11 h-11 rounded-xl flex items-center justify-center ${
                              isComplete
                                ? "bg-emerald-100 dark:bg-emerald-500/20"
                                : "bg-zinc-100 dark:bg-zinc-700"
                            }`}>
                              <IconTrophy className={`w-5 h-5 ${
                                isComplete ? "text-emerald-600 dark:text-emerald-400" : "text-zinc-500 dark:text-zinc-400"
                              }`} />
                            </div>
                            <div className="min-w-0 flex-1">
                              <h3 className="text-lg font-semibold text-zinc-900 dark:text-white">
                                {quota.name}
                              </h3>
                              {quota.type !== "custom" && formatGoal(quota) && (
                                <p className="mt-0.5 text-sm text-zinc-500 dark:text-zinc-400">
                                  Goal: {formatGoal(quota)}
                                </p>
                              )}
                              {quota.type === "custom" && (
                                <p className="mt-0.5 text-sm text-zinc-500 dark:text-zinc-400 italic">Tracked manually</p>
                              )}
                              {quota.description && (
                                <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">
                                  {quota.description}
                                </p>
                              )}
                              {quota.sessionType && quota.sessionType !== "all" && (
                                <p className="mt-1.5 text-xs text-primary font-medium">
                                  {quota.sessionType.charAt(0).toUpperCase() + quota.sessionType.slice(1)} only
                                </p>
                              )}
                            </div>
                          </div>

                          {quota.type !== "custom" && (
                            <div className="mt-5">
                              <div className="flex items-baseline justify-between gap-2 mb-2">
                                <span className="text-sm font-medium text-zinc-600 dark:text-zinc-400">
                                  Progress
                                </span>
                                <span className="text-sm font-semibold tabular-nums text-zinc-900 dark:text-white">
                                  {quota.currentValue} <span className="font-normal text-zinc-400 dark:text-zinc-500">/ {quota.value}</span>
                                </span>
                              </div>
                              <div className="w-full h-2.5 bg-zinc-100 dark:bg-zinc-700 rounded-full overflow-hidden">
                                <div
                                  className={`h-full rounded-full transition-all ${
                                    isComplete ? "bg-emerald-500" : "bg-primary"
                                  }`}
                                  style={{ width: `${barWidth}%` }}
                                />
                              </div>
                              <p className="mt-1.5 text-xs text-zinc-500 dark:text-zinc-400">
                                {isComplete ? (
                                  quota.percentage > 100 ? (
                                    <>Goal exceeded · {quota.percentage.toFixed(0)}%</>
                                  ) : (
                                    <>Complete</>
                                  )
                                ) : (
                                  <>{quota.percentage.toFixed(0)}% complete</>
                                )}
                              </p>
                            </div>
                          )}
                          {quota.type === "custom" && (
                            <p className="mt-4 text-xs text-zinc-500 dark:text-zinc-400 italic">Tracked manually by your team.</p>
                          )}

                          <div className="mt-5 pt-4 border-t border-zinc-100 dark:border-zinc-700">
                            <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-2">
                              Assigned to
                            </p>
                            <div className="flex flex-wrap gap-2">
                              {quota.quotaRoles?.map((qr: any) => (
                                <span
                                  key={qr.role.id}
                                  className="inline-flex items-center gap-1.5 py-1.5 px-2.5 rounded-lg text-xs font-medium text-white/95"
                                  style={{ backgroundColor: qr.role.color || "#71717a" }}
                                >
                                  <IconUsers className="w-3.5 h-3.5 opacity-90" />
                                  {qr.role.name}
                                </span>
                              ))}
                              {quota.quotaDepartments?.map((qd: any) => (
                                <span
                                  key={qd.department.id}
                                  className="inline-flex items-center gap-1.5 py-1.5 px-2.5 rounded-lg text-xs font-medium text-white/95"
                                  style={{ backgroundColor: qd.department.color || "#71717a" }}
                                >
                                  <IconBriefcase className="w-3.5 h-3.5 opacity-90" />
                                  {qd.department.name}
                                </span>
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {activeTab === "manage-quotas" && (canManageQuotas || (canDeleteQuotas as boolean)) && (
            <div>
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-lg font-semibold text-zinc-900 dark:text-white">
                  All quotas
                </h2>
                {canManageQuotas && (
                  <button
                    onClick={openCreateModal}
                    className="inline-flex items-center gap-2 px-4 py-2.5 bg-primary text-white text-sm font-medium rounded-xl hover:bg-primary/90 transition-colors shadow-sm"
                  >
                    <IconPlus className="w-4 h-4" />
                    Create quota
                  </button>
                )}
              </div>

              {allQuotas.length === 0 ? (
                <div className="rounded-2xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/50 p-12 text-center max-w-md mx-auto">
                  <div className="mx-auto w-14 h-14 rounded-2xl bg-zinc-200 dark:bg-zinc-700 flex items-center justify-center mb-4">
                    <IconClipboardList className="w-7 h-7 text-zinc-500 dark:text-zinc-400" />
                  </div>
                  <h3 className="text-base font-semibold text-zinc-900 dark:text-white mb-1">
                    No quotas yet
                  </h3>
                  <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-5">
                    {canManageQuotas ? "Create your first quota to assign to roles or departments." : "No activity quotas have been set up yet."}
                  </p>
                  {canManageQuotas && (
                    <button
                      onClick={openCreateModal}
                      className="inline-flex items-center gap-2 px-4 py-2.5 bg-primary text-white text-sm font-medium rounded-xl hover:bg-primary/90 transition-colors"
                    >
                      <IconPlus className="w-4 h-4" />
                      Create quota
                    </button>
                  )}
                </div>
              ) : (
                <div className="space-y-4">
                  {allQuotas.map((quota: any) => (
                    <div
                      key={quota.id}
                      className="rounded-2xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800/50 p-5 flex items-start justify-between gap-4"
                    >
                      <div className="min-w-0 flex-1">
                        <h3 className="text-base font-semibold text-zinc-900 dark:text-white">
                          {quota.name}
                        </h3>
                        {quota.type !== "custom" ? (
                          <p className="mt-0.5 text-sm text-zinc-500 dark:text-zinc-400">
                            {quota.value} {types[quota.type]}
                          </p>
                        ) : (
                          <p className="mt-0.5 text-sm text-zinc-500 dark:text-zinc-400 italic">Manually tracked</p>
                        )}
                        {quota.description && (
                          <p className="mt-1.5 text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">
                            {quota.description}
                          </p>
                        )}
                        {quota.sessionType && quota.sessionType !== "all" && (
                          <p className="mt-1 text-xs font-medium text-primary">
                            {quota.sessionType.charAt(0).toUpperCase() + quota.sessionType.slice(1)} only
                          </p>
                        )}
                        <div className="mt-3 flex flex-wrap gap-2">
                          {quota.quotaRoles?.map((qr: any) => (
                            <span
                              key={qr.role.id}
                              className="inline-flex items-center gap-1.5 py-1 px-2 rounded-lg text-xs font-medium text-white/95"
                              style={{ backgroundColor: qr.role.color || "#71717a" }}
                            >
                              <IconUsers className="w-3 h-3 opacity-90" />
                              {qr.role.name}
                            </span>
                          ))}
                          {quota.quotaDepartments?.map((qd: any) => (
                            <span
                              key={qd.department.id}
                              className="inline-flex items-center gap-1.5 py-1 px-2 rounded-lg text-xs font-medium text-white/95"
                              style={{ backgroundColor: qd.department.color || "#71717a" }}
                            >
                              <IconBriefcase className="w-3 h-3 opacity-90" />
                              {qd.department.name}
                            </span>
                          ))}
                        </div>
                      </div>
                      <div className="shrink-0 flex items-center gap-1">
                        {canManageQuotas && (
                          <button
                            onClick={() => openEditModal(quota)}
                            className="p-2 rounded-lg text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-colors"
                            aria-label="Edit quota"
                          >
                            <IconPencil className="w-4 h-4" />
                          </button>
                        )}
                        {(canDeleteQuotas as boolean) && (
                          <button
                            onClick={() => {
                              setQuotaToDelete(quota);
                              setIsDeleteModalOpen(true);
                            }}
                            className="p-2 rounded-lg text-zinc-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors"
                            aria-label="Delete quota"
                          >
                            <IconTrash className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <Transition appear show={isOpen} as={Fragment}>
        <Dialog
          as="div"
          className="relative z-10"
          onClose={() => {
            setIsOpen(false);
            setEditingQuota(null);
          }}
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
                <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-2xl bg-white dark:bg-zinc-800 p-6 text-left align-middle shadow-xl transition-all border border-zinc-200 dark:border-zinc-700">
                  <Dialog.Title
                    as="h3"
                    className="text-lg font-semibold text-zinc-900 dark:text-white"
                  >
                    {editingQuota ? "Edit quota" : "Create quota"}
                  </Dialog.Title>

                  <div className="mt-2">
                    <FormProvider {...form}>
                      <form onSubmit={handleSubmit(onSubmit)}>
                        <div className="space-y-4">
                          <div>
                            <label className="block text-sm font-medium dark:text-white text-zinc-700 mb-2">
                              Assigned Roles
                            </label>
                            <div className="space-y-2 max-h-48 overflow-y-auto">
                              {roles
                                .filter((role: any) => !role.isOwnerRole)
                                .map((role: any) => (
                                  <label
                                    key={role.id}
                                    className="flex items-center gap-2 p-2 rounded-lg hover:bg-zinc-50 dark:hover:bg-zinc-700 cursor-pointer"
                                  >
                                    <input
                                      type="checkbox"
                                      checked={selectedRoles.includes(role.id)}
                                      onChange={() => toggleRole(role.id)}
                                      className="rounded border-gray-300 text-primary focus:ring-primary"
                                    />
                                    <span className="text-sm text-zinc-900 dark:text-white">
                                      {role.name}
                                    </span>
                                  </label>
                                ))}
                            </div>
                          </div>

                          <div>
                            <label className="block text-sm font-medium dark:text-white text-zinc-700 mb-2">
                              Assigned Departments
                            </label>
                            <div className="space-y-2 max-h-48 overflow-y-auto">
                              {departments.length > 0 ? (
                                departments.map((department: any) => (
                                  <label
                                    key={department.id}
                                    className="flex items-center gap-2 p-2 rounded-lg hover:bg-zinc-50 dark:hover:bg-zinc-700 cursor-pointer"
                                  >
                                    <input
                                      type="checkbox"
                                      checked={selectedDepartments.includes(department.id)}
                                      onChange={() => toggleDepartment(department.id)}
                                      className="rounded border-gray-300 text-primary focus:ring-primary"
                                    />
                                    <span className="text-sm text-zinc-900 dark:text-white">
                                      {department.name}
                                    </span>
                                  </label>
                                ))
                              ) : (
                                <p className="text-sm text-zinc-500 dark:text-zinc-400 italic">
                                  No departments available.
                                </p>
                              )}
                            </div>
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-zinc-700 mb-2 dark:text-white">
                              Quota Type
                            </label>
                            <select
                              {...register("type")}
                              className="w-full rounded-lg border-gray-300 dark:border-zinc-600 bg-white dark:bg-zinc-600 text-zinc-900 dark:text-white focus:border-primary focus:ring-primary"
                            >
                              <option value="mins">Minutes in Game</option>
                              <option value="sessions_hosted">
                                Sessions Hosted
                              </option>
                              <option value="sessions_attended">
                                Sessions Attended
                              </option>
                              <option value="sessions_logged">
                                Sessions Logged
                              </option>
                              <option value="alliance_visits">
                                Alliance Visits
                              </option>
                              <option value="custom">Custom</option>
                            </select>
                            {watchedType && typeDescriptions[watchedType] && (
                              <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                                {typeDescriptions[watchedType]}
                              </p>
                            )}
                          </div>

                          {watchedType !== "custom" && ["sessions_hosted","sessions_attended","sessions_logged"].includes(watchedType) && (
                            <div>
                              <label className="block text-sm font-medium text-zinc-700 mb-2 dark:text-white">
                                Session Type Filter
                              </label>
                              <select
                                value={sessionTypeFilter}
                                onChange={(e) =>
                                  setSessionTypeFilter(e.target.value)
                                }
                                className="w-full rounded-lg border-gray-300 dark:border-zinc-600 bg-white dark:bg-zinc-600 text-zinc-900 dark:text-white focus:border-primary focus:ring-primary"
                              >
                                {sessionTypeOptions.map((opt) => (
                                  <option key={opt.value} value={opt.value}>
                                    {opt.label}
                                  </option>
                                ))}
                              </select>
                              <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                                Filter to count only specific session types
                              </p>
                            </div>
                          )}

                         {watchedType!== "custom" && ( <Input
                            label="Requirement"
                            type="number"
                            append={
                              watchedType === "mins"
                                ? "Minutes"
                                : watchedType === "alliance_visits"
                                ? "Visits"
                                : "Sessions"
                            }
                            classoverride="dark:text-white"
                            {...register("requirement", { required: true })}
                          />)}
                          <Input
                            label="Name"
                            placeholder="Enter a name for this quota..."
                            classoverride="dark:text-white"
                            {...register("name", { required: true })}
                          />
                          <div>
                            <label className="block text-sm font-medium text-zinc-700 mb-2 dark:text-white">
                              Description (Optional)
                            </label>
                            <textarea
                              {...register("description")}
                              placeholder="Add a description for this quota..."
                              className="w-full rounded-lg border-gray-300 dark:border-zinc-600 bg-white dark:bg-zinc-600 text-zinc-900 dark:text-white focus:border-primary focus:ring-primary p-2 resize-none"
                              rows={3}
                            />
                          </div>
                        </div>
                        <input type="submit" className="hidden" />
                      </form>
                    </FormProvider>
                  </div>

                  <div className="mt-6 flex gap-3">
                    <button
                      type="button"
                      className="flex-1 justify-center rounded-xl bg-zinc-100 dark:bg-zinc-700 px-4 py-2.5 text-sm font-medium text-zinc-900 dark:text-white hover:bg-zinc-200 dark:hover:bg-zinc-600 transition-colors"
                      onClick={() => setIsOpen(false)}
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      className="flex-1 justify-center rounded-xl bg-primary px-4 py-2.5 text-sm font-medium text-white hover:bg-primary/90 transition-colors"
                      onClick={handleSubmit(onSubmit)}
                    >
                      {editingQuota ? "Save" : "Create"}
                    </button>
                  </div>
                </Dialog.Panel>
              </Transition.Child>
            </div>
          </div>
        </Dialog>
      </Transition>

      <Transition appear show={isDeleteModalOpen} as={Fragment}>
        <Dialog
          as="div"
          className="relative z-50"
          onClose={() => setIsDeleteModalOpen(false)}
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
            <div className="fixed inset-0 bg-black/70" />
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
                <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-2xl bg-white dark:bg-zinc-800 p-6 text-left align-middle shadow-xl transition-all border border-zinc-200 dark:border-zinc-700">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="shrink-0 w-11 h-11 rounded-xl bg-red-100 dark:bg-red-500/20 flex items-center justify-center">
                      <IconTrash className="w-5 h-5 text-red-600 dark:text-red-400" />
                    </div>
                    <Dialog.Title
                      as="h3"
                      className="text-lg font-semibold text-zinc-900 dark:text-white"
                    >
                      Delete quota
                    </Dialog.Title>
                  </div>

                  <p className="text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">
                    Are you sure you want to delete <span className="font-semibold text-zinc-900 dark:text-white">{quotaToDelete?.name}</span>? This can't be undone.
                  </p>

                  <div className="mt-6 flex gap-3">
                    <button
                      type="button"
                      className="flex-1 justify-center rounded-xl bg-zinc-100 dark:bg-zinc-700 px-4 py-2.5 text-sm font-medium text-zinc-900 dark:text-white hover:bg-zinc-200 dark:hover:bg-zinc-600 transition-colors"
                      onClick={() => {
                        setIsDeleteModalOpen(false);
                        setQuotaToDelete(null);
                      }}
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      className="flex-1 justify-center rounded-xl bg-red-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-red-700 transition-colors"
                      onClick={deleteQuota}
                    >
                      Delete
                    </button>
                  </div>
                </Dialog.Panel>
              </Transition.Child>
            </div>
          </div>
        </Dialog>
      </Transition>

      <Toaster position="bottom-center" />
    </>
  );
};

Quotas.layout = workspace;

export default Quotas;

import workspace from "@/layouts/workspace";
import { pageWithLayout } from "@/layoutTypes";
import { loginState, workspacestate } from "@/state";
import axios from "axios";
import { useRouter } from "next/router";
import {
  useState,
  useMemo,
  Fragment,
  useCallback,
  useRef,
  useEffect,
  forwardRef,
  type ReactNode,
} from "react";
import randomText from "@/utils/randomText";
import { useRecoilState } from "recoil";
import toast from "react-hot-toast";
import { InferGetServerSidePropsType } from "next";
import { withPermissionCheckSsr } from "@/utils/permissionsManager";
import prisma from "@/utils/database";
import { Dialog, Transition } from "@headlessui/react";
import { FormProvider, SubmitHandler, useForm } from "react-hook-form";
import clsx from "clsx";
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
  IconClock,
  IconUser,
  IconSearch,
  IconChevronDown,
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

function quotaAvatarSrc(
  userid: string,
  picture: string | null | undefined,
  workspaceId?: string | string[] | undefined
) {
  if (picture) return picture;
  const wsId = Array.isArray(workspaceId) ? workspaceId[0] : workspaceId;
  if (wsId) return `/api/workspace/${wsId}/avatar/${userid}`;
  return null;
}

function QuotaMemberAvatar({
  userid,
  username,
  picture,
  workspaceId,
  className = "h-7 w-7",
  textClassName = "text-[10px]",
}: {
  userid: string;
  username?: string | null;
  picture?: string | null;
  workspaceId?: string | string[];
  className?: string;
  textClassName?: string;
}) {
  const src = quotaAvatarSrc(userid, picture, workspaceId);
  const boxClass = clsx(
    "inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full leading-none",
    className,
    getRandomBg(userid)
  );

  if (src) {
    return (
      <span className={boxClass}>
        <img
          src={src}
          alt=""
          className="block h-full w-full object-cover"
          style={{ background: "transparent" }}
        />
      </span>
    );
  }

  return (
    <span
      className={clsx(
        boxClass,
        "font-semibold text-zinc-700",
        textClassName
      )}
    >
      {(username || "?")[0]?.toUpperCase()}
    </span>
  );
}

const homePanelShadow =
  "shadow-[0_1px_3px_0_rgb(0,0,0,0.06),0_1px_2px_-1px_rgb(0,0,0,0.04)] dark:shadow-zinc-950/30";

function QuotaFormLabel({ children }: { children: ReactNode }) {
  return (
    <label className="mb-1 block text-[11px] font-medium text-zinc-400 dark:text-zinc-500">
      {children}
    </label>
  );
}

const QuotaFormInput = forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement>
>(function QuotaFormInput({ className, ...props }, ref) {
  return (
    <input
      ref={ref}
      {...props}
      className={clsx(
        "w-full rounded-xl border-0 bg-zinc-100 px-3 py-2 text-sm text-zinc-900 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-primary/40 dark:bg-zinc-800 dark:text-white dark:placeholder-zinc-500",
        className
      )}
    />
  );
});

const QuotaFormSelect = forwardRef<
  HTMLSelectElement,
  React.SelectHTMLAttributes<HTMLSelectElement>
>(function QuotaFormSelect({ className, children, ...props }, ref) {
  return (
    <select
      ref={ref}
      {...props}
      className={clsx(
        "w-full rounded-xl border-0 bg-zinc-100 px-3 py-2 text-sm text-zinc-900 focus:outline-none focus:ring-2 focus:ring-primary/40 dark:bg-zinc-800 dark:text-white",
        className
      )}
    >
      {children}
    </select>
  );
});

const QuotaFormTextarea = forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement>
>(function QuotaFormTextarea({ className, ...props }, ref) {
  return (
    <textarea
      ref={ref}
      {...props}
      className={clsx(
        "w-full resize-none rounded-xl border-0 bg-zinc-100 px-3 py-2 text-sm text-zinc-900 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-primary/40 dark:bg-zinc-800 dark:text-white dark:placeholder-zinc-500",
        className
      )}
    />
  );
});

function QuotaModalCard({
  title,
  hint,
  children,
  className,
}: {
  title: string;
  hint?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={clsx(
        "rounded-2xl bg-white p-4 sm:p-5 dark:bg-zinc-900/70",
        homePanelShadow,
        className
      )}
    >
      <div className="mb-4">
        <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">{title}</h3>
        {hint ? (
          <p className="mt-0.5 text-xs text-zinc-400 dark:text-zinc-500">{hint}</p>
        ) : null}
      </div>
      {children}
    </section>
  );
}

function QuotaPagePanel({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={clsx(
        "rounded-2xl bg-white dark:bg-zinc-900/70",
        homePanelShadow,
        className
      )}
    >
      {children}
    </div>
  );
}

function QuotaInset({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={clsx(
        "rounded-xl bg-zinc-50 px-3.5 py-3 dark:bg-zinc-800/40",
        className
      )}
    >
      {children}
    </div>
  );
}

function QuotaEmptyState({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon: typeof IconTarget;
  title: string;
  description: string;
  action?: { label: string; onClick: () => void; icon?: typeof IconPlus };
}) {
  const ActionIcon = action?.icon ?? IconPlus;
  return (
    <QuotaPagePanel className="mx-auto max-w-md px-8 py-12 text-center">
      <div className="mx-auto mb-4 flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10">
        <Icon className="h-5 w-5 text-primary" stroke={1.75} />
      </div>
      <h3 className="text-base font-semibold text-zinc-900 dark:text-white">{title}</h3>
      <p className="mt-1.5 text-sm leading-relaxed text-zinc-400 dark:text-zinc-500">
        {description}
      </p>
      {action ? (
        <button
          type="button"
          onClick={action.onClick}
          className="mt-5 inline-flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary/90"
        >
          <ActionIcon className="h-4 w-4" />
          {action.label}
        </button>
      ) : null}
    </QuotaPagePanel>
  );
}

function QuotaAssignmentBadges({
  quota,
  workspaceId,
}: {
  quota: any;
  workspaceId?: string | string[];
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {quota.quotaRoles?.map((qr: any) => (
        <span
          key={qr.role.id}
          className="inline-flex items-center gap-1 rounded-lg py-1 pl-1.5 pr-2 text-xs font-medium text-white/95"
          style={{ backgroundColor: qr.role.color || "#71717a" }}
        >
          <IconUsers className="h-3 w-3 opacity-90" />
          {qr.role.name}
        </span>
      ))}
      {quota.quotaDepartments?.map((qd: any) => (
        <span
          key={qd.department.id}
          className="inline-flex items-center gap-1 rounded-lg py-1 pl-1.5 pr-2 text-xs font-medium text-white/95"
          style={{ backgroundColor: qd.department.color || "#71717a" }}
        >
          <IconBriefcase className="h-3 w-3 opacity-90" />
          {qd.department.name}
        </span>
      ))}
      {quota.quotaUsers?.map((qu: any) => {
        const uid = String(qu.user?.userid ?? qu.userId);
        return (
          <span
            key={uid}
            className="inline-flex items-center gap-1.5 rounded-full bg-white py-0.5 pl-0.5 pr-2 text-xs font-medium text-zinc-800 shadow-sm dark:bg-zinc-700/80 dark:text-zinc-100"
          >
            <QuotaMemberAvatar
              userid={uid}
              username={qu.user?.username}
              picture={qu.user?.picture}
              workspaceId={workspaceId}
              className="h-5 w-5"
              textClassName="text-[9px]"
            />
            {qu.user?.username ?? "User"}
          </span>
        );
      })}
    </div>
  );
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
    const userId = (req as any).auth?.userId;
    if (!userId) {
      return {
        props: {
          myQuotas: [],
          allQuotas: [],
          roles: [],
          departments: [],
          members: [],
          canManageQuotas: false,
          canDeleteQuotas: false,
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
          {
            quotaUsers: {
              some: {
                userId: BigInt(userId),
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
        quotaUsers: {
          include: {
            user: {
              select: {
                userid: true,
                username: true,
                picture: true,
              },
            },
          },
        },
      },
    });

    const customQuotaIds = myQuotas
      .filter((q: { type: string }) => q.type === "custom")
      .map((q: { id: string }) => q.id);
    type MyCustomRow = {
      quotaId: string;
      status: string;
      submittedAt: Date;
      reviewedAt: Date | null;
    };
    const myCustomCompletions: MyCustomRow[] =
      customQuotaIds.length > 0
        ? await (prisma as any).quotaCustomCompletion.findMany({
            where: {
              userId: BigInt(userId),
              quotaId: { in: customQuotaIds },
            },
          })
        : [];
    const myCustomByQuotaId = new Map<string, MyCustomRow>(
      myCustomCompletions.map((row) => [row.quotaId, row])
    );

    const myQuotasWithProgress = myQuotas.map((quota: any) => {
      if (quota.type === "custom") {
        const c = myCustomByQuotaId.get(quota.id);
        const approved = c?.status === "approved";
        return {
          ...quota,
          currentValue: approved ? 1 : 0,
          percentage: approved ? 100 : 0,
          customCompletion: c
            ? {
                status: c.status,
                submittedAt: c.submittedAt?.toISOString?.() ?? c.submittedAt,
                reviewedAt: c.reviewedAt?.toISOString?.() ?? c.reviewedAt,
              }
            : null,
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
    let members: any[] = [];

    if (hasManagePermission || hasDeletePermission) {
      const rawAll = await prisma.quota.findMany({
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
          quotaUsers: {
            include: {
              user: {
                select: {
                  userid: true,
                  username: true,
                  picture: true,
                },
              },
            },
          },
        },
      });

      type PendingCustomRow = {
        id: string;
        quotaId: string;
        userId: bigint;
        submittedAt: Date;
        status: string;
        user: {
          userid: bigint;
          username: string | null;
          picture: string | null;
        } | null;
      };
      const pendingCustom: PendingCustomRow[] = await (prisma as any).quotaCustomCompletion.findMany({
        where: {
          status: "pending",
          quota: {
            workspaceGroupId: workspaceId,
            type: "custom",
          },
        },
        include: {
          user: {
            select: {
              userid: true,
              username: true,
              picture: true,
            },
          },
        },
        orderBy: { submittedAt: "asc" },
      });
      const pendingByQuotaId = new Map<string, PendingCustomRow[]>();
      for (const row of pendingCustom) {
        const list = pendingByQuotaId.get(row.quotaId) ?? [];
        list.push(row);
        pendingByQuotaId.set(row.quotaId, list);
      }

      allQuotas = rawAll.map((q) => {
        const enriched = {
          ...q,
          quotaUsers: (q.quotaUsers || []).map((qu: any) => ({
            ...qu,
            user: qu.user
              ? {
                  ...qu.user,
                  userid: String(qu.user.userid),
                  picture: qu.user.picture,
                }
              : null,
          })),
        };
        if (q.type !== "custom") {
          return { ...enriched, pendingCustomSubmissions: [] as unknown[] };
        }
        const list = pendingByQuotaId.get(q.id) ?? [];
        return {
          ...enriched,
          pendingCustomSubmissions: list.map((p: PendingCustomRow) => ({
            id: p.id,
            submittedAt: p.submittedAt?.toISOString?.() ?? p.submittedAt,
            userId: String(p.userId),
            user: p.user
              ? {
                  userid: String(p.user.userid),
                  username: p.user.username,
                  picture: p.user.picture,
                }
              : null,
          })),
        };
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

      const rawMembers = await prisma.user.findMany({
        where: {
          roles: {
            some: { workspaceGroupId: workspaceId },
          },
        },
        select: {
          userid: true,
          username: true,
          picture: true,
        },
        orderBy: { username: "asc" },
      });
      members = rawMembers.map((m) => ({
        userid: m.userid.toString(),
        username: m.username,
        picture: m.picture,
      }));
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
        members: JSON.parse(
          JSON.stringify(members, (_key, value) =>
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
  members: initialMembers,
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
  const members: any = initialMembers;

  const [isOpen, setIsOpen] = useState(false);
  const [editingQuota, setEditingQuota] = useState<any>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [quotaToDelete, setQuotaToDelete] = useState<any>(null);
  const [selectedRoles, setSelectedRoles] = useState<string[]>([]);
  const [selectedDepartments, setSelectedDepartments] = useState<string[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [selectedUserProfiles, setSelectedUserProfiles] = useState<
    Record<string, { username: string; picture: string | null }>
  >({});
  const [userSearchQuery, setUserSearchQuery] = useState("");
  const [userSearchOpen, setUserSearchOpen] = useState(false);
  const [userSearchResults, setUserSearchResults] = useState<
    { userid: string; username: string; picture: string | null }[]
  >([]);
  const [userSearchLoading, setUserSearchLoading] = useState(false);
  const userSearchInputRef = useRef<HTMLDivElement>(null);
  const [sessionTypeFilter, setSessionTypeFilter] = useState<string>("all");
  const [submittingCustomQuotaId, setSubmittingCustomQuotaId] = useState<string | null>(null);
  const [reviewingCustomKey, setReviewingCustomKey] = useState<string | null>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        userSearchInputRef.current &&
        !userSearchInputRef.current.contains(e.target as Node)
      ) {
        setUserSearchOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    const q = userSearchQuery.trim();
    if (!q || !id || typeof id !== "string") {
      setUserSearchResults([]);
      setUserSearchLoading(false);
      return;
    }

    setUserSearchLoading(true);
    const timeout = setTimeout(async () => {
      try {
        const res = await axios.get(
          `/api/workspace/${id}/staff/search/${encodeURIComponent(q)}`
        );
        const users = (res.data.users || [])
          .filter((u: any) => u.userid && !selectedUsers.includes(String(u.userid)))
          .map((u: any) => ({
            userid: String(u.userid),
            username: u.username || "Unknown",
            picture:
              u.picture ||
              (typeof id === "string"
                ? `/api/user/${u.userid}/avatar`
                : null),
          }));
        setUserSearchResults(users);
      } catch {
        setUserSearchResults([]);
      } finally {
        setUserSearchLoading(false);
      }
    }, 300);

    return () => clearTimeout(timeout);
  }, [userSearchQuery, id, selectedUsers]);

  const selectedUserEntries = useMemo(() => {
    return selectedUsers.map((userId) => {
      const cached = selectedUserProfiles[userId];
      if (cached) {
        return { userid: userId, ...cached };
      }
      const fromMembers = members.find((m: any) => String(m.userid) === userId);
      if (fromMembers) {
        return {
          userid: userId,
          username: fromMembers.username || "Unknown",
          picture: fromMembers.picture,
        };
      }
      const fromQuota = editingQuota?.quotaUsers?.find(
        (qu: any) => String(qu.user?.userid ?? qu.userId) === userId
      );
      if (fromQuota?.user) {
        return {
          userid: userId,
          username: fromQuota.user.username || "Unknown",
          picture: fromQuota.user.picture,
        };
      }
      return {
        userid: userId,
        username: "Unknown",
        picture: null,
      };
    });
  }, [selectedUsers, selectedUserProfiles, members, editingQuota]);

  const patchMyQuotaCustom = useCallback((quotaId: string, customCompletion: any) => {
    setMyQuotas((prev) =>
      prev.map((q: any) => {
        if (q.id !== quotaId) return q;
        const approved = customCompletion?.status === "approved";
        return {
          ...q,
          customCompletion,
          currentValue: approved ? 1 : 0,
          percentage: approved ? 100 : 0,
        };
      })
    );
  }, []);

  const submitCustomComplete = (quota: any) => {
    if (!id || typeof id !== "string") return;
    setSubmittingCustomQuotaId(quota.id);
    const req = axios
      .post(`/api/workspace/${id}/activity/quotas/${quota.id}/custom-submit`)
      .then((res) => {
        const c = res.data.completion;
        patchMyQuotaCustom(quota.id, {
          status: c.status,
          submittedAt: c.submittedAt,
          reviewedAt: c.reviewedAt ?? null,
        });
      })
      .finally(() => setSubmittingCustomQuotaId(null));
    toast.promise(req, {
      loading: "Submitting…",
      success: "Submitted for approval.",
      error: (err) => err.response?.data?.error || "Could not submit.",
    });
  };

  const reviewCustomCompletion = (
    quotaId: string,
    memberUserId: string,
    decision: "approve" | "deny"
  ) => {
    if (!id || typeof id !== "string") return;
    const key = `${quotaId}-${memberUserId}`;
    setReviewingCustomKey(key);
    const req = axios
      .patch(`/api/workspace/${id}/activity/quotas/${quotaId}/custom-review`, {
        memberUserId,
        decision,
      })
      .then(() => {
        setAllQuotas((prev: any[]) =>
          prev.map((q: any) => {
            if (q.id !== quotaId) return q;
            return {
              ...q,
              pendingCustomSubmissions: (q.pendingCustomSubmissions ?? []).filter(
                (p: any) => p.userId !== memberUserId
              ),
            };
          })
        );
      })
      .finally(() => setReviewingCustomKey(null));
    toast.promise(req, {
      loading: decision === "approve" ? "Approving…" : "Denying…",
      success: decision === "approve" ? "Marked complete." : "Request denied.",
      error: (err) => err.response?.data?.error || "Action failed.",
    });
  };

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
    setSelectedUsers([]);
    setSelectedUserProfiles({});
    setUserSearchQuery("");
    setUserSearchOpen(false);
    setUserSearchResults([]);
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
    const userIds = (quota.quotaUsers ?? [])
      .map((qu: any) => String(qu.user?.userid ?? qu.userId))
      .filter(Boolean);
    setSelectedUsers(userIds);
    const profiles: Record<string, { username: string; picture: string | null }> = {};
    for (const qu of quota.quotaUsers ?? []) {
      const uid = String(qu.user?.userid ?? qu.userId);
      if (!uid) continue;
      profiles[uid] = {
        username: qu.user?.username || "Unknown",
        picture: qu.user?.picture ?? null,
      };
    }
    setSelectedUserProfiles(profiles);
    setUserSearchQuery("");
    setUserSearchOpen(false);
    setUserSearchResults([]);
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

  const addUser = (member: { userid: string; username: string; picture: string | null }) => {
    const userId = String(member.userid);
    setSelectedUsers((prev) => (prev.includes(userId) ? prev : [...prev, userId]));
    setSelectedUserProfiles((prev) => ({
      ...prev,
      [userId]: {
        username: member.username,
        picture: member.picture,
      },
    }));
    setUserSearchQuery("");
    setUserSearchOpen(false);
    setUserSearchResults([]);
  };

  const removeUser = (userId: string) => {
    setSelectedUsers((prev) => prev.filter((u) => u !== userId));
    setSelectedUserProfiles((prev) => {
      const next = { ...prev };
      delete next[userId];
      return next;
    });
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
      users: selectedUsers,
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
        setSelectedUsers([]);
        setSelectedUserProfiles({});
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

  const dateLabel = new Date().toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
  const workspaceLabel = workspace.customName || workspace.groupName;
  const pageSubtitle =
    activeTab === "my-quotas"
      ? "Track your progress and see how you're doing"
      : "Create and manage quotas for your workspace";

  return (
    <>
      <div className="pagePadding">
        <div className="mx-auto max-w-6xl">
          <header className="mb-5 sm:mb-6">
            <div className="flex flex-col gap-4 border-b border-zinc-200 pb-5 dark:border-zinc-800 sm:flex-row sm:items-end sm:justify-between">
              <div className="min-w-0">
                <p className="text-xs text-zinc-500 dark:text-zinc-400">{dateLabel}</p>
                <h1 className="mt-0.5 text-xl font-semibold tracking-tight text-zinc-900 dark:text-white sm:text-2xl">
                  Quotas
                </h1>
                <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">{pageSubtitle}</p>
                <p className="mt-0.5 text-xs text-zinc-400 dark:text-zinc-500">{workspaceLabel}</p>
              </div>
              {activeTab === "manage-quotas" && canManageQuotas && (
                <button
                  type="button"
                  onClick={openCreateModal}
                  className="inline-flex shrink-0 items-center gap-1.5 self-start rounded-xl bg-primary px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary/90 sm:self-auto"
                >
                  <IconPlus className="h-4 w-4" />
                  Create quota
                </button>
              )}
            </div>
          </header>

          {(canManageQuotas || (canDeleteQuotas as boolean)) && (
            <nav className="mb-5 flex w-fit gap-0.5 rounded-xl bg-zinc-100 p-1 dark:bg-zinc-800/80 sm:mb-6">
              <button
                type="button"
                onClick={() => setActiveTab("my-quotas")}
                className={clsx(
                  "flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition-all duration-200",
                  activeTab === "my-quotas"
                    ? "bg-white text-zinc-900 shadow-sm dark:bg-zinc-700 dark:text-white"
                    : "text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white"
                )}
              >
                <IconTarget className="h-4 w-4 shrink-0" stroke={1.75} />
                <span>My Quotas</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("manage-quotas")}
                className={clsx(
                  "flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition-all duration-200",
                  activeTab === "manage-quotas"
                    ? "bg-white text-zinc-900 shadow-sm dark:bg-zinc-700 dark:text-white"
                    : "text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white"
                )}
              >
                <IconClipboardList className="h-4 w-4 shrink-0" stroke={1.75} />
                <span>Manage Quotas</span>
              </button>
            </nav>
          )}

          {(!(canManageQuotas || (canDeleteQuotas as boolean)) || activeTab === "my-quotas") && (
            <div className="flex flex-col gap-4 sm:gap-5">
              {myQuotas.length === 0 ? (
                <QuotaEmptyState
                  icon={IconTarget}
                  title="No quotas assigned"
                  description="You don't have any activity quotas yet. When a quota is assigned to you, your roles, or your departments, it'll show up here."
                />
              ) : (
                <div className="flex flex-col gap-4 sm:gap-5">
                  {myQuotas.map((quota: any) => {
                    const customStatus = quota.customCompletion?.status;
                    const isCustomApproved = quota.type === "custom" && customStatus === "approved";
                    const isCustomPending = quota.type === "custom" && customStatus === "pending";
                    const isCustomDenied = quota.type === "custom" && customStatus === "denied";
                    const isComplete =
                      (quota.type !== "custom" && quota.percentage >= 100) || isCustomApproved;
                    const barWidth =
                      quota.type === "custom"
                        ? isCustomApproved
                          ? 100
                          : 0
                        : Math.min(quota.percentage, 100);
                    return (
                      <QuotaPagePanel key={quota.id} className="overflow-hidden">
                        <div className="p-4 sm:p-5">
                          <div className="flex items-start gap-3.5">
                            <div
                              className={clsx(
                                "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl",
                                isComplete
                                  ? "bg-primary/10 dark:bg-primary/20"
                                  : "bg-zinc-100 dark:bg-zinc-800"
                              )}
                            >
                              <IconTrophy
                                className={clsx(
                                  "h-5 w-5",
                                  isComplete
                                    ? "text-primary"
                                    : "text-zinc-500 dark:text-zinc-400"
                                )}
                                stroke={1.75}
                              />
                            </div>
                            <div className="min-w-0 flex-1">
                              <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-100 sm:text-[15px]">
                                {quota.name}
                              </h3>
                              {quota.type !== "custom" && formatGoal(quota) && (
                                <p className="mt-0.5 text-xs text-zinc-400 dark:text-zinc-500">
                                  Goal · {formatGoal(quota)}
                                </p>
                              )}
                              {quota.type === "custom" && (
                                <p className="mt-0.5 text-xs italic text-zinc-400 dark:text-zinc-500">
                                  Tracked manually
                                </p>
                              )}
                              {quota.description && (
                                <p className="mt-2 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
                                  {quota.description}
                                </p>
                              )}
                              {quota.sessionType && quota.sessionType !== "all" && (
                                <p className="mt-1.5 text-xs font-medium text-primary">
                                  {quota.sessionType.charAt(0).toUpperCase() + quota.sessionType.slice(1)} only
                                </p>
                              )}
                            </div>
                          </div>

                          {quota.type !== "custom" && (
                            <div className="mt-4">
                              <div className="mb-2 flex items-baseline justify-between gap-2">
                                <span className="text-[11px] font-medium text-zinc-400 dark:text-zinc-500">
                                  Progress
                                </span>
                                <span className="text-sm font-semibold tabular-nums text-zinc-900 dark:text-zinc-100">
                                  {quota.currentValue}{" "}
                                  <span className="font-normal text-zinc-400 dark:text-zinc-500">
                                    / {quota.value}
                                  </span>
                                </span>
                              </div>
                              <div className="h-2 overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
                                <div
                                  className="h-full rounded-full bg-primary transition-all"
                                  style={{ width: `${barWidth}%` }}
                                />
                              </div>
                              <p className="mt-1.5 text-xs text-zinc-400 dark:text-zinc-500">
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
                            <div className="mt-4 space-y-3">
                              {isCustomPending && (
                                <QuotaInset className="flex items-start gap-2.5">
                                  <IconClock className="mt-px h-4 w-4 shrink-0 text-zinc-400" stroke={1.75} />
                                  <p className="text-sm leading-snug text-zinc-600 dark:text-zinc-400">
                                    Submitted — pending review by someone who can manage quotas.
                                  </p>
                                </QuotaInset>
                              )}
                              {isCustomApproved && (
                                <p className="text-sm font-medium text-primary">
                                  Your completion was approved.
                                </p>
                              )}
                              {isCustomDenied && (
                                <p className="text-sm text-zinc-600 dark:text-zinc-400">
                                  Your last completion request was not approved. You can submit again when you are ready.
                                </p>
                              )}
                              {!isCustomPending && !isCustomApproved && !isCustomDenied && (
                                <p className="text-xs leading-relaxed text-zinc-400 dark:text-zinc-500">
                                  Tracked manually by your team. Mark complete when you have finished; a manager will approve it.
                                </p>
                              )}
                              {!isCustomPending && !isCustomApproved && (
                                <button
                                  type="button"
                                  disabled={submittingCustomQuotaId === quota.id}
                                  onClick={() => submitCustomComplete(quota)}
                                  className="inline-flex items-center justify-center rounded-xl bg-primary px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary/90 disabled:pointer-events-none disabled:opacity-60"
                                >
                                  {submittingCustomQuotaId === quota.id ? "Submitting…" : "Mark as complete"}
                                </button>
                              )}
                            </div>
                          )}

                          {quota.type === "custom" && isCustomApproved && (
                            <div className="mt-4">
                              <div className="mb-2 flex items-baseline justify-between gap-2">
                                <span className="text-[11px] font-medium text-zinc-400 dark:text-zinc-500">
                                  Status
                                </span>
                                <span className="text-sm font-semibold tabular-nums text-primary">
                                  Complete
                                </span>
                              </div>
                              <div className="h-2 overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
                                <div
                                  className="h-full rounded-full bg-primary transition-all"
                                  style={{ width: `${barWidth}%` }}
                                />
                              </div>
                            </div>
                          )}

                          <QuotaInset className="mt-4">
                            <p className="mb-2 text-[11px] font-medium text-zinc-400 dark:text-zinc-500">
                              Assigned to
                            </p>
                            <QuotaAssignmentBadges quota={quota} workspaceId={id} />
                          </QuotaInset>
                        </div>
                      </QuotaPagePanel>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {activeTab === "manage-quotas" && (canManageQuotas || (canDeleteQuotas as boolean)) && (
            <div className="flex flex-col gap-4 sm:gap-5">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                  All quotas
                </h2>
                {allQuotas.length > 0 && (
                  <span className="text-xs text-zinc-400 dark:text-zinc-500 tabular-nums">
                    {allQuotas.length} total
                  </span>
                )}
              </div>

              {allQuotas.length === 0 ? (
                <QuotaEmptyState
                  icon={IconClipboardList}
                  title="No quotas yet"
                  description={
                    canManageQuotas
                      ? "Create your first quota and assign it to roles, departments, or specific users."
                      : "No activity quotas have been set up yet."
                  }
                  action={
                    canManageQuotas
                      ? { label: "Create quota", onClick: openCreateModal }
                      : undefined
                  }
                />
              ) : (
                <div className="flex flex-col gap-4 sm:gap-5">
                  {allQuotas.map((quota: any) => (
                    <QuotaPagePanel key={quota.id} className="overflow-hidden">
                      <div className="flex items-start justify-between gap-3 p-4 sm:p-5">
                        <div className="min-w-0 flex-1">
                          <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
                            {quota.name}
                          </h3>
                          {quota.type !== "custom" ? (
                            <p className="mt-0.5 text-xs text-zinc-400 dark:text-zinc-500">
                              {quota.value} {types[quota.type]}
                            </p>
                          ) : (
                            <p className="mt-0.5 text-xs italic text-zinc-400 dark:text-zinc-500">
                              Manually tracked
                            </p>
                          )}
                          {quota.description && (
                            <p className="mt-2 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
                              {quota.description}
                            </p>
                          )}
                          {quota.sessionType && quota.sessionType !== "all" && (
                            <p className="mt-1.5 text-xs font-medium text-primary">
                              {quota.sessionType.charAt(0).toUpperCase() + quota.sessionType.slice(1)} only
                            </p>
                          )}
                          <div className="mt-3">
                            <QuotaAssignmentBadges quota={quota} workspaceId={id} />
                          </div>
                          {quota.type === "custom" &&
                            (quota.pendingCustomSubmissions?.length ?? 0) > 0 && (
                              <div className="mt-4">
                                <p className="mb-2 text-[11px] font-medium text-zinc-400 dark:text-zinc-500">
                                  Awaiting review
                                </p>
                                <ul className="divide-y divide-zinc-100 overflow-hidden rounded-xl bg-zinc-50 dark:divide-zinc-800 dark:bg-zinc-800/40">
                                  {quota.pendingCustomSubmissions.map((sub: any) => {
                                    const rk = `${quota.id}-${sub.userId}`;
                                    const busy = reviewingCustomKey === rk;
                                    return (
                                      <li
                                        key={sub.id}
                                        className="flex flex-col gap-3 px-3 py-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4"
                                      >
                                        <div className="flex min-w-0 items-center gap-3">
                                          <QuotaMemberAvatar
                                            userid={String(sub.userId)}
                                            username={sub.user?.username}
                                            picture={sub.user?.picture}
                                            workspaceId={id}
                                            className="h-8 w-8"
                                            textClassName="text-xs"
                                          />
                                          <div className="min-w-0">
                                            <p className="truncate text-sm font-medium text-zinc-900 dark:text-zinc-100">
                                              {sub.user?.username ?? `User ${sub.userId}`}
                                            </p>
                                            <p className="text-xs tabular-nums text-zinc-400 dark:text-zinc-500">
                                              {new Date(sub.submittedAt).toLocaleString(undefined, {
                                                dateStyle: "medium",
                                                timeStyle: "short",
                                              })}
                                            </p>
                                          </div>
                                        </div>
                                        {canManageQuotas ? (
                                          <div className="flex shrink-0 flex-wrap items-center gap-2 sm:justify-end">
                                            <button
                                              type="button"
                                              disabled={busy}
                                              onClick={() =>
                                                reviewCustomCompletion(quota.id, sub.userId, "approve")
                                              }
                                              className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-3 py-1.5 text-sm font-medium text-white hover:bg-primary/90 disabled:opacity-50"
                                            >
                                              <IconCheck className="h-4 w-4" stroke={2} />
                                              Approve
                                            </button>
                                            <button
                                              type="button"
                                              disabled={busy}
                                              onClick={() =>
                                                reviewCustomCompletion(quota.id, sub.userId, "deny")
                                              }
                                              className="inline-flex items-center gap-1.5 rounded-xl bg-zinc-100 px-3 py-1.5 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-200/80 disabled:opacity-50 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-700"
                                            >
                                              <IconX className="h-4 w-4" stroke={2} />
                                              Deny
                                            </button>
                                          </div>
                                        ) : (
                                          <p className="text-xs text-zinc-400 dark:text-zinc-500">
                                            Needs quota edit permission to resolve.
                                          </p>
                                        )}
                                      </li>
                                    );
                                  })}
                                </ul>
                              </div>
                            )}
                        </div>
                        <div className="flex shrink-0 items-center gap-0.5">
                          {canManageQuotas && (
                            <button
                              type="button"
                              onClick={() => openEditModal(quota)}
                              className="rounded-lg p-2 text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-700 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
                              aria-label="Edit quota"
                            >
                              <IconPencil className="h-4 w-4" stroke={1.75} />
                            </button>
                          )}
                          {(canDeleteQuotas as boolean) && (
                            <button
                              type="button"
                              onClick={() => {
                                setQuotaToDelete(quota);
                                setIsDeleteModalOpen(true);
                              }}
                              className="rounded-lg p-2 text-zinc-400 transition-colors hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-500/10"
                              aria-label="Delete quota"
                            >
                              <IconTrash className="h-4 w-4" stroke={1.75} />
                            </button>
                          )}
                        </div>
                      </div>
                    </QuotaPagePanel>
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
            setUserSearchQuery("");
            setUserSearchOpen(false);
            setUserSearchResults([]);
            setSelectedUserProfiles({});
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
                <Dialog.Panel
                  className={clsx(
                    "w-full max-w-lg transform overflow-hidden rounded-2xl bg-zinc-50/90 text-left align-middle transition-all dark:bg-zinc-950/90",
                    homePanelShadow
                  )}
                >
                  <div className="border-b border-zinc-100/80 px-5 py-4 dark:border-zinc-800/80 sm:px-6">
                    <Dialog.Title
                      as="h3"
                      className="text-base font-semibold text-zinc-900 dark:text-zinc-100 sm:text-lg"
                    >
                      {editingQuota ? "Edit quota" : "Create quota"}
                    </Dialog.Title>
                    <p className="mt-1 text-xs text-zinc-400 dark:text-zinc-500 sm:text-sm">
                      Assign to roles, departments, or specific members.
                    </p>
                  </div>

                  <FormProvider {...form}>
                    <form onSubmit={handleSubmit(onSubmit)}>
                      <div className="max-h-[min(72vh,680px)] overflow-y-auto px-4 py-4 sm:px-5 sm:py-5 space-y-4">
                        <QuotaModalCard
                          title="Assignment"
                          hint="Choose at least one role, department, or user."
                        >
                          <div className="space-y-3">
                            <div className="rounded-xl bg-zinc-50 p-3 dark:bg-zinc-800/60">
                              <p className="mb-2 flex items-center gap-1.5 text-[11px] font-medium text-zinc-400 dark:text-zinc-500">
                                <IconUsers className="h-3.5 w-3.5" />
                                Roles
                              </p>
                              <div className="max-h-28 space-y-0.5 overflow-y-auto">
                                {roles
                                  .filter((role: any) => !role.isOwnerRole)
                                  .map((role: any) => (
                                    <label
                                      key={role.id}
                                      className="flex cursor-pointer items-center gap-2.5 rounded-lg px-2 py-1.5 hover:bg-white/80 dark:hover:bg-zinc-700/40"
                                    >
                                      <input
                                        type="checkbox"
                                        checked={selectedRoles.includes(role.id)}
                                        onChange={() => toggleRole(role.id)}
                                        className="rounded border-zinc-300 text-primary focus:ring-primary/30 dark:border-zinc-600"
                                      />
                                      <span className="text-sm text-zinc-800 dark:text-zinc-200">
                                        {role.name}
                                      </span>
                                    </label>
                                  ))}
                              </div>
                            </div>

                            <div className="rounded-xl bg-zinc-50 p-3 dark:bg-zinc-800/60">
                              <p className="mb-2 flex items-center gap-1.5 text-[11px] font-medium text-zinc-400 dark:text-zinc-500">
                                <IconBriefcase className="h-3.5 w-3.5" />
                                Departments
                              </p>
                              <div className="max-h-28 space-y-0.5 overflow-y-auto">
                                {departments.length > 0 ? (
                                  departments.map((department: any) => (
                                    <label
                                      key={department.id}
                                      className="flex cursor-pointer items-center gap-2.5 rounded-lg px-2 py-1.5 hover:bg-white/80 dark:hover:bg-zinc-700/40"
                                    >
                                      <input
                                        type="checkbox"
                                        checked={selectedDepartments.includes(department.id)}
                                        onChange={() => toggleDepartment(department.id)}
                                        className="rounded border-zinc-300 text-primary focus:ring-primary/30 dark:border-zinc-600"
                                      />
                                      <span className="text-sm text-zinc-800 dark:text-zinc-200">
                                        {department.name}
                                      </span>
                                    </label>
                                  ))
                                ) : (
                                  <p className="py-1 text-sm italic text-zinc-400 dark:text-zinc-500">
                                    No departments available.
                                  </p>
                                )}
                              </div>
                            </div>

                            <div className="rounded-xl bg-zinc-50 p-3 dark:bg-zinc-800/60">
                              <p className="mb-2 flex items-center gap-1.5 text-[11px] font-medium text-zinc-400 dark:text-zinc-500">
                                <IconUser className="h-3.5 w-3.5" />
                                Users
                              </p>
                              {members.length > 0 ? (
                                <div className="space-y-2.5">
                                  {selectedUserEntries.length > 0 && (
                                    <div className="flex flex-wrap gap-2">
                                      {selectedUserEntries.map((member) => (
                                        <span
                                          key={member.userid}
                                          className="inline-flex items-center gap-1.5 rounded-full bg-white py-1 pl-1 pr-2 text-sm shadow-sm dark:bg-zinc-700/80"
                                        >
                                          <QuotaMemberAvatar
                                            userid={member.userid}
                                            username={member.username}
                                            picture={member.picture}
                                            workspaceId={id}
                                            className="h-6 w-6"
                                            textClassName="text-[9px]"
                                          />
                                          <span className="font-medium text-zinc-800 dark:text-zinc-100">
                                            {member.username}
                                          </span>
                                          <button
                                            type="button"
                                            onClick={() => removeUser(member.userid)}
                                            className="rounded-full p-0.5 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600 dark:hover:bg-zinc-600"
                                            aria-label={`Remove ${member.username}`}
                                          >
                                            <IconX className="h-3 w-3" />
                                          </button>
                                        </span>
                                      ))}
                                    </div>
                                  )}
                                  <div ref={userSearchInputRef} className="relative">
                                    <IconSearch className="pointer-events-none absolute left-3 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-zinc-400" />
                                    <QuotaFormInput
                                      type="text"
                                      value={userSearchQuery}
                                      onChange={(e) => {
                                        setUserSearchQuery(e.target.value);
                                        setUserSearchOpen(true);
                                      }}
                                      onFocus={() => setUserSearchOpen(true)}
                                      placeholder="Search by username..."
                                      className="!pl-9"
                                    />
                                    {userSearchOpen && userSearchQuery.trim() && (
                                      <div
                                        className={clsx(
                                          "absolute z-20 mt-1.5 w-full overflow-hidden rounded-xl bg-white dark:bg-zinc-800",
                                          homePanelShadow
                                        )}
                                      >
                                        <div className="max-h-40 overflow-y-auto py-1">
                                          {userSearchLoading ? (
                                            <p className="px-3 py-2.5 text-center text-xs text-zinc-400">
                                              Searching…
                                            </p>
                                          ) : userSearchResults.length === 0 ? (
                                            <p className="px-3 py-2.5 text-center text-xs text-zinc-400">
                                              No members found
                                            </p>
                                          ) : (
                                            userSearchResults.map((member) => (
                                              <button
                                                key={member.userid}
                                                type="button"
                                                onClick={() => addUser(member)}
                                                className="flex w-full items-center gap-2.5 px-3 py-2.5 text-left hover:bg-zinc-50 dark:hover:bg-zinc-700/50"
                                              >
                                                <QuotaMemberAvatar
                                                  userid={member.userid}
                                                  username={member.username}
                                                  picture={member.picture}
                                                  workspaceId={id}
                                                  className="h-8 w-8"
                                                />
                                                <span className="text-sm font-medium leading-none text-zinc-900 dark:text-white">
                                                  {member.username}
                                                </span>
                                              </button>
                                            ))
                                          )}
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              ) : (
                                <p className="text-sm italic text-zinc-400 dark:text-zinc-500">
                                  No members available.
                                </p>
                              )}
                            </div>
                          </div>
                        </QuotaModalCard>

                        <QuotaModalCard title="Quota details">
                          <div className="space-y-3">
                            <div>
                              <QuotaFormLabel>Quota type</QuotaFormLabel>
                              <div className="relative">
                                <QuotaFormSelect {...register("type")}>
                                  <option value="mins">Minutes in Game</option>
                                  <option value="sessions_hosted">Sessions Hosted</option>
                                  <option value="sessions_attended">Sessions Attended</option>
                                  <option value="sessions_logged">Sessions Logged</option>
                                  <option value="alliance_visits">Alliance Visits</option>
                                  <option value="custom">Custom</option>
                                </QuotaFormSelect>
                                <IconChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
                              </div>
                              {watchedType && typeDescriptions[watchedType] && (
                                <p className="mt-1.5 text-xs leading-relaxed text-zinc-400 dark:text-zinc-500">
                                  {typeDescriptions[watchedType]}
                                </p>
                              )}
                            </div>

                            {watchedType !== "custom" &&
                              ["sessions_hosted", "sessions_attended", "sessions_logged"].includes(
                                watchedType
                              ) && (
                                <div>
                                  <QuotaFormLabel>Session type</QuotaFormLabel>
                                  <div className="relative">
                                    <QuotaFormSelect
                                      value={sessionTypeFilter}
                                      onChange={(e) => setSessionTypeFilter(e.target.value)}
                                    >
                                      {sessionTypeOptions.map((opt) => (
                                        <option key={opt.value} value={opt.value}>
                                          {opt.label}
                                        </option>
                                      ))}
                                    </QuotaFormSelect>
                                    <IconChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
                                  </div>
                                </div>
                              )}

                            {watchedType !== "custom" && (
                              <div>
                                <QuotaFormLabel>Requirement</QuotaFormLabel>
                                <div className="flex overflow-hidden rounded-xl bg-zinc-100 dark:bg-zinc-800">
                                  <QuotaFormInput
                                    type="number"
                                    className="!rounded-none !bg-transparent focus:!ring-0"
                                    {...register("requirement", { required: true })}
                                  />
                                  <span className="flex shrink-0 items-center border-l border-zinc-200/80 px-3 text-sm text-zinc-500 dark:border-zinc-700 dark:text-zinc-400">
                                    {watchedType === "mins"
                                      ? "Minutes"
                                      : watchedType === "alliance_visits"
                                        ? "Visits"
                                        : "Sessions"}
                                  </span>
                                </div>
                              </div>
                            )}

                            <div>
                              <QuotaFormLabel>Name</QuotaFormLabel>
                              <QuotaFormInput
                                placeholder="Enter a name for this quota..."
                                {...register("name", { required: true })}
                              />
                            </div>

                            <div>
                              <QuotaFormLabel>Description (optional)</QuotaFormLabel>
                              <QuotaFormTextarea
                                rows={3}
                                placeholder="Add a description for this quota..."
                                {...register("description")}
                              />
                            </div>
                          </div>
                        </QuotaModalCard>
                      </div>

                      <input type="submit" className="hidden" />

                      <div className="flex items-center gap-2 border-t border-zinc-100/80 bg-white px-5 py-3.5 dark:border-zinc-800/80 dark:bg-zinc-900/70 sm:px-6">
                        <button
                          type="button"
                          className="rounded-xl px-4 py-2 text-sm font-medium text-zinc-500 transition-colors hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800"
                          onClick={() => setIsOpen(false)}
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          className="ml-auto inline-flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary/90"
                          onClick={handleSubmit(onSubmit)}
                        >
                          <IconCheck className="h-3.5 w-3.5" />
                          {editingQuota ? "Save" : "Create quota"}
                        </button>
                      </div>
                    </form>
                  </FormProvider>
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
    </>
  );
};

Quotas.layout = workspace;

export default Quotas;

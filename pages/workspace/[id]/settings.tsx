"use client";

import type { pageWithLayout } from "@/layoutTypes";
import { loginState } from "@/state";
import {
  IconHome,
  IconLock,
  IconFlag,
  IconKey,
  IconServer,
  IconBellExclamation,
  IconHourglassHigh,
  IconLink,
  IconAdjustments,
} from "@tabler/icons-react";
import Permissions from "@/components/settings/permissions";
import Workspace from "@/layouts/workspace";
import type { GetServerSideProps } from "next";
import * as All from "@/components/settings/general";
import * as Api from "@/components/settings/api";
import * as Instance from "@/components/settings/instance";
import * as Integrations from "@/components/settings/integration";
import * as cookie from "cookie";
import toast from "react-hot-toast";
import * as noblox from "noblox.js";
import { withPermissionCheckSsr } from "@/utils/permissionsManager";
import prisma from "@/utils/database";
import { useRouter } from "next/router";
import {
  getUsername,
  getDisplayName,
  getThumbnail,
} from "@/utils/userinfoEngine";
import { useState, useEffect } from "react";
import clsx from "clsx";
import { getSessionByToken } from "@/utils/session";

const encodeTab = (tab: string) => {
  return btoa(tab);
};

const decodeTab = (value: string | null) => {
  if (!value) return null;
  try {
    return atob(value);
  } catch {
    return null;
  }
};

export const getServerSideProps: GetServerSideProps = withPermissionCheckSsr(
  async ({ params, res, req }) => {
    if (!params?.id) {
      res.statusCode = 404;
      return { props: {} };
    }

    const workspaceGroupId = Number.parseInt(params.id as string);
    const cookies = cookie.parse(req.headers.cookie || "");
    const token = cookies.session_token;
    if (!token)
      return { redirect: { destination: "/login", permanent: false } };

    const session = await getSessionByToken(token);
    if (!session)
      return { redirect: { destination: "/login", permanent: false } };

    const currentUserId = session.userId; // already a BigInt

    const currentUser = await prisma.user.findFirst({
      where: { userid: currentUserId },
      include: {
        workspaceMemberships: { where: { workspaceGroupId } },
        roles: { where: { workspaceGroupId } },
      },
    });

    const membership = currentUser?.workspaceMemberships?.[0];
    const isAdmin = membership?.isAdmin || false;
    const userPermissions = currentUser?.roles?.[0]?.permissions || [];

    const grouproles = await noblox.getRoles(Number(params.id));
    const users = await prisma.user.findMany({
      where: {
        roles: {
          some: {
            workspaceGroupId: Number.parseInt(params.id as string),
          },
        },
      },
      include: {
        roles: {
          where: {
            workspaceGroupId: Number.parseInt(params.id as string),
          },
        },
        workspaceMemberships: {
          where: {
            workspaceGroupId: Number.parseInt(params.id as string),
          },
        },
      },
    });

    const roles = await prisma.role.findMany({
      where: {
        workspaceGroupId: Number.parseInt(params.id as string),
      },
    });

    const departments = await prisma.department.findMany({
      where: {
        workspaceGroupId: Number.parseInt(params.id as string),
      },
    });

    const usersWithInfo = await Promise.all(
      users.map(async (user) => {
        const username = user.username || (await getUsername(user.userid));
        const thumbnail = user.picture || getThumbnail(user.userid);
        const displayName =
          user.username || (await getDisplayName(user.userid));
        return {
          ...user,
          userid: Number(user.userid),
          username,
          thumbnail,
          displayName,
          workspaceMemberships: user.workspaceMemberships?.map((m) => ({
            ...m,
            userId: Number(m.userId),
            lineManagerId: m.lineManagerId ? Number(m.lineManagerId) : null,
            joinDate: m.joinDate ? m.joinDate.toISOString() : null,
          })),
        };
      }),
    );

    return {
      props: {
        users: usersWithInfo.map((u) => ({
          ...u,
          roles: u.roles.map((r: any) => ({
            ...r,
            groupRoles: r.groupRoles.map((id: any) => id.toString()),
          })),
        })),
        roles: roles.map((r) => ({
          ...r,
          groupRoles: r.groupRoles.map((id) => id.toString()),
        })),
        departments: departments.map((d) => ({
          ...d,
          createdAt: d.createdAt ? d.createdAt.toISOString() : null,
          updatedAt: d.updatedAt ? d.updatedAt.toISOString() : null,
        })),
        grouproles,
        isAdmin,
        userPermissions,
      },
    };
  },
  [
    "admin",
    "workspace_customisation",
    "reset_activity",
    "manage_features",
    "manage_apikeys",
    "view_audit_logs",
  ],
);

type Props = {
  roles: [];
  users: [];
  departments: [];
  grouproles: [];
  isAdmin: boolean;
  userPermissions: string[];
};

const FEATURE_FLAGS = [
  "Guide",
  "Sessions",
  "Alliances",
  "Leaderboard",
  "Notices",
  "Resignations",
  "Policies",
  "Forms",
];

const SECTIONS = {
  general: {
    name: "General",
    icon: IconHome,
    description: "Basic workspace settings and preferences",
    components: Object.entries(All)
      .filter(([key]) => key === "Color" || key === "home" || key === "Admin")
      .sort(([keyA], [keyB]) => {
        if (keyA === "home") return -1;
        if (keyB === "home") return 1;
        if (keyA === "Admin") return 1;
        if (keyB === "Admin") return -1;
        return 0;
      })
      .map(([key, Component]) => ({
        key,
        component: Component,
        title: Component.title,
      })),
  },
  activity: {
    name: "Activity",
    icon: IconHourglassHigh,
    description: "Manage activity tracking and reset",
    components: Object.entries(All)
      .filter(([key]) => key === "Activity")
      .map(([key, Component]) => ({
        key,
        component: Component,
        title: Component.title,
      })),
  },
  features: {
    name: "Feature Flags",
    icon: IconFlag,
    description: "Enable or disable workspace features",
    components: Object.entries(All)
      .filter(([key]) => FEATURE_FLAGS.includes(key))
      .map(([key, Component]) => ({
        key,
        component: Component,
        title: Component.title,
      })),
  },
  api: {
    name: "Public API",
    icon: IconKey,
    description: "Manage API keys and access documentation",
    components: Object.entries(Api).map(([key, Component]) => ({
      key,
      component: Component,
      title: Component.title,
    })),
  },
  permissions: {
    name: "Permissions",
    icon: IconLock,
    description: "Manage roles and user permissions",
    components: [],
  },
  audit: {
    name: "Audit Logs",
    icon: IconBellExclamation,
    description: "View workspace audit events and filters",
    components: [],
  },
  instance: {
    name: "Services",
    icon: IconServer,
    description: "Configure external services and integrations",
    components: Object.entries(Instance).map(([key, Component]) => ({
      key,
      component: Component,
      title: Component.title,
    })),
  },
  integration: {
    name: "Integrations",
    icon: IconLink,
    description:
      "Use our integrations that require minimal setup for your experiences.",
    components: Object.entries(Integrations).map(([key, Component]) => ({
      key,
      component: Component,
      title: Component.title,
    })),
  },
  other: {
    name: "Other",
    icon: IconAdjustments,
    description: "Extra workspace preferences",
    components: Object.entries(All)
      .filter(([key]) => key === "Other")
      .map(([key, Component]) => ({
        key,
        component: Component,
        title: Component.title,
      })),
  },
};

const Settings: pageWithLayout<Props> = ({
  users,
  roles,
  departments,
  grouproles,
  isAdmin,
  userPermissions,
}) => {
  const [activeSection, setActiveSection] = useState("general");
  const [isSidebarExpanded] = useState(true);

  const hasPermission = (permission: string) => {
    return isAdmin || userPermissions.includes(permission);
  };

  const router = useRouter();

  useEffect(() => {
    const t = router.query.t as string | undefined;
    const decoded = decodeTab(t ?? null);

    if (decoded && SECTIONS[decoded as keyof typeof SECTIONS]) {
      setActiveSection(decoded);
    }
  }, [router.query.t]);

  const canAccessGeneral = hasPermission("workspace_customisation");
  const canAccessActivity = hasPermission("reset_activity");
  const canAccessFeatures = hasPermission("manage_features");
  const canAccessApi = hasPermission("manage_apikeys");
  const canAccessPermissions = isAdmin || hasPermission("admin"); // Admins or admin permission
  const canAccessAudit = hasPermission("view_audit_logs");
  const canAccessInstance = isAdmin || hasPermission("admin"); // Admins or admin permission
  const canAccessOther =
    hasPermission("manage_features") ||
    hasPermission("workspace_customisation");

  const availableSections = Object.entries(SECTIONS).filter(([key]) => {
    if (key === "general") return canAccessGeneral;
    if (key === "activity") return canAccessActivity;
    if (key === "features") return canAccessFeatures;
    if (key === "api") return canAccessApi;
    if (key === "permissions") return canAccessPermissions;
    if (key === "audit") return canAccessAudit;
    if (key === "instance") return canAccessInstance;
    if (key === "integration") return canAccessPermissions && canAccessApi; // api access is required, upon download it'll create a key and assign to that user, a key.
    if (key === "other") return canAccessOther;
    return false;
  });

  useEffect(() => {
    if (
      availableSections.length > 0 &&
      !availableSections.find(([key]) => key === activeSection)
    ) {
      setActiveSection(availableSections[0][0]);
    }
  }, []);

  const panelClass =
    "rounded-2xl bg-white shadow-[0_1px_3px_0_rgb(0,0,0,0.06),0_1px_2px_-1px_rgb(0,0,0,0.04)] dark:bg-zinc-900/70 dark:shadow-zinc-950/30";

  const renderContent = () => {
    if (activeSection === "permissions") {
      return (
        <div className={`${panelClass} p-5 sm:p-6`}>
          <Permissions
            users={users}
            roles={roles}
            departments={departments}
            grouproles={grouproles}
          />
        </div>
      );
    }

    if (activeSection === "audit") {
      return (
        <div className={`${panelClass} p-5 sm:p-6`}>
          <All.AuditLogs />
        </div>
      );
    }

    if (activeSection === "api") {
      const apiComponents = [...SECTIONS.api.components];
      const apiKeyIndex = apiComponents.findIndex(({ key }) =>
        key.toLowerCase().includes("key"),
      );
      if (apiKeyIndex > 0) {
        const [apiKeyComponent] = apiComponents.splice(apiKeyIndex, 1);
        apiComponents.unshift(apiKeyComponent);
      }
      return (
        <div className="space-y-4">
          {apiComponents.map(({ component: Component }, index) => (
            <div key={index} className={`${panelClass} p-5 sm:p-6`}>
              <Component triggerToast={toast} />
            </div>
          ))}
        </div>
      );
    }

    if (activeSection === "features") {
      return (
        <div className={`${panelClass} overflow-hidden`}>
          <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
            {SECTIONS.features.components.map(
              ({ component: Component, key }) => {
                const componentProps: any = { triggerToast: toast };
                return <Component key={key} {...componentProps} />;
              },
            )}
          </div>
        </div>
      );
    }

    const section = SECTIONS[activeSection as keyof typeof SECTIONS];
    const isServices = activeSection === "instance";

    if (isServices) {
      return (
        <div className="grid min-w-0 auto-rows-min gap-4 sm:grid-cols-2">
          {section.components.map(({ component: Component, title, key }) => {
            const componentProps: any = {
              triggerToast: toast,
              isSidebarExpanded,
              title,
            };
            return (
              <div key={key} className="min-w-0">
                <Component {...componentProps} />
              </div>
            );
          })}
        </div>
      );
    }

    return (
      <div className="space-y-4">
        {section.components.map(
          ({ component: Component, title, key }, index) => {
            const componentProps: any = { triggerToast: toast };

            if (key === "Admin") {
              componentProps.isAdmin = isAdmin;
            } else {
              componentProps.isSidebarExpanded = isSidebarExpanded;
              componentProps.hasResetActivityOnly =
                activeSection === "activity" &&
                !isAdmin &&
                !userPermissions.includes("workspace_customisation");
            }

            if ((Component as any).isAboveOthers) {
              return <Component key={index} {...componentProps} />;
            }

            return (
              <div key={index} className={`${panelClass} p-5 sm:p-6`}>
                <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 mb-4">
                  {title}
                </p>
                <Component {...componentProps} />
              </div>
            );
          },
        )}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-7">
          <h1 className="text-xl font-semibold text-zinc-900 dark:text-white">
            Settings
          </h1>
          <p className="text-sm text-zinc-400 dark:text-zinc-500 mt-0.5">
            Manage your workspace preferences and configurations
          </p>
        </div>

        <div className="flex flex-col lg:flex-row gap-8">
          <div className="w-full lg:w-48 flex-shrink-0">
            <nav className="space-y-0.5">
              {availableSections.map(([key, section]) => {
                const Icon = section.icon;
                const isActive = activeSection === key;
                return (
                  <button
                    key={key}
                    onClick={() => {
                        const encoded = encodeTab(key);
                        setActiveSection(key);
                        router.replace(
                          {
                            pathname: router.pathname,
                            query: { ...router.query, t: encoded },
                          },
                          undefined,
                          { shallow: true }
                        );
                      }}
                    className={clsx(
                      "w-full flex items-center gap-2.5 px-3 py-2 text-sm rounded-xl transition-colors text-left",
                      isActive
                        ? "bg-zinc-100 dark:bg-zinc-800/80 text-zinc-900 dark:text-zinc-100 font-medium"
                        : "text-zinc-500 dark:text-zinc-400 hover:bg-zinc-100/70 dark:hover:bg-zinc-800/40 hover:text-zinc-700 dark:hover:text-zinc-200",
                    )}
                  >
                    <Icon size={15} strokeWidth={isActive ? 2.2 : 1.75} />
                    <span>{section.name}</span>
                  </button>
                );
              })}
            </nav>
          </div>

          <div className="flex-1 min-w-0">
            <div className="mb-5">
              <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
                {SECTIONS[activeSection as keyof typeof SECTIONS]?.name ||
                  "Settings"}
              </h2>
              <p className="text-sm text-zinc-400 dark:text-zinc-500 mt-0.5">
                {SECTIONS[activeSection as keyof typeof SECTIONS]
                  ?.description || "Manage your settings"}
              </p>
            </div>

            {renderContent()}
          </div>
        </div>
      </div>
    </div>
  );
};

Settings.layout = Workspace;

export default Settings;

"use client"

import type { pageWithLayout } from "@/layoutTypes"
import { loginState } from "@/state"
import { IconChevronRight, IconHome, IconLock, IconFlag, IconKey, IconServer, IconBellExclamation, IconHourglassHigh } from "@tabler/icons-react"
import Permissions from "@/components/settings/permissions"
import Workspace from "@/layouts/workspace"
import { useRecoilState } from "recoil"
import type { GetServerSideProps } from "next"
import * as All from "@/components/settings/general"
import * as Api from "@/components/settings/api"
import * as Instance from "@/components/settings/instance"
import toast, { Toaster } from "react-hot-toast"
import * as noblox from "noblox.js"
import { withPermissionCheckSsr } from "@/utils/permissionsManager"
import prisma from "@/utils/database"
import { getUsername, getDisplayName } from "@/utils/userinfoEngine"
import { useState, useEffect } from "react"
import clsx from "clsx"

export const getServerSideProps: GetServerSideProps = withPermissionCheckSsr(async ({ params, res, req }) => {
  if (!params?.id) {
    res.statusCode = 404
    return { props: {} }
  }

  const workspaceGroupId = Number.parseInt(params.id as string);
  const currentUserId = req.session?.userid;
  const currentUser = await prisma.user.findFirst({
    where: { userid: BigInt(currentUserId) },
    include: {
      workspaceMemberships: {
        where: { workspaceGroupId },
      },
      roles: {
        where: { workspaceGroupId },
      },
    },
  });
  
  const membership = currentUser?.workspaceMemberships?.[0];
  const isAdmin = membership?.isAdmin || false;
  const userPermissions = currentUser?.roles?.[0]?.permissions || [];

  const grouproles = await noblox.getRoles(Number(params.id))
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
        }
      },
      workspaceMemberships: {
        where: {
          workspaceGroupId: Number.parseInt(params.id as string),
        },
      },
    },
  })

  const roles = await prisma.role.findMany({
    where: {
      workspaceGroupId: Number.parseInt(params.id as string),
    }
  })

  const departments = await prisma.department.findMany({
    where: {
      workspaceGroupId: Number.parseInt(params.id as string),
    }
  })

  const usersWithInfo = await Promise.all(
    users.map(async (user) => {
      const username = user.username || (await getUsername(user.userid))
      const thumbnail = user.picture || ""
      const displayName = user.username || (await getDisplayName(user.userid))
      return {
        ...user,
        userid: Number(user.userid),
        username,
        thumbnail,
        displayName,
        workspaceMemberships: user.workspaceMemberships?.map(m => ({
          ...m,
          userId: Number(m.userId),
          lineManagerId: m.lineManagerId ? Number(m.lineManagerId) : null,
          joinDate: m.joinDate ? m.joinDate.toISOString() : null,
        })),
      }
    }),
  )

  return {
    props: {
      users: usersWithInfo,
      roles,
      departments,
      grouproles,
      isAdmin,
      userPermissions,
    },
  }
}, ["admin", "workspace_customisation", "reset_activity", "manage_features", "manage_apikeys", "view_audit_logs"])

type Props = {
  roles: []
  users: []
  departments: []
  grouproles: []
  isAdmin: boolean
  userPermissions: string[]
}

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
      .filter(([key]) => key === "Guide" || key === "Sessions" || key === "Alliances" || key === "Leaderboard" || key === "Notices" || key === "Policies")
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
}

const Settings: pageWithLayout<Props> = ({ users, roles, departments, grouproles, isAdmin, userPermissions }) => {
  const [activeSection, setActiveSection] = useState("general")
  const [isSidebarExpanded] = useState(true)

  const hasPermission = (permission: string) => {
    return isAdmin || userPermissions.includes(permission);
  };

  const canAccessGeneral = hasPermission('workspace_customisation');
  const canAccessActivity = hasPermission('reset_activity');
  const canAccessFeatures = hasPermission('manage_features');
  const canAccessApi = hasPermission('manage_apikeys');
  const canAccessPermissions = isAdmin || hasPermission('admin'); // Admins or admin permission
  const canAccessAudit = hasPermission('view_audit_logs');
  const canAccessInstance = isAdmin || hasPermission('admin'); // Admins or admin permission

  const availableSections = Object.entries(SECTIONS).filter(([key]) => {
    if (key === 'general') return canAccessGeneral;
    if (key === 'activity') return canAccessActivity;
    if (key === 'features') return canAccessFeatures;
    if (key === 'api') return canAccessApi;
    if (key === 'permissions') return canAccessPermissions;
    if (key === 'audit') return canAccessAudit;
    if (key === 'instance') return canAccessInstance;
    return false;
  });

  useEffect(() => {
    if (availableSections.length > 0 && !availableSections.find(([key]) => key === activeSection)) {
      setActiveSection(availableSections[0][0]);
    }
  }, []);

  const renderContent = () => {
    if (activeSection === "permissions") {
      return (
        <div className="bg-white dark:bg-zinc-800 rounded-lg shadow-sm p-4 sm:p-6">
          <Permissions users={users} roles={roles} departments={departments} grouproles={grouproles} />
        </div>
      )
    }

    if (activeSection === "audit") {
      return (
        <div className="bg-white dark:bg-zinc-800 rounded-lg shadow-sm p-4 sm:p-6">
          <All.AuditLogs />
        </div>
      )
    }

	if (activeSection === "api") {
	  const apiComponents = [...SECTIONS.api.components]
	  const apiKeyIndex = apiComponents.findIndex(({ key }) => key.toLowerCase().includes("key"))
	  if (apiKeyIndex > 0) {
		const [apiKeyComponent] = apiComponents.splice(apiKeyIndex, 1)
		apiComponents.unshift(apiKeyComponent)
	  }
	  return apiComponents.map(({ component: Component }, index) => (
		<div key={index} className="bg-white dark:bg-zinc-800 rounded-lg shadow-sm p-4 sm:p-6 mb-4 last:mb-0">
		  <div className="mb-4">
			<Component triggerToast={toast} />
		  </div>
		</div>
	  ))
	}

    return SECTIONS[activeSection as keyof typeof SECTIONS].components.map(({ component: Component, title, key }, index) => {
      const componentProps: any = { triggerToast: toast };
      
      if (key === 'Admin') {
        componentProps.isAdmin = isAdmin;
      } else {
        componentProps.isSidebarExpanded = isSidebarExpanded;
        componentProps.hasResetActivityOnly = activeSection === 'activity' && !isAdmin && !userPermissions.includes('workspace_customisation');
      }
      
      return (
        <div key={index} className="bg-white dark:bg-zinc-800 rounded-lg shadow-sm p-4 sm:p-6 mb-4 last:mb-0">
          <div className="mb-4">
            <h3 className="text-lg font-medium text-zinc-900 dark:text-white mb-2">{title}</h3>
            <Component {...componentProps} />
          </div>
        </div>
      );
    })
  }

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-900">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-semibold text-zinc-900 dark:text-white">Settings</h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
            Manage your workspace preferences and configurations
          </p>
        </div>

        <div className="flex flex-col lg:flex-row gap-4">
          {/* Navigation Sidebar */}
          <div className="w-full lg:w-64 flex-shrink-0">
            <div className="bg-white dark:bg-zinc-800 rounded-lg shadow-sm p-3">
              <nav className="space-y-1">
                {availableSections.map(([key, section]) => {
                  const Icon = section.icon
                  return (
                    <button
                      key={key}
                      onClick={() => setActiveSection(key)}
                      className={clsx(
                        "w-full flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-lg transition-colors",
                        activeSection === key
                          ? "text-primary bg-primary/10 dark:bg-primary/20"
                          : "text-zinc-700 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-700",
                      )}
                    >
                      <Icon size={18} />
                      <span>{section.name}</span>
                      <IconChevronRight
                        size={16}
                        className={clsx(
                          "ml-auto transition-transform text-zinc-400 dark:text-zinc-300",
                          activeSection === key ? "rotate-90" : "",
                        )}
                      />
                    </button>
                  )
                })}
              </nav>
            </div>
          </div>

          {/* Main Content */}
          <div className="flex-1">
            <div className="mb-4">
              <h2 className="text-lg font-medium text-zinc-900 dark:text-white">
                {SECTIONS[activeSection as keyof typeof SECTIONS]?.name || 'Settings'}
              </h2>
              <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
                {SECTIONS[activeSection as keyof typeof SECTIONS]?.description || 'Manage your settings'}
              </p>
            </div>

            <div className="space-y-4">{renderContent()}</div>
          </div>
        </div>
      </div>
      <Toaster position="bottom-center" />
    </div>
  )
}

Settings.layout = Workspace

export default Settings

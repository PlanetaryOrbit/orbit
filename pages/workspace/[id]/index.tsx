"use client"

import type React from "react"
import type { pageWithLayout } from "@/layoutTypes"
import { loginState, workspacestate } from "@/state"
import Workspace from "@/layouts/workspace"
import Sessions from "@/components/home/sessions"
import Notices from "@/components/home/notices"
import Docs from "@/components/home/docs"
import Policies from "@/components/home/policies"
import randomText from "@/utils/randomText"
import wall from "@/components/home/wall"
import StickyNoteAnnouncement from "@/components/sticky-note-announcement"
import Birthdays from "@/components/birthdays"
import NewToTeam from "@/components/newmembers"
import UserPolicyDashboard from "@/components/UserPolicyDashboard"
import PolicyNotificationBanner from "@/components/PolicyNotificationBanner"
import ComplianceOverviewWidget from "@/components/ComplianceOverviewWidget"
import { useRecoilState } from "recoil"
import { useMemo, useEffect, useState } from "react"
import { useRouter } from "next/router"
import {
  IconHome,
  IconWall,
  IconFileText,
  IconSpeakerphone,
  IconChevronRight,
  IconSettings,
  IconPlus,
  IconRefresh,
  IconArrowRight,
  IconGift,
  IconShield,
  IconAlertTriangle,
} from "@tabler/icons-react"
import clsx from "clsx"

interface WidgetConfig {
  component: React.FC
  icon: React.ComponentType<{ className?: string }>
  title: string
  description: string
  color: string
  beta?: boolean;
}

const Home: pageWithLayout = () => {
  const [login, setLogin] = useRecoilState(loginState)
  const [workspace, setWorkspace] = useRecoilState(workspacestate)
  const router = useRouter()
  const text = useMemo(() => randomText(login.displayname), [login.displayname])
  const [isLoadingTitle, setIsLoadingTitle] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [titleVisible, setTitleVisible] = useState(false)
  const [loading, setLoading] = useState(true)
  const [policiesEnabled, setPoliciesEnabled] = useState(false)

  const widgets: Record<string, WidgetConfig> = {
    wall: {
      component: wall,
      icon: IconWall,
      title: "Wall",
      description: "Latest messages and announcements",
      color: "bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20",
    },
    sessions: {
      component: Sessions,
      icon: IconSpeakerphone,
      title: "Sessions",
      description: "Ongoing and upcoming sessions",
      color: "bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20",
    },
    notices: {
      component: Notices,
      icon: IconAlertTriangle,
      title: "Notices",
      description: "Staff currently on notice",
      color: "bg-gradient-to-br from-pink-50 to-pink-100 dark:from-pink-900/20 dark:to-pink-800/20",
    },
    documents: {
      component: Docs,
      icon: IconFileText,
      title: "Documents",
      description: "Latest workspace documents",
      color: "bg-gradient-to-br from-amber-50 to-amber-100 dark:from-amber-900/20 dark:to-amber-800/20",
    },
    policies: {
      component: Policies,
      icon: IconShield,
      title: "Policies",
      description: "Track your policy acknowledgments",
      color: "bg-gradient-to-br from-red-50 to-red-100 dark:from-red-900/20 dark:to-red-800/20",
	  beta: true,
    },
    compliance: {
      component: () => <ComplianceOverviewWidget workspaceId={workspace.groupId.toString()} />,
      icon: IconShield,
      title: "Compliance Overview",
      description: "Workspace-wide compliance metrics",
      color: "bg-gradient-to-br from-emerald-50 to-emerald-100 dark:from-emerald-900/20 dark:to-emerald-800/20",
	  beta: true,
    },
  }

  useEffect(() => {
    if (typeof window !== "undefined") {
      setIsLoadingTitle(document.title.includes("Loading"))
    }

    const timer = setTimeout(() => {
      setTitleVisible(true)
    }, 300)

    return () => clearTimeout(timer)
  }, [])

  useEffect(() => {
    if (
      workspace &&
      workspace.groupId &&
      workspace.settings &&
      Array.isArray(workspace.settings.widgets)
    ) {
      setLoading(false)
    }
  }, [workspace])

  useEffect(() => {
    if (workspace?.groupId) {
      fetch(`/api/workspace/${workspace.groupId}/settings/general/policies`)
        .then(res => res.json())
        .then(data => {
          let enabled = false;
          let val = data.value ?? data;
          if (typeof val === "string") {
            try { val = JSON.parse(val); } catch { val = {}; }
          }
          enabled =
            typeof val === "object" && val !== null && "enabled" in val
              ? (val as { enabled?: boolean }).enabled ?? false
              : false;
          setPoliciesEnabled(enabled);
        })
        .catch(() => setPoliciesEnabled(false));
    }
  }, [workspace?.groupId])

  const handleRefresh = () => {
    setRefreshing(true)
    setTimeout(() => {
      setRefreshing(false)
    }, 1000)
  }

  return (
    <div className="pagePadding">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
          <div className="relative">
            <div className="absolute -left-3 -top-3 w-20 h-20 bg-primary/5 rounded-full blur-2xl"></div>
            <div className="relative">
              <div
                className={clsx(
                  "transition-all duration-700 transform",
                  titleVisible ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0",
                )}
              >
                <span className="text-xs font-medium text-primary uppercase tracking-wider mb-1 block">
                  Welcome back
                </span>
                <h1 className="text-4xl font-extrabold text-zinc-900 dark:text-white mb-2 bg-clip-text text-transparent bg-gradient-to-r from-primary to-primary/70">
                  {text}
                </h1>
                <div
                  className={clsx(
                    "h-1 w-16 bg-gradient-to-r from-primary to-primary/30 rounded-full mb-3 transition-all duration-1000 transform",
                    titleVisible ? "scale-x-100 opacity-100" : "scale-x-0 opacity-0",
                  )}
                ></div>
                <p className="text-sm text-zinc-500 dark:text-zinc-400 max-w-md">
                  Here's what's happening in your workspace today
                </p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handleRefresh}
              className="p-2 rounded-full bg-white dark:bg-zinc-800 shadow-sm hover:shadow transition-all duration-200 text-zinc-500 dark:text-zinc-300 hover:text-primary dark:hover:text-primary"
              aria-label="Refresh dashboard"
            >
              <IconRefresh className={clsx("w-5 h-5", refreshing && "animate-spin")} />
            </button>
           
          </div>
        </div>
        {policiesEnabled && (
          <div className="mb-8 z-0 relative">
            <PolicyNotificationBanner
              workspaceId={workspace.groupId.toString()}
              onPolicyClick={(policyId) => {
                if (policyId === 'dashboard') {
                  router.push(`/workspace/${workspace.groupId}/policies`);
                } else {
                  router.push(`/workspace/${workspace.groupId}/policies/sign/${policyId}`);
                }
              }}
            />
          </div>
        )}
        {Array.isArray(workspace.settings.widgets) && workspace.settings.widgets.includes("birthdays") && (
          <div className="mb-8 z-0 relative">
            <Birthdays />
          </div>
        )}
        {Array.isArray(workspace.settings.widgets) && workspace.settings.widgets.includes("new_members") && (
          <div className="mb-8 z-0 relative">
            <NewToTeam />
          </div>
        )}
        <div className="mb-8 z-0 relative">
          <StickyNoteAnnouncement />
        </div>

        {loading ? (
          <div className="bg-white dark:bg-zinc-800 rounded-2xl shadow-sm p-12 text-center border border-zinc-100 dark:border-zinc-700">
            <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-gradient-to-br from-primary/10 to-primary/30 flex items-center justify-center">
              <IconHome className="w-12 h-12 text-primary" />
            </div>
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-zinc-900 dark:text-white">
                Hold on... your workspace is still loading or we're pushing an update 😋
              </h3>
              <div className="flex justify-center">
                <div className="animate-pulse flex space-x-2">
                  <div className="w-2 h-2 bg-primary rounded-full"></div>
                  <div className="w-2 h-2 bg-primary rounded-full"></div>
                  <div className="w-2 h-2 bg-primary rounded-full"></div>
                </div>
              </div>
            </div>
          </div>
        ) : workspace.settings.widgets.length > 0 ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {workspace.settings.widgets.map((widget, index) => {
              const widgetConfig = widgets[widget]
              if (!widgetConfig) return null
              const Widget = widgetConfig.component
              const Icon = widgetConfig.icon
              return (
                <div
                  key={widget}
                  className={clsx(
                    "bg-white dark:bg-zinc-800 rounded-2xl shadow-sm hover:shadow-md transition-all duration-300 overflow-hidden border border-zinc-100 dark:border-zinc-700",
                    "transform hover:-translate-y-1",
                  )}
                >
                  <div className={`px-6 py-5 ${widgetConfig.color} border-b border-zinc-100 dark:border-zinc-700`}>
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-white/80 dark:bg-zinc-800/80 backdrop-blur-sm flex items-center justify-center shadow-sm">
                        <Icon className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <div className="flex flex-row items-center gap-2">
							<h2 className="text-lg font-bold text-zinc-900 dark:text-white">{widgetConfig.title}</h2>
							{widgetConfig.beta && <span className="px-1.5 py-0.5 text-xs font-medium bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400 rounded-full">
								BETA
							</span>}
						</div>
                        <p className="text-sm text-zinc-600 dark:text-zinc-300">{widgetConfig.description}</p>
                      </div>
                    </div>
                  </div>

                  <div className="p-6">
                    <Widget />
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          <div className="bg-white dark:bg-zinc-800 rounded-2xl shadow-sm p-12 text-center border border-zinc-100 dark:border-zinc-700">
            <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-gradient-to-br from-primary/10 to-primary/30 flex items-center justify-center">
              <IconHome className="w-12 h-12 text-primary" />
            </div>
            <h3 className="text-2xl font-bold text-zinc-900 dark:text-white mb-3 bg-clip-text text-transparent bg-gradient-to-r from-gray-900 to-gray-600 dark:from-white dark:to-gray-300">
              Your dashboard is empty
            </h3>
            <p className="text-zinc-500 dark:text-zinc-400 mb-8 max-w-md mx-auto">
              Add widgets to your workspace to see important information at a glance
            </p>
            <button
              onClick={() => (window.location.href = `/workspace/${workspace.groupId}/settings`)}
              className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-white rounded-xl hover:bg-primary/90 transition-all duration-300 shadow-sm hover:shadow group"
            >
              <IconPlus className="w-5 h-5" />
              <span>Configure Dashboard</span>
              <IconChevronRight className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" />
            </button>
          </div>
        )}

      </div>
    </div>
  )
}


Home.layout = Workspace

export default Home

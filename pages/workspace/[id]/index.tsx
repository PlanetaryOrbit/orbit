"use client"

import type React from "react"
import type { pageWithLayout } from "@/layoutTypes"
import { loginState, workspacestate } from "@/state"
import Workspace from "@/layouts/workspace"
import Sessions from "@/components/home/sessions"
import Notices from "@/components/home/notices"
import Docs from "@/components/home/docs"
import randomText from "@/utils/randomText"
import wall from "@/components/home/wall"
import StickyNoteAnnouncement from "@/components/stickyannouncement"
import Birthdays from "@/components/birthdays"
import NewToTeam from "@/components/newmembers"
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
  IconArrowRight,
  IconGift,
  IconAlertTriangle,
} from "@tabler/icons-react"
import clsx from "clsx"
import { withPermissionCheckSsr } from "@/utils/permissionsManager"
import { GetServerSideProps } from "next"
import RandomMusic from "@/components/home/randommusic"
import QuickLinks from "@/components/home/quickLinks"

export const getServerSideProps: GetServerSideProps = withPermissionCheckSsr(
  async ({ query }) => {
    return {
      props: {},
    }
  }
)

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
  const [titleVisible, setTitleVisible] = useState(false)
  const [loading, setLoading] = useState(true)
  const [banner, setBanner] = useState<string | null>(null)

  const widgets: Record<string, WidgetConfig> = {
    wall: {
      component: wall,
      icon: IconWall,
      title: "Wall",
      description: "Latest messages and announcements",
      color: "text-blue-600 dark:text-blue-400",
    },
    sessions: {
      component: Sessions,
      icon: IconSpeakerphone,
      title: "Sessions",
      description: "Ongoing and upcoming sessions",
      color: "text-violet-600 dark:text-violet-400",
    },
    notices: {
      component: Notices,
      icon: IconAlertTriangle,
      title: "Notices",
      description: "Staff currently on notice",
      color: "text-pink-600 dark:text-pink-400",
    },
    documents: {
      component: Docs,
      icon: IconFileText,
      title: "Documents",
      description: "Latest workspace documents",
      color: "text-amber-600 dark:text-amber-400",
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
    if (workspace?.groupId && login?.userId) {
      const detectedTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      fetch(`/api/workspace/${workspace.groupId}/timezone`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ timezone: detectedTimezone }),
      }).catch(() => { });
    }
  }, [workspace?.groupId, login?.userId])

  useEffect(() => {
    if (!workspace?.groupId) return;
    fetch(`/api/workspace/${workspace.groupId}/settings/general/banner`)
      .then((r) => r.json())
      .then((data) => { if (data.banner) setBanner(data.banner) })
      .catch(() => { });
  }, [workspace?.groupId])

  return (
    <div className="pagePadding">
      <div className="max-w-5xl mx-auto">
        {banner ? (
          <div className="relative w-full h-44 md:h-56 rounded-2xl overflow-hidden mb-8 border border-zinc-200 dark:border-zinc-700">
            <img
              src={banner}
              alt="Workspace banner"
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-zinc-950/70 via-zinc-950/10 to-transparent" />
            <div className="absolute inset-0 flex items-end px-6 pb-5">
              <div
                className={clsx(
                  "transition-all duration-500",
                  titleVisible ? "translate-y-0 opacity-100" : "translate-y-2 opacity-0",
                )}
              >
                <span className="text-xs font-medium text-primary uppercase tracking-wider mb-1 block">
                  Welcome back
                </span>
                <h1 className="text-2xl font-semibold tracking-tight text-white mb-0.5">
                  {text}
                </h1>
                <p className="text-sm text-white/60">
                  Here's what's happening in your workspace
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div
            className={clsx(
              "mb-8 transition-all duration-500",
              titleVisible ? "translate-y-0 opacity-100" : "translate-y-2 opacity-0",
            )}
          >
            <span className="text-xs font-medium text-primary uppercase tracking-wider mb-1 block">
              Welcome back
            </span>
            <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-white mb-1">
              {text}
            </h1>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              Here's what's happening in your workspace
            </p>
          </div>
        )}
        {Array.isArray(workspace.settings.widgets) && workspace.settings.widgets.includes("new_members") && (
          <div className="mb-8 z-0 relative">
            <NewToTeam />
          </div>
        )}
        {Array.isArray(workspace.settings.widgets) && workspace.settings.widgets.includes("birthdays") && (
          <div className="mb-8 z-0 relative">
            <Birthdays />
          </div>
        )}
        <div className="mb-8 z-0 relative">
          <StickyNoteAnnouncement />
        </div>
        {Array.isArray(workspace.settings.widgets) && workspace.settings.widgets.includes("music_quote") && (
          <div className="mb-8 z-0 relative">
            <RandomMusic />
          </div>
        )}
        {Array.isArray(workspace.settings.widgets) && workspace.settings.widgets.includes("quick_links") && (
          <div className="mb-8 z-0 relative">
            <QuickLinks />
          </div>
        )}
        {loading ? (
          <div className="rounded-2xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800/50 p-12 text-center">
            <div className="mx-auto w-14 h-14 rounded-2xl bg-zinc-200 dark:bg-zinc-700 flex items-center justify-center mb-4">
              <IconHome className="w-7 h-7 text-zinc-500 dark:text-zinc-400" />
            </div>
            <h3 className="text-base font-semibold text-zinc-900 dark:text-white mb-1">
              Loading your workspace
            </h3>
            <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-4">
              Hold on, we're getting everything ready
            </p>
            <div className="flex justify-center gap-1.5">
              <div className="w-2 h-2 bg-zinc-400 dark:bg-zinc-500 rounded-full animate-pulse" />
              <div className="w-2 h-2 bg-zinc-400 dark:bg-zinc-500 rounded-full animate-pulse [animation-delay:150ms]" />
              <div className="w-2 h-2 bg-zinc-400 dark:bg-zinc-500 rounded-full animate-pulse [animation-delay:300ms]" />
            </div>
          </div>
        ) : workspace.settings.widgets.length > 0 ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {workspace.settings.widgets.map((widget) => {
              const widgetConfig = widgets[widget]
              if (!widgetConfig) return null
              const Widget = widgetConfig.component
              const Icon = widgetConfig.icon
              return (
                <div
                  key={widget}
                  className="rounded-2xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800/50 overflow-hidden"
                >
                  <div className="px-5 py-4 border-b border-zinc-100 dark:border-zinc-700">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-xl bg-zinc-100 dark:bg-zinc-700 flex items-center justify-center shrink-0 ${widgetConfig.color}`}>
                        <Icon className="w-5 h-5" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <h2 className="text-base font-semibold text-zinc-900 dark:text-white">
                            {widgetConfig.title}
                          </h2>
                          {widgetConfig.beta && (
                            <span className="px-1.5 py-0.5 text-xs font-medium bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-300 rounded-md">
                              BETA
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-0.5">
                          {widgetConfig.description}
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="p-5">
                    <Widget />
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          <div className="rounded-2xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/50 p-12 text-center max-w-md mx-auto">
            <div className="mx-auto w-14 h-14 rounded-2xl bg-zinc-200 dark:bg-zinc-700 flex items-center justify-center mb-4">
              <IconHome className="w-7 h-7 text-zinc-500 dark:text-zinc-400" />
            </div>
            <h3 className="text-base font-semibold text-zinc-900 dark:text-white mb-1">
              Dashboard is empty
            </h3>
            <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-6">
              Add widgets in workspace settings to see updates at a glance.
            </p>
            <button
              onClick={() => (window.location.href = `/workspace/${workspace.groupId}/settings`)}
              className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium bg-primary text-white rounded-xl hover:bg-primary/90 transition-colors"
            >
              <IconPlus className="w-4 h-4" />
              Configure dashboard
            </button>
          </div>
        )}

      </div>
    </div>
  )
}


Home.layout = Workspace

export default Home

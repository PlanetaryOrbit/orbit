"use client"

import type { pageWithLayout } from "@/layoutTypes"
import { loginState, workspacestate } from "@/state"
import Workspace from "@/layouts/workspace"
import randomText from "@/utils/randomText"
import { useRecoilState } from "recoil"
import { useMemo, useEffect, useState } from "react"
import { useRouter } from "next/router"
import { IconPlus, IconLayoutDashboard, IconWall, IconBell, IconUsers, IconArrowRight } from "@tabler/icons-react"
import { withPermissionCheckSsr } from "@/utils/permissionsManager"
import { GetServerSideProps } from "next"
import { HomeDashboard } from "@/components/home/dashboard"
import { normalizeHomeWidgetOrder } from "@/utils/homeWidgets"

export const getServerSideProps: GetServerSideProps = withPermissionCheckSsr(async () => ({
  props: {},
}))

const Home: pageWithLayout = () => {
  const [login] = useRecoilState(loginState)
  const [workspace] = useRecoilState(workspacestate)
  const router = useRouter()
  const text = useMemo(() => randomText(login.displayname), [login.displayname])
  const [ready, setReady] = useState(false)
  const [banner, setBanner] = useState<string | null>(null);
  const [showWarn, setShowWarn] = useState<boolean>(false);
  const [syncWarnDismissed, setSyncWarnDismissed] = useState(false)
  const [workspaceMembership, setWorkspaceMembership] = useState<{
    isAdmin: boolean | null
  } | null>(null)

  const orderedWidgets = useMemo(
    () => normalizeHomeWidgetOrder(workspace.settings.widgets ?? []),
    [workspace.settings.widgets]
  )

  const workspaceId = workspace?.groupId ?? Number(router.query.id)
  const workspaceLabel = workspace.customName || workspace.groupName

  useEffect(() => {
    if (workspace?.groupId && workspace.settings && Array.isArray(workspace.settings.widgets)) {
      setReady(true)
    }
  }, [workspace])

  useEffect(() => {
    if (workspace?.groupId && login?.userId) {
      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone
      fetch(`/api/workspace/${workspace.groupId}/timezone`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ timezone: tz }),
      }).catch(() => {})
    }
  }, [workspace?.groupId, login?.userId])

  useEffect(() => {
    if (!workspace?.groupId || !login?.userId) return
    fetch(`/api/workspace/${workspace.groupId}/member`)
      .then((r) => r.json())
      .then((data) => {
        if (data.success) setWorkspaceMembership(data.member)
      })
      .catch(() => {})
  }, [workspace?.groupId, login?.userId])

  useEffect(() => {
    if (!workspace?.groupId) return
    fetch(`/api/workspace/${workspace.groupId}/`)
      .then((r) => r.json())
      .then((data) => {
        if (data.success) setShowWarn(!data.workspace.lastSyncedSuccessful)
      })
      .catch(() => {})
  }, [workspace.groupId])

  useEffect(() => {
    if (!workspace?.groupId) return
    fetch(`/api/workspace/${workspace.groupId}/settings/general/banner`)
      .then((r) => r.json())
      .then((data) => {
        if (data.banner) setBanner(data.banner)
      })
      .catch(() => {})
  }, [workspace?.groupId])

  const dateLabel = new Date().toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
  })

  return (
    <div className="pagePadding">
      <div className="mx-auto max-w-6xl">
        {(showWarn && !syncWarnDismissed) && (
          <div className="mb-5 flex flex-col gap-3 rounded-lg border border-zinc-200 bg-zinc-50 px-4 py-3 dark:border-zinc-700 dark:bg-zinc-900/60 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              <span className="font-medium text-zinc-900 dark:text-zinc-200">Sync failed.</span>{" "}
              Group sync did not finish — check API keys in settings.
            </p>
            <div className="flex shrink-0 items-center gap-2">
              <button
                type="button"
                onClick={() => router.push(`/workspace/${workspace.groupId}/settings`)}
                className="rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-white hover:bg-primary/90"
              >
                Settings
              </button>
              <button
                type="button"
                onClick={() => setSyncWarnDismissed(true)}
                className="rounded-md px-3 py-1.5 text-xs font-medium text-zinc-600 hover:bg-zinc-200/80 dark:text-zinc-400 dark:hover:bg-zinc-800"
              >
                Dismiss
              </button>
            </div>
          </div>
        )}

        <header className="mb-5 sm:mb-6">
          {banner ? (
            <div className="relative overflow-hidden rounded-2xl">
              <div className="relative h-32 sm:h-36 md:h-44">
                <img src={banner} alt="" className="h-full w-full object-cover" />
                <div className="absolute inset-0 bg-gradient-to-r from-zinc-950/85 via-zinc-950/50 to-zinc-950/20" />
              </div>
              <div className="absolute inset-0 flex flex-col justify-end p-4 sm:p-5 md:p-6">
                <p className="text-[11px] text-white/60">{dateLabel}</p>
                <h1 className="mt-0.5 max-w-2xl text-lg font-semibold tracking-tight text-white sm:text-2xl md:text-3xl">
                  {text}
                </h1>
                <p className="mt-0.5 text-xs text-white/70 sm:text-sm">{workspaceLabel}</p>
              </div>
            </div>
          ) : (
            <div className="flex items-start justify-between gap-4 border-b border-zinc-200 pb-5 dark:border-zinc-800">
              <div className="min-w-0">
                <p className="text-xs text-zinc-500 dark:text-zinc-400">{dateLabel}</p>
                <h1 className="mt-0.5 text-xl font-semibold tracking-tight text-zinc-900 dark:text-white sm:text-2xl md:text-3xl">
                  {text}
                </h1>
                <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">{workspaceLabel}</p>
              </div>
              {workspace.groupThumbnail ? (
                <img
                  src={workspace.groupThumbnail}
                  alt=""
                  className="h-10 w-10 shrink-0 rounded-xl border border-zinc-200 object-cover dark:border-zinc-700 sm:h-14 sm:w-14"
                />
              ) : null}
            </div>
          )}
        </header>

        {!ready ? (
          <div className="flex items-center gap-3 py-20 text-sm text-zinc-500 dark:text-zinc-400">
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-zinc-300 border-t-primary dark:border-zinc-600" />
            Loading…
          </div>
        ) : orderedWidgets.length > 0 ? (
          <HomeDashboard workspaceId={workspaceId} workspaceName={workspaceLabel} widgets={orderedWidgets} />
        ) : (
          <div className="mt-2 space-y-6">
            <div className="rounded-2xl bg-white px-8 py-10 text-center shadow-[0_1px_3px_0_rgb(0,0,0,0.06)] dark:bg-zinc-900/70">
              <div className="mx-auto mb-4 flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10">
                <IconLayoutDashboard className="h-5 w-5 text-primary" stroke={1.75} />
              </div>
              <p className="text-base font-semibold text-zinc-900 dark:text-white">Your dashboard is empty</p>
              <p className="mt-1.5 text-sm text-zinc-400 dark:text-zinc-500 max-w-xs mx-auto">
                Turn on widgets in settings to start building your home screen.
              </p>
              <button
                type="button"
                onClick={() => router.push(`/workspace/${workspace.groupId}/settings`)}
                className="mt-5 inline-flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90 transition-colors"
              >
                Go to settings
                <IconArrowRight className="h-3.5 w-3.5" />
              </button>
            </div>

            <div>
              <p className="mb-3 text-xs font-medium text-zinc-400 dark:text-zinc-500">Available widgets</p>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                {[
                  { icon: IconWall, label: "Wall", desc: "Posts from your team" },
                  { icon: IconBell, label: "Sessions", desc: "Upcoming scheduled sessions" },
                  { icon: IconUsers, label: "Staff", desc: "New members & birthdays" },
                ].map(({ icon: Icon, label, desc }) => (
                  <div key={label} className="flex items-center gap-3 rounded-xl bg-white px-4 py-3 shadow-[0_1px_3px_0_rgb(0,0,0,0.04)] dark:bg-zinc-900/70">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-zinc-100 dark:bg-zinc-800">
                      <Icon className="h-4 w-4 text-zinc-500 dark:text-zinc-400" stroke={1.75} />
                    </span>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-zinc-800 dark:text-zinc-200">{label}</p>
                      <p className="text-xs text-zinc-400 dark:text-zinc-500 truncate">{desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

Home.layout = Workspace

export default Home

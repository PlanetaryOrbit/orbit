"use client"

import { useState, useEffect } from "react"
import type { NextPage } from "next"
import { loginState, workspacestate } from "@/state"
import { themeState } from "@/state/theme"
import { useRecoilState } from "recoil"
import { Menu, Listbox, Dialog } from "@headlessui/react"
import { useRouter } from "next/router"
import { motion, AnimatePresence } from "framer-motion"
import {
  IconHome,
  IconMessage2,
  IconClipboardList,
  IconBell,
  IconUser,
  IconSettings,
  IconChevronDown,
  IconFileText,
  IconShield,
  IconCheck,
  IconRosetteDiscountCheck,
  IconMenu2,
  IconSun,
  IconMoon,
  IconX,
  IconClock,
  IconTrophy,
  IconLogout,
  IconRocket,
  IconChevronLeft,
  IconExternalLink,
} from "@tabler/icons-react"
import axios from "axios"
import clsx from "clsx"
import ReactMarkdown from "react-markdown"
import packageJson from "../../package.json"

interface SidebarProps {
  isCollapsed: boolean
  setIsCollapsed: (value: boolean) => void
}

const Sidebar: NextPage<SidebarProps> = ({ isCollapsed, setIsCollapsed }) => {
  const [login, setLogin] = useRecoilState(loginState)
  const [workspace, setWorkspace] = useRecoilState(workspacestate)
  const [theme, setTheme] = useRecoilState(themeState)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [showChangelog, setShowChangelog] = useState(false)
  const [changelog, setChangelog] = useState<{ title: string; link: string; pubDate: string; content: string }[]>([])
  const [docsEnabled, setDocsEnabled] = useState(false)
  const [alliesEnabled, setAlliesEnabled] = useState(false)
  const [sessionsEnabled, setSessionsEnabled] = useState(false)
  const [noticesEnabled, setNoticesEnabled] = useState(false)
  const [leaderboardEnabled, setLeaderboardEnabled] = useState(false)
  const [policiesEnabled, setPoliciesEnabled] = useState(false)
  const router = useRouter()

  useEffect(() => {
    if (isMobileMenuOpen) {
      document.body.classList.add("overflow-hidden")
    } else {
      document.body.classList.remove("overflow-hidden")
    }
    return () => document.body.classList.remove("overflow-hidden")
  }, [isMobileMenuOpen])

  const pages = [
    { name: "Home", href: `/workspace/${workspace.groupId}`, icon: IconHome, accessible: true },
    { name: "Wall", href: `/workspace/${workspace.groupId}/wall`, icon: IconMessage2, accessible: true },
    { name: "Activity", href: `/workspace/${workspace.groupId}/activity`, icon: IconClipboardList, accessible: true },
    ...(leaderboardEnabled ? [{ name: "Leaderboard", href: `/workspace/${workspace.groupId}/leaderboard`, icon: IconTrophy, accessible: workspace.yourPermission.includes("view_entire_groups_activity") }] : []),
    ...(noticesEnabled ? [{ name: "Notices", href: `/workspace/${workspace.groupId}/notices`, icon: IconClock, accessible: true }] : []),
    ...(alliesEnabled ? [{ name: "Alliances", href: `/workspace/${workspace.groupId}/alliances`, icon: IconRosetteDiscountCheck, accessible: true }] : []),
    ...(sessionsEnabled ? [{ name: "Sessions", href: `/workspace/${workspace.groupId}/sessions`, icon: IconBell, accessible: true }] : []),
    { name: "Staff", href: `/workspace/${workspace.groupId}/views`, icon: IconUser, accessible: workspace.yourPermission.includes("view_members") },
    ...(docsEnabled ? [{ name: "Docs", href: `/workspace/${workspace.groupId}/docs`, icon: IconFileText, accessible: true }] : []),
    ...(policiesEnabled ? [{ name: "Policies", href: `/workspace/${workspace.groupId}/policies`, icon: IconShield, accessible: workspace.yourPermission.includes("manage_policies") || workspace.yourPermission.includes("admin"), badge: "BETA" }] : []),
    { name: "Settings", href: `/workspace/${workspace.groupId}/settings`, icon: IconSettings, accessible: workspace.yourPermission.includes("admin") },
  ]

  const gotopage = (page: string) => {
    router.push(page)
    setIsMobileMenuOpen(false)
  }

  const logout = async () => {
    await axios.post("/api/auth/logout")
    setLogin({
      userId: 1,
      username: "",
      displayname: "",
      canMakeWorkspace: false,
      thumbnail: "",
      workspaces: [],
      isOwner: false,
    })
    router.push("/login")
  }

  const toggleTheme = () => {
    const newTheme = theme === "dark" ? "light" : "dark"
    setTheme(newTheme)
    if (typeof window !== "undefined") {
      localStorage.setItem("theme", newTheme)
    }
  }

  useEffect(() => {
    if (showChangelog && changelog.length === 0) {
      fetch("/api/changelog")
        .then((res) => res.json())
        .then((items) => setChangelog(items))
    }
  }, [showChangelog, changelog.length])

  useEffect(() => {
    fetch(`/api/workspace/${workspace.groupId}/settings/general/configuration`)
      .then((res) => res.json())
      .then((data) => {
        setDocsEnabled(data.value.guides?.enabled ?? false)
        setAlliesEnabled(data.value.allies?.enabled ?? false)
        setSessionsEnabled(data.value.sessions?.enabled ?? false)
        setNoticesEnabled(data.value.notices?.enabled ?? false)
        setLeaderboardEnabled(data.value.leaderboard?.enabled ?? false)
        setPoliciesEnabled(data.value.policies?.enabled ?? false)
      })
      .catch(() => setDocsEnabled(false))
  }, [workspace.groupId])

  const isActivePage = (href: string) => {
    return router.asPath === href.replace("[id]", workspace.groupId.toString())
  }

  return (
    <>
      {/* Mobile menu button */}
      <button
        onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        className="lg:hidden fixed top-4 left-4 z-[999999] p-2.5 rounded-xl bg-white dark:bg-slate-800 shadow-lg border border-slate-200 dark:border-slate-700"
      >
        <IconMenu2 className="w-5 h-5 text-slate-700 dark:text-white" />
      </button>

      {/* Mobile overlay */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsMobileMenuOpen(false)}
            className="lg:hidden fixed inset-0 bg-black/50 backdrop-blur-sm z-[99998]"
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <aside
        className={clsx(
          "fixed lg:sticky top-0 left-0 h-screen z-[99999] flex flex-col",
          "bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800",
          "transition-all duration-300 ease-out",
          isCollapsed ? "w-20" : "w-72",
          isMobileMenuOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        )}
      >
        {/* Header */}
        <div className="p-4 border-b border-slate-200 dark:border-slate-800">
          <Listbox
            value={workspace.groupId}
            onChange={(id) => {
              const selected = login.workspaces?.find((ws) => ws.groupId === id)
              if (selected) {
                setWorkspace({
                  ...workspace,
                  groupId: selected.groupId,
                  groupName: selected.groupName,
                  groupThumbnail: selected.groupThumbnail,
                })
                router.push(`/workspace/${selected.groupId}`)
              }
            }}
          >
            <div className="relative">
              <Listbox.Button
                className={clsx(
                  "w-full flex items-center gap-3 p-2 rounded-xl",
                  "hover:bg-slate-100 dark:hover:bg-slate-800",
                  "transition-colors duration-200",
                  isCollapsed && "justify-center"
                )}
              >
                <img
                  src={workspace.groupThumbnail || "/favicon-32x32.png"}
                  alt={workspace.groupName}
                  className="w-10 h-10 rounded-xl object-cover flex-shrink-0"
                />
                {!isCollapsed && (
                  <>
                    <div className="flex-1 min-w-0 text-left">
                      <p className="text-sm font-semibold text-slate-900 dark:text-white truncate">
                        {workspace.groupName}
                      </p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        Switch workspace
                      </p>
                    </div>
                    <IconChevronDown className="w-4 h-4 text-slate-400 flex-shrink-0" />
                  </>
                )}
              </Listbox.Button>

              <Listbox.Options className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-slate-200 dark:border-slate-700 overflow-hidden z-50 max-h-64 overflow-y-auto">
                {login?.workspaces?.map((ws) => (
                  <Listbox.Option
                    key={ws.groupId}
                    value={ws.groupId}
                    className={({ active }) =>
                      clsx(
                        "flex items-center gap-3 px-3 py-2.5 cursor-pointer transition-colors",
                        active ? "bg-pink-50 dark:bg-pink-500/10" : "",
                        workspace.groupId === ws.groupId && "bg-pink-50 dark:bg-pink-500/10"
                      )
                    }
                  >
                    <img
                      src={ws.groupThumbnail || "/placeholder.svg"}
                      alt={ws.groupName}
                      className="w-8 h-8 rounded-lg object-cover"
                    />
                    <span className="flex-1 text-sm font-medium text-slate-900 dark:text-white truncate">
                      {ws.groupName}
                    </span>
                    {workspace.groupId === ws.groupId && (
                      <IconCheck className="w-4 h-4 text-pink-500" />
                    )}
                  </Listbox.Option>
                ))}
              </Listbox.Options>
            </div>
          </Listbox>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {pages.map(
            (page) =>
              page.accessible && (
                <button
                  key={page.name}
                  onClick={() => gotopage(page.href)}
                  className={clsx(
                    "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200",
                    isActivePage(page.href)
                      ? "bg-pink-50 dark:bg-pink-500/10 text-pink-600 dark:text-pink-400"
                      : "text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800",
                    isCollapsed && "justify-center px-2"
                  )}
                >
                  <page.icon className={clsx("w-5 h-5 flex-shrink-0", isActivePage(page.href) && "text-pink-500")} />
                  {!isCollapsed && (
                    <span className="flex-1 text-left">{page.name}</span>
                  )}
                  {!isCollapsed && (page as any).badge && (
                    <span className="px-1.5 py-0.5 text-[10px] font-semibold bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-400 rounded-md">
                      {(page as any).badge}
                    </span>
                  )}
                </button>
              )
          )}
        </nav>

        {/* Footer */}
        <div className="p-3 border-t border-slate-200 dark:border-slate-800 space-y-2">
          {/* Theme Toggle */}
          <button
            onClick={toggleTheme}
            className={clsx(
              "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium",
              "text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800",
              "transition-colors duration-200",
              isCollapsed && "justify-center px-2"
            )}
          >
            {theme === "dark" ? (
              <IconSun className="w-5 h-5" />
            ) : (
              <IconMoon className="w-5 h-5" />
            )}
            {!isCollapsed && <span>{theme === "dark" ? "Light Mode" : "Dark Mode"}</span>}
          </button>

          {/* User Menu */}
          <Menu as="div" className="relative">
            <Menu.Button
              className={clsx(
                "w-full flex items-center gap-3 p-2 rounded-xl",
                "hover:bg-slate-100 dark:hover:bg-slate-800",
                "transition-colors duration-200",
                isCollapsed && "justify-center"
              )}
            >
              <img
                src={login?.thumbnail || "/placeholder.svg"}
                alt={login?.displayname}
                className="w-10 h-10 rounded-xl object-cover flex-shrink-0"
              />
              {!isCollapsed && (
                <>
                  <div className="flex-1 min-w-0 text-left">
                    <p className="text-sm font-semibold text-slate-900 dark:text-white truncate">
                      {login?.displayname}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                      @{login?.username}
                    </p>
                  </div>
                  <IconChevronDown className="w-4 h-4 text-slate-400 flex-shrink-0" />
                </>
              )}
            </Menu.Button>

            <Menu.Items className="absolute bottom-full left-0 right-0 mb-2 bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-slate-200 dark:border-slate-700 overflow-hidden z-50">
              <div className="p-2">
                <Menu.Item>
                  {({ active }) => (
                    <button
                      onClick={() => router.push("/")}
                      className={clsx(
                        "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm",
                        "text-slate-600 dark:text-slate-300",
                        active && "bg-slate-100 dark:bg-slate-700"
                      )}
                    >
                      <IconRocket className="w-5 h-5" />
                      All Workspaces
                    </button>
                  )}
                </Menu.Item>
                <Menu.Item>
                  {({ active }) => (
                    <button
                      onClick={logout}
                      className={clsx(
                        "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm",
                        "text-red-600 dark:text-red-400",
                        active && "bg-red-50 dark:bg-red-500/10"
                      )}
                    >
                      <IconLogout className="w-5 h-5" />
                      Sign Out
                    </button>
                  )}
                </Menu.Item>
              </div>
            </Menu.Items>
          </Menu>

          {/* Version */}
          {!isCollapsed && (
            <div className="px-3 py-2 text-xs text-slate-400 dark:text-slate-500">
              <button
                onClick={() => setShowChangelog(true)}
                className="hover:text-pink-500 transition-colors"
              >
                Orbit v{packageJson.version}
              </button>
            </div>
          )}
        </div>

        {/* Collapse Button (Desktop) */}
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="hidden lg:flex absolute -right-3 top-1/2 -translate-y-1/2 w-6 h-6 items-center justify-center bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-full shadow-sm hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
        >
          <IconChevronLeft
            className={clsx(
              "w-4 h-4 text-slate-400 transition-transform duration-300",
              isCollapsed && "rotate-180"
            )}
          />
        </button>

        {/* Mobile Close Button */}
        <button
          onClick={() => setIsMobileMenuOpen(false)}
          className="lg:hidden absolute top-4 right-4 p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
        >
          <IconX className="w-5 h-5 text-slate-400" />
        </button>
      </aside>

      {/* Changelog Dialog */}
      <Dialog
        open={showChangelog}
        onClose={() => setShowChangelog(false)}
        className="relative z-[100000]"
      >
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" aria-hidden="true" />
        <div className="fixed inset-0 flex items-center justify-center p-4">
          <Dialog.Panel className="w-full max-w-lg bg-white dark:bg-slate-800 rounded-2xl shadow-2xl overflow-hidden">
            <div className="p-6 border-b border-slate-200 dark:border-slate-700">
              <div className="flex items-center justify-between">
                <Dialog.Title className="text-xl font-semibold text-slate-900 dark:text-white">
                  Changelog
                </Dialog.Title>
                <button
                  onClick={() => setShowChangelog(false)}
                  className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                >
                  <IconX className="w-5 h-5 text-slate-400" />
                </button>
              </div>
            </div>
            <div className="p-6 max-h-96 overflow-y-auto space-y-6">
              {changelog.length === 0 ? (
                <p className="text-sm text-slate-500">Loading...</p>
              ) : (
                changelog.map((entry, idx) => (
                  <div key={idx} className="space-y-2">
                    <a
                      href={entry.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 font-semibold text-pink-600 dark:text-pink-400 hover:underline"
                    >
                      {entry.title}
                      <IconExternalLink className="w-4 h-4" />
                    </a>
                    <p className="text-xs text-slate-400">{entry.pubDate}</p>
                    <div className="text-sm text-slate-600 dark:text-slate-300 prose prose-sm dark:prose-invert max-w-none">
                      <ReactMarkdown>{entry.content}</ReactMarkdown>
                    </div>
                  </div>
                ))
              )}
            </div>
          </Dialog.Panel>
        </div>
      </Dialog>
    </>
  )
}

export default Sidebar

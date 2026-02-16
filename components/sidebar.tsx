import { useState, useEffect, useRef } from "react"
import type { NextPage } from "next"
import { loginState, workspacestate } from "@/state"
import { themeState } from "@/state/theme"
import { useRecoilState } from "recoil"
import { Menu, Listbox, Dialog } from "@headlessui/react"
import { useRouter } from "next/router"
import {
  IconHome,
  IconHomeFilled,
  IconMessage2,
  IconMessage2Filled,
  IconServer,
  IconClipboardList,
  IconClipboardListFilled,
  IconBell,
  IconBellFilled,
  IconUser,
  IconUserFilled,
  IconSettings,
  IconSettingsFilled,
  IconChevronDown,
  IconFileText,
  IconFileTextFilled,
  IconShield,
  IconCheck,
  IconRosetteDiscountCheck,
  IconRosetteDiscountCheckFilled,
  IconChevronLeft,
  IconMenu2,
  IconSun,
  IconMoon,
  IconX,
  IconClock,
  IconClockFilled,
  IconTrophy,
  IconTrophyFilled,
  IconShieldFilled,
  IconTarget,
  IconCopyright,
  IconBook,
  IconBrandGithub,
  IconHistory,
  IconBug,
} from "@tabler/icons-react"
import axios from "axios"
import clsx from "clsx"
import Parser from "rss-parser"
import ReactMarkdown from "react-markdown";
import packageJson from "../package.json";

interface SidebarProps {
  isCollapsed: boolean
  setIsCollapsed: (value: boolean) => void
}

const ChangelogContent: React.FC<{ workspaceId: number }> = ({ workspaceId }) => {
  const [entries, setEntries] = useState<
    { title: string; link: string; pubDate: string; content: string }[]
  >([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/changelog')
      .then(res => res.json())
      .then(data => {
        setEntries(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [workspaceId]);

  if (loading) return <p className="text-sm text-zinc-500">Loading...</p>;
  if (!entries.length) return <p className="text-sm text-zinc-500">No entries found.</p>;

  return (
    <div className="space-y-6">
      {entries.map((entry, idx) => (
        <div 
          key={idx}
          className={clsx(
            "pb-6",
            idx < entries.length - 1 && "border-b border-zinc-200 dark:border-zinc-700"
          )}
        >
          <a
            href={entry.link}
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium text-primary hover:underline"
          >
            {entry.title}
          </a>
          <div className="text-xs text-zinc-400 mt-1 mb-3">{entry.pubDate}</div>
          <div className="text-sm text-zinc-700 dark:text-zinc-300 prose prose-sm dark:prose-invert max-w-none prose-p:my-2 prose-ul:my-2 prose-ol:my-2 prose-headings:my-2">
            <ReactMarkdown>{entry.content}</ReactMarkdown>
          </div>
        </div>
      ))}
    </div>
  );
};

const Sidebar: NextPage<SidebarProps> = ({ isCollapsed, setIsCollapsed }) => {
  const [login, setLogin] = useRecoilState(loginState)
  const [workspace, setWorkspace] = useRecoilState(workspacestate)
  const [theme, setTheme] = useRecoilState(themeState)
  const [showOrbitInfo, setShowOrbitInfo] = useState(false);
  const [showCopyright, setShowCopyright] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [showChangelog, setShowChangelog] = useState(false);
  const [changelog, setChangelog] = useState<{ title: string, link: string, pubDate: string, content: string }[]>([]);
  const [changelogLoading, setChangelogLoading] = useState(false);
  const [docsEnabled, setDocsEnabled] = useState(false);
  const [alliesEnabled, setAlliesEnabled] = useState(false);
  const [sessionsEnabled, setSessionsEnabled] = useState(false);
  const [noticesEnabled, setNoticesEnabled] = useState(false);
  const [policiesEnabled, setPoliciesEnabled] = useState(false);
  const [pendingPolicyCount, setPendingPolicyCount] = useState(0);
  const [pendingNoticesCount, setPendingNoticesCount] = useState(0);
  const workspaceListboxWrapperRef = useRef<HTMLDivElement>(null);
  const router = useRouter()

  useEffect(() => {
    if (isMobileMenuOpen) {
      document.body.classList.add("overflow-hidden")
    } else {
      document.body.classList.remove("overflow-hidden")
    }
    return () => {
      document.body.classList.remove("overflow-hidden")
    }
  }, [isMobileMenuOpen])

  const pages: {
    name: string
    href: string
    icon: React.ElementType
    filledIcon?: React.ElementType
    accessible?: boolean
  }[] = [
    { name: "Home", href: `/workspace/${workspace.groupId}`, icon: IconHome, filledIcon: IconHomeFilled },
    { name: "Wall", href: `/workspace/${workspace.groupId}/wall`, icon: IconMessage2, filledIcon: IconMessage2Filled, accessible: workspace.yourPermission.includes("view_wall") },
    { name: "Activity", href: `/workspace/${workspace.groupId}/activity`, icon: IconClipboardList, filledIcon: IconClipboardListFilled, accessible: true },
    { name: "Quotas", href: `/workspace/${workspace.groupId}/quotas`, icon: IconTarget, accessible: true },
   ...(noticesEnabled ? [{
      name: "Notices",
      href: `/workspace/${workspace.groupId}/notices`,
      icon: IconClock,
      filledIcon: IconClockFilled,
      accessible: true,
    }] : []),
    ...(alliesEnabled ? [{
      name: "Alliances",
      href: `/workspace/${workspace.groupId}/alliances`,
      icon: IconRosetteDiscountCheck,
      filledIcon: IconRosetteDiscountCheckFilled,
      accessible: true,
    }] : []),
    ...(sessionsEnabled ? [{
      name: "Sessions",
      href: `/workspace/${workspace.groupId}/sessions`,
      icon: IconBell,
      filledIcon: IconBellFilled,
      accessible: true,
    }] : []),
    { name: "Staff", href: `/workspace/${workspace.groupId}/views`, icon: IconUser, filledIcon: IconUserFilled, accessible: workspace.yourPermission.includes("view_members") },
    ...(docsEnabled ? [{ name: "Docs", href: `/workspace/${workspace.groupId}/docs`, icon: IconFileText, filledIcon: IconFileTextFilled, accessible: true }] : []),
    ...(policiesEnabled ? [{ name: "Policies", href: `/workspace/${workspace.groupId}/policies`, icon: IconShield, filledIcon: IconShieldFilled, accessible: true }] : []),
    { name: "Settings", href: `/workspace/${workspace.groupId}/settings`, icon: IconSettings, filledIcon: IconSettingsFilled, accessible: ["admin", "workspace_customisation", "reset_activity", "manage_features", "manage_apikeys", "view_audit_logs"].some(perm => workspace.yourPermission.includes(perm)) },
  ];

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
    if (!showChangelog) return;
    setChangelogLoading(true);
    fetch('/api/changelog')
      .then(res => res.json())
      .then((data) => {
        const items = Array.isArray(data) ? data : (data?.items ?? []);
        setChangelog(Array.isArray(items) ? items : []);
      })
      .catch(() => setChangelog([]))
      .finally(() => setChangelogLoading(false));
  }, [showChangelog]);

  useEffect(() => {
    fetch(`/api/workspace/${workspace.groupId}/settings/general/configuration`)
      .then(res => res.json())
      .then(data => {
        setDocsEnabled(data.value.guides?.enabled ?? false);
		setAlliesEnabled(data.value.allies?.enabled ?? false);
		setSessionsEnabled(data.value.sessions?.enabled ?? false);
		setNoticesEnabled(data.value.notices?.enabled ?? false);
		setPoliciesEnabled(data.value.policies?.enabled ?? false);
      })
      .catch(() => setDocsEnabled(false));
  }, [workspace.groupId]);

  useEffect(() => {
    if (policiesEnabled) {
      fetch(`/api/workspace/${workspace.groupId}/policies/pending`)
        .then(res => res.json())
        .then(data => {
          if (data.success) {
            setPendingPolicyCount(data.count);
          }
        })
        .catch(() => setPendingPolicyCount(0));
    }
  }, [workspace.groupId, policiesEnabled]);

  useEffect(() => {
    if (noticesEnabled) {
      if (workspace.yourPermission?.includes("approve_notices") || workspace.yourPermission?.includes("manage_notices") || workspace.yourPermission?.includes("admin")) {
        fetch(`/api/workspace/${workspace.groupId}/activity/notices/count`)
          .then(res => res.json())
          .then(data => {
            if (data.success) {
              setPendingNoticesCount(data.count || 0);
            }
          })
          .catch(() => setPendingNoticesCount(0));
      }
    }
  }, [workspace.groupId, noticesEnabled, workspace.yourPermission]);

  return (
    <>
      {!isMobileMenuOpen && (
        <button
          onClick={() => setIsMobileMenuOpen(true)}
          className="lg:hidden fixed top-4 left-4 z-[999999] p-2.5 rounded-xl bg-white dark:bg-zinc-800 shadow-lg border border-zinc-200/80 dark:border-zinc-600/80"
        >
          <IconMenu2 className="w-6 h-6 text-zinc-700 dark:text-white" />
        </button>
      )}

      {isMobileMenuOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/50 z-[99998]"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      <div
  		className={clsx(
  			"fixed lg:static top-0 left-0 h-screen lg:w-auto z-[99999] transition-transform duration-300 flex flex-col",
    		isMobileMenuOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
  		)}
      >

        <aside
          className={clsx(
            "h-screen flex flex-col pointer-events-auto transition-all duration-300",
            "bg-zinc-50/80 dark:bg-zinc-900/95 border-r border-zinc-200/80 dark:border-zinc-700/80",
            "backdrop-blur-sm",
            isCollapsed ? "w-[4.5rem]" : "w-64",
          )}
        >
          <div className="h-full flex flex-col p-4 overflow-y-auto pb-20 lg:pb-4">
            <div className="relative" ref={workspaceListboxWrapperRef}>
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
                <Listbox.Button
                  className={clsx(
                    "w-full flex items-center gap-3 p-2.5 rounded-xl transition-all duration-200",
                    "bg-white dark:bg-zinc-800/80 border border-zinc-200/80 dark:border-zinc-600/80",
                    "hover:border-[color:rgb(var(--group-theme)/0.4)] hover:bg-[color:rgb(var(--group-theme)/0.06)]",
                    "shadow-sm",
                    isCollapsed && "justify-center"
                  )}
                >
                  <img
                    src={workspace.groupThumbnail || "/favicon-32x32.png"}
                    alt=""
                    className={clsx(
                      "w-9 h-9 rounded-lg object-cover ring-1 ring-zinc-200/50 dark:ring-zinc-600/50 transition-all duration-300",
                      isCollapsed && "scale-90 opacity-80"
                    )}
                  />
                  {!isCollapsed && (
                    <div className="flex-1 min-w-0 text-left transition-all duration-300">
                      <p className="text-sm font-semibold truncate text-zinc-800 dark:text-white max-w-full">
                        {workspace.groupName}
                      </p>
                      <p className="text-xs text-zinc-500 dark:text-zinc-400 truncate max-w-full">
                        Switch workspace
                      </p>
                    </div>
                  )}
                  {!isCollapsed && (
                    <IconChevronDown className="w-4 h-4 text-zinc-400 dark:text-zinc-500 transition-all duration-300 flex-shrink-0" />
                  )}
                </Listbox.Button>
              
                <Listbox.Options
                  className={clsx(
                    "absolute top-full left-0 z-50 w-full mt-2 bg-white dark:bg-zinc-800 rounded-xl shadow-lg border border-zinc-200 dark:border-zinc-600 max-h-60 overflow-y-auto py-1"
                  )}
                >
                  <button
                    type="button"
                    onClick={() => {
                      workspaceListboxWrapperRef.current?.querySelector('button')?.click()
                      router.push('/')
                    }}
                    className={clsx(
                      "w-full flex items-center gap-3 px-3 py-2.5 mx-1 rounded-lg text-sm font-medium transition duration-200",
                      "text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-700 hover:text-zinc-900 dark:hover:text-white"
                    )}
                  >
                    <IconChevronLeft className="w-4 h-4 flex-shrink-0" />
                    Back to menu
                  </button>
                  <div className="my-1 border-t border-zinc-200 dark:border-zinc-600" />
                  {login?.workspaces && login.workspaces.length > 1 ? (
                    login.workspaces
                      .filter(ws => ws.groupId !== workspace.groupId)
                      .map((ws) => (
                        <Listbox.Option
                          key={ws.groupId}
                          value={ws.groupId}
                          className={({ active }) =>
                            clsx(
                              "flex items-center gap-3 px-3 py-2.5 mx-1 cursor-pointer rounded-lg transition duration-200",
                              active && "bg-[color:rgb(var(--group-theme)/0.1)] text-[color:rgb(var(--group-theme))]"
                            )
                          }
                        >
                          <img
                            src={ws.groupThumbnail || "/placeholder.svg"}
                            alt=""
                            className="w-8 h-8 rounded-lg object-cover transition duration-200"
                          />
                          <span className="flex-1 truncate text-sm dark:text-white">{ws.groupName}</span>
                          {workspace.groupId === ws.groupId && <IconCheck className="w-5 h-5 text-primary" />}
                        </Listbox.Option>
                      ))
                  ) : (
                    <div className="px-3 py-2 text-sm text-zinc-500 dark:text-zinc-400">
                      No other workspaces
                    </div>
                  )}
                </Listbox.Options>
              </Listbox>
            </div>

            <nav className="flex-1 space-y-0.5 mt-2">
              {pages.map((page) =>
                (page.accessible === undefined || page.accessible) && (
                  <button
                    key={page.name}
                    onClick={() => gotopage(page.href)}
                    className={clsx(
                      "w-full gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 relative",
                      router.asPath === page.href.replace("[id]", workspace.groupId.toString())
                        ? "bg-[color:rgb(var(--group-theme)/0.12)] text-[color:rgb(var(--group-theme))] font-semibold shadow-sm"
                        : "text-zinc-600 dark:text-zinc-300 hover:bg-white dark:hover:bg-zinc-800/80 hover:text-zinc-900 dark:hover:text-white",
                      isCollapsed ? "grid place-content-center" : "flex gap-3 items-center",
                    )}
                  >
                    {(() => {
                      const IconComponent: React.ElementType =
                        router.asPath === page.href.replace("[id]", workspace.groupId.toString())
                          ? page.filledIcon || page.icon
                          : page.icon;
                      return <IconComponent className="w-5 h-5 flex-shrink-0" />;
                    })()}
                    {!isCollapsed && (
                      <div className="flex items-center gap-2">
                        <span>{page.name}</span>
                        {page.name === "Policies" && (
                          <>
                            <span className="px-1.5 py-0.5 text-xs font-medium bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400 rounded-full">
                              BETA
                            </span>
                            {pendingPolicyCount > 0 && (
                              <span className="px-1.5 py-0.5 text-xs font-bold bg-red-500 text-white rounded-full">
                                {pendingPolicyCount}
                              </span>
                            )}
                          </>
                        )}
                        {page.name === "Notices" && pendingNoticesCount > 0 && (
                          <span className="px-1.5 py-0.5 text-xs font-bold bg-amber-500 text-white rounded-full">
                            {pendingNoticesCount}
                          </span>
                        )}
                      </div>
                    )}
                    {isCollapsed && page.name === "Policies" && pendingPolicyCount > 0 && (
                      <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center">
                        {pendingPolicyCount}
                      </span>
                    )}
                    {isCollapsed && page.name === "Notices" && pendingNoticesCount > 0 && (
                      <span className="absolute -top-1 -right-1 w-5 h-5 bg-amber-500 text-white text-xs font-bold rounded-full flex items-center justify-center">
                        {pendingNoticesCount}
                      </span>
                    )}
                  </button>
                )
              )}
            </nav>

            {!isCollapsed && (
              <div className="mt-auto pt-4 border-t border-zinc-200/80 dark:border-zinc-700/80">
                <div className="flex items-center gap-1 mb-3">
                  <button
                    onClick={() => {
                      setShowOrbitInfo(true);
                      setIsMobileMenuOpen(false);
                    }}
                    className="p-2 rounded-lg hover:bg-white dark:hover:bg-zinc-800 text-zinc-400 hover:text-[color:rgb(var(--group-theme))] transition-all duration-200"
                    title="Copyright Notices"
                  >
                    <IconCopyright className="w-4 h-4" />
                  </button>
                  <a
                    href="https://docs.planetaryapp.us"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2 rounded-lg hover:bg-white dark:hover:bg-zinc-800 text-zinc-400 hover:text-[color:rgb(var(--group-theme))] transition-all duration-200"
                    title="Documentation"
                  >
                    <IconBook className="w-4 h-4" />
                  </a>
                  <a
                    href="https://github.com/planetaryorbit/orbit"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2 rounded-lg hover:bg-white dark:hover:bg-zinc-800 text-zinc-400 hover:text-[color:rgb(var(--group-theme))] transition-all duration-200"
                    title="GitHub"
                  >
                    <IconBrandGithub className="w-4 h-4" />
                  </a>
                  <a
                    href="https://feedback.planetaryapp.us/bugs"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2 rounded-lg hover:bg-white dark:hover:bg-zinc-800 text-zinc-400 hover:text-[color:rgb(var(--group-theme))] transition-all duration-200"
                    title="Bug Reports"
                  >
                    <IconBug className="w-4 h-4" />
                  </a>
                </div>
                <div className="flex items-center gap-2 text-xs text-zinc-500 dark:text-zinc-400">
                  <span className="px-2 py-1 rounded-md bg-zinc-200/60 dark:bg-zinc-700/60">
                    Orbit v{packageJson.version}
                  </span>
                  <button
                    onClick={() => {
                      setShowChangelog(true);
                      setIsMobileMenuOpen(false);
                    }}
                    className="p-1.5 rounded-md hover:bg-white dark:hover:bg-zinc-800 hover:text-[color:rgb(var(--group-theme))] transition-all duration-200"
                    title="Changelog"
                  >
                    <IconHistory className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )}

            <Menu as="div" className={clsx("relative", !isCollapsed && "mt-4")}>
              <Menu.Button
                className={clsx(
                  "w-full flex items-center gap-3 p-2.5 rounded-xl transition-all duration-200",
                  "bg-white dark:bg-zinc-800/80 border border-zinc-200/80 dark:border-zinc-600/80",
                  "hover:border-[color:rgb(var(--group-theme)/0.4)] hover:bg-[color:rgb(var(--group-theme)/0.06)] shadow-sm",
                  isCollapsed ? "justify-center" : "justify-start"
                )}
              >
                <img
                  src={login?.thumbnail || "/placeholder.svg"}
                  alt=""
                  className={clsx(
                    "w-9 h-9 rounded-lg object-cover ring-1 ring-zinc-200/50 dark:ring-zinc-600/50 transition-all duration-300",
                    isCollapsed && "scale-90 opacity-80"
                  )}
                />
                {!isCollapsed && (
                  <div className="flex-1 min-w-0 text-left transition-all duration-300">
                    <p className="text-sm font-semibold truncate text-zinc-800 dark:text-white">{login?.displayname}</p>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400 truncate">
                      Manage account
                    </p>
                  </div>
                )}
                {!isCollapsed && (
                  <IconChevronDown className="w-4 h-4 text-zinc-400 dark:text-zinc-500 transition-all duration-300 flex-shrink-0" />
                )}
              </Menu.Button>
          
              <Menu.Items className="absolute bottom-full left-0 w-full mt-2 bg-white dark:bg-zinc-800 rounded-xl shadow-xl border border-zinc-200 dark:border-zinc-600 z-50 py-1.5 min-w-[11rem]">
                <Menu.Item>
                  {({ active }) => (
                    <button
                      onClick={toggleTheme}
                      className={clsx(
                        "w-full flex items-center gap-3 px-4 py-2.5 text-sm font-medium transition-all duration-200 rounded-lg mx-1.5",
                        "text-zinc-700 dark:text-zinc-200",
                        active && "bg-[color:rgb(var(--group-theme)/0.1)] text-[color:rgb(var(--group-theme))]"
                      )}
                    >
                      {theme === "dark" ? (
                        <>
                          <IconSun className="w-4 h-4 flex-shrink-0" />
                          Light mode
                        </>
                      ) : (
                        <>
                          <IconMoon className="w-4 h-4 flex-shrink-0" />
                          Dark mode
                        </>
                      )}
                    </button>
                  )}
                </Menu.Item>
                <div className="my-1 border-t border-zinc-200 dark:border-zinc-600" />
                <Menu.Item>
                  {({ active }) => (
                    <button
                      onClick={logout}
                      className={clsx(
                        "w-full flex items-center gap-3 px-4 py-2.5 text-sm font-medium transition-all duration-200 rounded-lg mx-1.5",
                        "text-red-600 dark:text-red-400",
                        active && "bg-red-50 dark:bg-red-900/30"
                      )}
                    >
                      Logout
                    </button>
                  )}
                </Menu.Item>
              </Menu.Items>
            </Menu>
          </div>

          <Dialog
            open={showCopyright}
            onClose={() => setShowCopyright(false)}
            className="relative z-50"
          >
            <div className="fixed inset-0 bg-black/30" aria-hidden="true" />

            <div className="fixed inset-0 flex items-center justify-center p-4">
              <Dialog.Panel className="mx-auto max-w-sm rounded-lg bg-white dark:bg-zinc-800 p-6 shadow-xl">
                <div className="flex items-center justify-between mb-4">
                  <Dialog.Title className="text-lg font-medium text-zinc-900 dark:text-white">
                    Copyright Notices
                  </Dialog.Title>
                  <button
                    onClick={() => setShowCopyright(false)}
                    className="p-1 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-700"
                  >
                    <IconX className="w-5 h-5 text-zinc-500" />
                  </button>
                </div>

                <div className="space-y-4">
                  <div>
                    <h3 className="text-sm font-medium text-zinc-900 dark:text-white mb-1">
                      Orbit features, enhancements, and modifications:
                    </h3>
                    <p className="text-sm text-zinc-500 dark:text-zinc-400">
                      Copyright © 2025 Planetary. All rights reserved.
                    </p>
                  </div>

                  <div>
                    <h3 className="text-sm font-medium text-zinc-900 dark:text-white mb-1">
                      Original Tovy features and code:
                    </h3>
                    <p className="text-sm text-zinc-500 dark:text-zinc-400">
                      Copyright © 2022 Tovy. All rights reserved.
                    </p>
                  </div>
                </div>
              </Dialog.Panel>
            </div>
          </Dialog>

          <Dialog
            open={showOrbitInfo}
            onClose={() => setShowOrbitInfo(false)}
            className="relative z-50"
          >
            <div className="fixed inset-0 bg-black/30" aria-hidden="true" />
          
            <div className="fixed inset-0 flex items-center justify-center p-4">
              <Dialog.Panel className="mx-auto max-w-lg rounded-lg bg-white dark:bg-zinc-800 p-6 shadow-xl transition-all duration-300">
                <div className="flex items-center justify-between mb-4">
                  <Dialog.Title className="text-lg font-medium text-zinc-900 dark:text-white">
                    © Copyright Notices
                  </Dialog.Title>
                  <button
                    onClick={() => setShowOrbitInfo(false)}
                    className="p-1 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-all duration-300"
                  >
                    <IconX className="w-5 h-5 text-zinc-500" />
                  </button>
                </div>
          
                <div className="mb-4">
                  <p className="text-sm font-medium text-zinc-900 dark:text-white mb-1">
                    Orbit
                  </p>
                  <p className="text-sm text-zinc-500 dark:text-zinc-400">
                    © 2025 Planetary — All rights reserved.
                  </p>
                </div>
          
                <div className="border-t border-zinc-300 dark:border-zinc-700 my-4" />
          
                <div className="mb-4">
                  <p className="text-sm font-medium text-zinc-900 dark:text-white mb-1">
                    Original Tovy Project
                  </p>
                  <p className="text-sm text-zinc-500 dark:text-zinc-400">
                    © 2022 Tovy — All rights reserved.
                  </p>
                </div>
              </Dialog.Panel>
            </div>
          </Dialog>

          <Dialog
            open={showChangelog}
            onClose={() => setShowChangelog(false)}
            className="relative z-50"
          >
            <div className="fixed inset-0 bg-black/30" aria-hidden="true" />
            <div className="fixed inset-0 flex items-center justify-center p-4">
              <Dialog.Panel className="mx-auto max-w-lg rounded-lg bg-white dark:bg-zinc-800 p-6 shadow-xl">
                <div className="flex items-center justify-between mb-4">
                  <Dialog.Title className="text-lg font-medium text-zinc-900 dark:text-white">
                    Changelog
                  </Dialog.Title>
                  <button
                    onClick={() => setShowChangelog(false)}
                    className="p-1 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-700">
                    <IconX className="w-5 h-5 text-zinc-500" />
                  </button>
                </div>
                <div className="space-y-6 max-h-96 overflow-y-auto">
                  {changelogLoading && <p className="text-sm text-zinc-500">Loading...</p>}
                  {!changelogLoading && changelog.length === 0 && <p className="text-sm text-zinc-500">No entries found.</p>}
                  {!changelogLoading && changelog.map((entry, idx) => (
                    <div 
                      key={idx}
                      className={clsx(
                        "pb-6",
                        idx < changelog.length - 1 && "border-b border-zinc-200 dark:border-zinc-700"
                      )}
                    >
                      <a href={entry.link} target="_blank" rel="noopener noreferrer" className="font-semibold text-primary hover:underline">
                        {entry.title}
                      </a>
                      <div className="text-xs text-zinc-400 mt-1 mb-3">{entry.pubDate}</div>
                      <div className="text-sm text-zinc-700 dark:text-zinc-300 prose prose-sm dark:prose-invert max-w-none prose-p:my-2 prose-ul:my-2 prose-ol:my-2 prose-headings:my-2">
                        <ReactMarkdown>{entry.content}</ReactMarkdown>
                      </div>
                    </div>
                  ))}
                </div>
              </Dialog.Panel>
            </div>
          </Dialog>
        </aside>
      </div>
    </>
  )
}

export default Sidebar

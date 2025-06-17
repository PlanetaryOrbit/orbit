import { useState, useEffect } from "react"
import type { NextPage } from "next"
import { loginState, workspacestate } from "@/state"
import { themeState } from "../state/theme"
import { useRecoilState } from "recoil"
import { Menu, Listbox, Dialog } from "@headlessui/react"
import { useRouter } from "next/router"
import {
  IconHome,
  IconWall,
  IconClipboardList,
  IconSpeakerphone,
  IconUsers,
  IconSettings,
  IconChevronDown,
  IconFileText,
  IconCheck,
  IconBuildingCommunity,
  IconChevronLeft,
  IconMenu2,
  IconSun,
  IconMoon,
  IconX,
} from "@tabler/icons"
import axios from "axios"
import clsx from "clsx"
import Parser from "rss-parser"
import ReactMarkdown from "react-markdown";
import packageJson from "../package.json"; // Adjust path if needed

interface SidebarProps {
  isCollapsed: boolean
  setIsCollapsed: (value: boolean) => void
}

const Sidebar: NextPage<SidebarProps> = ({ isCollapsed, setIsCollapsed }) => {
  const [login, setLogin] = useRecoilState(loginState)
  const [workspace, setWorkspace] = useRecoilState(workspacestate)
  const [theme, setTheme] = useRecoilState(themeState)
  const [showCopyright, setShowCopyright] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [showChangelog, setShowChangelog] = useState(false);
  const [changelog, setChangelog] = useState<{ title: string, link: string, pubDate: string, content: string }[]>([]);
  const [docsEnabled, setDocsEnabled] = useState(false);
  const [alliesEnabled, setAlliesEnabled] = useState(false);
  const [sessionsEnabled, setSessionsEnabled] = useState(false);
  const router = useRouter()

  // Add body class to prevent scrolling when mobile menu is open
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

  const pages = [
    { name: "Home", href: "/workspace/[id]", icon: IconHome },
    { name: "Wall", href: "/workspace/[id]/wall", icon: IconWall },
    {
      name: "Activity",
      href: "/workspace/[id]/activity",
      icon: IconClipboardList,
      accessible: workspace.yourPermission.includes("view_entire_groups_activity"),
    },
    ...(alliesEnabled ? [{
      name: "Allies",
      href: "/workspace/[id]/allies",
      icon: IconBuildingCommunity,
      accessible: true, // or add your permission check
    }] : []),
    ...(sessionsEnabled ? [{
      name: "Sessions",
      href: "/workspace/[id]/sessions",
      icon: IconSpeakerphone,
      accessible: workspace.yourPermission.includes("manage_sessions"),
    }] : []),
    {
      name: "Staff",
      href: "/workspace/[id]/views",
      icon: IconUsers,
      accessible: workspace.yourPermission.includes("view_members"),
    },
    ...(docsEnabled ? [{
      name: "Docs",
      href: "/workspace/[id]/docs",
      icon: IconFileText,
      accessible: workspace.yourPermission.includes("manage_docs"),
    }] : []),
    {
      name: "Settings",
      href: "/workspace/[id]/settings",
      icon: IconSettings,
      accessible: workspace.yourPermission.includes("admin"),
    },
  ]

  const gotopage = (page: string) => {
    router.push(page.replace("[id]", workspace.groupId.toString()))
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
      fetch('/api/changelog')
        .then(res => res.json())
        .then(items => setChangelog(items));
    }
  }, [showChangelog, changelog.length]);

  useEffect(() => {
    // Fetch the config for docs/guides
    fetch(`/api/workspace/${workspace.groupId}/settings/general/guides`)
      .then(res => res.json())
      .then(data => {
        let enabled = false;
        let val = data.value ?? data;
        if (typeof val === "string") {
          try {
            val = JSON.parse(val);
          } catch {
            val = {};
          }
        }
        enabled =
          typeof val === "object" && val !== null && "enabled" in val
            ? (val as { enabled?: boolean }).enabled ?? false
            : false;
        setDocsEnabled(enabled);
      })
      .catch(() => setDocsEnabled(false));
  }, [workspace.groupId]);

  useEffect(() => {
    fetch(`/api/workspace/${workspace.groupId}/settings/general/ally`)
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
        setAlliesEnabled(enabled);
      })
      .catch(() => setAlliesEnabled(false));
  }, [workspace.groupId]);

  useEffect(() => {
    fetch(`/api/workspace/${workspace.groupId}/settings/general/sessions`)
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
        setSessionsEnabled(enabled);
      })
      .catch(() => setSessionsEnabled(false));
  }, [workspace.groupId]);

  return (
    <>
      {/* Mobile menu button */}
      <button
        onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        className="lg:hidden fixed top-4 left-4 z-[999999] p-2 rounded-lg bg-white dark:bg-gray-800 shadow"
      >
        <IconMenu2 className="w-6 h-6 text-gray-700 dark:text-white" />
      </button>

      {/* Mobile overlay */}
      {/* Sidebar */}
      <div
  		className={clsx(
  			"fixed lg:static top-0 left-0 h-screen w-full lg:w-auto z-[99999] transition-transform duration-300 flex flex-col",
    		isMobileMenuOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
  		)}
      >

        <aside
          className={clsx(
            "h-screen flex flex-col pointer-events-auto shadow-xl transition-all duration-300",
            "bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700",
            isCollapsed ? "w-[4.5rem]" : "w-64",
          )}
        >
          <div className="h-full flex flex-col p-3 overflow-y-auto">
            <button
              onClick={() => setIsCollapsed(!isCollapsed)}
              className="grid place-content-center p-2 mb-4 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              <IconChevronLeft
                className={clsx(
                  "w-5 h-5 text-gray-500 dark:text-white transition-transform",
                  isCollapsed && "rotate-180",
                )}
              />
            </button>

            <div className="relative">
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
                    "w-full flex items-center gap-3 p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700",
                    isCollapsed && "justify-center",
                  )}
                >
                  <div className="w-10 h-10 flex-shrink-0">
                    <img
                      src={workspace.groupThumbnail || "/favicon-32x32.png"}
                      alt=""
                      className="w-full h-full rounded-lg object-cover"
                    />
                  </div>
                  {!isCollapsed && (
                    <>
                      <div className="flex-1 text-left">
                        <p className="text-sm font-medium truncate dark:text-white">{workspace.groupName}</p>
                        <p className="text-xs text-gray-500 dark:text-white">Switch workspace</p>
                      </div>
                      <IconChevronDown className="w-4 h-4 text-gray-400 dark:text-white flex-shrink-0" />
                    </>
                  )}
                </Listbox.Button>
                <div className={clsx("absolute top-0 z-50 w-64 mt-14", isCollapsed ? "left-full ml-2" : "left-0")}>
                  <Listbox.Options className="bg-white dark:bg-gray-800 rounded-lg shadow-lg border dark:border-gray-700 max-h-64 overflow-auto">
                    {login?.workspaces?.map((ws) => (
                      <Listbox.Option
                        key={ws.groupId}
                        value={ws.groupId}
                        className={({ active }) =>
                          clsx("flex items-center gap-3 px-3 py-2 cursor-pointer", active && "bg-primary/10")
                        }
                      >
                        <img
                          src={ws.groupThumbnail || "/placeholder.svg"}
                          alt=""
                          className="w-8 h-8 rounded-lg object-cover"
                        />
                        <span className="flex-1 truncate text-sm dark:text-white">{ws.groupName}</span>
                        {workspace.groupId === ws.groupId && <IconCheck className="w-5 h-5 text-primary" />}
                      </Listbox.Option>
                    ))}
                  </Listbox.Options>
                </div>
              </Listbox>
            </div>

            <nav className="flex-1 space-y-1 mt-4">
              {pages.map(
                (page) =>
                  (page.accessible === undefined || page.accessible) && (
                    <button
                      key={page.name}
                      onClick={() => gotopage(page.href)}
                      className={clsx(
                        "w-full gap-3 px-2 py-2 rounded-lg text-sm font-medium",
                        router.asPath === page.href.replace("[id]", workspace.groupId.toString())
                          ? "bg-[color:rgb(var(--group-theme)/0.1)] text-[color:rgb(var(--group-theme))] font-semibold"
                          : "text-gray-700 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-700",
                        isCollapsed ? "grid place-content-center" : "flex gap-2 items-center",
                      )}
                    >
                      <page.icon className="w-5 h-5" />
                      {!isCollapsed && <span>{page.name}</span>}
                    </button>
                  ),
              )}
            </nav>

            <div className="mt-auto">
              <button
                onClick={toggleTheme}
                className={clsx(
                  "mb-4 p-2 rounded-lg flex items-center gap-2 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-700",
                  isCollapsed ? "justify-center" : "justify-start",
                )}
              >
                {theme === "dark" ? <IconSun className="w-5 h-5" /> : <IconMoon className="w-5 h-5" />}
                {!isCollapsed && <span>{theme === "dark" ? "Light Mode" : "Dark Mode"}</span>}
              </button>

              <Menu as="div" className="relative">
                <Menu.Button
                  className={clsx(
                    "w-full flex items-center gap-3 p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700",
                    isCollapsed && "justify-center",
                  )}
                >
                  <img
                    src={login?.thumbnail || "/placeholder.svg"}
                    alt=""
                    className="w-10 h-10 rounded-lg object-cover"
                  />
                  {!isCollapsed && (
                    <>
                      <div className="flex-1 text-left">
                        <p className="text-sm font-medium dark:text-white truncate">{login?.displayname}</p>
                        <p className="text-xs text-gray-500 dark:text-white">Manage account</p>
                      </div>
                      <IconChevronDown className="w-4 h-4 text-gray-400 dark:text-white" />
                    </>
                  )}
                </Menu.Button>
                <Menu.Items className="absolute bottom-14 left-0 w-full bg-white dark:bg-gray-700 rounded-lg shadow-lg z-50 py-2">
                  <Menu.Item>
                    {({ active }) => (
                      <button
                        onClick={() => router.push(`/workspace/${workspace.groupId}/profile/${login.userId}`)}
                        className={clsx(
                          "w-full text-left px-4 py-2 text-sm dark:text-white",
                          active ? "bg-gray-100 dark:bg-gray-600 dark:text-white" : "",
                        )}
                      >
                        View Profile
                      </button>
                    )}
                  </Menu.Item>
                  <Menu.Item>
                    {({ active }) => (
                      <button
                        onClick={logout}
                        className={clsx(
                          "w-full text-left px-4 py-2 text-sm text-red-500",
                          active ? "bg-gray-100 dark:bg-gray-600" : "",
                        )}
                      >
                        Logout
                      </button>
                    )}
                  </Menu.Item>
                </Menu.Items>
              </Menu>

              {!isCollapsed && (
                <>
                  <button 
                    onClick={() => setShowCopyright(true)} 
                    className="mt-4 text-left text-xs text-gray-500 hover:text-primary"
                  >
                    © Copyright Notices
                  </button>

                  <div className="mt-2 text-xs text-gray-500">
                    v{packageJson.version} - <button onClick={() => setShowChangelog(true)} className="mt-2 text-left text-xs text-gray-500 hover:text-primary">Changelog</button>
                  </div>
                </>
              )}
            </div>
          </div>

          <Dialog
            open={showCopyright}
            onClose={() => setShowCopyright(false)}
            className="relative z-50"
          >
            <div className="fixed inset-0 bg-black/30" aria-hidden="true" />

            <div className="fixed inset-0 flex items-center justify-center p-4">
              <Dialog.Panel className="mx-auto max-w-sm rounded-lg bg-white dark:bg-gray-800 p-6 shadow-xl">
                <div className="flex items-center justify-between mb-4">
                  <Dialog.Title className="text-lg font-medium text-gray-900 dark:text-white">
                    Copyright Notices
                  </Dialog.Title>
                  <button
                    onClick={() => setShowCopyright(false)}
                    className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
                  >
                    <IconX className="w-5 h-5 text-gray-500" />
                  </button>
                </div>

                <div className="space-y-4">
                  <div>
                    <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-1">
                      Orbit features, enhancements, and modifications:
                    </h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Copyright © 2025 Planetary. All rights reserved.
                    </p>
                  </div>

                  <div>
                    <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-1">
                      Original Tovy features and code:
                    </h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Copyright © 2022 Tovy. All rights reserved.
                    </p>
                  </div>
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
              <Dialog.Panel className="mx-auto max-w-lg rounded-lg bg-white dark:bg-gray-800 p-6 shadow-xl">
                <div className="flex items-center justify-between mb-4">
                  <Dialog.Title className="text-lg font-medium text-gray-900 dark:text-white">
                    Changelog
                  </Dialog.Title>
                  <button
                    onClick={() => setShowChangelog(false)}
                    className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
                  >
                    <IconX className="w-5 h-5 text-gray-500" />
                  </button>
                </div>
                <div className="space-y-4 max-h-96 overflow-y-auto">
                  {changelog.length === 0 && <p className="text-sm text-gray-500">Loading...</p>}
                  {changelog.map((entry, idx) => (
                    <div key={idx}>
                      <a href={entry.link} target="_blank" rel="noopener noreferrer" className="font-semibold text-primary hover:underline">
                        {entry.title}
                      </a>
                      <div className="text-xs text-gray-400">{entry.pubDate}</div>
                      <div className="text-sm text-gray-700 dark:text-gray-300">
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

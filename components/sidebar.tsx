import { useState, useEffect, useRef } from "react";
import type { NextPage } from "next";
import { loginState, workspacestate } from "@/state";
import { themeState } from "@/state/theme";
import { useRecoilState } from "recoil";
import { Menu, Listbox } from "@headlessui/react";
import { useRouter } from "next/router";
import {
  IconHome,
  IconHomeFilled,
  IconMessage2,
  IconMessage2Filled,
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
  IconShieldFilled,
  IconCheck,
  IconRosetteDiscountCheck,
  IconRosetteDiscountCheckFilled,
  IconChevronLeft,
  IconMenu2,
  IconSun,
  IconMoon,
  IconLogout,
  IconClock,
  IconClockFilled,
  IconTarget,
} from "@tabler/icons-react";
import axios from "axios";
import clsx from "clsx";

interface SidebarProps {
  isCollapsed: boolean;
  setIsCollapsed: (value: boolean) => void;
}

const Sidebar: NextPage<SidebarProps> = ({ isCollapsed, setIsCollapsed }) => {
  const [login, setLogin] = useRecoilState(loginState);
  const [workspace, setWorkspace] = useRecoilState(workspacestate);
  const [theme, setTheme] = useRecoilState(themeState);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [docsEnabled, setDocsEnabled] = useState(false);
  const [alliesEnabled, setAlliesEnabled] = useState(false);
  const [sessionsEnabled, setSessionsEnabled] = useState(false);
  const [noticesEnabled, setNoticesEnabled] = useState(false);
  const [policiesEnabled, setPoliciesEnabled] = useState(false);
  const [pendingPolicyCount, setPendingPolicyCount] = useState(0);
  const [pendingNoticesCount, setPendingNoticesCount] = useState(0);
  const workspaceListboxWrapperRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  useEffect(() => {
    if (isMobileMenuOpen) document.body.classList.add("overflow-hidden");
    else document.body.classList.remove("overflow-hidden");
    return () => document.body.classList.remove("overflow-hidden");
  }, [isMobileMenuOpen]);

  const pages: {
    name: string;
    href: string;
    icon: React.ElementType;
    filledIcon?: React.ElementType;
    accessible?: boolean;
  }[] = [
    { name: "Home", href: `/workspace/${workspace.groupId}`, icon: IconHome, filledIcon: IconHomeFilled },
    { name: "Wall", href: `/workspace/${workspace.groupId}/wall`, icon: IconMessage2, filledIcon: IconMessage2Filled, accessible: workspace.yourPermission.includes("view_wall") },
    { name: "Activity", href: `/workspace/${workspace.groupId}/activity`, icon: IconClipboardList, filledIcon: IconClipboardListFilled, accessible: true },
    { name: "Quotas", href: `/workspace/${workspace.groupId}/quotas`, icon: IconTarget, accessible: true },
    ...(noticesEnabled ? [{ name: "Notices", href: `/workspace/${workspace.groupId}/notices`, icon: IconClock, filledIcon: IconClockFilled, accessible: true }] : []),
    ...(alliesEnabled ? [{ name: "Alliances", href: `/workspace/${workspace.groupId}/alliances`, icon: IconRosetteDiscountCheck, filledIcon: IconRosetteDiscountCheckFilled, accessible: true }] : []),
    ...(sessionsEnabled ? [{ name: "Sessions", href: `/workspace/${workspace.groupId}/sessions`, icon: IconBell, filledIcon: IconBellFilled, accessible: true }] : []),
    { name: "Staff", href: `/workspace/${workspace.groupId}/views`, icon: IconUser, filledIcon: IconUserFilled, accessible: workspace.yourPermission.includes("view_members") },
    ...(docsEnabled ? [{ name: "Docs", href: `/workspace/${workspace.groupId}/docs`, icon: IconFileText, filledIcon: IconFileTextFilled, accessible: true }] : []),
    ...(policiesEnabled ? [{ name: "Policies", href: `/workspace/${workspace.groupId}/policies`, icon: IconShield, filledIcon: IconShieldFilled, accessible: true }] : []),
    { name: "Settings", href: `/workspace/${workspace.groupId}/settings`, icon: IconSettings, filledIcon: IconSettingsFilled, accessible: ["admin", "workspace_customisation", "reset_activity", "manage_features", "manage_apikeys", "view_audit_logs"].some((perm) => workspace.yourPermission.includes(perm)) },
  ];

  const visiblePages = pages.filter((p) => p.accessible === undefined || p.accessible);

  const gotopage = (page: string) => {
    router.push(page);
    setIsMobileMenuOpen(false);
  };

  const logout = async () => {
    await axios.post("/api/auth/logout");
    setLogin({
      userId: 1,
      username: "",
      displayname: "",
      canMakeWorkspace: false,
      thumbnail: "",
      workspaces: [],
      isOwner: false,
    });
    router.push("/login");
  };

  const toggleTheme = () => {
    const newTheme = theme === "dark" ? "light" : "dark";
    setTheme(newTheme);
    if (typeof window !== "undefined") localStorage.setItem("theme", newTheme);
  };

  useEffect(() => {
    fetch(`/api/workspace/${workspace.groupId}/settings/general/configuration`)
      .then((res) => res.json())
      .then((data) => {
        setDocsEnabled(data.value?.guides?.enabled ?? false);
        setAlliesEnabled(data.value?.allies?.enabled ?? false);
        setSessionsEnabled(data.value?.sessions?.enabled ?? false);
        setNoticesEnabled(data.value?.notices?.enabled ?? false);
        setPoliciesEnabled(data.value?.policies?.enabled ?? false);
      })
      .catch(() => setDocsEnabled(false));
  }, [workspace.groupId]);

  useEffect(() => {
    if (policiesEnabled) {
      fetch(`/api/workspace/${workspace.groupId}/policies/pending`)
        .then((res) => res.json())
        .then((data) => data.success && setPendingPolicyCount(data.count))
        .catch(() => setPendingPolicyCount(0));
    }
  }, [workspace.groupId, policiesEnabled]);

  useEffect(() => {
    if (noticesEnabled && (workspace.yourPermission?.includes("approve_notices") || workspace.yourPermission?.includes("manage_notices") || workspace.yourPermission?.includes("admin"))) {
      fetch(`/api/workspace/${workspace.groupId}/activity/notices/count`)
        .then((res) => res.json())
        .then((data) => data.success && setPendingNoticesCount(data.count || 0))
        .catch(() => setPendingNoticesCount(0));
    }
  }, [workspace.groupId, noticesEnabled, workspace.yourPermission]);

  return (
    <>
      {!isMobileMenuOpen && (
        <button
          type="button"
          onClick={() => setIsMobileMenuOpen(true)}
          className="lg:hidden fixed top-4 left-4 z-[999999] p-2 rounded-2xl bg-white/90 dark:bg-zinc-800/90 backdrop-blur-md text-zinc-600 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-white transition-colors shadow-lg"
          aria-label="Open menu"
        >
          <IconMenu2 className="w-6 h-6" stroke={1.5} />
        </button>
      )}

      {isMobileMenuOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/40 backdrop-blur-sm z-[99998]"
          onClick={() => setIsMobileMenuOpen(false)}
          aria-hidden
        />
      )}

      <div
        className={clsx(
          "fixed lg:static top-0 left-0 h-screen z-[99999] flex flex-col transition-[transform,width] duration-300 ease-out",
          isMobileMenuOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0",
          isCollapsed ? "w-[72px]" : "w-56"
        )}
      >
        <aside
          className={clsx(
            "h-full flex flex-col flex-1 min-w-0",
            "bg-white/80 dark:bg-zinc-950/95 backdrop-blur-xl",
            "border-r border-zinc-200/40 dark:border-zinc-800/80"
          )}
        >
          <div className="flex flex-col h-full min-h-0 py-4 px-3 pb-20 lg:pb-4">
            <div className="shrink-0 overflow-visible px-0">
            <Listbox
              value={workspace.groupId}
              onChange={(id) => {
                const selected = login.workspaces?.find((ws) => ws.groupId === id);
                if (selected) {
                  setWorkspace({
                    ...workspace,
                    groupId: selected.groupId,
                    groupName: selected.groupName,
                    groupThumbnail: selected.groupThumbnail,
                  });
                  router.push(`/workspace/${selected.groupId}`);
                }
              }}
            >
              <div className="relative" ref={workspaceListboxWrapperRef}>
                <Listbox.Button
                  className={clsx(
                    "w-full flex items-center gap-3 rounded-2xl p-2.5 transition-colors duration-200 outline-none",
                    "text-zinc-700 dark:text-zinc-200 hover:bg-zinc-100/80 dark:hover:bg-zinc-800/60",
                    isCollapsed && "justify-center p-2"
                  )}
                >
                  <span className={clsx("flex shrink-0 overflow-hidden rounded-xl bg-zinc-100 dark:bg-zinc-800", isCollapsed ? "w-9 h-9" : "w-10 h-10")}>
                    <img
                      src={workspace.groupThumbnail || "/favicon-32x32.png"}
                      alt=""
                      width={isCollapsed ? 36 : 40}
                      height={isCollapsed ? 36 : 40}
                      className="h-full w-full object-contain"
                    />
                  </span>
                  {!isCollapsed && (
                    <>
                      <div className="flex-1 min-w-0 text-left">
                        <p className="text-sm font-semibold truncate text-zinc-900 dark:text-white">
                          {workspace.groupName}
                        </p>
                        <p className="text-[11px] text-zinc-500 dark:text-zinc-400 truncate">Workspace</p>
                      </div>
                      <IconChevronDown className="w-4 h-4 text-zinc-400 shrink-0" stroke={1.5} />
                    </>
                  )}
                </Listbox.Button>
                <Listbox.Options className="absolute top-full left-0 mt-1.5 py-2 rounded-2xl w-max min-w-[14rem] max-w-[18rem] max-h-[min(20rem,60vh)] overflow-y-auto z-50 bg-white/90 dark:bg-zinc-900/95 backdrop-blur-xl shadow-lg shadow-zinc-200/50 dark:shadow-zinc-950/50 border border-zinc-200/50 dark:border-zinc-800/80">
                  <button
                    type="button"
                    onClick={() => {
                      workspaceListboxWrapperRef.current?.querySelector("button")?.click();
                      router.push("/");
                    }}
                    className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100/80 dark:hover:bg-zinc-800/60 rounded-xl mx-2 transition-colors duration-150"
                  >
                    <IconChevronLeft className="w-4 h-4 shrink-0" stroke={1.5} />
                    Back to menu
                  </button>
                  <div className="my-1.5 mx-2 h-px bg-zinc-200/80 dark:bg-zinc-700/60" />
                  {login?.workspaces && login.workspaces.length > 1 ? (
                    login.workspaces
                      .filter((ws) => ws.groupId !== workspace.groupId)
                      .map((ws) => (
                        <Listbox.Option
                          key={ws.groupId}
                          value={ws.groupId}
                          className={({ active }) =>
                            clsx(
                              "flex items-center gap-3 px-3 py-2.5 mx-2 rounded-xl cursor-pointer transition-colors duration-150",
                              active && "bg-zinc-100/80 dark:bg-zinc-800/60"
                            )
                          }
                        >
                          {({ selected }) => (
                            <>
                              <img src={ws.groupThumbnail || "/placeholder.svg"} alt="" className="w-8 h-8 rounded-lg object-cover shrink-0" />
                              <span className="flex-1 min-w-0 truncate text-sm text-zinc-800 dark:text-zinc-200">{ws.groupName}</span>
                              {selected && <IconCheck className="w-4 h-4 text-[color:rgb(var(--group-theme))] shrink-0" stroke={2} />}
                            </>
                          )}
                        </Listbox.Option>
                      ))
                  ) : (
                    <div className="px-4 py-3 text-xs text-zinc-500 dark:text-zinc-400 whitespace-nowrap">No other workspaces</div>
                  )}
                </Listbox.Options>
              </div>
            </Listbox>
            </div>

            <nav className="flex-1 mt-6 space-y-0.5 min-h-0 overflow-y-auto overflow-x-hidden">
              {visiblePages.map((page) => {
                const isActive = router.asPath === page.href.replace("[id]", workspace.groupId.toString());
                const IconComponent = isActive ? (page.filledIcon || page.icon) : page.icon;
                return (
                  <button
                    key={page.name}
                    type="button"
                    onClick={() => gotopage(page.href)}
                    className={clsx(
                      "w-full flex items-center gap-3 rounded-xl py-2.5 px-3 text-left outline-none select-none transition-colors duration-200",
                      "focus-visible:ring-0 active:bg-transparent",
                      isActive
                        ? "bg-[color:rgb(var(--group-theme)/0.1)] text-[color:rgb(var(--group-theme))]"
                        : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100/60 dark:hover:bg-zinc-800/40",
                      isCollapsed && "justify-center px-2"
                    )}
                    style={{ WebkitTapHighlightColor: "transparent" }}
                  >
                    <IconComponent className="w-5 h-5 shrink-0" stroke={1.5} />
                    {!isCollapsed && (
                      <span className="flex-1 truncate text-sm font-medium">{page.name}</span>
                    )}
                    {!isCollapsed && page.name === "Policies" && (
                      <>
                        <span className="px-1.5 py-0.5 text-[10px] font-medium bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 rounded-md">BETA</span>
                        {pendingPolicyCount > 0 && (
                          <span className="min-w-[1.25rem] h-5 px-1.5 rounded-md bg-red-500 text-white text-xs font-semibold flex items-center justify-center">
                            {pendingPolicyCount}
                          </span>
                        )}
                      </>
                    )}
                    {!isCollapsed && page.name === "Notices" && pendingNoticesCount > 0 && (
                      <span className="min-w-[1.25rem] h-5 px-1.5 rounded-md bg-amber-500 text-white text-xs font-semibold flex items-center justify-center">
                        {pendingNoticesCount}
                      </span>
                    )}
                    {isCollapsed && (page.name === "Policies" && pendingPolicyCount > 0 || page.name === "Notices" && pendingNoticesCount > 0) && (
                      <span className="absolute top-1 right-1 w-4 h-4 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center">
                        {page.name === "Policies" ? pendingPolicyCount : pendingNoticesCount}
                      </span>
                    )}
                  </button>
                );
              })}
            </nav>

            <div className={clsx("shrink-0 mt-auto pt-4 flex flex-col gap-2 overflow-visible", !isCollapsed && "border-t border-zinc-200/50 dark:border-zinc-800/80")}>
              <button
                type="button"
                onClick={() => setIsCollapsed(!isCollapsed)}
                className={clsx(
                  "hidden lg:flex items-center justify-center rounded-xl py-2 text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100/80 dark:hover:bg-zinc-800/50 transition-colors outline-none w-full",
                  isCollapsed ? "w-full" : "w-full"
                )}
                aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
              >
                <IconChevronLeft className={clsx("w-4 h-4 transition-transform duration-300", isCollapsed && "rotate-180")} stroke={1.5} />
              </button>

              <Menu as="div" className="relative">
                <Menu.Button
                  className={clsx(
                    "w-full flex items-center gap-3 rounded-2xl p-2.5 outline-none transition-colors duration-200",
                    "text-zinc-700 dark:text-zinc-200 hover:bg-zinc-100/80 dark:hover:bg-zinc-800/60",
                    isCollapsed && "justify-center p-2"
                  )}
                >
                  <img
                    src={login?.thumbnail || "/placeholder.svg"}
                    alt=""
                    className={clsx("rounded-xl object-cover shrink-0", isCollapsed ? "w-9 h-9" : "w-10 h-10")}
                  />
                  {!isCollapsed && (
                    <>
                      <div className="flex-1 min-w-0 text-left">
                        <p className="text-sm font-semibold truncate text-zinc-900 dark:text-white">{login?.displayname}</p>
                        <p className="text-[11px] text-zinc-500 dark:text-zinc-400 truncate">Account</p>
                      </div>
                      <IconChevronDown className="w-4 h-4 text-zinc-400 shrink-0" stroke={1.5} />
                    </>
                  )}
                </Menu.Button>
                <Menu.Items className="absolute bottom-full left-0 mb-2 py-2 rounded-2xl z-50 min-w-[11rem] w-full max-w-[14rem] bg-white/90 dark:bg-zinc-900/95 backdrop-blur-xl shadow-lg shadow-zinc-200/50 dark:shadow-zinc-950/50 border border-zinc-200/50 dark:border-zinc-800/80 overflow-hidden">
                  <Menu.Item>
                    {({ active }) => (
                      <button
                        type="button"
                        onClick={toggleTheme}
                        className={clsx(
                          "w-full flex items-center gap-3 px-3 py-2.5 text-sm rounded-xl mx-2 transition-colors duration-150 whitespace-nowrap text-left",
                          active ? "bg-zinc-100/80 dark:bg-zinc-800/60" : "text-zinc-700 dark:text-zinc-200"
                        )}
                      >
                        {theme === "dark" ? <IconSun className="w-4 h-4 shrink-0" stroke={1.5} /> : <IconMoon className="w-4 h-4 shrink-0" stroke={1.5} />}
                        {theme === "dark" ? "Light mode" : "Dark mode"}
                      </button>
                    )}
                  </Menu.Item>
                  <div className="my-1.5 mx-2 h-px bg-zinc-200/80 dark:bg-zinc-700/60" />
                  <Menu.Item>
                    {({ active }) => (
                      <button
                        type="button"
                        onClick={logout}
                        className={clsx(
                          "w-full flex items-center gap-3 px-3 py-2.5 text-sm rounded-xl mx-2 transition-colors duration-150 whitespace-nowrap text-left",
                          "text-red-600 dark:text-red-400",
                          active && "bg-red-50/80 dark:bg-red-950/40"
                        )}
                      >
                        <IconLogout className="w-4 h-4 shrink-0" stroke={1.5} />
                        Logout
                      </button>
                    )}
                  </Menu.Item>
                </Menu.Items>
              </Menu>
            </div>
          </div>
        </aside>
      </div>
    </>
  );
};

export default Sidebar;
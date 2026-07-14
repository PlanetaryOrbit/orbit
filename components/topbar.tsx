import type { NextPage } from "next";
import { Dialog, Transition } from "@headlessui/react";
import { loginState } from "@/state";
import { useRecoilState } from "recoil";
import Router, { useRouter } from "next/router";
import { useTheme } from "next-themes";
import {
  IconLogout,
  IconChevronDown,
  IconSun,
  IconMoon,
  IconSettings,
  IconDeviceLaptop,
  IconDeviceMobile,
  IconDevices,
  IconChevronLeft,
  IconTrash,
  IconRefresh,
} from "@tabler/icons-react";
import axios from "axios";
import { Fragment, useEffect, useRef, useState } from "react";
import toast from "react-hot-toast";
import { DiscordOAuthAvailable } from "@/hooks/useDiscordOAuth";
import { GoogleOAuthAvailable } from "@/hooks/useGoogleOAuth";
import { CrownIcon } from "lucide-react";
import moment from "moment";

type Session = {
  id: string;
  token: string;
  browser: string | null;
  os: string | null;
  device: string | null;
  ipAddress: string | null;
  createdAt: string;
  expiresAt: string;
  isCurrent: boolean;
  region?: string;
  country?: string;
};

function DeviceIcon({ device }: { device: string | null }) {
  if (device === "mobile") return <IconDeviceMobile className="w-5 h-5" />;
  if (device === "tablet") return <IconDeviceMobile className="w-5 h-5" />;
  return <IconDeviceLaptop className="w-5 h-5" />;
}

type Panel = "main" | "settings" | "sessions";

const Topbar: NextPage = () => {
  const [login, setLogin] = useRecoilState(loginState);
  const {theme, setTheme, resolvedTheme} = useTheme();
  const { isAvailable: isDiscordOAuth } = DiscordOAuthAvailable();
  const { isAvailable: isGoogleOAuth } = GoogleOAuthAvailable();
  const [open, setOpen] = useState(false);
  const [panel, setPanel] = useState<Panel>("main");
  const [sessions, setSessions] = useState<Session[]>([]);
  const [sessionsLoading, setSessionsLoading] = useState(false);
  const router = useRouter();
  const errorToastShown = useRef(false);

  const toggleTheme = () => {
    setTheme(resolvedTheme === "dark" ? "light" : "dark");
  };

  const openPanel = (p: Panel) => setPanel(p);

  const handleOpen = () => {
    setPanel("main");
    setOpen(true);
  };

  const fetchSessions = async () => {
    setSessionsLoading(true);
    try {
      const res = await axios.get("/api/user/sessions");
      setSessions(res.data.sessions || []);
    } catch {
      toast.error("Failed to load sessions");
    } finally {
      setSessionsLoading(false);
    }
  };

  const revokeSession = async (id: string) => {
    try {
      await axios.delete(`/api/user/sessions/${id}`);
      setSessions((prev) => prev.filter((s) => s.id !== id));
      toast.success("Session revoked");
    } catch {
      toast.error("Failed to revoke session");
    }
  };

  const revokeAll = async () => {
    try {
      await axios.delete("/api/user/sessions");
    } catch {
      toast.error("Failed to sign out all sessions");
    }
  };

  async function logout() {
    await axios.post("/api/auth/logout");
    setLogin({
      userId: 1,
      username: "",
      displayname: "",
      canMakeWorkspace: false,
      thumbnail: "",
      workspaces: [],
      isOwner: false,
      isFirstLogin: false,
    });
    router.push("/login");
  }

  async function unlink() {
    const id = toast.loading("Unlinking Discord...");
    try {
      await axios.post("/api/auth/discord/unlink");
      toast.success("Discord unlinked", { id });
      setLogin((prev) => ({ ...prev, discordUser: undefined }));
    } catch {
      toast.error("Failed to unlink", { id });
    }
  }

  async function deleteAccount() {
    const id = toast.loading("Deleting account...");
    try {
      await axios.delete("/api/user/account");
      toast.success("Account deleted", { id });
      await logout();
    } catch {
      toast.error("Failed to delete account", { id });
    }
  }

  async function googleUnlink() {
    const id = toast.loading("Unlinking Google...");
    try {
      await axios.post("/api/auth/google/unlink");
      toast.success("Google unlinked", { id });
      setLogin((prev) => ({ ...prev, googleUser: undefined }));
    } catch {
      toast.error("Failed to unlink", { id });
    }
  }

  useEffect(() => {
    if (!Router.isReady || errorToastShown.current) return;
    const { action, ...rest } = Router.query;
    if (action) {
      toast[action === "linked" ? "success" : "error"](
        action === "linked" ? "Discord linked!" : "Error signing in.",
      );
      errorToastShown.current = true;
      Router.replace({ pathname: Router.pathname, query: rest }, undefined, {
        shallow: true,
      });
    }
  }, [Router.isReady, Router.query]);

  const initials =
    login?.displayname
      ?.split(" ")
      .map((w) => w[0])
      .join("")
      .slice(0, 2)
      .toUpperCase() || "?";

  return (
    <>
      <header className="sticky top-0 z-50 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-sm border-b border-zinc-200 dark:border-zinc-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <img src="/planetary.svg" className="h-8 w-32" alt="Planetary" />

            <button
              onClick={handleOpen}
              aria-label="Open account menu"
              className="group flex items-center gap-2.5 rounded-full p-1 transition-colors hover:bg-zinc-100 dark:hover:bg-zinc-700/60 sm:pr-3"
            >
              <span className="relative inline-flex shrink-0">
                <img
                  src={login?.thumbnail || "/default-avatar.jpg"}
                  className="h-9 w-9 rounded-full bg-zinc-200 object-cover ring-2 ring-white transition group-hover:ring-zinc-100 dark:bg-zinc-600 dark:ring-zinc-800 dark:group-hover:ring-zinc-700"
                  alt=""
                />
                {login?.canMakeWorkspace && (
                  <span className="absolute -bottom-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-amber-500 ring-2 ring-white dark:ring-zinc-800">
                    <CrownIcon className="h-2.5 w-2.5 text-white" />
                  </span>
                )}
              </span>
              <span className="hidden text-sm font-medium text-zinc-700 dark:text-zinc-200 sm:block">
                {login?.displayname}
              </span>
              <IconChevronDown className="hidden h-4 w-4 text-zinc-400 sm:block" />
            </button>
          </div>
        </div>
      </header>

      <Transition show={open} as={Fragment}>
        <Dialog onClose={() => setOpen(false)} className="relative z-50">
          <Transition.Child
            as={Fragment}
            enter="ease-out duration-200"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="ease-in duration-150"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <div className="fixed inset-0 bg-black/20 dark:bg-black/40 backdrop-blur-[2px]" />
          </Transition.Child>

          <div className="fixed inset-0 flex items-center justify-center p-4">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-200"
              enterFrom="opacity-0 translate-y-1 scale-95"
              enterTo="opacity-100 translate-y-0 scale-100"
              leave="ease-in duration-150"
              leaveFrom="opacity-100 translate-y-0 scale-100"
              leaveTo="opacity-0 translate-y-1 scale-95"
            >
              <Dialog.Panel className="w-full max-w-sm overflow-hidden rounded-2xl bg-white shadow-2xl shadow-zinc-900/20 transition-all dark:bg-zinc-900">
                {panel === "main" && (
                  <>
                    <div className="flex items-center gap-3 px-4 py-4">
                      <img
                        src={login?.thumbnail}
                        className="h-10 w-10 shrink-0 rounded-full object-cover"
                        alt=""
                      />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-zinc-900 dark:text-white">
                          {login?.displayname}
                        </p>
                        <p className="truncate text-xs text-zinc-400 dark:text-zinc-500">
                          @{login?.username}
                        </p>
                      </div>
                      {login?.canMakeWorkspace && (
                        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-xl bg-amber-500/10">
                          <CrownIcon className="h-3.5 w-3.5 text-amber-500" />
                        </div>
                      )}
                    </div>

                    <div className="divide-y divide-zinc-100 dark:divide-zinc-800/80">
                      <div>
                        <button
                          onClick={toggleTheme}
                          className="flex w-full items-center gap-3 px-4 py-3 text-sm text-zinc-700 transition-colors hover:bg-zinc-50 dark:text-zinc-300 dark:hover:bg-zinc-800"
                        >
                          {resolvedTheme === "dark" ? (
                            <IconSun className="h-4 w-4 shrink-0 text-zinc-400" />
                          ) : (
                            <IconMoon className="h-4 w-4 shrink-0 text-zinc-400" />
                          )}
                          {resolvedTheme === "dark" ? "Light mode" : "Dark mode"}
                        </button>
                        <button
                          onClick={() => { openPanel("sessions"); fetchSessions(); }}
                          className="flex w-full items-center gap-3 px-4 py-3 text-sm text-zinc-700 transition-colors hover:bg-zinc-50 dark:text-zinc-300 dark:hover:bg-zinc-800"
                        >
                          <IconDevices className="h-4 w-4 shrink-0 text-zinc-400" />
                          <span className="flex-1 text-left">Sessions</span>
                          <IconChevronDown className="h-3.5 w-3.5 -rotate-90 text-zinc-400" />
                        </button>
                        <button
                          onClick={() => openPanel("settings")}
                          className="flex w-full items-center gap-3 px-4 py-3 text-sm text-zinc-700 transition-colors hover:bg-zinc-50 dark:text-zinc-300 dark:hover:bg-zinc-800"
                        >
                          <IconSettings className="h-4 w-4 shrink-0 text-zinc-400" />
                          <span className="flex-1 text-left">Account settings</span>
                          <IconChevronDown className="h-3.5 w-3.5 -rotate-90 text-zinc-400" />
                        </button>
                      </div>
                      <div>
                        <button
                          onClick={logout}
                          className="flex w-full items-center gap-3 px-4 py-3 text-sm text-red-600 transition-colors hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-500/10"
                        >
                          <IconLogout className="h-4 w-4 shrink-0" />
                          Sign out
                        </button>
                      </div>
                    </div>
                  </>
                )}

                {panel === "sessions" && (
                  <>
                    <div className="flex items-center gap-2 px-4 py-3.5">
                      <button
                        onClick={() => setPanel("main")}
                        className="rounded-lg p-1 text-zinc-500 transition-colors hover:bg-zinc-100 dark:hover:bg-zinc-800"
                      >
                        <IconChevronLeft className="h-4 w-4" />
                      </button>
                      <p className="flex-1 text-sm font-semibold text-zinc-900 dark:text-white">
                        Active sessions
                      </p>
                      <button
                        onClick={() => { fetchSessions(); toast.success("Sessions refreshed"); }}
                        className="rounded-lg p-1 text-zinc-400 transition-colors hover:bg-zinc-100 dark:hover:bg-zinc-800"
                      >
                        <IconRefresh className="h-4 w-4" />
                      </button>
                      <button
                        onClick={revokeAll}
                        className="rounded-lg px-2 py-1 text-xs font-medium text-red-500 transition-colors hover:bg-red-50 dark:hover:bg-red-500/10"
                      >
                        Sign out all
                      </button>
                    </div>

                    <div className="max-h-72 overflow-y-auto">
                      {sessionsLoading ? (
                        <div className="flex items-center justify-center py-10">
                          <div className="h-5 w-5 animate-spin rounded-full border-2 border-zinc-200 border-t-primary dark:border-zinc-700" />
                        </div>
                      ) : sessions.length === 0 ? (
                        <p className="py-10 text-center text-sm text-zinc-400 dark:text-zinc-500">
                          No sessions found
                        </p>
                      ) : (
                        <div className="divide-y divide-zinc-100 px-4 dark:divide-zinc-800/80">
                          {sessions.map((s) => (
                            <div key={s.id} className="flex items-center gap-3 py-3">
                              <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl ${s.isCurrent ? "bg-primary/10 text-primary" : "bg-zinc-100 text-zinc-400 dark:bg-zinc-800 dark:text-zinc-500"}`}>
                                <DeviceIcon device={s.device} />
                              </div>
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-1.5">
                                  <p className="truncate text-sm font-medium text-zinc-900 dark:text-white">
                                    {s.browser || "Unknown"} on {s.os || "Unknown"}
                                  </p>
                                  {s.isCurrent && (
                                    <span className="shrink-0 rounded-full bg-emerald-500/10 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">
                                      Current
                                    </span>
                                  )}
                                </div>
                                <p className="truncate text-xs text-zinc-400 dark:text-zinc-500">
                                  {[s.region, s.country].filter(Boolean).join(', ') || `${s.ipAddress} · ${moment(s.createdAt).fromNow()}`}
                                </p>
                              </div>
                              {!s.isCurrent && (
                                <button
                                  onClick={() => revokeSession(s.id)}
                                  className="shrink-0 rounded-lg p-1.5 text-zinc-400 transition-colors hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-500/10"
                                >
                                  <IconTrash className="h-3.5 w-3.5" />
                                </button>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </>
                )}

                {panel === "settings" && (
                  <>
                    <div className="flex items-center gap-2 border-b border-zinc-100 px-4 py-3.5 dark:border-zinc-800/80">
                      <button
                        onClick={() => setPanel("main")}
                        className="rounded-lg p-1 text-zinc-500 transition-colors hover:bg-zinc-100 dark:hover:bg-zinc-800"
                      >
                        <IconChevronLeft className="h-4 w-4" />
                      </button>
                      <p className="text-sm font-semibold text-zinc-900 dark:text-white">
                        Account settings
                      </p>
                    </div>

                    <div className="space-y-4 p-4">
                      <div className="flex items-center gap-3">
                        <img
                          src={login?.thumbnail}
                          alt=""
                          className="h-12 w-12 shrink-0 rounded-full object-cover"
                        />
                        <div>
                          <p className="font-semibold text-zinc-900 dark:text-white">
                            {login?.displayname}
                          </p>
                          <p className="text-xs text-zinc-400 dark:text-zinc-500">
                            @{login?.username}
                          </p>
                        </div>
                      </div>

                      {isDiscordOAuth &&
                        (login.discordUser ? (
                          <div className="flex items-center gap-3 rounded-xl bg-zinc-100 px-3 py-2.5 dark:bg-zinc-800">
                            <img
                              src={`https://cdn.discordapp.com/avatars/${login.discordUser.discordUserId}/${login.discordUser.avatar}.png`}
                              alt=""
                              className="h-7 w-7 shrink-0 rounded-full"
                            />
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-sm font-medium text-zinc-900 dark:text-white">
                                {login.discordUser.username}
                              </p>
                              <p className="text-xs text-zinc-400">Discord linked</p>
                            </div>
                            <button
                              onClick={unlink}
                              className="text-xs font-medium text-red-500 transition-colors hover:text-red-600"
                            >
                              Unlink
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => (window.location.href = "/api/auth/discord/start")}
                            className="flex w-full items-center justify-center gap-2 rounded-xl bg-zinc-100 px-4 py-2.5 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-700"
                          >
                            <img src="/discord.svg" alt="" className="h-4 w-4 invert dark:invert-0" />
                            Link Discord
                          </button>
                        ))}

                      {isGoogleOAuth &&
                        (login.googleUser ? (
                          <div className="flex items-center gap-3 rounded-xl bg-zinc-100 px-3 py-2.5 dark:bg-zinc-800">
                            <img
                              src={login.googleUser.avatar ? `/api/google/avatar-proxy?url=${encodeURIComponent(login.googleUser.avatar)}` : "/default-avatar.jpg"}
                              alt=""
                              className="h-7 w-7 shrink-0 rounded-full"
                            />
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-sm font-medium text-zinc-900 dark:text-white">
                                {login.googleUser.email}
                              </p>
                              <p className="text-xs text-zinc-400">Google linked</p>
                            </div>
                            <button
                              onClick={googleUnlink}
                              className="text-xs font-medium text-red-500 transition-colors hover:text-red-600"
                            >
                              Unlink
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => (window.location.href = "/api/auth/google/start")}
                            className="flex w-full items-center justify-center gap-2 rounded-xl bg-zinc-100 px-4 py-2.5 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-700"
                          >
                            <img src="/google.svg" alt="" className="h-4 w-4" />
                            Link Google
                          </button>
                        ))}

                      <div className="space-y-0.5 border-t border-zinc-100 pt-3 dark:border-zinc-800/80">
                        <p className="mb-1 px-1 text-[11px] font-medium uppercase tracking-wide text-zinc-400 dark:text-zinc-500">
                          Danger zone
                        </p>
                        <button
                          onClick={revokeAll}
                          className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-red-500 transition-colors hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-500/10"
                        >
                          <IconDevices className="h-4 w-4 shrink-0" />
                          Sign out all devices
                        </button>
                        {!login.canMakeWorkspace && (
                          <button
                            onClick={deleteAccount}
                            className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-red-500 transition-colors hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-500/10"
                          >
                            <IconTrash className="h-4 w-4 shrink-0" />
                            Delete account
                          </button>
                        )}
                      </div>
                    </div>
                  </>
                )}
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </Dialog>
      </Transition>
    </>
  );
};

export default Topbar;

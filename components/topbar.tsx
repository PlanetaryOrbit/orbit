import type { NextPage } from "next";
import { Dialog, Transition } from "@headlessui/react";
import { loginState } from "@/state";
import { useRecoilState } from "recoil";
import { Menu } from "@headlessui/react";
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
import moment from "moment";
import { CrownIcon, RefreshCwIcon } from "lucide-react";

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
      <header className="sticky top-0 z-50 bg-white/80 dark:bg-zinc-800/80 backdrop-blur-sm border-b border-zinc-200 dark:border-zinc-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <img src="/planetary.svg" className="h-8 w-32" alt="Planetary" />

            <button
              onClick={handleOpen}
              className="flex items-center gap-2.5 px-2.5 py-1.5 rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-700/60 transition-colors"
            >
              <div className="relative">
                <img
                  src={login?.thumbnail}
                  className="h-8 w-8 rounded-full bg-zinc-200 dark:bg-zinc-600 object-cover"
                  alt=""
                />
              </div>
              <span className="text-sm font-medium text-zinc-700 dark:text-zinc-200 hidden sm:block">
                {login?.displayname}
              </span>
              <IconChevronDown className="h-4 w-4 text-zinc-400" />
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
              <Dialog.Panel className="w-full max-w-sm bg-white dark:bg-zinc-800 rounded-2xl border border-zinc-200/80 dark:border-zinc-700/60 shadow-2xl shadow-zinc-900/10 overflow-hidden">
                {panel === "main" && (
                  <div>
                    <div className="p-4 border-b border-zinc-100 dark:border-zinc-700/60">
                      <div className="flex items-center gap-3">
                        <div className="relative shrink-0">
                          <img
                            src={login?.thumbnail}
                            className="h-12 w-12 rounded-xl object-cover bg-zinc-200/10"
                            alt=""
                          />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="font-semibold text-zinc-900 dark:text-white text-sm truncate">
                            {login?.displayname}
                          </p>
                          <p className="text-xs text-zinc-500 dark:text-zinc-400 truncate">
                            @{login?.username}
                          </p>
                        </div>
                        {login?.canMakeWorkspace && (
                          <div className="shrink-0 flex items-center justify-center w-7 h-7 rounded-lg bg-amber-50 dark:bg-amber-500/10">
                            <CrownIcon className="w-3.5 h-3.5 text-amber-500" />
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="p-2 space-y-0.5">
                      <button
                        onClick={toggleTheme}
                        className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-700/60 transition-colors text-left"
                      >
                        {resolvedTheme === "dark" ? (
                          <IconSun className="w-4 h-4 text-zinc-400 shrink-0" />
                        ) : (
                          <IconMoon className="w-4 h-4 text-zinc-400 shrink-0" />
                        )}
                        {resolvedTheme === "dark" ? "Light mode" : "Dark mode"}
                      </button>

                      <button
                        onClick={() => {
                          openPanel("sessions");
                          fetchSessions();
                        }}
                        className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-700/60 transition-colors text-left"
                      >
                        <IconDevices className="w-4 h-4 text-zinc-400 shrink-0" />
                        <span className="flex-1">Sessions</span>
                        <IconChevronDown className="w-3.5 h-3.5 text-zinc-400 -rotate-90" />
                      </button>

                      <button
                        onClick={() => openPanel("settings")}
                        className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-700/60 transition-colors text-left"
                      >
                        <IconSettings className="w-4 h-4 text-zinc-400 shrink-0" />
                        <span className="flex-1">Account settings</span>
                        <IconChevronDown className="w-3.5 h-3.5 text-zinc-400 -rotate-90" />
                      </button>
                    </div>

                    <div className="p-2 border-t border-zinc-100 dark:border-zinc-700/60">
                      <button
                        onClick={logout}
                        className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors text-left"
                      >
                        <IconLogout className="w-4 h-4 shrink-0" />
                        Sign out
                      </button>
                    </div>
                  </div>
                )}

                {panel === "sessions" && (
                  <div>
                    <div className="flex items-center gap-2 p-4 border-b border-zinc-100 dark:border-zinc-700/60">
                      <button
                        onClick={() => setPanel("main")}
                        className="p-1.5 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-colors"
                      >
                        <IconChevronLeft className="w-4 h-4 text-zinc-500" />
                      </button>
                      <p className="font-semibold text-sm text-zinc-900 dark:text-white flex-1">
                        Active sessions
                      </p>
                      <button
                        onClick={revokeAll}
                        className="text-xs text-red-500 hover:text-red-600 dark:text-red-400 font-medium px-2 py-1 rounded-lg hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors"
                      >
                        Sign out all
                      </button>
                      <button
                        onClick={() => {fetchSessions(); toast.success("Sessions refreshed")}}
                      >
                        <IconRefresh className="w-5 h-5 text-black/50 dark:text-white/50 p-0.5 rounded-lg dark:hover:bg-white/5 hover:bg-black/10 transition-all" />
                      </button>
                    </div>

                    <div className="overflow-y-auto max-h-80">
                      {sessionsLoading ? (
                        <div className="flex items-center justify-center py-10">
                          <div className="w-6 h-6 border-2 border-zinc-300 dark:border-zinc-600 border-t-primary rounded-full animate-spin" />
                        </div>
                      ) : sessions.length === 0 ? (
                        <p className="text-center text-sm text-zinc-400 py-10">
                          No sessions found
                        </p>
                      ) : (
                        <div className="p-2 space-y-1">
                          {sessions.map((s) => (
                            <div
                              key={s.id}
                              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl ${s.isCurrent ? "bg-zinc-50 dark:bg-zinc-700/40" : ""}`}
                            >
                              <div
                                className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${s.isCurrent ? "bg-primary/10 text-primary" : "bg-zinc-100 dark:bg-zinc-700 text-zinc-500 dark:text-zinc-400"}`}
                              >
                                <DeviceIcon device={s.device} />
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-1.5">
                                  <p className="text-sm font-medium text-zinc-900 dark:text-white truncate">
                                    {s.browser || "Unknown browser"} on{" "}
                                    {s.os || "Unknown OS"}
                                  </p>
                                  {s.isCurrent && (
                                    <span className="shrink-0 text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400">
                                      Current
                                    </span>
                                  )}
                                </div>
                                <p className="text-xs text-zinc-400 dark:text-zinc-500 truncate">
                                  {s.ipAddress} ·{" "}
                                  {moment(s.createdAt).fromNow()}
                                </p>
                              </div>
                              {!s.isCurrent && (
                                <button
                                  onClick={() => revokeSession(s.id)}
                                  className="shrink-0 p-1.5 rounded-lg text-zinc-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors"
                                >
                                  <IconTrash className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {panel === "settings" && (
                  <div>
                    <div className="flex items-center gap-2 p-4 border-b border-zinc-100 dark:border-zinc-700/60">
                      <button
                        onClick={() => setPanel("main")}
                        className="p-1.5 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-colors"
                      >
                        <IconChevronLeft className="w-4 h-4 text-zinc-500" />
                      </button>
                      <p className="font-semibold text-sm text-zinc-900 dark:text-white">
                        Account settings
                      </p>
                    </div>

                    <div className="p-4 space-y-3">
                      <div className="flex items-center gap-4">
                        <img
                          src={login?.thumbnail}
                          alt=""
                          className="h-16 w-16 rounded-2xl object-cover bg-zinc-200 dark:bg-zinc-600 shrink-0"
                        />
                        <div>
                          <p className="font-semibold text-zinc-900 dark:text-white">
                            {login?.displayname}
                          </p>
                          <p className="text-xs text-zinc-500 dark:text-zinc-400">
                            @{login?.username}
                          </p>
                        </div>
                      </div>

                      {isDiscordOAuth &&
                        (login.discordUser ? (
                          <div className="flex items-center gap-3 p-3 rounded-xl border border-zinc-200 dark:border-zinc-600/60 bg-zinc-50 dark:bg-zinc-700/30">
                            <img
                              src={`https://cdn.discordapp.com/avatars/${login.discordUser.discordUserId}/${login.discordUser.avatar}.png`}
                              alt=""
                              className="h-8 w-8 rounded-full shrink-0"
                            />
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-zinc-900 dark:text-white truncate">
                                {login.discordUser.username}
                              </p>
                              <p className="text-xs text-zinc-400">
                                Discord linked
                              </p>
                            </div>
                            <button
                              onClick={unlink}
                              className="text-xs text-red-500 hover:text-red-600 font-medium"
                            >
                              Unlink
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() =>
                              (window.location.href = "/api/auth/discord/start")
                            }
                            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 border border-zinc-200 dark:border-zinc-600 rounded-xl text-sm font-medium text-zinc-700 dark:text-zinc-200 hover:bg-zinc-50 dark:hover:bg-zinc-700/50 transition-colors"
                          >
                            <img
                              src="/discord.svg"
                              alt=""
                              className="w-4 h-4 dark:invert-0 invert"
                            />
                            Link Discord
                          </button>
                        ))}

                      {isGoogleOAuth &&
                        (login.googleUser ? (
                          <div className="flex items-center gap-3 p-3 rounded-xl border border-zinc-200 dark:border-zinc-600/60 bg-zinc-50 dark:bg-zinc-700/30">
                            <img
                              src={
                                login.googleUser.avatar
                                  ? `/api/google/avatar-proxy?url=${encodeURIComponent(login.googleUser.avatar)}`
                                  : "/default-avatar.jpg"
                              }
                              alt=""
                              className="h-8 w-8 rounded-full shrink-0"
                            />
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-zinc-900 dark:text-white truncate">
                                {login.googleUser.email}
                              </p>
                              <p className="text-xs text-zinc-400">
                                Google linked
                              </p>
                            </div>
                            <button
                              onClick={googleUnlink}
                              className="text-xs text-red-500 hover:text-red-600 font-medium"
                            >
                              Unlink
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() =>
                              (window.location.href = "/api/auth/google/start")
                            }
                            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 border border-zinc-200 dark:border-zinc-600 rounded-xl text-sm font-medium text-zinc-700 dark:text-zinc-200 hover:bg-zinc-50 dark:hover:bg-zinc-700/50 transition-colors"
                          >
                            <img src="/google.svg" alt="" className="w-4 h-4" />
                            Link Google
                          </button>
                        ))}
                      <div className="pt-2 mt-2 border-t border-zinc-100 dark:border-zinc-700/60 space-y-0.5">
                        <p className="px-3 pb-1 text-[11px] font-semibold text-zinc-400 uppercase tracking-wide">
                          Danger zone
                        </p>
                        <button
                          onClick={revokeAll}
                          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-red-500 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors text-left"
                        >
                          <IconDevices className="w-4 h-4 shrink-0" />
                          Sign out all devices
                        </button>
                        {!login.canMakeWorkspace && <button
                          onClick={deleteAccount}
                          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-red-500 disabled:text-red-400/50 dark:disabled:text-red-400/60 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors text-left"
                        >
                          <IconTrash className="w-4 h-4 shrink-0" />
                          {login.canMakeWorkspace
                            ? "Instance owner account cannot be deleted"
                            : "Delete account"}
                        </button>}
                      </div>
                    </div>
                  </div>
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

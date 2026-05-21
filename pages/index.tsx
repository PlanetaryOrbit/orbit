"use client";

import type { NextPage } from "next";
import Head from "next/head";
import Topbar from "@/components/topbar";
import Router, { useRouter } from "next/router";
import { loginState, workspaceinfo } from "@/state";
import { Transition, Dialog } from "@headlessui/react";
import { useState, useEffect, Fragment, useRef, useCallback } from "react";
import axios from "axios";
import Input from "@/components/input";
import { motion } from "framer-motion";
import { useForm, FormProvider } from "react-hook-form";
import { useRecoilState } from "recoil";
import { toast } from "react-hot-toast";
import {
  IconPlus,
  IconRefresh,
  IconBuildingSkyscraper,
  IconSettings,
  IconX,
  IconUsersGroup,
  IconCalendarEvent,
  IconChartBar,
  IconFileText,
  IconRocket,
  IconServerCog,
  IconClock,
  IconUserCog,
  IconClockCog,
} from "@tabler/icons-react";
import clsx from "clsx";
import { workspace } from "@prisma/client";
import {
  WorkspaceCard,
  WorkspacesEmptyState,
  WorkspacesPageHeader,
  WorkspacesPageShell,
  WorkspacesSectionLabel,
  workspacesFormInputOverride,
  workspacesModalPanelClass,
  workspacesPrimaryButtonClass,
  workspacesSecondaryButtonClass,
} from "@/components/workspaces/shell";

interface RolesRes {
  success: true;
  data: {
    workspace: Workspaces;
  }[];
}

interface Workspaces {
  groupId: number;
  groupName: string;
  groupLogo: string;
}

const PINNED_WORKSPACE_KEY = "orbit-pinned-workspace";

const Home: NextPage = () => {
  const [login, setLogin] = useRecoilState(loginState);
  const [loading, setLoading] = useState(false);
  const methods = useForm();
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [isOwner, setIsOwner] = useState(false);
  const [showInstanceSettings, setShowInstanceSettings] = useState(false);
  const [pinnedWorkspaceId, setPinnedWorkspaceId] = useState<number | null>(
    null,
  );
  const [workspaces, setWorkspaces] = useState<Workspaces[] | []>([]);
  const [externalConfig, setExternalConfig] = useState({
    clientId: "",
    clientSecret: "",
    redirectUri: "",
    redirect_wid: "",
    discordAppId: "",
    discordAppSecret: "",
    google_id: "",
    google_secret: "",
    google_email_filtration: "",
    oauthOnlyLogin: false,
  });
  const [configLoading, setConfigLoading] = useState(false);
  const [saveMessage, setSaveMessage] = useState("");
  const [usingEnvVars, setUsingEnvVars] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [onboardingSlide, setOnboardingSlide] = useState(0);
  const [loginBackground, setLoginBackground] = useState<string | null>(null);
  const [bgUploading, setBgUploading] = useState(false);
  const bgFileInputRef = useRef<HTMLInputElement>(null);
  const isOAuthConfigValid =
    (externalConfig.discordAppId.trim().length > 0 &&
      externalConfig.discordAppSecret.trim().length > 0) ||
    (externalConfig.clientId.trim().length > 0 &&
      externalConfig.clientSecret.trim().length > 0) ||
    (externalConfig.clientId.trim().length > 0 &&
      externalConfig.clientSecret.trim().length > 0) ||
    (externalConfig.google_id.trim().length > 0 &&
      externalConfig.google_secret.trim().length > 0);

  const features = [
    {
      title: "Workspaces",
      desc: "Each Roblox group gets its own workspace with members, roles, and activity tracking.",
    },
    {
      title: "Roles & Departments",
      desc: "Organise your team into departments and assign roles for fine-grained access control.",
    },
    {
      title: "Sessions",
      desc: "Log and track sessions, attendance, and host activity all in one place.",
    },
  ];
  const slides = [
    {
      icon: IconBuildingSkyscraper,
      title: "Workspaces",
      desc: "Each Roblox group gets its own workspace — your team's central hub for everything.",
      note: undefined,
    },
    {
      icon: IconUsersGroup,
      title: "Roles & Departments",
      desc: "Organise your team into departments and assign roles for fine-grained access control.",
      note: undefined,
    },
    {
      icon: IconCalendarEvent,
      title: "Sessions",
      desc: "Host and log sessions, track attendance, assign co-hosts, and keep notes automatically.",
      note: undefined,
    },
    {
      icon: IconChartBar,
      title: "Activity & Quotas",
      desc: "Monitor member activity over time. Set quotas and see who's contributing.",
      note: undefined,
    },
    {
      icon: IconFileText,
      title: "Documents & Policies",
      desc: "Write internal documents and require policy acknowledgments from your members.",
      note: undefined,
    },
    {
      icon: IconServerCog,
      title: "Staff Management",
      desc: "Manage all of your staff effortlessly from the views.",
      note: undefined,
    },
    {
      icon: IconUserCog,
      title: "Staff Notices",
      desc: "See, monitor, approve or deny staff notices, all made in one place.",
      note: undefined,
    },
    {
      icon: IconClockCog,
      title: "Leaderboard",
      desc: "See how you have been doing, and see who is on the leaderboard.",
      note: undefined,
    },
    {
      icon: IconRocket,
      title: "You're all set! 🎉",
      desc: "That's everything. Jump into your workspace and start exploring.",
      note: "More features are added regularly — keep an eye out for updates.",
    },
  ];

  const gotoWorkspace = (id: number) => {
    router.push(`/workspace/${id}`);
  };

  useEffect(() => {
    async function checkWorkspaces() {
      try {
        const { data } = await axios.get<{ data: Workspaces[]}>("/api/auth/workspaceMembership");

        setWorkspaces(data.data);
      } catch (error) {
        console.error("Error checking workspaces:", error);
      }
    }

    if (typeof window === "undefined") return;
    const raw = localStorage.getItem(PINNED_WORKSPACE_KEY);
    if (raw) {
      const id = parseInt(raw, 10);
      if (!isNaN(id)) setPinnedWorkspaceId(id);
    }

    checkWorkspaces();
  }, []);

  useEffect(() => {
    if (!workspaces?.length || pinnedWorkspaceId === null) return;
    const inList = workspaces.some((w) => w.groupId === pinnedWorkspaceId);
    if (!inList) {
      setPinnedWorkspaceId(null);
      localStorage.removeItem(PINNED_WORKSPACE_KEY);
    }
  }, [workspaces, pinnedWorkspaceId]);

  const togglePin = (e: React.MouseEvent, groupId: number) => {
    e.preventDefault();
    e.stopPropagation();
    if (pinnedWorkspaceId === groupId) {
      setPinnedWorkspaceId(null);
      localStorage.removeItem(PINNED_WORKSPACE_KEY);
      toast.success("Workspace unpinned");
    } else {
      setPinnedWorkspaceId(groupId);
      localStorage.setItem(PINNED_WORKSPACE_KEY, String(groupId));
      toast.success("Workspace pinned");
    }
  };

  const createWorkspace = async () => {
    setLoading(true);
    const t = toast.loading("Creating workspace...");

    const request = await axios
      .post("/api/createws", {
        groupId: Number(methods.getValues("groupID")),
      })
      .catch((err) => {
        console.log(err);
        setLoading(false);

        if (err.response?.data?.error === "You are not a high enough rank") {
          methods.setError("groupID", {
            type: "custom",
            message: "You need to be a rank 10 or higher to create a workspace",
          });
        }
        if (err.response?.data?.error === "Workspace already exists") {
          methods.setError("groupID", {
            type: "custom",
            message: "This group already has a workspace",
          });
        }
      });

    if (request) {
      toast.success("Workspace created!", { id: t });
      setIsOpen(false);
      router.push(`/workspace/${methods.getValues("groupID")}?new=true`);
    }
  };
  useEffect(() => {
    const checkLogin = async () => {
      let req;
      try {
        req = await axios.get("/api/@me");
        setLogin({ ...req.data.user });
        if (req.data.user.isFirstLogin) {
          setShowOnboarding(true);
        }
      } catch (err: any) {
        const status = err.response?.status;
        if (status === 400) {
          if (router.pathname !== "/welcome") router.push("/welcome");
        } else if (status === 401) {
          router.push("/login");
        } else {
          console.error("Unexpected error:", err);
        }
      } finally {
        setLoading(false);
      }
    };

    const checkOwnerStatus = async () => {
      try {
        const response = await axios.get("/api/auth/checkOwner");
        if (response.data.success) setIsOwner(response.data.isOwner);
      } catch (err: any) {
        if (err.response?.status !== 401) {
          console.error("Failed to check owner status:", err);
        }
      }
    };

    checkLogin();
    checkOwnerStatus();
  }, []);

  const checkRoles = async () => {
    const request = axios
      .post("/api/auth/checkRoles")
      .then((data) => { setWorkspaces(data.data.data ?? []) })
      .catch(console.error);

    toast.promise(request, {
      loading: "Checking roles...",
      success: "Roles checked!",
      error: "An error occurred",
    });
  };

  useEffect(() => {
    if (!isOwner) return;
    if (showInstanceSettings) {
      loadRobloxConfig();
    }
  }, [showInstanceSettings, isOwner]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const currentOrigin = window.location.origin;
      const autoRedirectUri = `${currentOrigin}/api/auth/roblox/callback`;
      setExternalConfig((prev) => ({ ...prev, redirectUri: autoRedirectUri }));
    }
  }, []);

  const loadRobloxConfig = async () => {
    try {
      const response = await axios.get("/api/admin/instance-config");
      console.log(response);
      const {
        robloxClientId,
        robloxClientSecret,
        oauthOnlyLogin,
        usingEnvVars: envVars,
        redirectWorkspace,
        discordApplicationID,
        discordClientSecret,
        loginBackground: bg,
        google_id,
        google_secret,
        google_email_filtration,
      } = response.data;
      const currentOrigin =
        typeof window !== "undefined" ? window.location.origin : "";
      const autoRedirectUri = `${currentOrigin}/api/auth/roblox/callback`;

      setExternalConfig({
        clientId: robloxClientId || "",
        clientSecret: robloxClientSecret || "",
        redirectUri: response.data.robloxRedirectUri || autoRedirectUri,
        discordAppId: discordApplicationID || "", // was missing the fallback
        discordAppSecret: discordClientSecret || "", // was missing the fallback
        oauthOnlyLogin: oauthOnlyLogin || false,
        redirect_wid: redirectWorkspace || "", // was missing the fallback
        google_id: google_id || "",
        google_secret: google_secret || "",
        google_email_filtration: google_email_filtration || "",
      });
      setUsingEnvVars(envVars || false);
      setLoginBackground(bg || null);
    } catch (error) {
      console.error("Failed to load OAuth config:", error);
    }
  };

  const saveRobloxConfig = async () => {
    setConfigLoading(true);
    setSaveMessage("");
    try {
      await axios.post("/api/admin/instance-config", {
        robloxClientId: externalConfig.clientId,
        robloxClientSecret: externalConfig.clientSecret,
        robloxRedirectUri: externalConfig.redirectUri,
        oauthOnlyLogin: externalConfig.oauthOnlyLogin,
        redirectWorkspaceID: externalConfig.redirect_wid,
        discordAppId: externalConfig.discordAppId,
        discordSecret: externalConfig.discordAppSecret,
        google_id: externalConfig.google_id,
        google_secret: externalConfig.google_secret,
        google_email_filtration: externalConfig.google_email_filtration
          ? externalConfig.google_email_filtration.startsWith("@")
            ? externalConfig.google_email_filtration
            : `@${externalConfig.google_email_filtration}`
          : "",
      });
      setSaveMessage("Settings saved successfully!");
      setTimeout(() => setSaveMessage(""), 3000);
    } catch (error) {
      console.error("Failed to save OAuth config:", error);
      setSaveMessage("Failed to save settings. Please try again.");
      setTimeout(() => setSaveMessage(""), 3000);
    } finally {
      setConfigLoading(false);
    }
  };

  const Onboarded = async () => {
    try {
      await axios.post("/api/user/firstLogin");
    } catch {}
  };

  const uploadBackground = useCallback(async (file: File) => {
    setBgUploading(true);
    try {
      const formData = new FormData();
      formData.append("background", file);
      const res = await axios.post("/api/admin/upload-background", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setLoginBackground(res.data.url);
      toast.success("Background image updated!");
    } catch {
      toast.error("Failed to upload background image.");
    } finally {
      setBgUploading(false);
    }
  }, []);

  const removeBackground = useCallback(async () => {
    setBgUploading(true);
    try {
      await axios.delete("/api/admin/upload-background");
      setLoginBackground(null);
      toast.success("Background image removed.");
    } catch {
      toast.error("Failed to remove background image.");
    } finally {
      setBgUploading(false);
    }
  }, []);

  useEffect(() => {
    if (isOwner) return;

    if (showInstanceSettings || configLoading) {
      return;
    }

    if (
      externalConfig.redirect_wid &&
      externalConfig.redirect_wid.length >= 1 &&
      workspaces?.length
    ) {
      const redirectWorkspaceId = Number(externalConfig.redirect_wid);
      const hasAccess = workspaces.some(
        (workspace) => workspace.groupId === redirectWorkspaceId,
      );

      if (hasAccess) {
        gotoWorkspace(redirectWorkspaceId);
      } else {
        router.push("/404");
      }
    }
  }, [
    workspaces,
    externalConfig.redirect_wid,
    showInstanceSettings,
    configLoading,
  ]);

  const nextSlide = () => {
    setOnboardingSlide(onboardingSlide + 1);
  };

  // workaround to prevent people from staying locked out of their instance
  useEffect(() => {
    if (!isOAuthConfigValid) {
      setExternalConfig((prev) => ({
        ...prev,
        oauthOnlyLogin: false,
      }));
    }
  }, [isOAuthConfigValid]);

  return (
    <div>
      <Head>
        <title>Orbit - Workspaces</title>
        <meta
          name="description"
          content="Manage your Roblox workspaces with Orbit"
        />
      </Head>

      <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 relative overflow-hidden">
        <div
          className="absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(var(--group-theme,236,72,153),0.08),transparent)] dark:bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(var(--group-theme,236,72,153),0.12),transparent)] pointer-events-none"
          aria-hidden
        />
        <Topbar />
        <WorkspacesPageShell>
          <WorkspacesPageHeader
            title="Workspaces"
            subtitle="Choose a workspace to continue, or create one to get started."
            action={
              <div className="flex flex-wrap items-center justify-end gap-2">
                {isOwner ? (
                  <button
                    type="button"
                    onClick={() => setIsOpen(true)}
                    className={clsx(workspacesPrimaryButtonClass, "gap-2 px-5 py-2.5 font-semibold")}
                  >
                    <IconPlus className="h-5 w-5" stroke={2} />
                    <span>New Workspace</span>
                  </button>
                ) : null}
                <button
                  type="button"
                  onClick={checkRoles}
                  className={clsx(workspacesSecondaryButtonClass, "gap-2 px-4 py-2.5")}
                >
                  <IconRefresh className="h-4 w-4" stroke={1.5} />
                  <span className="hidden sm:inline">Check Roles</span>
                </button>
                {isOwner ? (
                  <button
                    type="button"
                    onClick={() => setShowInstanceSettings(true)}
                    className="flex h-10 w-10 items-center justify-center rounded-xl bg-zinc-100 text-zinc-600 transition-colors hover:bg-zinc-200 hover:text-primary dark:bg-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-700"
                    title="Instance settings"
                  >
                    <IconSettings className="h-5 w-5" stroke={1.5} />
                  </button>
                ) : null}
              </div>
            }
          />

          {workspaces.length > 0 ? (
            <>
              {(() => {
                const pinned =
                  pinnedWorkspaceId != null
                    ? workspaces.find((w) => w.groupId === pinnedWorkspaceId)
                    : null;
                const others = pinned
                  ? workspaces.filter((w) => w.groupId !== pinnedWorkspaceId)
                  : workspaces;
                const showPinnedFeatured = !!pinned;
                const showAsSingleBig = !showPinnedFeatured && others.length === 1;

                return (
                  <>
                    {showPinnedFeatured && pinned ? (
                      <div className="mb-6">
                        <WorkspacesSectionLabel>Pinned workspace</WorkspacesSectionLabel>
                        <WorkspaceCard
                          workspace={pinned}
                          featured
                          isPinned
                          onOpen={() => gotoWorkspace(pinned.groupId)}
                          onTogglePin={(e) => togglePin(e, pinned.groupId)}
                        />
                      </div>
                    ) : null}
                    {others.length > 0 ? (
                      <div>
                        {showPinnedFeatured ? (
                          <WorkspacesSectionLabel>Other workspaces</WorkspacesSectionLabel>
                        ) : null}
                        <div
                          className={clsx(
                            "grid gap-3 sm:gap-4",
                            !showPinnedFeatured && showAsSingleBig
                              ? "grid-cols-1 max-w-xl"
                              : "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3"
                          )}
                        >
                          {others.map((w) => (
                            <WorkspaceCard
                              key={w.groupId}
                              workspace={w}
                              featured={!showPinnedFeatured && others.length === 1}
                              isPinned={pinnedWorkspaceId === w.groupId}
                              onOpen={() => gotoWorkspace(w.groupId)}
                              onTogglePin={(e) => togglePin(e, w.groupId)}
                            />
                          ))}
                        </div>
                      </div>
                    ) : null}
                  </>
                );
              })()}
            </>
          ) : (
            <WorkspacesEmptyState
              icon={IconBuildingSkyscraper}
              title="No workspaces yet"
              description={
                isOwner
                  ? "Create your first workspace to get started."
                  : "You don't have permission to create workspaces. Contact an administrator if you need access."
              }
              action={
                isOwner ? (
                  <button
                    type="button"
                    onClick={() => setIsOpen(true)}
                    className={clsx(workspacesPrimaryButtonClass, "gap-2 px-5 py-2.5 font-semibold")}
                  >
                    <IconPlus className="h-5 w-5" stroke={2} />
                    Create Workspace
                  </button>
                ) : null
              }
            />
          )}

          <Transition appear show={isOpen} as={Fragment}>
            <Dialog
              as="div"
              className="relative z-10"
              onClose={() => setIsOpen(false)}
            >
              <Transition.Child
                as={Fragment}
                enter="ease-out duration-300"
                enterFrom="opacity-0"
                enterTo="opacity-100"
                leave="ease-in duration-200"
                leaveFrom="opacity-100"
                leaveTo="opacity-0"
              >
                <div className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm" />
              </Transition.Child>

              <div className="fixed inset-0 overflow-y-auto">
                <div className="flex min-h-full items-center justify-center p-4 text-center">
                  <Transition.Child
                    as={Fragment}
                    enter="ease-out duration-300"
                    enterFrom="opacity-0 scale-95"
                    enterTo="opacity-100 scale-100"
                    leave="ease-in duration-200"
                    leaveFrom="opacity-100 scale-100"
                    leaveTo="opacity-0 scale-95"
                  >
                    <Dialog.Panel className={clsx(workspacesModalPanelClass, "max-w-md p-6")}>
                      <Dialog.Title
                        as="h3"
                        className="text-lg font-semibold text-zinc-900 dark:text-white"
                      >
                        Create New Workspace
                      </Dialog.Title>
                      <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                        Enter your Roblox group ID to set up a workspace
                      </p>

                      <div className="mt-5">
                        <FormProvider {...methods}>
                          <form
                            onSubmit={methods.handleSubmit(createWorkspace)}
                          >
                            <Input
                              label="Group ID"
                              placeholder="e.g. 35724790"
                              classoverride={workspacesFormInputOverride}
                              {...methods.register("groupID", {
                                required: "This field is required",
                                pattern: {
                                  value: /^[a-zA-Z0-9-.]*$/,
                                  message: "No spaces or special characters",
                                },
                                maxLength: {
                                  value: 10,
                                  message: "Length must be below 10 characters",
                                },
                              })}
                            />
                          </form>
                        </FormProvider>
                      </div>

                      <div className="mt-6 flex justify-end gap-3">
                        <button
                          type="button"
                          onClick={() => setIsOpen(false)}
                          className={workspacesSecondaryButtonClass}
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          onClick={methods.handleSubmit(createWorkspace)}
                          disabled={loading}
                          className={workspacesPrimaryButtonClass}
                        >
                          {loading ? "Creating…" : "Create"}
                        </button>
                      </div>
                    </Dialog.Panel>
                  </Transition.Child>
                </div>
              </div>
            </Dialog>
          </Transition>

          <Transition appear show={showInstanceSettings} as={Fragment}>
            <Dialog
              as="div"
              className="relative z-10"
              onClose={() => setShowInstanceSettings(false)}
            >
              <Transition.Child
                as={Fragment}
                enter="ease-out duration-300"
                enterFrom="opacity-0"
                enterTo="opacity-100"
                leave="ease-in duration-200"
                leaveFrom="opacity-100"
                leaveTo="opacity-0"
              >
                <div className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm" />
              </Transition.Child>

              <div className="fixed inset-0 overflow-y-auto">
                <div className="flex min-h-full items-center justify-center p-4 text-center">
                  <Transition.Child
                    as={Fragment}
                    enter="ease-out duration-300"
                    enterFrom="opacity-0 scale-95"
                    enterTo="opacity-100 scale-100"
                    leave="ease-in duration-200"
                    leaveFrom="opacity-100 scale-100"
                    leaveTo="opacity-0 scale-95"
                  >
                    <Dialog.Panel className={clsx(workspacesModalPanelClass, "flex max-h-[90vh] max-w-lg flex-col")}>
                      <div className="flex items-center justify-between px-6 pt-6 pb-4 shrink-0">
                        <Dialog.Title className="text-lg font-semibold text-zinc-900 dark:text-white">
                          Instance Settings
                        </Dialog.Title>
                        <button
                          type="button"
                          onClick={() => setShowInstanceSettings(false)}
                          className="p-2 rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-700 text-zinc-500 transition-colors"
                        >
                          <IconX className="w-5 h-5" stroke={1.5} />
                        </button>
                      </div>

                      <div className="overflow-y-auto px-6 pb-2 space-y-4">
                        <div>
                          {usingEnvVars && (
                            <div className="mb-3 p-3 rounded-md bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
                              <p className="text-sm text-blue-800 dark:text-blue-200 font-medium">
                                🔒 Using Environment Variables
                              </p>
                              <p className="text-xs text-blue-700 dark:text-blue-300 mt-0.5">
                                Database configuration is disabled.
                              </p>
                            </div>
                          )}

                          <div className="space-y-2.5">
                            <div className="grid grid-cols-2 gap-2.5">
                              <div>
                                <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1">
                                  Client ID
                                </label>
                                <input
                                  type="text"
                                  value={externalConfig.clientId}
                                  onChange={(e) =>
                                    setExternalConfig((prev) => ({
                                      ...prev,
                                      clientId: e.target.value,
                                    }))
                                  }
                                  placeholder="23748326747865334"
                                  disabled={usingEnvVars}
                                  className={`w-full px-3 py-1.5 border rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                                    usingEnvVars
                                      ? "bg-zinc-100 dark:bg-zinc-800 border-zinc-300 dark:border-zinc-600 text-zinc-500 dark:text-zinc-400 cursor-not-allowed"
                                      : "border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white"
                                  }`}
                                />
                              </div>
                              <div>
                                <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1">
                                  Client Secret
                                </label>
                                <input
                                  type="password"
                                  value={externalConfig.clientSecret}
                                  onChange={(e) =>
                                    setExternalConfig((prev) => ({
                                      ...prev,
                                      clientSecret: e.target.value,
                                    }))
                                  }
                                  placeholder="JHJD_NMIRHNSD$ER$6dj38"
                                  disabled={usingEnvVars}
                                  className={`w-full px-3 py-1.5 border rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                                    usingEnvVars
                                      ? "bg-zinc-100 dark:bg-zinc-800 border-zinc-300 dark:border-zinc-600 text-zinc-500 dark:text-zinc-400 cursor-not-allowed"
                                      : "border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white"
                                  }`}
                                />
                              </div>
                            </div>

                            <div>
                              <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1">
                                Redirect URI{" "}
                                <span className="text-zinc-400 dark:text-zinc-500">
                                  (auto-generated)
                                </span>
                              </label>
                              <input
                                type="url"
                                value={externalConfig.redirectUri}
                                readOnly
                                placeholder="https://instance.planetaryapp.cloud/api/auth/roblox/callback"
                                className="w-full px-3 py-1.5 border border-zinc-300 dark:border-zinc-600 rounded-md bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 text-sm cursor-not-allowed"
                                title="This field is automatically generated based on your current domain"
                              />
                            </div>

                            <div className="grid grid-cols-2 gap-2.5">
                              <div>
                                <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1">
                                  Discord App ID
                                </label>
                                <input
                                  type="text"
                                  value={externalConfig.discordAppId}
                                  onChange={(e) =>
                                    setExternalConfig((prev) => ({
                                      ...prev,
                                      discordAppId: e.target.value,
                                    }))
                                  }
                                  placeholder="1234567890"
                                  disabled={usingEnvVars}
                                  className={`w-full px-3 py-1.5 border rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                                    usingEnvVars
                                      ? "bg-zinc-100 dark:bg-zinc-800 border-zinc-300 dark:border-zinc-600 text-zinc-500 dark:text-zinc-400 cursor-not-allowed"
                                      : "border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white"
                                  }`}
                                />
                              </div>
                              <div>
                                <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1">
                                  Discord App Secret
                                </label>
                                <input
                                  type="password"
                                  value={externalConfig.discordAppSecret}
                                  onChange={(e) =>
                                    setExternalConfig((prev) => ({
                                      ...prev,
                                      discordAppSecret: e.target.value,
                                    }))
                                  }
                                  placeholder="eYli_RL3dUJUb7ieBQXhp0lLs…"
                                  disabled={usingEnvVars}
                                  className={`w-full px-3 py-1.5 border rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                                    usingEnvVars
                                      ? "bg-zinc-100 dark:bg-zinc-800 border-zinc-300 dark:border-zinc-600 text-zinc-500 dark:text-zinc-400 cursor-not-allowed"
                                      : "border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white"
                                  }`}
                                />
                              </div>
                            </div>

                            <div className="grid grid-cols-2 gap-2.5">
                              <div>
                                <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1">
                                  Google App ID
                                </label>
                                <input
                                  type="text"
                                  value={externalConfig.google_id}
                                  onChange={(e) =>
                                    setExternalConfig((prev) => ({
                                      ...prev,
                                      google_id: e.target.value,
                                    }))
                                  }
                                  placeholder="1234567890"
                                  disabled={usingEnvVars}
                                  className={`w-full px-3 py-1.5 border rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                                    usingEnvVars
                                      ? "bg-zinc-100 dark:bg-zinc-800 border-zinc-300 dark:border-zinc-600 text-zinc-500 dark:text-zinc-400 cursor-not-allowed"
                                      : "border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white"
                                  }`}
                                />
                              </div>
                              <div>
                                <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1">
                                  Google App Secret
                                </label>
                                <input
                                  type="password"
                                  value={externalConfig.google_secret}
                                  onChange={(e) =>
                                    setExternalConfig((prev) => ({
                                      ...prev,
                                      google_secret: e.target.value,
                                    }))
                                  }
                                  placeholder="eYli_RL3dUJUb7ieBQXhp0lLs…"
                                  disabled={usingEnvVars}
                                  className={`w-full px-3 py-1.5 border rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                                    usingEnvVars
                                      ? "bg-zinc-100 dark:bg-zinc-800 border-zinc-300 dark:border-zinc-600 text-zinc-500 dark:text-zinc-400 cursor-not-allowed"
                                      : "border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white"
                                  }`}
                                />
                              </div>
                            </div>
                            <div>
                              <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1">
                                Google email domain filtration
                              </label>
                              <input
                                type="text"
                                value={externalConfig.google_email_filtration}
                                onChange={(e) =>
                                  setExternalConfig((prev) => ({
                                    ...prev,
                                    google_email_filtration: e.target.value,
                                  }))
                                }
                                placeholder="@domain.com"
                                disabled={usingEnvVars}
                                className={`w-full px-3 py-1.5 border rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                                  usingEnvVars
                                    ? "bg-zinc-100 dark:bg-zinc-800 border-zinc-300 dark:border-zinc-600 text-zinc-500 dark:text-zinc-400 cursor-not-allowed"
                                    : "border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white"
                                }`}
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1">
                                Redirect to workspace
                              </label>
                              <input
                                type="text"
                                value={externalConfig.redirect_wid}
                                onChange={(e) =>
                                  setExternalConfig((prev) => ({
                                    ...prev,
                                    redirect_wid: e.target.value,
                                  }))
                                }
                                placeholder="35724790"
                                disabled={usingEnvVars}
                                className={`w-full px-3 py-1.5 border rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                                  usingEnvVars
                                    ? "bg-zinc-100 dark:bg-zinc-800 border-zinc-300 dark:border-zinc-600 text-zinc-500 dark:text-zinc-400 cursor-not-allowed"
                                    : "border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white"
                                }`}
                              />
                            </div>
                          </div>

                          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-2">
                            Need a hand? Check our documentation at{" "}
                            <a
                              href="https://docs.planetaryapp.us/workspace/roblox-oauth"
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-600 hover:underline"
                            >
                              docs.planetaryapp.us
                            </a>
                          </p>
                        </div>

                        <div className="mt-4 pt-4 border-t border-zinc-200 dark:border-zinc-700">
                          <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                            Login Page Background
                          </label>
                          {loginBackground ? (
                            <div className="relative mb-2 rounded-lg overflow-hidden border border-zinc-200 dark:border-zinc-600 h-28 bg-zinc-100 dark:bg-zinc-800">
                              <img
                                src={loginBackground}
                                alt="Custom login background"
                                className="w-full h-full object-cover"
                              />
                            </div>
                          ) : (
                            <div className="mb-2 rounded-lg border-2 border-dashed border-zinc-200 dark:border-zinc-600 h-28 flex flex-col items-center justify-center text-zinc-400 dark:text-zinc-500 bg-zinc-50 dark:bg-zinc-800/50">
                              <svg
                                className="w-8 h-8 mb-1"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                                strokeWidth={1.5}
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3 20.25h18M3.75 3.75h16.5A.75.75 0 0121 4.5v13.5a.75.75 0 01-.75.75H3.75A.75.75 0 013 18V4.5a.75.75 0 01.75-.75z"
                                />
                              </svg>
                              <span className="text-xs">
                                No custom background set
                              </span>
                            </div>
                          )}
                          <input
                            ref={bgFileInputRef}
                            type="file"
                            accept="image/jpeg,image/png,image/webp,image/gif"
                            className="hidden"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) uploadBackground(file);
                              e.target.value = "";
                            }}
                          />
                          <div className="flex gap-2">
                            <button
                              type="button"
                              disabled={bgUploading}
                              onClick={() => bgFileInputRef.current?.click()}
                              className="flex-1 px-3 py-2 rounded-lg text-sm font-medium border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-700 text-zinc-700 dark:text-zinc-200 hover:bg-zinc-50 dark:hover:bg-zinc-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            >
                              {bgUploading
                                ? "Uploading…"
                                : loginBackground
                                  ? "Replace Image"
                                  : "Upload Image"}
                            </button>
                            {loginBackground && (
                              <button
                                type="button"
                                disabled={bgUploading}
                                onClick={removeBackground}
                                className="px-3 py-2 rounded-lg text-sm font-medium border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/40 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                              >
                                Remove
                              </button>
                            )}
                          </div>
                          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1.5">
                            Replaces the default gradient on the login page. Max
                            5 MB (JPEG, PNG, WebP, GIF).
                          </p>
                        </div>

                        <div className="mt-4 pt-4 border-t border-zinc-200 dark:border-zinc-700">
                          <label className="flex items-center cursor-pointer">
                            <input
                              type="checkbox"
                              checked={externalConfig.oauthOnlyLogin}
                              onChange={(e) =>
                                setExternalConfig((prev) => ({
                                  ...prev,
                                  oauthOnlyLogin: e.target.checked,
                                }))
                              }
                              disabled={usingEnvVars || !isOAuthConfigValid}
                              className={`w-4 h-4 text-blue-600 border-zinc-300 dark:border-zinc-600 rounded focus:ring-blue-500 focus:ring-2 ${
                                usingEnvVars || !isOAuthConfigValid
                                  ? "bg-zinc-100 dark:bg-zinc-800 cursor-not-allowed"
                                  : "bg-white dark:bg-zinc-700"
                              }`}
                            />
                            <span
                              className={`ml-2 text-sm ${usingEnvVars ? "text-zinc-500 dark:text-zinc-400" : "text-zinc-700 dark:text-zinc-300"}`}
                            >
                              Enforce OAuth login
                            </span>
                          </label>
                          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 ml-6">
                            When enabled, users will only see the OAuth login
                            options.
                          </p>
                        </div>
                      </div>

                      <div className="px-6 pt-3 pb-5 shrink-0 border-t border-zinc-100 dark:border-zinc-700/60">
                        {saveMessage && (
                          <div
                            className={`mb-3 p-2.5 rounded-md text-sm ${
                              saveMessage.includes("successfully")
                                ? "bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300"
                                : "bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300"
                            }`}
                          >
                            {saveMessage}
                          </div>
                        )}
                        <div className="flex justify-end gap-3">
                          <button
                            type="button"
                            onClick={() => setShowInstanceSettings(false)}
                            disabled={configLoading}
                            className={workspacesSecondaryButtonClass}
                          >
                            Cancel
                          </button>
                          <button
                            type="button"
                            onClick={saveRobloxConfig}
                            disabled={configLoading || usingEnvVars}
                            className={clsx(
                              workspacesPrimaryButtonClass,
                              usingEnvVars && "cursor-not-allowed opacity-60"
                            )}
                          >
                            {configLoading
                              ? "Saving…"
                              : usingEnvVars
                                ? "Using Env Vars"
                                : "Save Settings"}
                          </button>
                        </div>
                      </div>
                    </Dialog.Panel>
                  </Transition.Child>
                </div>
              </div>
            </Dialog>
          </Transition>
          <Transition appear show={showOnboarding} as={Fragment}>
            <Dialog
              as="div"
              className="relative z-20"
              onClose={() => setShowOnboarding(false)}
            >
              <Transition.Child
                as={Fragment}
                enter="ease-out duration-300"
                enterFrom="opacity-0"
                enterTo="opacity-100"
                leave="ease-in duration-200"
                leaveFrom="opacity-100"
                leaveTo="opacity-0"
              >
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" />
              </Transition.Child>

              <div className="fixed inset-0 overflow-y-auto">
                <div className="flex min-h-full items-center justify-center p-4">
                  <Transition.Child
                    as={Fragment}
                    enter="ease-out duration-300"
                    enterFrom="opacity-0 scale-95"
                    enterTo="opacity-100 scale-100"
                    leave="ease-in duration-200"
                    leaveFrom="opacity-100 scale-100"
                    leaveTo="opacity-0 scale-95"
                  >
                    <Dialog.Panel className={clsx(workspacesModalPanelClass, "max-w-md overflow-hidden")}>
                      <div className="relative overflow-hidden">
                        <motion.div
                          className="flex"
                          animate={{ x: `${-onboardingSlide * 100}%` }}
                          transition={{
                            type: "spring",
                            stiffness: 400,
                            damping: 35,
                            mass: 0.8,
                          }}
                        >
                          <div className="w-full shrink-0 px-6 pt-6 pb-4">
                            <div className="flex flex-col items-center text-center">
                              <div className="w-12 h-12 rounded-xl bg-primary/15 flex items-center justify-center mb-3">
                                <IconBuildingSkyscraper
                                  className="w-6 h-6 text-primary"
                                  stroke={1.5}
                                />
                              </div>
                              <Dialog.Title className="text-xl font-bold text-zinc-900 dark:text-white">
                                Hi {login.displayname}! 👋
                              </Dialog.Title>
                              <p className="text-zinc-500 dark:text-zinc-400 mt-1 text-xs">
                                Welcome to Orbit. Here's a quick look at what
                                you can do.
                              </p>
                            </div>
                            <div className="mt-4 space-y-1.5">
                              {features.map((item) => (
                                <div
                                  key={item.title}
                                  className="flex gap-2.5 px-2.5 py-2 rounded-lg bg-zinc-50 dark:bg-zinc-700/50 text-left"
                                >
                                  <div className="w-1 rounded-full bg-primary/60 shrink-0" />
                                  <div>
                                    <p className="text-[16px] font-semibold text-zinc-800 dark:text-zinc-200">
                                      {item.title}
                                    </p>
                                    <p className="text-[13px] text-zinc-500 dark:text-zinc-400 mt-0.5 leading-relaxed">
                                      {item.desc}
                                    </p>
                                  </div>
                                </div>
                              ))}
                              <p className="px-8 pt-3 pb-6 text-center text-xs text-zinc-400 dark:text-zinc-500">
                                And so much more to discover. ✨
                              </p>
                            </div>
                          </div>
                          {slides.map((slide, i) => {
                            const Icon = slide.icon;
                            return (
                              <div key={i} className="w-full shrink-0">
                                <div className="flex items-center justify-center pt-8 pb-4">
                                  <div className="w-16 h-16 rounded-2xl bg-primary/15 dark:bg-primary/20 flex items-center justify-center">
                                    <Icon
                                      className="w-8 h-8 text-primary"
                                      stroke={1.5}
                                    />
                                  </div>
                                </div>

                                <div className="px-8 pb-4 text-center">
                                  <p className="text-xl font-bold text-zinc-900 dark:text-white">
                                    {slide.title}
                                  </p>
                                  <p className="text-zinc-500 dark:text-zinc-400 mt-2 text-sm">
                                    {slide.desc}
                                  </p>
                                </div>

                                <div className="mx-4 rounded-xl overflow-hidden border border-zinc-200 dark:border-zinc-700 shadow-sm">
                                  <div className="relative w-full aspect-video bg-zinc-100 dark:bg-zinc-900">
                                    <img
                                      src={`/presentation/${i + 1}.png`}
                                      alt={slide.title}
                                      className="w-full h-full object-cover"
                                    />
                                  </div>
                                </div>

                                {slide.note && (
                                  <p className="px-8 pt-3 pb-6 text-center text-xs text-zinc-400 dark:text-zinc-500">
                                    {slide.note}
                                  </p>
                                )}
                              </div>
                            );
                          })}
                        </motion.div>
                      </div>

                      <div className="px-8 pb-8 flex flex-col items-center gap-4">
                        <div className="flex gap-1.5">
                          {Array.from({ length: 10 }).map((_, dotIdx) => (
                            <div
                              key={dotIdx}
                              className={clsx(
                                "h-1.5 rounded-full transition-all duration-300",
                                dotIdx === onboardingSlide
                                  ? "w-4 bg-primary"
                                  : "w-1.5 bg-zinc-200 dark:bg-zinc-600",
                              )}
                            />
                          ))}
                        </div>

                        <div className="flex gap-3 w-full">
                          {onboardingSlide < 9 ? (
                            <>
                              <button
                                type="button"
                                onClick={async () => {
                                  setShowOnboarding(false);
                                  Onboarded();
                                }}
                                className={clsx(workspacesSecondaryButtonClass, "flex-1 justify-center py-2.5")}
                              >
                                Skip
                              </button>
                              <button
                                type="button"
                                onClick={() => setOnboardingSlide((s) => s + 1)}
                                className={clsx(workspacesPrimaryButtonClass, "flex-1 justify-center py-2.5 font-semibold")}
                              >
                                Next
                              </button>
                            </>
                          ) : (
                            <button
                              type="button"
                              onClick={async () => {
                                setShowOnboarding(false);
                                Onboarded();
                              }}
                              className={clsx(workspacesPrimaryButtonClass, "w-full justify-center py-2.5 font-semibold")}
                            >
                              Get started
                            </button>
                          )}
                        </div>
                      </div>
                    </Dialog.Panel>
                  </Transition.Child>
                </div>
              </div>
            </Dialog>
          </Transition>
        </WorkspacesPageShell>
      </div>
    </div>
  );
};

export default Home;

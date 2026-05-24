import React, { useState, useEffect, useRef } from "react";
import clsx from "clsx";
import {
  IconX,
  IconCalendarEvent,
  IconClock,
  IconNotes,
  IconHistory,
  IconSend,
  IconUserPlus,
  IconUserMinus,
  IconUserCheck,
  IconBan,
  IconAlertTriangle,
} from "@tabler/icons-react";
import axios from "axios";
import { useRouter } from "next/router";
import toast from "react-hot-toast";
import { useRecoilValue } from "recoil";
import { loginState, workspacestate } from "@/state";
import ReactMarkdown from "react-markdown";
import rehypeSanitize from "rehype-sanitize";
import type { SessionColors } from "@/hooks/useSessionColors";
import { canAssignUsers, canClaimSelf, canHostSession } from "@/utils/sessionPermissions";
import { sessionsPanelShadow } from "@/components/sessions/shell";

// Mobile detection utility
const isMobile = () => {
  if (typeof window === 'undefined') return false;
  return window.innerWidth <= 768;
};

const BG_COLORS = [
  "bg-rose-300",
  "bg-lime-300",
  "bg-teal-200",
  "bg-amber-300",
  "bg-rose-200",
  "bg-lime-200",
  "bg-green-100",
  "bg-red-100",
  "bg-yellow-200",
  "bg-amber-200",
  "bg-emerald-300",
  "bg-green-300",
  "bg-red-300",
  "bg-emerald-200",
  "bg-green-200",
  "bg-red-200",
];

function getRandomBg(userid: string, username?: string) {
  const key = `${userid ?? ""}:${username ?? ""}`;
  let hash = 5381;
  for (let i = 0; i < key.length; i++) {
    hash = ((hash << 5) - hash) ^ key.charCodeAt(i);
  }
  const index = (hash >>> 0) % BG_COLORS.length;
  return BG_COLORS[index];
}

function sessionAvatarSrc(
  userid: string | undefined,
  picture: string | undefined,
  workspaceId?: number
) {
  if (workspaceId && userid) {
    return `/api/user/${userid}/avatar`;
  }
  return picture || "/default-avatar.jpg";
}

function SessionSection({
  title,
  icon: Icon,
  children,
}: {
  title: string;
  icon?: React.ElementType<{ className?: string; stroke?: string | number }>;
  children: React.ReactNode;
}) {
  return (
    <section>
      <div className="mb-2.5 flex items-center gap-2">
        {Icon ? <Icon className="h-4 w-4 text-zinc-400" stroke={1.75} /> : null}
        <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">{title}</h3>
      </div>
      {children}
    </section>
  );
}

function SessionInset({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={clsx(
        "rounded-xl bg-zinc-50 p-4 dark:bg-zinc-800/40",
        className
      )}
    >
      {children}
    </div>
  );
}

function SessionBadge({
  children,
  variant = "default",
}: {
  children: React.ReactNode;
  variant?: "live" | "status" | "type" | "default" | "danger" | "muted";
}) {
  return (
    <span
      className={clsx(
        "inline-flex shrink-0 items-center rounded-md px-2 py-0.5 text-[11px] font-medium",
        variant === "live" && "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
        variant === "status" && "bg-sky-500/10 text-sky-600 dark:text-sky-400",
        variant === "danger" && "bg-red-500/10 text-red-600 dark:text-red-400",
        variant === "muted" && "bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400",
        variant === "default" && "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300"
      )}
    >
      {children}
    </span>
  );
}

interface SessionModalProps {
  session: any;
  isOpen: boolean;
  onClose: () => void;
  onEdit?: (sessionId: string) => void;
  onDelete: (sessionId: string, deleteAll?: boolean) => void;
  onUpdate?: () => void;
  workspaceMembers: any[];
  canManage: boolean;
  canAddNotes?: boolean;
  sessionColors?: SessionColors;
  colorsReady?: boolean | undefined;
}

const SessionModal: React.FC<SessionModalProps> = ({
  session,
  isOpen,
  onClose,
  onEdit,
  onDelete,
  onUpdate,
  workspaceMembers,
  canManage,
  canAddNotes,
  sessionColors,
  colorsReady,
}) => {
  const [availableUsers, setAvailableUsers] = useState<any[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [isCancelExpanded, setIsCancelExpanded] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [isCancelling, setIsCancelling] = useState(false);
  const router = useRouter();
  const login = useRecoilValue(loginState);
  const workspace = useRecoilValue(workspacestate);

  const defaultColors: SessionColors = {
    recurring: "bg-blue-500",
    shift: "bg-green-500",
    training: "bg-yellow-500",
    event: "bg-purple-500",
    other: "bg-zinc-500",
  };

  const effectiveColors: SessionColors = sessionColors || defaultColors;

  const getSessionTypeColor = (sessionType: string | null | undefined) => {
    if (!sessionType) return effectiveColors.other;
    const type = sessionType.toLowerCase();
    if (type === "shift") return effectiveColors.shift;
    if (type === "training") return effectiveColors.training;
    if (type === "event") return effectiveColors.event;
    return effectiveColors.other;
  };

  const getRecurringColor = () => {
    return effectiveColors.recurring;
  };

  const getTextColorForBackground = (bgColor: string) => {
    if (bgColor.includes("yellow") || bgColor.includes("orange-400")) {
      return "text-zinc-800 dark:text-zinc-900";
    }
    return "text-white";
  };

  const refreshSessionData = async () => {
    onUpdate?.();
    setRefreshKey((prev) => prev + 1);
  };

  const handleCancelSession = async () => {
    if (!cancelReason.trim()) return;
    try {
      const workspaceIdRaw = Array.isArray(router.query.id) ? router.query.id[0] : router.query.id;
      const workspaceId = typeof workspaceIdRaw === "string" ? workspaceIdRaw : "";
      if (!/^[A-Za-z0-9_-]{1,64}$/.test(workspaceId)) {
        toast.error("Invalid workspace id");
        return;
      }

      setIsCancelling(true);
      await axios.patch(
        `/api/workspace/${workspaceId}/sessions/${session.id}/cancel`,
        { reason: cancelReason.trim() }
      );
      session.cancelled = true;
      session.cancellationReason = cancelReason.trim();
      setIsCancelExpanded(false);
      setCancelReason("");
      toast.success("Session cancelled");
      refreshSessionData();
    } catch (error: any) {
      toast.error(error?.response?.data?.error || "Failed to cancel session");
    } finally {
      setIsCancelling(false);
    }
  };

  useEffect(() => {
    if (isOpen && session) {
      setAvailableUsers(workspaceMembers);
    }
  }, [isOpen, session, workspaceMembers, login.userId]);

  const handleHostClaim = async (username: string) => {
    const userHasAssignPermission = canAssignUsers(workspace.yourPermission, session.type);
    const userHasHostPermission = canHostSession(workspace.yourPermission, session.type);
    const isAssigningToSelf = username.toLowerCase() === login.username.toLowerCase();
    const isRemovingSelf = !username.trim() && session.owner?.username?.toLowerCase() === login.username.toLowerCase();
    const isRemovingOther = !username.trim() && session.owner?.username?.toLowerCase() !== login.username.toLowerCase();
    
    if (!canManage) {
      if (username.trim()) {
        if (!userHasAssignPermission && !(userHasHostPermission && isAssigningToSelf)) return;
      } else {
        if (isRemovingOther && !userHasAssignPermission) return;
        if (isRemovingSelf && !userHasHostPermission && !userHasAssignPermission) return;
      }
    }

    try {
      setIsSubmitting(true);
      const user = username.trim()
        ? availableUsers.find(
            (u) => u.username.toLowerCase() === username.toLowerCase()
          )
        : null;

      if (username.trim() && !user) {
        toast.error(`User "${username}" not found in workspace`);
        return;
      }

      await axios.put(
        `/api/workspace/${router.query.id}/sessions/${session.id}/update-host`,
        {
          ownerId: user ? user.userid : null,
        }
      );

      await axios.post(
        `/api/workspace/${router.query.id}/sessions/${session.id}/logs`,
        {
          action: username.trim() ? "host_assigned" : "host_unassigned",
          targetId: user ? user.userid : session.ownerId,
          metadata: {},
        }
      );

      toast.success(
        username.trim()
          ? "Host assigned successfully"
          : "Host unassigned successfully"
      );
      refreshSessionData();

      session.owner = user || null;
      session.ownerId = user ? user.userid : null;
    } catch (error: any) {
      console.error("Host claim error:", error);
      toast.error(
        error?.response?.data?.error || "Failed to update host assignment"
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSlotClaim = async (
    roleId: string,
    slot: number,
    username: string
  ) => {
    const userHasAssignPermission = canAssignUsers(workspace.yourPermission, session.type);
    const userHasClaimPermission = canClaimSelf(workspace.yourPermission, session.type);
    const isAssigningToSelf = username.toLowerCase() === login.username.toLowerCase();
    
    const currentAssignment = session.users?.find(
      (u: any) => u.roleID === roleId && u.slot === slot
    );
    const assignedUser = currentAssignment
      ? availableUsers.find(
          (user: any) => user.userid === currentAssignment.userid.toString()
        )
      : null;
    
    const isRemovingSelf = !username.trim() && assignedUser?.username?.toLowerCase() === login.username.toLowerCase();
    const isRemovingOther = !username.trim() && assignedUser?.username?.toLowerCase() !== login.username.toLowerCase();

    if (!canManage) {
      if (username.trim()) {
        if (!userHasAssignPermission && !(userHasClaimPermission && isAssigningToSelf)) return;
      } else {
        if (isRemovingOther && !userHasAssignPermission) return;
        if (isRemovingSelf && !userHasClaimPermission && !userHasAssignPermission) return;
      }
    }

    try {
      setIsSubmitting(true);

      if (username.trim()) {
        const user = availableUsers.find(
          (u) => u.username.toLowerCase() === username.toLowerCase()
        );

        if (!user) {
          toast.error(`User "${username}" not found in workspace`);
          return;
        }

        await axios.post(
          `/api/workspace/${router.query.id}/sessions/${session.id}/claim-role`,
          {
            userId: user.userid,
            roleId,
            slot,
            action: "claim",
          }
        );

        const roleSlot = session.sessionType.slots?.find(
          (s: any) => s.id === roleId
        );
        await axios.post(
          `/api/workspace/${router.query.id}/sessions/${session.id}/logs`,
          {
            action: "role_assigned",
            targetId: user.userid,
            metadata: {
              roleName: roleSlot?.name || "Unknown Role",
              slot: slot,
            },
          }
        );

        toast.success("Role assigned successfully");
      } else {
        const currentAssignment = session.users?.find(
          (u: any) => u.roleID === roleId && u.slot === slot
        );

        await axios.post(
          `/api/workspace/${router.query.id}/sessions/${session.id}/claim-role`,
          {
            roleId,
            slot,
            action: "unclaim",
          }
        );

        if (currentAssignment) {
          const roleSlot = session.sessionType.slots?.find(
            (s: any) => s.id === roleId
          );
          await axios.post(
            `/api/workspace/${router.query.id}/sessions/${session.id}/logs`,
            {
              action: "role_unassigned",
              targetId: currentAssignment.userid,
              metadata: {
                roleName: roleSlot?.name || "Unknown Role",
                slot: slot,
              },
            }
          );
        }

        toast.success("Role unassigned successfully");
      }

      refreshSessionData();
    } catch (error: any) {
      console.error("Role claim error:", error);
      toast.error(
        error?.response?.data?.error || "Failed to update role assignment"
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen || !session) return null;

  if (colorsReady === false) {
    return (
      <div
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm lg:pl-[280px]"
        onClick={(e) => {
          if (e.target === e.currentTarget && !isMobile()) {
            onClose();
          }
        }}
      >
        <div
          className={clsx(
            "w-full max-w-2xl rounded-2xl bg-white p-8 text-center dark:bg-zinc-900/95",
            sessionsPanelShadow
          )}
        >
          <div className="text-sm text-zinc-500 dark:text-zinc-400">Loading…</div>
        </div>
      </div>
    );
  }

  const sessionDate = new Date(session.date);
  const isRecurring = session.scheduleId !== null;
  const now = new Date();
  const sessionStart = new Date(session.date);
  const sessionDuration = session.duration || 30;
  const sessionEnd = new Date(
    sessionStart.getTime() + sessionDuration * 60 * 1000
  );
  const isActive = now >= sessionStart && now <= sessionEnd;
  const isConcluded = now > sessionEnd;
  
  const getCurrentStatus = () => {
    if (isConcluded) return "Concluded";
    
    const minutesFromStart = (now.getTime() - sessionStart.getTime()) / 1000 / 60;
    const statues = (session.sessionType as any)?.statues || [];
    
    const sortedStatues = [...statues].sort((a: any, b: any) => b.timeAfter - a.timeAfter);
    for (const status of sortedStatues) {
      if (minutesFromStart >= status.timeAfter) {
        return status.name;
      }
    }
    return null;
  };
  
  const currentStatus = getCurrentStatus();

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm lg:pl-[280px]"
      onClick={(e) => {
        if (e.target === e.currentTarget && !isMobile()) {
          onClose();
        }
      }}
    >
      <div
        className={clsx(
          "flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl bg-white dark:bg-zinc-900/95",
          sessionsPanelShadow
        )}
      >
        <div className="flex items-start justify-between gap-4 border-b border-zinc-100 px-5 py-4 dark:border-zinc-800 sm:px-6 sm:py-5">
          <div className="min-w-0 flex-1">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10">
                <IconCalendarEvent className="h-5 w-5 text-primary" stroke={1.75} />
              </div>
              <div className="min-w-0">
                <h2 className="truncate text-lg font-semibold tracking-tight text-zinc-900 dark:text-white sm:text-xl">
                  {session.name || session.sessionType.name}
                </h2>
                <div className="mt-1 flex items-center gap-1.5 text-xs text-zinc-400">
                  <IconClock className="h-3.5 w-3.5 shrink-0" stroke={1.75} />
                  {sessionDate.toLocaleDateString()} at{" "}
                  {sessionDate.toLocaleTimeString(undefined, {
                    hour: "2-digit",
                    minute: "2-digit",
                    hour12: true,
                  })}
                </div>
                <div className="mt-2 flex flex-wrap items-center gap-1.5">
                  {isActive && <SessionBadge variant="live">Live</SessionBadge>}
                  {isRecurring && (
                    <span
                      className={clsx(
                        "inline-flex shrink-0 items-center rounded-md px-2 py-0.5 text-[11px] font-medium",
                        getRecurringColor(),
                        getTextColorForBackground(getRecurringColor())
                      )}
                    >
                      Recurring
                    </span>
                  )}
                  {session.type && (
                    <span
                      className={clsx(
                        "inline-flex shrink-0 items-center rounded-md px-2 py-0.5 text-[11px] font-medium",
                        getSessionTypeColor(session.type),
                        getTextColorForBackground(getSessionTypeColor(session.type))
                      )}
                    >
                      {session.type.charAt(0).toUpperCase() + session.type.slice(1)}
                    </span>
                  )}
                  {session.cancelled && (
                    <SessionBadge variant="danger">
                      <IconBan className="mr-1 h-3 w-3" />
                      Cancelled
                    </SessionBadge>
                  )}
                  {isConcluded && !session.cancelled && (
                    <SessionBadge variant="muted">Concluded</SessionBadge>
                  )}
                  {!isConcluded &&
                    !session.cancelled &&
                    currentStatus &&
                    currentStatus !== "Open" && (
                      <SessionBadge variant="status">{currentStatus}</SessionBadge>
                    )}
                </div>
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-600 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
          >
            <IconX className="h-5 w-5" stroke={1.75} />
          </button>
        </div>

        <div className="flex-1 space-y-5 overflow-y-auto px-5 py-5 sm:px-6">
          {session.sessionType.description && (
            <SessionSection title="Description">
              <SessionInset>
                <div className="prose prose-sm max-w-none text-zinc-600 dark:prose-invert dark:text-zinc-300">
                  <ReactMarkdown rehypePlugins={[rehypeSanitize]}>
                    {session.sessionType.description}
                  </ReactMarkdown>
                </div>
              </SessionInset>
            </SessionSection>
          )}

          <SessionSection title="Role Claims">
            <div className="space-y-2.5">
              <SessionInset>
                <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-400">
                  Host
                </h4>
                <div className="flex items-center gap-2">
                  <span className="w-14 shrink-0 text-xs text-zinc-400">Slot 1</span>
                  <div className="min-w-0 flex-1">
                    <HostButton
                      currentValue={session.owner?.username || ""}
                      onValueChange={handleHostClaim}
                      isSubmitting={isSubmitting}
                      canEdit={
                        canManage ||
                        canAssignUsers(workspace.yourPermission, session.type) ||
                        canHostSession(workspace.yourPermission, session.type) || workspace.yourPermission.includes("admin")
                      }
                      availableUsers={availableUsers}
                      currentUserId={login.userId}
                      currentUserPicture={login.thumbnail}
                      currentUserUsername={login.username}
                      assignedUserPicture={session.owner?.picture}
                      assignedUserId={session.owner?.userid?.toString()}
                      workspace={workspace}
                      isHostRole={true}
                      sessionType={session.type}
                    />
                  </div>
                </div>
              </SessionInset>

              {session.sessionType.slots &&
                Array.isArray(session.sessionType.slots) &&
                session.sessionType.slots.length > 0 &&
                session.sessionType.slots.map(
                  (slot: any, slotIndex: number) => {
                    if (typeof slot !== "object") return null;
                    const slotData = JSON.parse(JSON.stringify(slot));

                    return (
                      <SessionInset key={slotIndex}>
                        <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-400">
                          {slotData.name}
                        </h4>
                        <div className="space-y-2">
                          {Array.from(Array(slotData.slots)).map((_, i) => {
                            const key = `${slotData.id}-${i}`;
                            const assignedUser = session.users?.find(
                              (u: any) =>
                                u.roleID === slotData.id && u.slot === i
                            );
                            const username = assignedUser
                              ? availableUsers.find(
                                  (user: any) =>
                                    user.userid ===
                                    assignedUser.userid.toString()
                                )?.username
                              : null;
                            const userPicture = assignedUser
                              ? availableUsers.find(
                                  (user: any) =>
                                    user.userid ===
                                    assignedUser.userid.toString()
                                )?.picture
                              : null;
                            return (
                              <div key={i} className="flex items-center gap-2">
                                <span className="w-14 shrink-0 text-xs text-zinc-400">
                                  Slot {i + 1}
                                </span>
                                <div className="min-w-0 flex-1">
                                  <RoleButton
                                    currentValue={username || ""}
                                    onValueChange={(value) =>
                                      handleSlotClaim(slotData.id, i, value)
                                    }
                                    isSubmitting={isSubmitting}
                                    canEdit={
                                      canManage ||
                                      canAssignUsers(workspace.yourPermission, session.type) ||
                                      workspace.yourPermission.includes("admin") ||
                                      (slotData.name === "Host" || slotData.name.toLowerCase() === "co-host" 
                                        ? canHostSession(workspace.yourPermission, session.type) || workspace.yourPermission.includes("admin")
                                        : canClaimSelf(workspace.yourPermission, session.type) || workspace.yourPermission.includes("admin"))
                                    }
                                    availableUsers={availableUsers}
                                    currentUserId={login.userId}
                                    currentUserPicture={login.thumbnail}
                                    currentUserUsername={login.username}
                                    assignedUserPicture={userPicture}
                                    assignedUserId={assignedUser?.userid?.toString()}
                                    workspace={workspace}
                                    isHostRole={slotData.name === "Host" || slotData.name.toLowerCase() === "co-host"}
                                    sessionType={session.type}
                                  />
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </SessionInset>
                    );
                  }
                )}
            </div>
          </SessionSection>

          <NotesSection
            sessionId={session.id}
            canManage={canAddNotes ?? canManage}
            currentUser={login}
            refreshKey={refreshKey}
            onDataChange={refreshSessionData}
          />

          <ActivityLogsSection sessionId={session.id} refreshKey={refreshKey} />

          {session.cancelled && session.cancellationReason && (
            <SessionInset className="border border-red-200/60 bg-red-50/80 dark:border-red-900/40 dark:bg-red-950/20">
              <div className="mb-1 flex items-center gap-2">
                <IconBan className="h-4 w-4 text-red-500" stroke={1.75} />
                <span className="text-sm font-medium text-red-600 dark:text-red-400">
                  Cancellation reason
                </span>
              </div>
              <p className="text-sm text-red-600/90 dark:text-red-300">
                {session.cancellationReason}
              </p>
            </SessionInset>
          )}

          {canManage && !session.cancelled && (
            <SessionInset>
              {!isCancelExpanded ? (
                <button
                  type="button"
                  onClick={() => setIsCancelExpanded(true)}
                  className="flex items-center gap-2 text-sm font-medium text-red-500 transition-colors hover:text-red-600 dark:hover:text-red-400"
                >
                  <IconBan className="h-4 w-4" stroke={1.75} />
                  Cancel this session
                </button>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <IconAlertTriangle className="h-4 w-4 shrink-0 text-red-500" stroke={1.75} />
                    <span className="text-sm font-medium text-zinc-900 dark:text-white">
                      Cancel session
                    </span>
                  </div>
                  <textarea
                    value={cancelReason}
                    onChange={(e) => setCancelReason(e.target.value)}
                    placeholder="Reason for cancellation..."
                    rows={3}
                    className="w-full resize-none rounded-xl border-0 bg-white px-3 py-2 text-sm text-zinc-900 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-red-500/40 dark:bg-zinc-900 dark:text-white"
                  />
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleCancelSession}
                      disabled={!cancelReason.trim() || isCancelling}
                      className="rounded-lg bg-red-600 px-4 py-1.5 text-sm font-medium text-white transition-colors hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {isCancelling ? "Cancelling…" : "Confirm cancel"}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setIsCancelExpanded(false);
                        setCancelReason("");
                      }}
                      className="rounded-lg px-4 py-1.5 text-sm font-medium text-zinc-500 transition-colors hover:bg-zinc-100 hover:text-zinc-700 dark:hover:bg-zinc-800 dark:hover:text-zinc-300"
                    >
                      Keep session
                    </button>
                  </div>
                </div>
              )}
            </SessionInset>
          )}
        </div>
      </div>
    </div>
  );
};

const AutocompleteInput: React.FC<{
  currentValue: string;
  onValueChange: (value: string) => void;
  isSubmitting: boolean;
  canEdit: boolean;
  availableUsers: any[];
  sessionType: string;
  currentUserId: number;
  currentUserPicture?: string;
  currentUserUsername?: string;
  placeholder?: string;
  assignedUserPicture?: string;
  assignedUserId?: string;
  isHostRole?: boolean;
  workspace?: any;
  canRemove?: boolean;
}> = ({
  currentValue,
  onValueChange,
  isSubmitting,
  canEdit,
  availableUsers,
  currentUserId,
  currentUserPicture,
  currentUserUsername,
  placeholder = "Enter username",
  assignedUserPicture,
  assignedUserId,
  isHostRole = false,
  workspace,
  canRemove = true,
  sessionType,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [inputValue, setInputValue] = useState(currentValue);
  const [filteredUsers, setFilteredUsers] = useState<any[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const suggestionRefs = useRef<(HTMLDivElement | null)[]>([]);
  const hasPermissionToEdit = () => {
    if (!workspace) return canEdit;
    const hasAssignPermission = canAssignUsers(workspace.yourPermission, sessionType) || workspace.yourPermission.includes("admin");
    const hasClaimPermission = canClaimSelf(workspace.yourPermission, sessionType) || workspace.yourPermission.includes("admin");
    const hasHostPermission = canHostSession(workspace.yourPermission, sessionType) || workspace.yourPermission.includes("admin");
    
    if (isHostRole) {
      // Host roles require the host permission (assign alone is NOT enough)
      return hasHostPermission;
    } else {
      return hasAssignPermission || hasClaimPermission;
    }
  };

  const actualCanEdit = canEdit && hasPermissionToEdit();

  useEffect(() => {
    setInputValue(currentValue);
  }, [currentValue]);

  useEffect(() => {
    const userHasAssignPermission = canAssignUsers(workspace?.yourPermission || [], sessionType) || workspace?.yourPermission?.includes("admin") || false;
    let usersForSuggestions = availableUsers;
    
    if (!userHasAssignPermission) {
      usersForSuggestions = availableUsers.filter(
        (user) => user.userid.toString() === currentUserId.toString()
      );
    }
    
    let suggestions = [];
    if (assignedUserId && currentValue.trim() !== "") {
      const assignedUser = availableUsers.find(user => user.userid.toString() === assignedUserId);
      if (assignedUser) {
        suggestions.push({
          ...assignedUser,
          isSelf: assignedUser.userid.toString() === currentUserId.toString(),
          isCurrentlyAssigned: true,
        });
      }
    }
    
    if (inputValue.trim() === "") {
      const isCurrentUserAssigned = assignedUserId === currentUserId.toString();
      if (currentUserUsername && !isCurrentUserAssigned) {
        suggestions.push({
          userid: currentUserId.toString(),
          username: currentUserUsername,
          picture: currentUserPicture || "/default-avatar.jpg",
          isSelf: true,
        });
      }
      
      const otherUsers = usersForSuggestions.filter(
        (user) => 
          user.userid.toString() !== currentUserId.toString() &&
          user.userid.toString() !== assignedUserId
      );
      
      suggestions.push(...otherUsers.slice(0, 7));
    } else {
      const filtered = usersForSuggestions
        .filter((user) => {
          const matchesInput = user.username.toLowerCase().includes(inputValue.toLowerCase());
          const isAssigned = user.userid.toString() === assignedUserId;
          return matchesInput || isAssigned;
        })
        .map((user) => ({
          ...user,
          isSelf: user.userid.toString() === currentUserId.toString(),
          isCurrentlyAssigned: user.userid.toString() === assignedUserId,
        }))
        .slice(0, 8);
      suggestions = suggestions.filter(existing => 
        !filtered.some(user => user.userid === existing.userid)
      );
      suggestions.push(...filtered);
    }
    
    setFilteredUsers(suggestions);
  }, [
    inputValue,
    availableUsers,
    currentUserId,
    currentUserUsername,
    currentUserPicture,
    assignedUserId,
    currentValue,
    workspace,
  ]);

  const canAssignToUser = (targetUsername: string) => {
    if (!workspace) return true;
    const hasAssignPermission = canAssignUsers(workspace.yourPermission, sessionType) || workspace.yourPermission.includes("admin");
    const hasClaimPermission = canClaimSelf(workspace.yourPermission, sessionType) || workspace.yourPermission.includes("admin");
    const hasHostPermission = canHostSession(workspace.yourPermission, sessionType) || workspace.yourPermission.includes("admin");
    const targetUser = availableUsers.find(user => user.username === targetUsername);
    if (!targetUser) return false;
    const isAssigningToSelf = targetUser.userid.toString() === currentUserId.toString();
    
    if (isHostRole) {
      // Host roles require host permission
      if (isAssigningToSelf) {
        return hasHostPermission;
      } else {
        // Assigning others to host roles requires both assign AND host
        return hasAssignPermission && hasHostPermission;
      }
    } else {
      // Normal roles
      if (hasAssignPermission) {
        return true;
      }
      if (hasClaimPermission && isAssigningToSelf) {
        return true;
      }
    }
    
    return false;
  };

  const handleSubmit = () => {
    if (inputValue.trim() === "" || canAssignToUser(inputValue)) {
      onValueChange(inputValue);
    } else {
      setInputValue(currentValue);
    }
    setIsEditing(false);
    setShowSuggestions(false);
    setSelectedIndex(-1);
  };

  const handleCancel = () => {
    setInputValue(currentValue);
    setIsEditing(false);
    setShowSuggestions(false);
    setSelectedIndex(-1);
  };

  const handleUserSelect = (user: any) => {
    if (canAssignToUser(user.username)) {
      setInputValue(user.username);
      onValueChange(user.username);
      setIsEditing(false);
    } else {
      setInputValue(currentValue);
      setIsEditing(false);
    }
    setShowSuggestions(false);
    setSelectedIndex(-1);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((prev) => Math.min(prev + 1, filteredUsers.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((prev) => Math.max(prev - 1, -1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (selectedIndex >= 0 && filteredUsers[selectedIndex]) {
        handleUserSelect(filteredUsers[selectedIndex]);
      } else {
        handleSubmit();
      }
    } else if (e.key === "Escape") {
      handleCancel();
    }
  };

  const handleInputFocus = () => {
    setShowSuggestions(true);
  };

  const handleInputBlur = (e: React.FocusEvent) => {
    const current = e.currentTarget;
    const related = (e.relatedTarget as Node) || null;
    setTimeout(() => {
      try {
        if (!current || (related && !current.contains(related))) {
          setShowSuggestions(false);
          setSelectedIndex(-1);
        }
      } catch (err) {
        setShowSuggestions(false);
        setSelectedIndex(-1);
      }
    }, 150);
  };

  if (!actualCanEdit) {
    return (
      <div className="flex items-center gap-2 rounded-xl bg-zinc-100 px-3 py-2 dark:bg-zinc-800/80">
        {currentValue && assignedUserId && (
          <div
            className={clsx(
              "flex h-6 w-6 shrink-0 items-center justify-center overflow-hidden rounded-full",
              getRandomBg(assignedUserId)
            )}
          >
            <img
              src={sessionAvatarSrc(
                assignedUserId,
                assignedUserPicture,
                workspace?.groupId
              )}
              alt={currentValue}
              className="h-6 w-6 rounded-full border-2 border-white object-cover dark:border-zinc-900"
              style={{ background: "transparent" }}
            />
          </div>
        )}
        <span className="text-sm text-zinc-700 dark:text-zinc-200">
          {currentValue || "No assignment"}
        </span>
      </div>
    );
  }

  if (isEditing) {
    return (
      <div className="relative">
        <div className="flex items-center gap-2">
          <div className="relative min-w-0 flex-1">
            <input
              ref={inputRef}
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              onFocus={handleInputFocus}
              onBlur={handleInputBlur}
              placeholder={placeholder}
              className="w-full rounded-xl border-0 bg-zinc-100 px-3 py-2 text-sm text-zinc-900 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-primary/40 dark:bg-zinc-800 dark:text-white dark:placeholder-zinc-500"
              disabled={isSubmitting}
              autoFocus
            />

            {showSuggestions && filteredUsers.length > 0 && (
              <div className="absolute z-50 mt-1 max-h-60 w-full overflow-y-auto rounded-xl border border-zinc-200/80 bg-white shadow-xl dark:border-zinc-700 dark:bg-zinc-900">
                {filteredUsers.map((user, index) => (
                  <div
                    key={user.userid}
                    ref={(el) => {
                      suggestionRefs.current[index] = el;
                    }}
                    className={clsx(
                      "flex cursor-pointer items-center gap-3 px-3 py-2 hover:bg-zinc-50 dark:hover:bg-zinc-800",
                      selectedIndex === index && "bg-zinc-50 dark:bg-zinc-800"
                    )}
                    onClick={() => handleUserSelect(user)}
                  >
                    <div
                      className={clsx(
                        "flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full",
                        getRandomBg(user.userid.toString(), user.username)
                      )}
                    >
                      <img
                        src={sessionAvatarSrc(
                          user.userid.toString(),
                          user.picture,
                          workspace?.groupId
                        )}
                        alt={user.username}
                        className="h-8 w-8 rounded-full border-2 border-white object-cover dark:border-zinc-900"
                        style={{ background: "transparent" }}
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-medium text-zinc-900 dark:text-white">
                        {user.username}
                        {user.isSelf && (
                          <span className="ml-2 rounded-md bg-primary/10 px-2 py-0.5 text-xs text-primary">
                            You
                          </span>
                        )}
                      </div>
                    </div>
                    {user.isSelf && (
                      <span className="text-xs text-zinc-400">Claim</span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="rounded-lg bg-primary px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-primary/90 disabled:opacity-50"
          >
            Save
          </button>
          <button
            type="button"
            onClick={handleCancel}
            disabled={isSubmitting}
            className="rounded-lg px-3 py-2 text-sm font-medium text-zinc-500 transition-colors hover:bg-zinc-100 hover:text-zinc-700 dark:hover:bg-zinc-800 dark:hover:text-zinc-300"
          >
            Cancel
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if ((e.key === "Enter" || e.key === " ") && !isSubmitting && actualCanEdit)
          setIsEditing(true);
      }}
      onClick={() => {
        if (!isSubmitting && actualCanEdit) setIsEditing(true);
      }}
      className="w-full rounded-xl bg-zinc-100 px-3 py-2 text-left transition-colors outline-none hover:bg-zinc-200/70 disabled:opacity-50 dark:bg-zinc-800/80 dark:hover:bg-zinc-800"
    >
      <div className="flex w-full items-center gap-2">
        <div className="flex min-w-0 flex-1 items-center">
          {currentValue && assignedUserId && (
            <div
              className={clsx(
                "flex h-6 w-6 shrink-0 items-center justify-center overflow-hidden rounded-full",
                getRandomBg(assignedUserId)
              )}
            >
              <img
                src={sessionAvatarSrc(
                  assignedUserId,
                  assignedUserPicture,
                  workspace?.groupId
                )}
                alt={currentValue}
                className="h-6 w-6 rounded-full border-2 border-white object-cover dark:border-zinc-900"
                style={{ background: "transparent" }}
              />
            </div>
          )}
          <span className="ml-2 text-sm text-zinc-700 dark:text-zinc-200">
            {currentValue || "Unclaimed"}
          </span>
        </div>

        {currentValue && canRemove && (
          <span
            role="button"
            title="Remove assignment"
            onClick={(e) => {
              e.stopPropagation();
              if (!isSubmitting && actualCanEdit) {
                const canRemoveAssignment = () => {
                  if (!workspace) return true;
                  
                  const hasAssignPermission = canAssignUsers(workspace.yourPermission, sessionType) || workspace.yourPermission.includes("admin");
                  const isAssignedToSelf = assignedUserId?.toString() === currentUserId.toString();
                  
                  if (isHostRole) {
                    // Host roles require host permission (assign + host for others, just host for self)
                    const hasHostPermission = canHostSession(workspace.yourPermission, sessionType) || workspace.yourPermission.includes("admin");
                    if (isAssignedToSelf) {
                      return hasHostPermission;
                    } else {
                      return hasAssignPermission && hasHostPermission;
                    }
                  } else {
                    const hasClaimPermission = canClaimSelf(workspace.yourPermission, sessionType) || workspace.yourPermission.includes("admin");
                    return hasAssignPermission || (hasClaimPermission && isAssignedToSelf);
                  }
                };
                
                if (canRemoveAssignment()) {
                  onValueChange("");
                }
              }
            }}
            className="ml-2 cursor-pointer rounded p-1 text-zinc-400 transition-colors hover:bg-zinc-200/70 hover:text-zinc-600 dark:hover:bg-zinc-700 dark:hover:text-zinc-200"
          >
            <IconX className="h-4 w-4" stroke={1.75} />
          </span>
        )}
      </div>
    </div>
  );
};

const HostButton: React.FC<{
  currentValue: string;
  onValueChange: (value: string) => void;
  isSubmitting: boolean;
  canEdit: boolean;
  availableUsers: any[];
  currentUserId: number;
  currentUserPicture?: string;
  currentUserUsername?: string;
  assignedUserPicture?: string;
  assignedUserId?: string;
  workspace?: any;
  isHostRole?: boolean;
  sessionType: string;
}> = ({
  currentValue,
  onValueChange,
  isSubmitting,
  canEdit,
  availableUsers,
  currentUserId,
  currentUserPicture,
  currentUserUsername,
  assignedUserPicture,
  assignedUserId,
  workspace,
  isHostRole = false,
  sessionType,
}) => {
  const filteredUsers = availableUsers;
const canRemoveHost = workspace ? 
    (() => {
      const hasAssignPermission = canAssignUsers(workspace.yourPermission, sessionType) || workspace.yourPermission.includes("admin");
      const hasHostPermission = canHostSession(workspace.yourPermission, sessionType) || workspace.yourPermission.includes("admin");
      const isCurrentUserAssigned = assignedUserId === currentUserId.toString();
      
      // Host roles require host permission (assign + host for others, just host for self)
      if (isCurrentUserAssigned) {
        return hasHostPermission;
      } else {
        return hasAssignPermission && hasHostPermission;
      }
    })()
    : true;

  return (
    <AutocompleteInput
      currentValue={currentValue}
      onValueChange={onValueChange}
      isSubmitting={isSubmitting}
      canEdit={canEdit}
      availableUsers={filteredUsers}
      currentUserId={currentUserId}
      currentUserPicture={currentUserPicture}
      currentUserUsername={currentUserUsername}
      placeholder="Enter username to assign host"
      assignedUserPicture={assignedUserPicture}
      assignedUserId={assignedUserId}
      isHostRole={isHostRole}
      workspace={workspace}
      canRemove={canRemoveHost}
      sessionType={sessionType}
    />
  );
};

const RoleButton: React.FC<{
  currentValue: string;
  onValueChange: (value: string) => void;
  isSubmitting: boolean;
  canEdit: boolean;
  availableUsers: any[];
  currentUserId: number;
  currentUserPicture?: string;
  currentUserUsername?: string;
  assignedUserPicture?: string;
  assignedUserId?: string;
  workspace?: any;
  isHostRole?: boolean;
  sessionType: string;
}> = ({
  currentValue,
  onValueChange,
  isSubmitting,
  canEdit,
  availableUsers,
  currentUserId,
  currentUserPicture,
  currentUserUsername,
  assignedUserPicture,
  assignedUserId,
  workspace,
  isHostRole = false,
  sessionType,
}) => {
  const filteredUsers = availableUsers;
  const canRemoveRole = workspace ? 
    (() => {
      const hasAssignPermission = canAssignUsers(workspace.yourPermission, sessionType) || workspace.yourPermission.includes("admin");
      const isCurrentUserAssigned = assignedUserId === currentUserId.toString();
      if (isHostRole) {
        // Host roles require host permission (assign + host for others, just host for self)
        const hasHostPermission = canHostSession(workspace.yourPermission, sessionType) || workspace.yourPermission.includes("admin");
        if (isCurrentUserAssigned) {
          return hasHostPermission;
        } else {
          return hasAssignPermission && hasHostPermission;
        }
      } else {
        const hasClaimPermission = canClaimSelf(workspace.yourPermission, sessionType) || workspace.yourPermission.includes("admin");
        return hasAssignPermission || (hasClaimPermission && isCurrentUserAssigned);
      }
    })()
    : true;

  return (
    <AutocompleteInput
      currentValue={currentValue}
      onValueChange={onValueChange}
      isSubmitting={isSubmitting}
      canEdit={canEdit}
      availableUsers={filteredUsers}
      currentUserId={currentUserId}
      currentUserPicture={currentUserPicture}
      currentUserUsername={currentUserUsername}
      placeholder="Enter username to assign role"
      assignedUserPicture={assignedUserPicture}
      assignedUserId={assignedUserId}
      isHostRole={isHostRole}
      workspace={workspace}
      canRemove={canRemoveRole}
      sessionType={sessionType}
    />
  );
};

const NotesSection: React.FC<{
  sessionId: string;
  canManage: boolean;
  currentUser: any;
  refreshKey?: number;
  onDataChange?: () => void;
}> = ({ sessionId, canManage, currentUser, refreshKey, onDataChange }) => {
  const [notes, setNotes] = useState<any[]>([]);
  const [newNote, setNewNote] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const router = useRouter();

  const fetchNotes = async () => {
    try {
      setIsLoading(true);
      const response = await axios.get(
        `/api/workspace/${router.query.id}/sessions/${sessionId}/notes`
      );
      setNotes(response.data.notes || []);
    } catch (error) {
      console.error("Failed to fetch notes:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const addNote = async () => {
    if (!newNote.trim()) return;

    try {
      setIsSubmitting(true);
      await axios.post(
        `/api/workspace/${router.query.id}/sessions/${sessionId}/notes`,
        {
          content: newNote.trim(),
        }
      );
      setNewNote("");
      fetchNotes();
      onDataChange?.();
      toast.success("Note added successfully");
    } catch (error: any) {
      console.error("Failed to add note:", error);
      toast.error(error?.response?.data?.error || "Failed to add note");
    } finally {
      setIsSubmitting(false);
    }
  };

  useEffect(() => {
    if (sessionId) {
      fetchNotes();
    }
  }, [sessionId, refreshKey]);

  return (
    <SessionSection title="Notes" icon={IconNotes}>
      {canManage && (
        <div className="mb-3">
          <div className="flex flex-col gap-2">
            <textarea
              value={newNote}
              onChange={(e) => setNewNote(e.target.value)}
              placeholder="Add a note about this session..."
              className="flex-1 resize-none rounded-xl border-0 bg-zinc-100 px-3 py-2.5 text-sm text-zinc-900 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-primary/40 dark:bg-zinc-800 dark:text-white dark:placeholder-zinc-500"
              rows={2}
              disabled={isSubmitting}
            />
            <div className="flex items-center">
              <button
                type="button"
                onClick={addNote}
                disabled={isSubmitting || !newNote.trim()}
                className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3.5 py-2 text-sm font-medium text-white transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <IconSend className="h-4 w-4" stroke={1.75} />
                Add note
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="max-h-60 space-y-2 overflow-y-auto">
        {isLoading ? (
          <div className="py-4 text-center text-sm text-zinc-400">Loading notes…</div>
        ) : notes.length === 0 ? (
          <SessionInset className="py-8 text-center">
            <IconNotes className="mx-auto mb-2 h-7 w-7 text-zinc-300 dark:text-zinc-600" stroke={1.5} />
            <p className="text-sm text-zinc-500 dark:text-zinc-400">No notes yet</p>
            <p className="mt-0.5 text-xs text-zinc-400">
              {canManage ? "Add the first note above" : "Notes will appear here when added"}
            </p>
          </SessionInset>
        ) : (
          notes.map((note) => (
            <SessionInset key={note.id} className="p-3">
              <div className="mb-2 flex items-center gap-2">
                <div
                  className={clsx(
                    "flex h-6 w-6 shrink-0 items-center justify-center overflow-hidden rounded-full",
                    getRandomBg(note.author?.userid?.toString() || "", note.author?.username)
                  )}
                >
                  <img
                    src={sessionAvatarSrc(
                      note.author?.userid?.toString(),
                      note.author?.picture,
                      Number(router.query.id)
                    )}
                    alt={note.author?.username || "User"}
                    className="h-6 w-6 rounded-full border-2 border-white object-cover dark:border-zinc-900"
                    style={{ background: "transparent" }}
                  />
                </div>
                <span className="text-sm font-medium text-zinc-900 dark:text-white">
                  {note.author?.username || "Unknown User"}
                </span>
                <span className="text-xs text-zinc-400">
                  {new Date(note.createdAt).toLocaleString()}
                </span>
              </div>
              <div className="prose prose-sm max-w-none text-zinc-600 dark:prose-invert dark:text-zinc-300">
                <ReactMarkdown rehypePlugins={[rehypeSanitize]}>
                  {note.content}
                </ReactMarkdown>
              </div>
            </SessionInset>
          ))
        )}
      </div>
    </SessionSection>
  );
};

const ActivityLogsSection: React.FC<{
  sessionId: string;
  refreshKey?: number;
}> = ({ sessionId, refreshKey }) => {
  const [logs, setLogs] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const fetchLogs = async () => {
    try {
      setIsLoading(true);
      const response = await axios.get(
        `/api/workspace/${router.query.id}/sessions/${sessionId}/logs`
      );
      setLogs(response.data.logs || []);
    } catch (error) {
      console.error("Failed to fetch logs:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (sessionId) {
      fetchLogs();
    }
  }, [sessionId, refreshKey]);

  const getLogIcon = (action: string) => {
    switch (action) {
      case "role_assigned":
      case "host_assigned":
        return <IconUserPlus className="w-4 h-4 text-green-500" />;
      case "role_unassigned":
      case "host_unassigned":
        return <IconUserMinus className="w-4 h-4 text-red-500" />;
      case "session_claimed":
        return <IconUserCheck className="w-4 h-4 text-blue-500" />;
      default:
        return <IconHistory className="w-4 h-4 text-zinc-500" />;
    }
  };

  const getLogMessage = (log: any) => {
    const actorName = log.actor?.username || "Unknown User";
    const targetName = log.target?.username || "Unknown User";

    switch (log.action) {
      case "role_assigned":
        return `${actorName} assigned ${targetName} to role "${
          log.metadata?.roleName || "Unknown Role"
        }"`;
      case "role_unassigned":
        return `${actorName} removed ${targetName} from role "${
          log.metadata?.roleName || "Unknown Role"
        }"`;
      case "host_assigned":
        return `${actorName} assigned ${targetName} as "Host"`;
      case "host_unassigned":
        return `${actorName} removed ${targetName} as "Host"`;
      case "session_claimed":
        return `${actorName} claimed this session`;
      default:
        return `${actorName} performed an action`;
    }
  };

  return (
    <SessionSection title="Activity log" icon={IconHistory}>
      <div className="max-h-60 space-y-2 overflow-y-auto">
        {isLoading ? (
          <div className="py-4 text-center text-sm text-zinc-400">Loading activity…</div>
        ) : logs.length === 0 ? (
          <SessionInset className="py-8 text-center">
            <IconHistory className="mx-auto mb-2 h-7 w-7 text-zinc-300 dark:text-zinc-600" stroke={1.5} />
            <p className="text-sm text-zinc-500 dark:text-zinc-400">No activity yet</p>
            <p className="mt-0.5 text-xs text-zinc-400">
              Actions will be logged here automatically
            </p>
          </SessionInset>
        ) : (
          logs.map((log) => (
            <SessionInset key={log.id} className="flex items-start gap-3 p-3">
              {getLogIcon(log.action)}
              <div className="min-w-0 flex-1">
                <p className="text-sm text-zinc-700 dark:text-zinc-300">
                  {getLogMessage(log)}
                </p>
                <p className="mt-1 text-xs text-zinc-400">
                  {new Date(log.createdAt).toLocaleString()}
                </p>
              </div>
            </SessionInset>
          ))
        )}
      </div>
    </SessionSection>
  );
};

export default SessionModal;
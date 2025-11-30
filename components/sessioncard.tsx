import React, { useState, useEffect, useRef } from "react";
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
} from "@tabler/icons-react";
import axios from "axios";
import { useRouter } from "next/router";
import toast from "react-hot-toast";
import { useRecoilValue } from "recoil";
import { loginState, workspacestate } from "@/state";
import ReactMarkdown from "react-markdown";
import rehypeSanitize from "rehype-sanitize";
import type { SessionColors } from "@/hooks/useSessionColors";

// Mobile detection utility
const isMobile = () => {
  if (typeof window === 'undefined') return false;
  return window.innerWidth <= 768;
};

const BG_COLORS = [
  "bg-red-200",
  "bg-green-200",
  "bg-emerald-200",
  "bg-red-300",
  "bg-green-300",
  "bg-emerald-300",
  "bg-amber-200",
  "bg-yellow-200",
  "bg-red-100",
  "bg-green-100",
  "bg-lime-200",
  "bg-rose-200",
  "bg-amber-300",
  "bg-teal-200",
  "bg-lime-300",
  "bg-rose-300",
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

interface SessionModalProps {
  session: any;
  isOpen: boolean;
  onClose: () => void;
  onEdit?: (sessionId: string) => void;
  onDelete: (sessionId: string, deleteAll?: boolean) => void;
  onUpdate?: () => void;
  workspaceMembers: any[];
  canManage: boolean;
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
  sessionColors,
  colorsReady,
}) => {
  const [availableUsers, setAvailableUsers] = useState<any[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
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

  useEffect(() => {
    if (isOpen && session) {
      setAvailableUsers(workspaceMembers);
    }
  }, [isOpen, session, workspaceMembers, login.userId]);

  const handleHostClaim = async (username: string) => {
    const isOwner = workspace?.roles?.find((r: any) => r.id === workspace.yourRole)?.isOwnerRole || false;
    const userHasAssignPermission = isOwner || workspace.yourPermission.includes("sessions_assign");
    const userHasHostPermission = isOwner || workspace.yourPermission.includes("sessions_host");
    const isAssigningToSelf = username.toLowerCase() === login.username.toLowerCase();
    const isRemovingSelf = !username.trim() && session.owner?.username?.toLowerCase() === login.username.toLowerCase();
    const isRemovingOther = !username.trim() && session.owner?.username?.toLowerCase() !== login.username.toLowerCase();
    
    if (!canManage && !isOwner) {
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
    const isOwner = workspace?.roles?.find((r: any) => r.id === workspace.yourRole)?.isOwnerRole || false;
    const userHasAssignPermission = isOwner || workspace.yourPermission.includes("sessions_assign");
    const userHasClaimPermission = isOwner || workspace.yourPermission.includes("sessions_claim");
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

    if (!canManage && !isOwner) {
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
        className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
        onClick={(e) => {
          if (e.target === e.currentTarget && !isMobile()) {
            onClose();
          }
        }}
      >
        <div className="bg-white dark:bg-zinc-800 rounded-xl shadow-xl w-full max-w-2xl mx-auto p-6 text-center">
          <div className="text-zinc-700 dark:text-zinc-200">Loading…</div>
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

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 lg:pl-[280px]"
      onClick={(e) => {
        if (e.target === e.currentTarget && !isMobile()) {
          onClose();
        }
      }}
    >
      <div className="bg-white dark:bg-zinc-800 rounded-xl shadow-xl w-full max-w-3xl mx-auto max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-zinc-700">
          <div className="flex items-center gap-3">
            <div className="bg-primary/10 p-2 rounded-lg">
              <IconCalendarEvent className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-zinc-900 dark:text-white">
                {session.name || session.sessionType.name}
              </h2>
              <div className="flex items-center gap-2 text-sm text-zinc-500 dark:text-zinc-400">
                <IconClock className="w-4 h-4" />
                {sessionDate.toLocaleDateString()} at{" "}
                {sessionDate.toLocaleTimeString(undefined, {
                  hour: "2-digit",
                  minute: "2-digit",
                  hour12: true,
                })}
                {isActive && (
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200 animate-pulse">
                    • LIVE
                  </span>
                )}
                {isRecurring && (
                  <span
                    className={`${getRecurringColor()} ${getTextColorForBackground(
                      getRecurringColor()
                    )} px-2 py-1 rounded text-xs font-medium`}
                  >
                    Recurring
                  </span>
                )}
                {session.type && (
                  <span
                    className={`${getSessionTypeColor(
                      session.type
                    )} ${getTextColorForBackground(
                      getSessionTypeColor(session.type)
                    )} px-2 py-1 rounded text-xs font-medium`}
                  >
                    {session.type.charAt(0).toUpperCase() +
                      session.type.slice(1)}
                  </span>
                )}
                {isConcluded && (
                  <span className="bg-zinc-100 text-zinc-600 dark:bg-zinc-700 dark:text-zinc-400 px-2 py-1 rounded text-xs font-medium">
                    Concluded
                  </span>
                )}
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 transition-colors"
          >
            <IconX className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {session.sessionType.description && (
            <div>
              <h3 className="text-lg font-medium text-zinc-900 dark:text-white mb-3">
                Description
              </h3>
              <div className="bg-zinc-50 dark:bg-zinc-700/30 rounded-lg p-4">
                <div className="prose text-zinc-700 dark:text-zinc-300 dark:prose-invert max-w-none">
                  <ReactMarkdown rehypePlugins={[rehypeSanitize]}>
                    {session.sessionType.description}
                  </ReactMarkdown>
                </div>
              </div>
            </div>
          )}

          <div>
            <h3 className="text-lg font-medium text-zinc-900 dark:text-white mb-3">
              Role Claims
            </h3>
            <div className="space-y-3">
              <div className="bg-zinc-50 dark:bg-zinc-700/30 rounded-lg p-4">
                <h4 className="text-sm font-medium text-zinc-900 dark:text-white mb-2">
                  Host
                </h4>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-zinc-600 dark:text-zinc-400 w-16">
                    Slot 1:
                  </span>
                  <div className="flex-1">
                    <HostButton
                      currentValue={session.owner?.username || ""}
                      onValueChange={handleHostClaim}
                      isSubmitting={isSubmitting}
                      canEdit={
                        canManage ||
                        (workspace?.roles?.find((r: any) => r.id === workspace.yourRole)?.isOwnerRole || false) ||
                        workspace.yourPermission.includes("sessions_assign") ||
                        workspace.yourPermission.includes("sessions_host")
                      }
                      availableUsers={availableUsers}
                      currentUserId={login.userId}
                      currentUserPicture={login.thumbnail}
                      currentUserUsername={login.username}
                      assignedUserPicture={session.owner?.picture}
                      assignedUserId={session.owner?.userid?.toString()}
                      workspace={workspace}
                      isHostRole={true}
                    />
                  </div>
                </div>
              </div>

              {session.sessionType.slots &&
                Array.isArray(session.sessionType.slots) &&
                session.sessionType.slots.length > 0 &&
                session.sessionType.slots.map(
                  (slot: any, slotIndex: number) => {
                    if (typeof slot !== "object") return null;
                    const slotData = JSON.parse(JSON.stringify(slot));

                    return (
                      <div
                        key={slotIndex}
                        className="bg-zinc-50 dark:bg-zinc-700/30 rounded-lg p-4"
                      >
                        <h4 className="text-sm font-medium text-zinc-900 dark:text-white mb-2">
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
                                <span className="text-sm text-zinc-600 dark:text-zinc-400 w-16">
                                  Slot {i + 1}:
                                </span>
                                <div className="flex-1">
                                  <RoleButton
                                    currentValue={username || ""}
                                    onValueChange={(value) =>
                                      handleSlotClaim(slotData.id, i, value)
                                    }
                                    isSubmitting={isSubmitting}
                                    canEdit={
                                      canManage ||
                                      (workspace?.roles?.find((r: any) => r.id === workspace.yourRole)?.isOwnerRole || false) ||
                                      workspace.yourPermission.includes("sessions_assign") ||
                                      (slotData.name === "Host" || slotData.name.toLowerCase() === "co-host" 
                                        ? workspace.yourPermission.includes("sessions_host")
                                        : workspace.yourPermission.includes("sessions_claim"))
                                    }
                                    availableUsers={availableUsers}
                                    currentUserId={login.userId}
                                    currentUserPicture={login.thumbnail}
                                    currentUserUsername={login.username}
                                    assignedUserPicture={userPicture}
                                    assignedUserId={assignedUser?.userid?.toString()}
                                    workspace={workspace}
                                    isHostRole={slotData.name === "Host" || slotData.name.toLowerCase() === "co-host"}
                                  />
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  }
                )}
            </div>
          </div>

          <NotesSection
            sessionId={session.id}
            canManage={canManage}
            currentUser={login}
            refreshKey={refreshKey}
            onDataChange={refreshSessionData}
          />

          <ActivityLogsSection sessionId={session.id} refreshKey={refreshKey} />
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
    const isOwner = workspace?.roles?.find((r: any) => r.id === workspace.yourRole)?.isOwnerRole || false;
    if (isOwner) return true;
    const hasAssignPermission = workspace.yourPermission.includes("sessions_assign");
    const hasClaimPermission = workspace.yourPermission.includes("sessions_claim");
    const hasHostPermission = workspace.yourPermission.includes("sessions_host");
    
    if (isHostRole) {
      return hasAssignPermission || hasHostPermission;
    } else {
      return hasAssignPermission || hasClaimPermission;
    }
  };

  const actualCanEdit = canEdit && hasPermissionToEdit();

  useEffect(() => {
    setInputValue(currentValue);
  }, [currentValue]);

  useEffect(() => {
    const userHasAssignPermission = workspace?.yourPermission?.includes("sessions_assign") || false;
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
    const isOwner = workspace?.roles?.find((r: any) => r.id === workspace.yourRole)?.isOwnerRole || false;
    if (isOwner) return true;
    const hasAssignPermission = workspace.yourPermission.includes("sessions_assign");
    const hasClaimPermission = workspace.yourPermission.includes("sessions_claim");
    const hasHostPermission = workspace.yourPermission.includes("sessions_host");
    const targetUser = availableUsers.find(user => user.username === targetUsername);
    if (!targetUser) return false;
    const isAssigningToSelf = targetUser.userid.toString() === currentUserId.toString();
    if (hasAssignPermission) {
      return true;
    }
    
    if (isHostRole) {
      if (hasHostPermission && isAssigningToSelf) {
        return true;
      }
      if (hasHostPermission && !isAssigningToSelf) {
        const targetUserHasHostPermission = workspace.members?.find((member: any) => 
          member.userid === targetUser.userid
        )?.permissions?.includes("sessions_host") || false;
        return targetUserHasHostPermission;
      }
    } else {
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
      <div className="flex items-center gap-2 px-4 py-2 bg-zinc-100 dark:bg-zinc-700 rounded-lg">
        {currentValue && assignedUserPicture && assignedUserId && (
          <div
            className={`w-6 h-6 rounded-full flex items-center justify-center ${getRandomBg(
              assignedUserId
            )}`}
          >
            <img
              src={assignedUserPicture || "/default-avatar.jpg"}
              alt={currentValue}
              className="w-6 h-6 rounded-full object-cover"
              onError={(e) => {
                e.currentTarget.src = "/default-avatar.jpg";
              }}
            />
          </div>
        )}
        <span className="text-zinc-700 dark:text-white">
          {currentValue || "No assignment"}
        </span>
      </div>
    );
  }

  if (isEditing) {
    return (
      <div className="relative">
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <input
              ref={inputRef}
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              onFocus={handleInputFocus}
              onBlur={handleInputBlur}
              placeholder={placeholder}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-primary dark:bg-zinc-700 dark:border-zinc-600 dark:text-white"
              disabled={isSubmitting}
              autoFocus
            />

            {showSuggestions && filteredUsers.length > 0 && (
              <div className="absolute z-50 w-full mt-1 bg-white dark:bg-zinc-800 border border-gray-300 dark:border-zinc-600 rounded-md shadow-lg max-h-60 overflow-y-auto">
                {filteredUsers.map((user, index) => (
                  <div
                    key={user.userid}
                    ref={(el) => {
                      suggestionRefs.current[index] = el;
                    }}
                    className={`flex items-center gap-3 px-3 py-2 cursor-pointer hover:bg-zinc-50 dark:hover:bg-zinc-700 ${
                      selectedIndex === index
                        ? "bg-zinc-50 dark:bg-zinc-700"
                        : ""
                    }`}
                    onClick={() => handleUserSelect(user)}
                  >
                    <img
                      src={user.picture || "/default-avatar.jpg"}
                      alt={user.username}
                      className="w-8 h-8 rounded-full"
                      onError={(e) => {
                        e.currentTarget.src = "/default-avatar.jpg";
                      }}
                    />
                    <div className="flex-1">
                      <div className="text-sm font-medium text-zinc-900 dark:text-white">
                        {user.username}
                        {user.isSelf && (
                          <span className="ml-2 text-xs bg-primary/10 text-primary px-2 py-0.5 rounded">
                            You
                          </span>
                        )}
                      </div>
                    </div>
                    {user.isSelf && (
                      <span className="text-xs text-zinc-500 dark:text-zinc-400">
                        Claim
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
          <button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="px-3 py-2 text-sm bg-primary text-white rounded-md hover:bg-primary/90 disabled:opacity-50"
          >
            Save
          </button>
          <button
            onClick={handleCancel}
            disabled={isSubmitting}
            className="px-3 py-2 text-sm bg-zinc-500 text-white rounded-md hover:bg-zinc-600 disabled:opacity-50"
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
        if ((e.key === "Enter" || e.key === " ") && !isSubmitting && actualCanEdit) setIsEditing(true);
      }}
      onClick={() => {
        if (!isSubmitting && actualCanEdit) setIsEditing(true);
      }}
      className="w-full px-4 py-2 text-left bg-white dark:bg-zinc-700 border border-gray-300 dark:border-zinc-600 rounded-lg hover:bg-zinc-50 dark:hover:bg-zinc-600 transition-colors disabled:opacity-50 outline-none"
    >
      <div className="flex items-center gap-2 w-full">
        <div className="flex items-center flex-1">
          {currentValue && assignedUserPicture && assignedUserId && (
            <div
              className={`w-6 h-6 rounded-full flex items-center justify-center ${getRandomBg(
                assignedUserId
              )}`}
            >
              <img
                src={assignedUserPicture || "/default-avatar.jpg"}
                alt={currentValue}
                className="w-6 h-6 rounded-full object-cover"
                onError={(e) => {
                  e.currentTarget.src = "/default-avatar.jpg";
                }}
              />
            </div>
          )}
          <span className="text-zinc-700 dark:text-white ml-2">
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
                  const isOwner = workspace?.roles?.find((r: any) => r.id === workspace.yourRole)?.isOwnerRole || false;
                  if (isOwner) return true;
                  
                  const hasAssignPermission = workspace.yourPermission.includes("sessions_assign");
                  const isAssignedToSelf = assignedUserId?.toString() === currentUserId.toString();
                  
                  if (isHostRole) {
                    const hasHostPermission = workspace.yourPermission.includes("sessions_host");
                    return hasAssignPermission || (hasHostPermission && isAssignedToSelf);
                  } else {
                    const hasClaimPermission = workspace.yourPermission.includes("sessions_claim");
                    return hasAssignPermission || (hasClaimPermission && isAssignedToSelf);
                  }
                };
                
                if (canRemoveAssignment()) {
                  onValueChange("");
                }
              }
            }}
            className="ml-2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 p-1 rounded hover:bg-zinc-100 dark:hover:bg-zinc-600 cursor-pointer"
          >
            <IconX className="w-4 h-4" />
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
}) => {
  const filteredUsers = availableUsers;
const canRemoveHost = workspace ? 
    (() => {
      const isOwner = workspace?.roles?.find((r: any) => r.id === workspace.yourRole)?.isOwnerRole || false;
      if (isOwner) return true;
      const hasAssignPermission = workspace.yourPermission.includes("sessions_assign");
      const hasHostPermission = workspace.yourPermission.includes("sessions_host");
      const isCurrentUserAssigned = assignedUserId === currentUserId.toString();
      
      return hasAssignPermission || (hasHostPermission && isCurrentUserAssigned);
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
}) => {
  const filteredUsers = availableUsers;
  const canRemoveRole = workspace ? 
    (() => {
      const isOwner = workspace?.roles?.find((r: any) => r.id === workspace.yourRole)?.isOwnerRole || false;
      if (isOwner) return true;
      const hasAssignPermission = workspace.yourPermission.includes("sessions_assign");
      const isCurrentUserAssigned = assignedUserId === currentUserId.toString();
      if (isHostRole) {
        const hasHostPermission = workspace.yourPermission.includes("sessions_host");
        return hasAssignPermission || (hasHostPermission && isCurrentUserAssigned);
      } else {
        const hasClaimPermission = workspace.yourPermission.includes("sessions_claim");
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
    <div>
      <div className="flex items-center gap-2 mb-3">
        <IconNotes className="w-5 h-5 text-primary" />
        <h3 className="text-lg font-medium text-zinc-900 dark:text-white">
          Notes
        </h3>
      </div>

      {canManage && (
        <div className="mb-4">
          <div className="flex flex-col gap-2">
            <textarea
              value={newNote}
              onChange={(e) => setNewNote(e.target.value)}
              placeholder="Add a note about this session..."
              className="flex-1 px-3 py-2 text-sm border border-gray-300 dark:border-zinc-600 rounded-lg resize-none focus:outline-none focus:ring-1 focus:ring-primary dark:bg-zinc-700 dark:text-white"
              rows={2}
              disabled={isSubmitting}
            />
            <div className="flex justify-between items-center">
              <button
                onClick={addNote}
                disabled={isSubmitting || !newNote.trim()}
                className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                <IconSend className="w-4 h-4" />
                Add Note
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="space-y-3 max-h-60 overflow-y-auto">
        {isLoading ? (
          <div className="text-center py-4 text-zinc-500 dark:text-zinc-400">
            Loading notes...
          </div>
        ) : notes.length === 0 ? (
          <div className="text-center py-8 bg-zinc-50 dark:bg-zinc-700/30 rounded-lg">
            <IconNotes className="w-8 h-8 text-zinc-400 mx-auto mb-2" />
            <p className="text-zinc-500 dark:text-zinc-400">No notes yet</p>
            <p className="text-sm text-zinc-400 dark:text-zinc-500">
              {canManage
                ? "Add the first note above"
                : "Notes will appear here when added"}
            </p>
          </div>
        ) : (
          notes.map((note) => (
            <div
              key={note.id}
              className="bg-zinc-50 dark:bg-zinc-700/30 rounded-lg p-3"
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2">
                  <img
                    src={note.author?.picture || "/default-avatar.jpg"}
                    alt={note.author?.username || "User"}
                    className="w-6 h-6 rounded-full"
                    onError={(e) => {
                      e.currentTarget.src = "/default-avatar.jpg";
                    }}
                  />
                  <span className="text-sm font-medium text-zinc-900 dark:text-white">
                    {note.author?.username || "Unknown User"}
                  </span>
                  <span className="text-xs text-zinc-500 dark:text-zinc-400">
                    {new Date(note.createdAt).toLocaleString()}
                  </span>
                </div>
              </div>
              <div className="prose text-zinc-700 dark:text-zinc-300 dark:prose-invert max-w-none text-sm">
                <ReactMarkdown rehypePlugins={[rehypeSanitize]}>
                  {note.content}
                </ReactMarkdown>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
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
    <div>
      <div className="flex items-center gap-2 mb-3">
        <IconHistory className="w-5 h-5 text-primary" />
        <h3 className="text-lg font-medium text-zinc-900 dark:text-white">
          Activity Log
        </h3>
      </div>

      <div className="space-y-2 max-h-60 overflow-y-auto">
        {isLoading ? (
          <div className="text-center py-4 text-zinc-500 dark:text-zinc-400">
            Loading activity log...
          </div>
        ) : logs.length === 0 ? (
          <div className="text-center py-8 bg-zinc-50 dark:bg-zinc-700/30 rounded-lg">
            <IconHistory className="w-8 h-8 text-zinc-400 mx-auto mb-2" />
            <p className="text-zinc-500 dark:text-zinc-400">No activity yet</p>
            <p className="text-sm text-zinc-400 dark:text-zinc-500">
              Actions will be logged here automatically
            </p>
          </div>
        ) : (
          logs.map((log) => (
            <div
              key={log.id}
              className="flex items-start gap-3 p-3 bg-zinc-50 dark:bg-zinc-700/30 rounded-lg"
            >
              {getLogIcon(log.action)}
              <div className="flex-1">
                <p className="text-sm text-zinc-700 dark:text-zinc-300">
                  {getLogMessage(log)}
                </p>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                  {new Date(log.createdAt).toLocaleString()}
                </p>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default SessionModal;
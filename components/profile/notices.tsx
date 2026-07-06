import React, { useState } from "react";
import { FC } from "@/types/settingsComponent";
import moment from "moment";
import {
  formatNoticeDay,
  parseDateInputEnd,
  parseDateInputStart,
} from "@/utils/noticeDates";
import {
  IconCheck,
  IconX,
  IconClock,
  IconPlus,
  IconCalendarTime,
  IconBug,
  IconHome,
  IconBook,
  IconAlertTriangle,
  IconArrowRight,
} from "@tabler/icons-react";
import { useRouter } from "next/router";
import axios from "axios";
import toast from "react-hot-toast";
import { useRecoilState } from "recoil";
import { workspacestate, loginState } from "@/state";
import {
  ProfileEmptyState,
  profileInputClass,
  profileSecondaryButtonClass,
  profilePrimaryButtonClass,
} from "@/components/profile/shell";

interface Props {
  notices: any[];
  canManageNotices?: boolean;
  canApproveNotices?: boolean;
  canRecordNotices?: boolean;
  userId?: string;
}

const Notices: FC<Props> = ({ notices, canManageNotices = false, canApproveNotices = false, canRecordNotices = false, userId }) => {
  const router = useRouter();
  const [workspace] = useRecoilState(workspacestate);
  const [login] = useRecoilState(loginState);
  const [localNotices, setLocalNotices] = useState<any[]>(notices || []);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [reason, setReason] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [selectedType, setSelectedType] = useState<
    "" | "holiday" | "sickness" | "personal" | "school" | "other"
  >("");

  const TYPE_LABELS: Record<string, string> = {
    holiday: "Holiday",
    sickness: "Sickness", 
    personal: "Personal",
    school: "School",
    other: "Other",
  };

  const getStatusIcon = (notice: any) => {
    if (notice.approved)
      return (
        <IconCheck className="w-5 h-5 text-green-500 dark:text-green-400" />
      );
    if (notice.reviewed)
      return <IconX className="w-5 h-5 text-red-500 dark:text-red-400" />;
    if (notice.revoked)
      return <IconX className="w-5 h-5 text-red-500 dark:text-red-400" />;
    return (
      <IconClock className="w-5 h-5 text-yellow-500 dark:text-yellow-400" />
    );
  };

  const getStatusText = (notice: any) => {
    if (notice.approved) return "Approved";
    if (notice.revoked) return "Revoked";
    if (notice.reviewed) return "Declined";
    return "Under Review";
  };

  const createNotice = async () => {
    if (!reason.trim() || !startTime || !endTime || !userId) {
      toast.error("Please fill in all fields");
      return;
    }

    if (startTime > endTime) {
      toast.error("End date must be on or after start date");
      return;
    }

    const start = parseDateInputStart(startTime);
    const end = parseDateInputEnd(endTime);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
      toast.error("Invalid date");
      return;
    }

    setIsCreating(true);
    try {

      const workspaceId = router.query.id ?? workspace.groupId;
      const res = await axios.post(
        `/api/workspace/${workspaceId}/activity/notices/record`,
        {
          userId: userId,
          startTime: start.getTime(),
          endTime: end.getTime(),
          reason: reason.trim(),
        }
      );

      if (res.data.success) {
        toast.success("Notice recorded!");
        setReason("");
        setStartTime("");
        setEndTime("");
        setSelectedType("");
        setShowCreateForm(false);
        
        const newNotice = {
          id: res.data.notice.id,
          reason: reason.trim(),
          startTime: start.toISOString(),
          endTime: end.toISOString(),
          approved: true,
          reviewed: true,
          revoked: false,
        };
        setLocalNotices(prev => [newNotice, ...prev]);
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to record notice");
    } finally {
      setIsCreating(false);
    }
  };

  const typeButtons: { type: typeof selectedType; label: string; icon: React.ElementType }[] = [
    { type: "holiday", label: "Holiday", icon: IconCalendarTime },
    { type: "sickness", label: "Sickness", icon: IconBug },
    { type: "personal", label: "Personal", icon: IconHome },
    { type: "school", label: "School", icon: IconBook },
    { type: "other", label: "Other", icon: IconPlus },
  ];

  const statusConfig = {
    approved: { color: "border-l-emerald-400 dark:border-l-emerald-500", badge: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300" },
    declined: { color: "border-l-red-400 dark:border-l-red-500", badge: "bg-red-100 text-red-600 dark:bg-red-900/40 dark:text-red-300" },
    pending: { color: "border-l-amber-400 dark:border-l-amber-500", badge: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300" },
  };

  const getStatusConfig = (notice: any) => {
    if (notice.approved) return statusConfig.approved;
    if (notice.reviewed || notice.revoked) return statusConfig.declined;
    return statusConfig.pending;
  };

  const pendingCount = localNotices.filter((n) => !n.reviewed).length;

  return (
    <div className="space-y-4">

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold text-zinc-900 dark:text-white">
            Time off
          </h3>
          {localNotices.length > 0 && (
            <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs font-medium text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400">
              {localNotices.length}
            </span>
          )}
        </div>
        {canRecordNotices && !showCreateForm && (
          <button
            onClick={() => setShowCreateForm(true)}
            className={profileSecondaryButtonClass}
          >
            <IconPlus className="w-3.5 h-3.5" />
            Add record
          </button>
        )}
        {canRecordNotices && showCreateForm && (
          <button
            onClick={() => { setShowCreateForm(false); setReason(""); setStartTime(""); setEndTime(""); setSelectedType(""); }}
            className={profileSecondaryButtonClass}
          >
            <IconX className="w-3.5 h-3.5" />
            Cancel
          </button>
        )}
      </div>

      {(canApproveNotices || canManageNotices) && pendingCount > 0 && (
        <button
          onClick={() => router.push(`/workspace/${router.query.id}/notices`)}
          className="flex w-full items-center justify-between gap-3 rounded-xl bg-amber-500/10 px-4 py-3 text-left transition hover:bg-amber-500/15"
        >
          <div className="flex items-center gap-2.5">
            <IconAlertTriangle className="h-4 w-4 shrink-0 text-amber-500" />
            <span className="text-sm font-medium text-amber-600 dark:text-amber-400">
              {pendingCount} pending notice{pendingCount !== 1 ? "s" : ""}
            </span>
          </div>
          <div className="flex items-center gap-1 text-xs font-medium text-amber-600 dark:text-amber-400">
            Review
            <IconArrowRight className="h-3.5 w-3.5" />
          </div>
        </button>
      )}

      {canRecordNotices && showCreateForm && (
        <div className="space-y-4 rounded-xl bg-zinc-50 p-4 dark:bg-zinc-800/50">
          <div>
            <p className="mb-2 text-[11px] font-medium uppercase tracking-wide text-zinc-400 dark:text-zinc-500">
              Type
            </p>
            <div className="flex flex-wrap gap-1.5">
              {typeButtons.map(({ type, label, icon: Icon }) => (
                <button
                  key={type}
                  onClick={() => { setSelectedType(type); setReason(type !== "other" ? label : ""); }}
                  className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors ${
                    selectedType === type
                      ? "bg-primary text-white"
                      : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200 dark:bg-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-600"
                  }`}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1.5 block text-[11px] font-medium uppercase tracking-wide text-zinc-400 dark:text-zinc-500">
                Start date
              </label>
              <input
                type="date"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className={profileInputClass}
              />
            </div>
            <div>
              <label className="mb-1.5 block text-[11px] font-medium uppercase tracking-wide text-zinc-400 dark:text-zinc-500">
                End date
              </label>
              <input
                type="date"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                min={startTime || moment().format("YYYY-MM-DD")}
                className={profileInputClass}
              />
            </div>
          </div>

          {selectedType !== "" && (
            <div>
              <label className="mb-1.5 block text-[11px] font-medium uppercase tracking-wide text-zinc-400 dark:text-zinc-500">
                Reason
              </label>
              {selectedType !== "other" ? (
                <div className={`${profileInputClass} text-zinc-500 dark:text-zinc-400`}>
                  {TYPE_LABELS[selectedType]}
                </div>
              ) : (
                <textarea
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  rows={3}
                  placeholder="Brief explanation…"
                  className={`${profileInputClass} resize-none`}
                />
              )}
            </div>
          )}

          <div className="flex gap-2 pt-1">
            <button
              onClick={createNotice}
              disabled={isCreating || !reason.trim() || !startTime || !endTime}
              className={`flex-1 ${profilePrimaryButtonClass} justify-center disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              {isCreating ? "Adding…" : "Add record"}
            </button>
            <button
              onClick={() => { setShowCreateForm(false); setReason(""); setStartTime(""); setEndTime(""); setSelectedType(""); }}
              className={`flex-1 ${profileSecondaryButtonClass} justify-center`}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {localNotices.length === 0 ? (
        <ProfileEmptyState
          icon={IconCalendarTime}
          title="No notices yet"
          description="Inactivity notices will appear here"
        />
      ) : (
        <div className="divide-y divide-zinc-100 dark:divide-zinc-800/60">
          {localNotices.map((notice: any) => {
            const now = new Date();
            const isActive =
              notice.approved &&
              notice.startTime &&
              notice.endTime &&
              new Date(notice.startTime) <= now &&
              new Date(notice.endTime) >= now;
            const cfg = getStatusConfig(notice);
            const statusText = getStatusText(notice);

            return (
              <div key={notice.id} className="flex items-start justify-between gap-4 py-3.5">
                <div className="flex items-start gap-3 min-w-0">
                  <div className="mt-0.5 shrink-0">{getStatusIcon(notice)}</div>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-0.5">
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${cfg.badge}`}>
                        {statusText}
                      </span>
                      {isActive && (
                        <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400">
                          Active now
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-zinc-900 dark:text-white">
                      {notice.reason}
                    </p>
                    <p className="mt-0.5 text-xs tabular-nums text-zinc-400 dark:text-zinc-500">
                      {formatNoticeDay(notice.startTime, "D MMM YYYY")} – {formatNoticeDay(notice.endTime, "D MMM YYYY")}
                    </p>
                  </div>
                </div>
                {isActive && canManageNotices && (
                  <button
                    onClick={async () => {
                      try {
                        const routeWorkspaceId = Array.isArray(router.query.id) ? router.query.id[0] : router.query.id;
                        const workspaceIdCandidate = routeWorkspaceId ?? workspace.groupId;
                        const safeWorkspaceId =
                          typeof workspaceIdCandidate === "string" && /^[A-Za-z0-9_-]{1,128}$/.test(workspaceIdCandidate)
                            ? workspaceIdCandidate
                            : workspace.groupId;
                        await axios.post(
                          `/api/workspace/${encodeURIComponent(safeWorkspaceId)}/activity/notices/update`,
                          { id: notice.id, status: "cancel" },
                        );
                        setLocalNotices((prev) => prev.filter((n) => n.id !== notice.id));
                        toast.success("Notice revoked");
                      } catch {
                        toast.error("Failed to revoke notice");
                      }
                    }}
                    className="shrink-0 rounded-lg bg-red-500/10 px-2.5 py-1.5 text-xs font-medium text-red-600 transition hover:bg-red-500/20 dark:text-red-400"
                  >
                    Revoke
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
export default Notices;
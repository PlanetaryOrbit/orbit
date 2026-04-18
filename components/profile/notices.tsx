import React, { useState } from "react";
import { FC } from "@/types/settingsComponent";
import moment from "moment";
import { IconCheck, IconX, IconClock, IconPlus, IconCalendarTime, IconBug, IconHome, IconBook } from "@tabler/icons-react";
import { useRouter } from "next/router";
import axios from "axios";
import toast from "react-hot-toast";
import { useRecoilState } from "recoil";
import { workspacestate, loginState } from "@/state";

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

    if (new Date(startTime) >= new Date(endTime)) {
      toast.error("End time must be after start time");
      return;
    }

    setIsCreating(true);
    try {
      const start = new Date(startTime);
      const end = new Date(endTime);

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

  return (
    <div className="rounded-xl border border-zinc-200 dark:border-zinc-700/60 bg-white dark:bg-zinc-800/80 overflow-hidden">
      <div className="flex items-center justify-between gap-3 px-5 py-4 border-b border-zinc-100 dark:border-zinc-700/60">
        <div className="flex items-center gap-3 min-w-0">
          <div className="p-1.5 bg-primary/10 rounded-md flex-shrink-0">
            <IconCalendarTime className="w-4 h-4 text-primary" />
          </div>
          <div className="min-w-0">
            <h2 className="text-sm font-semibold text-zinc-900 dark:text-white">Inactivity Notices</h2>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">Record and review approved time off for this member.</p>
          </div>
        </div>
        {canRecordNotices && !showCreateForm && (
          <button
            onClick={() => setShowCreateForm(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-primary text-white text-xs font-medium rounded-lg hover:bg-primary/90 transition-colors shrink-0"
          >
            <IconPlus className="w-3.5 h-3.5" />
            Add Record
          </button>
        )}
      </div>

      <div className="p-5 space-y-4">
        {canRecordNotices && showCreateForm && (
          <div className="rounded-xl border border-zinc-200 dark:border-zinc-700/60 bg-zinc-50 dark:bg-zinc-700/30 p-4 space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 uppercase tracking-wide">New Record</p>
              <button
                onClick={() => { setShowCreateForm(false); setReason(""); setStartTime(""); setEndTime(""); setSelectedType(""); }}
                className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 transition-colors"
              >
                <IconX className="w-4 h-4" />
              </button>
            </div>

            <div>
              <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wide mb-2">Type</p>
              <div className="flex gap-1.5 flex-wrap">
                {typeButtons.map(({ type, label, icon: Icon }) => (
                  <button
                    key={type}
                    onClick={() => { setSelectedType(type); setReason(type !== "other" ? label : ""); }}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border transition-all ${
                      selectedType === type
                        ? "bg-primary/10 border-primary/30 text-primary"
                        : "border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 hover:border-zinc-300 dark:hover:border-zinc-600 hover:text-zinc-900 dark:hover:text-white"
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wide mb-1.5">Start Date</label>
                <input
                  type="date"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-zinc-200 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-700/50 text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wide mb-1.5">End Date</label>
                <input
                  type="date"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  min={startTime || moment().format("YYYY-MM-DD")}
                  className="w-full px-3 py-2 text-sm border border-zinc-200 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-700/50 text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition"
                />
              </div>
            </div>

            {selectedType !== "" && (
              <div>
                <label className="block text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wide mb-1.5">Reason</label>
                {selectedType !== "other" ? (
                  <div className="w-full px-3 py-2 text-sm border border-zinc-200 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-700/50 text-zinc-900 dark:text-white">
                    {TYPE_LABELS[selectedType]}
                  </div>
                ) : (
                  <textarea
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    rows={3}
                    placeholder="Brief explanation for the inactivity period..."
                    className="w-full px-3 py-2 text-sm border border-zinc-200 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-700/50 text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition resize-none placeholder:text-zinc-400 dark:placeholder:text-zinc-500"
                  />
                )}
              </div>
            )}

            <div className="flex gap-2">
              <button
                onClick={createNotice}
                disabled={isCreating || !reason.trim() || !startTime || !endTime}
                className="flex-1 py-2 text-sm font-medium bg-primary text-white rounded-lg hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isCreating ? "Adding..." : "Add Record"}
              </button>
              <button
                onClick={() => { setShowCreateForm(false); setReason(""); setStartTime(""); setEndTime(""); setSelectedType(""); }}
                className="flex-1 py-2 text-sm font-medium bg-zinc-100 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-300 rounded-lg hover:bg-zinc-200 dark:hover:bg-zinc-600 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {(canApproveNotices || canManageNotices) && localNotices.filter((n) => !n.reviewed).length > 0 && (
          <div className="flex items-center justify-between gap-3 px-3 py-2.5 rounded-lg border border-amber-200 dark:border-amber-800/60 bg-amber-50 dark:bg-amber-900/20">
            <p className="text-xs font-medium text-amber-700 dark:text-amber-300">
              {localNotices.filter((n) => !n.reviewed).length} pending notice(s)
            </p>
            <button
              onClick={() => router.push(`/workspace/${router.query.id}/notices`)}
              className="text-xs font-semibold text-amber-700 dark:text-amber-300 hover:underline shrink-0"
            >
              Manage →
            </button>
          </div>
        )}

        {localNotices.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 gap-3">
            <div className="w-12 h-12 bg-zinc-100 dark:bg-zinc-700/50 rounded-full flex items-center justify-center">
              <IconCalendarTime className="w-6 h-6 text-zinc-400 dark:text-zinc-500" />
            </div>
            <div className="text-center">
              <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300">No notices yet</p>
              <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-0.5">Inactivity notices will appear here</p>
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            {localNotices.map((notice: any) => {
              const now = new Date();
              const isActive =
                notice.approved &&
                notice.startTime &&
                notice.endTime &&
                new Date(notice.startTime) <= now &&
                new Date(notice.endTime) >= now;
              const cfg = getStatusConfig(notice);
              return (
                <div
                  key={notice.id}
                  className={`flex items-start justify-between gap-3 px-4 py-3 rounded-xl border border-zinc-100 dark:border-zinc-700/60 bg-zinc-50 dark:bg-zinc-700/30 border-l-2 ${cfg.color}`}
                >
                  <div className="flex items-start gap-2.5 flex-1 min-w-0">
                    <div className="mt-0.5 shrink-0">{getStatusIcon(notice)}</div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className={`text-xs font-semibold px-1.5 py-0.5 rounded ${cfg.badge}`}>
                          {getStatusText(notice)}
                        </span>
                        <span className="text-xs text-zinc-400 dark:text-zinc-500 tabular-nums">
                          {moment(notice.startTime).format("D MMM YYYY")} – {moment(notice.endTime).format("D MMM YYYY")}
                        </span>
                      </div>
                      <p className="text-sm text-zinc-600 dark:text-zinc-300 break-words leading-relaxed">
                        {notice.reason}
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
                          await axios.post(`/api/workspace/${encodeURIComponent(safeWorkspaceId)}/activity/notices/update`, { id: notice.id, status: "cancel" });
                          setLocalNotices((prev) => prev.filter((n) => n.id !== notice.id));
                          toast.success("Notice revoked");
                        } catch (e) {
                          toast.error("Failed to revoke notice");
                        }
                      }}
                      className="shrink-0 px-2.5 py-1.5 text-xs font-medium rounded-lg bg-red-500 text-white hover:bg-red-600 transition-colors"
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
    </div>
  );
};
export default Notices;
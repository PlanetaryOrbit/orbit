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
  canManageMembers?: boolean;
  userId?: string;
}

const Notices: FC<Props> = ({ notices, canManageMembers = false, userId }) => {
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

  return (
    <div className="bg-white dark:bg-zinc-800 rounded-xl shadow-sm overflow-hidden">
      <div className="p-4 sm:p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-2">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <div className="p-2 rounded-lg bg-primary/10 flex-shrink-0">
              <IconCalendarTime className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
            </div>
            <div className="min-w-0 flex-1">
              <h2 className="text-base sm:text-lg font-semibold text-zinc-900 dark:text-zinc-100">
                Inactivity Notices
              </h2>
              <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400">
                Record and review approved time off for this member.
              </p>
            </div>
          </div>
          {canManageMembers && !showCreateForm && (
            <button
              onClick={() => setShowCreateForm(true)}
              className="inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 bg-primary text-white text-xs sm:text-sm rounded-md hover:bg-primary/90 transition-colors whitespace-nowrap flex-shrink-0"
            >
              <IconPlus className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              Add Record
            </button>
          )}
        </div>

        {canManageMembers && showCreateForm && (
          <div className="bg-zinc-50 dark:bg-zinc-800/60 rounded-lg p-3 sm:p-4 mb-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xs sm:text-sm font-medium text-zinc-900 dark:text-zinc-100">
                Create Notices Record
              </h3>
              <button
                onClick={() => {
                  setShowCreateForm(false);
                  setReason("");
                  setStartTime("");
                  setEndTime("");
                  setSelectedType("");
                }}
                className="text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 flex-shrink-0"
              >
                <IconX className="w-4 h-4" />
              </button>
            </div>

            <div className="mb-4">
              <label className="block text-xs sm:text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                Type
              </label>
              <div className="flex gap-2 flex-wrap">
                <button
                  onClick={() => {
                    setSelectedType("holiday");
                    setReason("Holiday");
                  }}
                  className={`px-2.5 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm font-medium rounded-md transition-colors flex items-center gap-1.5 sm:gap-2 ${
                    selectedType === "holiday"
                      ? "bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white shadow-sm"
                      : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white"
                  }`}
                >
                  <IconCalendarTime className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-zinc-600 dark:text-zinc-400" />
                  Holiday
                </button>

                <button
                  onClick={() => {
                    setSelectedType("sickness");
                    setReason("Sickness");
                  }}
                  className={`px-2.5 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm font-medium rounded-md transition-colors flex items-center gap-1.5 sm:gap-2 ${
                    selectedType === "sickness"
                      ? "bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white shadow-sm"
                      : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white"
                  }`}
                >
                  <IconBug className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-zinc-600 dark:text-zinc-400" />
                  Sickness
                </button>

                <button
                  onClick={() => {
                    setSelectedType("personal");
                    setReason("Personal");
                  }}
                  className={`px-2.5 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm font-medium rounded-md transition-colors flex items-center gap-1.5 sm:gap-2 ${
                    selectedType === "personal"
                      ? "bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white shadow-sm"
                      : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white"
                  }`}
                >
                  <IconHome className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-zinc-600 dark:text-zinc-400" />
                  Personal
                </button>

                <button
                  onClick={() => {
                    setSelectedType("school");
                    setReason("School");
                  }}
                  className={`px-2.5 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm font-medium rounded-md transition-colors flex items-center gap-1.5 sm:gap-2 ${
                    selectedType === "school"
                      ? "bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white shadow-sm"
                      : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white"
                  }`}
                >
                  <IconBook className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-zinc-600 dark:text-zinc-400" />
                  School
                </button>

                <button
                  onClick={() => {
                    setSelectedType("other");
                    setReason("");
                  }}
                  className={`px-2.5 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm font-medium rounded-md transition-colors flex items-center gap-1.5 sm:gap-2 ${
                    selectedType === "other"
                      ? "bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white shadow-sm"
                      : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white"
                  }`}
                >
                  <IconPlus className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-zinc-600 dark:text-zinc-400" />
                  Other
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4 mb-4">
              <div>
                <label className="block text-xs sm:text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                  Start Date
                </label>
                <input
                  type="date"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-zinc-300 dark:border-zinc-600 rounded-lg bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-xs sm:text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                  End Date
                </label>
                <input
                  type="date"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-zinc-300 dark:border-zinc-600 rounded-lg bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white"
                  min={startTime || moment().format("YYYY-MM-DD")}
                />
              </div>
            </div>

            {selectedType !== "" && (
              <div className="mb-4">
                <label className="block text-xs sm:text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                  Reason for Inactivity
                </label>
                {selectedType !== "other" ? (
                  <div className="w-full px-3 py-2 text-sm border border-zinc-300 dark:border-zinc-600 rounded-lg bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white">
                    {TYPE_LABELS[selectedType] ?? reason}
                  </div>
                ) : (
                  <textarea
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-zinc-300 dark:border-zinc-600 rounded-lg bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white resize-none"
                    rows={3}
                    placeholder="Please provide a brief explanation for the inactivity period..."
                  />
                )}
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-2">
              <button
                onClick={createNotice}
                disabled={
                  isCreating || !reason.trim() || !startTime || !endTime
                }
                className="px-3 sm:px-4 py-2 text-xs sm:text-sm bg-primary text-white rounded-lg hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isCreating ? "Adding..." : "Add Record"}
              </button>
              <button
                onClick={() => {
                  setShowCreateForm(false);
                  setReason("");
                  setStartTime("");
                  setEndTime("");
                  setSelectedType("");
                }}
                className="px-3 sm:px-4 py-2 text-xs sm:text-sm bg-zinc-100 dark:bg-zinc-600 text-zinc-700 dark:text-zinc-300 rounded-lg hover:bg-zinc-200 dark:hover:bg-zinc-500"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {localNotices.filter((n) => !n.reviewed).length > 0 && (
          <div className="mb-3 p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-md flex items-center justify-between">
            <div className="text-sm text-yellow-800 dark:text-yellow-300">
              {localNotices.filter((n) => !n.reviewed).length} pending notice(s)
              for this user
            </div>
            <div>
              <button
                onClick={() =>
                  router.push(`/workspace/${router.query.id}/notices`)
                }
                className="px-3 py-1 bg-yellow-100 dark:bg-yellow-800 text-yellow-800 dark:text-yellow-200 rounded-md text-sm"
              >
                Manage
              </button>
            </div>
          </div>
        )}

        {localNotices.length === 0 ? (
          <p className="text-sm text-zinc-500 dark:text-zinc-400 italic">
            No inactivity notices found.
          </p>
        ) : (
          <div className="space-y-3">
            {localNotices.map((notice: any) => {
              const now = new Date();
              const isActive =
                notice.approved &&
                notice.startTime &&
                notice.endTime &&
                new Date(notice.startTime) <= now &&
                new Date(notice.endTime) >= now;
              return (
                <div
                  key={notice.id}
                  className="flex flex-col sm:flex-row gap-3 sm:gap-4 p-3 sm:p-4 bg-zinc-50 dark:bg-zinc-800/60 rounded-lg"
                >
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    <div className="flex-shrink-0">{getStatusIcon(notice)}</div>
                    <div className="flex-grow min-w-0">
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 sm:gap-2 mb-1">
                        <span
                          className={`text-xs sm:text-sm font-medium ${
                            notice.approved
                              ? "text-green-600 dark:text-green-400"
                              : notice.reviewed
                              ? "text-red-600 dark:text-red-400"
                              : "text-yellow-600 dark:text-yellow-400"
                          }`}
                        >
                          {getStatusText(notice)}
                        </span>
                        <span className="text-xs text-zinc-500 dark:text-zinc-300 whitespace-nowrap">
                          {moment(notice.startTime).format("DD MMM YYYY")} -{" "}
                          {moment(notice.endTime).format("DD MMM YYYY")}
                        </span>
                      </div>
                      <p className="text-xs sm:text-sm text-zinc-600 dark:text-zinc-300 break-words">
                        {notice.reason}
                      </p>
                    </div>
                  </div>
                  {isActive && (
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <button
                        onClick={async () => {
                          try {
                            const workspaceId =
                              router.query.id ?? workspace.groupId;
                            await axios.post(
                              `/api/workspace/${workspaceId}/activity/notices/update`,
                              {
                                id: notice.id,
                                status: "cancel",
                              }
                            );
                            setLocalNotices((prev) =>
                              prev.filter((n) => n.id !== notice.id)
                            );
                            toast.success("Notice revoked");
                          } catch (e) {
                            console.error(e);
                            toast.error("Failed to revoke notice");
                          }
                        }}
                        className="px-2.5 sm:px-3 py-1.5 text-xs sm:text-sm font-medium rounded-md bg-red-600 text-white hover:bg-red-700 shadow-sm focus:outline-none focus:ring-2 focus:ring-red-500/60 whitespace-nowrap w-full sm:w-auto"
                      >
                        Revoke
                      </button>
                    </div>
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
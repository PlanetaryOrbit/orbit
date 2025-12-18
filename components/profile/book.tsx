import React, { useState, useEffect } from "react";
import { FC } from "@/types/settingsComponent";
import { useRecoilState } from "recoil";
import { workspacestate } from "@/state";
import {
  IconPencil,
  IconCheck,
  IconX,
  IconAlertTriangle,
  IconStar,
  IconShieldCheck,
  IconClipboardList,
  IconRocket,
  IconTrash,
} from "@tabler/icons-react";
import axios from "axios";
import { useRouter } from "next/router";
import { toast } from "react-hot-toast";
import moment from "moment";

interface Props {
  userBook: any[];
  onRefetch?: () => void;
}

const Book: FC<Props> = ({ userBook, onRefetch }) => {
  const router = useRouter();
  const { id } = router.query;
  const [workspace, setWorkspace] = useRecoilState(workspacestate);
  const [text, setText] = useState("");
  const [type, setType] = useState("note");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [rankGunEnabled, setRankGunEnabled] = useState(false);
  const [targetRank, setTargetRank] = useState("");
  const [ranks, setRanks] = useState<
    Array<{ id: number; name: string; rank: number }>
  >([]);
  const [loadingRanks, setLoadingRanks] = useState(false);
  const [localBook, setLocalBook] = useState<any[]>(userBook || []);

  useEffect(() => {
    setLocalBook(userBook || []);
  }, [userBook]);

  useEffect(() => {
    const checkRankGunStatus = async () => {
      try {
        const response = await axios.get(
          `/api/workspace/${id}/external/ranking`
        );
        setRankGunEnabled(response.data.rankGunEnabled);
        return response.data.rankGunEnabled;
      } catch (error) {
        return false;
      }
    };

    const fetchRanks = async () => {
      setLoadingRanks(true);
      try {
        const response = await axios.get(`/api/workspace/${id}/ranks`);
        if (response.data.success) {
          setRanks(response.data.ranks);
        }
      } catch (error) {
        console.error("Error fetching ranks:", error);
      } finally {
        setLoadingRanks(false);
      }
    };

    if (id) {
      checkRankGunStatus().then((enabled) => {
        if (enabled) {
          fetchRanks();
        }
      });
    }
  }, [id]);

  useEffect(() => {
    if (type !== "rank_change") {
      setTargetRank("");
    }
  }, [type]);

  const addNote = async () => {
    if (!text) {
      toast.error("Please enter a note.");
      return;
    }

    if (type === "rank_change" && !targetRank) {
      toast.error("Please select a target rank.");
      return;
    }

    setIsSubmitting(true);
    try {
      const payload: any = {
        notes: text,
        type: type,
      };

      if (type === "rank_change") {
        const selectedRank = ranks.find(
          (rank) => rank.id.toString() === targetRank
        );
        if (selectedRank) {
          payload.targetRank = selectedRank.rank;
        } else {
          toast.error("Invalid rank selected.");
          setIsSubmitting(false);
          return;
        }
      }

      const response = await axios.post(
        `/api/workspace/${id}/userbook/${router.query.uid}/new`,
        payload
      );

      setText("");
      setTargetRank("");

      if (response.data.terminated) {
        toast.success("User terminated successfully!");
      } else {
        const isRankGunAction =
          rankGunEnabled &&
          (type === "promotion" ||
            type === "demotion" ||
            type === "rank_change");
        toast.success(
          isRankGunAction
            ? "Note added and rank updated successfully!"
            : "Note added successfully"
        );
      }

      router.reload();
    } catch (error: any) {
      console.error("Error adding note:", error);
      // log server response body for debugging
      try {
        console.error("Server response:", error?.response?.data);
      } catch (e) {}
      const raw = error?.response?.data?.error || error?.message || "Failed to add note";
      const errorMessage = typeof raw === "object" ? JSON.stringify(raw) : String(raw);
      toast.error(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  const getIcon = (type: string) => {
    switch (type) {
      case "note":
        return (
          <IconClipboardList className="w-5 h-5 text-zinc-500 dark:text-white" />
        );
      case "warning":
        return <IconAlertTriangle className="w-5 h-5 text-yellow-500" />;
      case "promotion":
        return <IconStar className="w-5 h-5 text-primary" />;
      case "demotion":
        return <IconX className="w-5 h-5 text-red-500" />;
      case "rank_change":
        return <IconRocket className="w-5 h-5 text-blue-500" />;
      case "termination":
        return <IconX className="w-5 h-5 text-red-500" />;
      default:
        return (
          <IconClipboardList className="w-5 h-5 text-zinc-500 dark:text-white" />
        );
    }
  };

  const getEntryTitle = (type: string) => {
    switch (type) {
      case "note":
        return "Note";
      case "warning":
        return "Warning";
      case "promotion":
        return "Promotion";
      case "demotion":
        return "Demotion";
      case "rank_change":
        return "Rank Change";
      case "termination":
        return "Termination";
      default:
        return "Note";
    }
  };

  const canRedact = (workspace: any) => {
    return (workspace?.yourPermission || []).includes("manage_members");
  };

  const isOwner = (workspace: any) => {
    try {
      if (!workspace?.yourRole) return false;
      return workspace.roles?.some(
        (r: any) => r.id === workspace.yourRole && r.isOwnerRole
      );
    } catch (e) {
      return false;
    }
  };

  const redactEntry = async (entry: any) => {
    setRedactTarget(entry);
    setShowRedactModal(true);
  };

  const deleteEntry = async (entry: any) => {
    setDeleteTarget(entry);
    setShowDeleteModal(true);
  };

  const [showRedactModal, setShowRedactModal] = React.useState(false);
  const [redactTarget, setRedactTarget] = React.useState<any | null>(null);
  const [showDeleteModal, setShowDeleteModal] = React.useState(false);
  const [deleteTarget, setDeleteTarget] = React.useState<any | null>(null);

  const confirmRedact = async () => {
    if (!redactTarget) return;
    try {
      const response = await axios.post(
        `/api/workspace/${id}/userbook/${router.query.uid}/${redactTarget.id}/redact`,
        { redacted: !redactTarget.redacted }
      );
      if (response.data.success) {
        toast.success(
          response.data.entry?.redacted ? "Entry redacted!" : "Entry unredacted!"
        );
        const updatedEntry = response.data.entry;
        setLocalBook((prev) =>
          prev.map((e) => (e.id === updatedEntry.id ? updatedEntry : e))
        );
        if (onRefetch) onRefetch();
      }
    } catch (error: any) {
      toast.error("Failed to redact entry.");
    } finally {
      setShowRedactModal(false);
      setRedactTarget(null);
    }
  };

  const confirmDeleteEntry = async () => {
    if (!deleteTarget) return;
    try {
      const response = await axios.delete(
        `/api/workspace/${id}/userbook/${router.query.uid}/${deleteTarget.id}/delete`
      );
      if (response.data.success) {
        toast.success("Entry deleted!");
        setLocalBook((prev) => prev.filter((e) => e.id !== deleteTarget.id));
        if (onRefetch) onRefetch();
      }
    } catch (error: any) {
      toast.error("Failed to delete entry.");
    } finally {
      setShowDeleteModal(false);
      setDeleteTarget(null);
    }
  };

  const getRankChangeText = (entry: any) => {
    if (
      (entry.type === "promotion" ||
        entry.type === "demotion" ||
        entry.type === "rank_change" ||
        entry.type === "termination") &&
      entry.rankBefore !== null &&
      entry.rankAfter !== null
    ) {
      const beforeText = entry.rankNameBefore
        ? `${entry.rankNameBefore} (${entry.rankBefore})`
        : `Rank ${entry.rankBefore}`;
      const afterText = entry.rankNameAfter
        ? `${entry.rankNameAfter} (${entry.rankAfter})`
        : `Rank ${entry.rankAfter}`;
      return `${beforeText} → ${afterText}`;
    }
    return null;
  };

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-zinc-800 rounded-xl shadow-sm overflow-hidden">
        <div className="p-4 sm:p-6 space-y-4">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-lg bg-primary/10 flex-shrink-0">
              <IconClipboardList className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
            </div>
            <div className="min-w-0 flex-1">
              <h2 className="text-base sm:text-lg font-semibold text-zinc-900 dark:text-white">
                Add New Note
              </h2>
              <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400">
                Log performance, rank changes, warnings, and other important updates.
              </p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="bg-zinc-50 dark:bg-zinc-800/60 p-4 rounded-lg">
              <label
                htmlFor="type"
                className="block text-sm font-medium text-zinc-700 mb-1 dark:text-white"
              >
                Type
              </label>
              <select
                id="type"
                value={type}
                onChange={(e) => setType(e.target.value)}
                className="block w-full rounded-lg border-gray-300 dark:border-zinc-700 bg-white dark:bg-zinc-600 text-zinc-900 dark:text-white shadow-sm focus:border-primary focus:ring-primary sm:text-sm"
              >
                <option value="note">Note</option>
                <option value="warning">Warning</option>
                <option value="promotion">Promotion</option>
                <option value="demotion">Demotion</option>
                {rankGunEnabled && (
                  <option value="rank_change">Rank Change</option>
                )}
                <option value="termination">Termination</option>
              </select>
            </div>

            {rankGunEnabled &&
              (type === "promotion" ||
                type === "demotion" ||
                type === "rank_change" ||
                type === "termination") && (
                <div className="bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-700 p-4 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <IconRocket className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                    <h3 className="text-sm font-medium text-blue-800 dark:text-blue-200">
                      Ranking Integration Active
                    </h3>
                  </div>
                  <p className="text-sm text-blue-700 dark:text-blue-300">
                    {type === "promotion" &&
                      "This will automatically promote the user in the Roblox group."}
                    {type === "demotion" &&
                      "This will automatically demote the user in the Roblox group."}
                    {type === "rank_change" &&
                      "This will automatically change the user's rank to the specified rank."}
                    {type === "termination" &&
                      "This will automatically terminate the user and remove them from the workspace."}
                  </p>
                </div>
              )}

            {type === "rank_change" && (
              <div className="bg-zinc-50 dark:bg-zinc-800/60 p-4 rounded-lg">
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                  Target Rank
                </label>
                {loadingRanks ? (
                  <div className="flex items-center gap-2 p-3 text-sm text-zinc-500 dark:text-zinc-400">
                    <div className="animate-spin w-4 h-4 border-2 border-zinc-300 border-t-primary rounded-full"></div>
                    Loading ranks...
                  </div>
                ) : (
                  <select
                    value={targetRank}
                    onChange={(e) => setTargetRank(e.target.value)}
                    className="block w-full rounded-lg border-gray-300 dark:border-zinc-700 bg-white dark:bg-zinc-600 text-zinc-900 dark:text-white shadow-sm focus:border-primary focus:ring-primary sm:text-sm"
                  >
                    <option value="">Select a rank...</option>
                    {ranks
                      .filter((rank) => rank.rank > 0)
                      .map((rank) => (
                        <option key={rank.id} value={rank.id}>
                          {rank.name}
                        </option>
                      ))}
                  </select>
                )}
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                  Select the rank that the user should be set to.
                </p>
              </div>
            )}

            <div className="bg-zinc-50 dark:bg-zinc-800/60 p-4 rounded-lg">
              <label
                htmlFor="note"
                className="block text-sm font-medium text-zinc-700 dark:text-white mb-1"
              >
                Note
              </label>
              <textarea
                id="note"
                rows={4}
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Enter your note here..."
                className="block w-full rounded-lg border-gray-300 dark:border-zinc-500 bg-white dark:bg-zinc-600 text-zinc-900 dark:text-white shadow-sm focus:border-primary focus:ring-primary sm:text-sm"
              />
            </div>
            <button
              onClick={addNote}
              disabled={isSubmitting}
              className="w-full flex justify-center items-center px-4 py-2 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-primary hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <>
                  <svg
                    className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    ></circle>
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    ></path>
                  </svg>
                  {rankGunEnabled &&
                  (type === "promotion" ||
                    type === "demotion" ||
                    type === "rank_change" ||
                    type === "termination")
                    ? "Executing..."
                    : "Adding..."}
                </>
              ) : rankGunEnabled &&
                (type === "promotion" ||
                  type === "demotion" ||
                  type === "rank_change" ||
                  type === "termination") ? (
                `Add Note & ${
                  type === "rank_change"
                    ? "Change Rank"
                    : type === "promotion"
                    ? "Promote"
                    : type === "demotion"
                    ? "Demote"
                    : "Terminate"
                }`
              ) : (
                "Add Note"
              )}
            </button>
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-zinc-800 rounded-xl shadow-sm overflow-hidden">
        <div className="p-4 sm:p-6 space-y-4">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-lg bg-primary/10 flex-shrink-0">
              <IconClipboardList className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
            </div>
            <div className="min-w-0 flex-1">
              <h2 className="text-base sm:text-lg font-semibold text-zinc-900 dark:text-white">
                History
              </h2>
              <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400">
                A timeline of all notes, rank changes, and terminations for this member.
              </p>
            </div>
          </div>

          {localBook.length === 0 ? (
            <div className="text-center py-12">
              <div className="bg-zinc-50 dark:bg-zinc-800/60 rounded-xl p-8 max-w-md mx-auto">
                <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4">
                  <IconClipboardList className="w-8 h-8 text-primary" />
                </div>
                <h3 className="text-lg font-medium text-zinc-900 dark:text-white mb-1">
                  No Notes
                </h3>
                <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-4">
                  No notes have been added to this user's book yet
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {localBook.map((entry: any) => {
                const rankChangeText = getRankChangeText(entry);
                return (
                  <div
                    key={entry.id}
                    className="flex gap-3 sm:gap-4 p-3 sm:p-4 bg-zinc-50 dark:bg-zinc-800/60 rounded-lg"
                  >
                    <div className="flex-shrink-0">{getIcon(entry.type)}</div>
                    <div className="flex-grow min-w-0">
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 sm:gap-2 mb-1">
                        <div className="flex items-center gap-2 min-w-0 flex-wrap">
                          <span
                            className={`text-xs sm:text-sm font-medium ${
                              entry.redacted
                                ? "line-through opacity-60 text-zinc-500 dark:text-zinc-300"
                                : "text-zinc-900 dark:text-white"
                            }`}
                          >
                            {getEntryTitle(entry.type)}
                          </span>
                          {rankChangeText && (
                            <span className="text-xs dark:bg-blue-100 bg-blue-900 dark:text-blue-800 text-blue-200 px-2 py-0.5 rounded-full whitespace-nowrap">
                              {rankChangeText}
                            </span>
                          )}
                        </div>
                        <time className="text-xs text-zinc-500 dark:text-zinc-400 whitespace-nowrap">
                          {moment(entry.createdAt).format("DD MMM YYYY")}
                        </time>
                      </div>
                      <p
                        className={`text-sm ${
                          entry.redacted
                            ? "line-through opacity-60 text-zinc-500 dark:text-zinc-300 mb-1"
                            : "text-zinc-600 dark:text-zinc-300 mb-1"
                        }`}
                      >
                        {entry.reason}
                      </p>
                      <p className="text-xs text-zinc-500 dark:text-zinc-400">
                        Logged by {entry.admin?.username || "Unknown"}
                      </p>

                      {entry.redacted && (
                        <p className="text-xs text-zinc-400 dark:text-zinc-300 mt-2">
                          Redacted by{" "}
                          {entry.redactedByUser?.username ||
                            (entry.redactedBy
                              ? entry.redactedBy.toString()
                              : "Unknown")}{" "}
                          on{" "}
                          {entry.redactedAt
                            ? moment(entry.redactedAt).format("DD MMM YYYY")
                            : "Unknown"}
                        </p>
                      )}
                    </div>
                    <div className="flex-shrink-0 flex flex-col items-end justify-start gap-2">
                      {canRedact(workspace) && (
                        <button
                          onClick={() => redactEntry(entry)}
                          className="inline-flex items-center px-3 py-1.5 text-xs font-medium rounded-md text-zinc-700 bg-yellow-100 hover:bg-yellow-200 dark:bg-yellow-900/20 dark:text-yellow-200 transition-colors"
                        >
                          <IconAlertTriangle className="w-4 h-4 mr-2" />
                          {entry.redacted ? "Undo" : "Redact"}
                        </button>
                      )}
                      {isOwner(workspace) && (
                        <button
                          onClick={() => deleteEntry(entry)}
                          className="inline-flex items-center px-3 py-1.5 text-xs font-medium rounded-md text-white bg-red-600 hover:bg-red-700 transition-colors"
                        >
                          <IconTrash className="w-4 h-4 mr-2" />
                          Delete
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
      {showRedactModal && redactTarget && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-zinc-800 rounded-lg shadow-xl p-6 w-full max-w-sm text-center">
            <h2 className="text-lg font-semibold text-zinc-900 dark:text-white mb-4">
              {redactTarget.redacted ? "Undo Redaction" : "Redact Entry"}
            </h2>
            <p className="text-sm text-zinc-600 dark:text-zinc-300 mb-6">
              {redactTarget.redacted
                ? "Un-redacting will make the entry visible again."
                : "Mark this entry as redacted? This will cross it out for viewers."}
            </p>
            <div className="flex justify-center gap-4">
              <button
                onClick={() => {
                  setShowRedactModal(false);
                  setRedactTarget(null);
                }}
                className="px-4 py-2 rounded-md bg-zinc-100 dark:bg-zinc-700 hover:bg-zinc-200 dark:hover:bg-zinc-600 text-zinc-800 dark:text-white"
              >
                Cancel
              </button>
              <button
                onClick={confirmRedact}
                className="px-4 py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600"
              >
                {redactTarget.redacted ? "Undo" : "Redact"}
              </button>
            </div>
          </div>
        </div>
      )}

      {showDeleteModal && deleteTarget && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-zinc-800 rounded-lg shadow-xl p-6 w-full max-w-sm text-center">
            <h2 className="text-lg font-semibold text-zinc-900 dark:text-white mb-4">
              Confirm Deletion
            </h2>
            <p className="text-sm text-zinc-600 dark:text-zinc-300 mb-6">
              Are you sure you want to permanently delete this entry? This
              action cannot be undone.
            </p>
            <div className="flex justify-center gap-4">
              <button
                onClick={() => {
                  setShowDeleteModal(false);
                  setDeleteTarget(null);
                }}
                className="px-4 py-2 rounded-md bg-zinc-100 dark:bg-zinc-700 hover:bg-zinc-200 dark:hover:bg-zinc-600 text-zinc-800 dark:text-white"
              >
                Cancel
              </button>
              <button
                onClick={confirmDeleteEntry}
                className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Book;
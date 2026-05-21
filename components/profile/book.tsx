import React, { useState, useEffect } from "react";
import { FC } from "@/types/settingsComponent";
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
  IconPaperclip,
  IconPhoto,
  IconFileDescription,
} from "@tabler/icons-react";
import axios from "axios";
import { useRouter } from "next/router";
import { toast } from "react-hot-toast";
import moment from "moment";

interface Props {
  userBook: any[];
  onRefetch?: () => void;
  logbookPermissions?: {
    view: boolean;
    rank: boolean;
    note: boolean;
    warning: boolean;
    promotion: boolean;
    demotion: boolean;
    termination: boolean;
    redact: boolean;
    delete: boolean;
  };
  isSelf: boolean;
}

const Book: FC<Props> = ({ userBook, onRefetch, logbookPermissions, isSelf }) => {
  const router = useRouter();
  const { id } = router.query;
  const [text, setText] = useState("");
  const [type, setType] = useState("note");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [rankingEnabled, setRankingEnabled] = useState(false);
  const [targetRank, setTargetRank] = useState("");
  const [attachments, setAttachments] = useState<File[]>([]);
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
        setRankingEnabled(
          response.data.rankGunEnabled ? response.data.rankGunEnabled : response.data.openCloudEnabled ? response.data.rankGunEnabled : false
        );
        return response.data.rankGunEnabled ? response.data.rankGunEnabled : response.data.openCloudEnabled ? response.data.rankGunEnabled : false;
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
      const formData = new FormData();
      formData.append("notes", text);
      formData.append("type", type);

      if (type === "rank_change") {
        const selectedRank = ranks.find(
          (rank) => rank.id.toString() === targetRank
        );
        if (selectedRank) {
          formData.append("targetRank", selectedRank.rank.toString());
        } else {
          toast.error("Invalid rank selected.");
          setIsSubmitting(false);
          return;
        }
      }

      attachments.forEach((file) => {
        formData.append("attachments", file);
      });

      const response = await axios.post(
        `/api/workspace/${id}/userbook/${router.query.uid}/new`,
        formData
      );

      setText("");
      setTargetRank("");
      setAttachments([]);

      if (response.data.terminated) {
        toast.success("User terminated successfully!");
      } else {
        const isRankGunAction =
          rankingEnabled &&
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

  const onAttachmentChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(event.target.files || []);
    if (selected.length === 0) return;

    const allowedTypes = new Set([
      "application/pdf",
      "image/jpeg",
      "image/png",
      "image/webp",
      "image/gif",
    ]);

    const validFiles = selected.filter((file) => allowedTypes.has(file.type));
    if (validFiles.length !== selected.length) {
      toast.error("Only PDF and image files are supported.");
    }

    const combined = [...attachments, ...validFiles];
    if (combined.length > 5) {
      toast.error("You can upload up to 5 files per entry.");
      setAttachments(combined.slice(0, 5));
    } else {
      setAttachments(combined);
    }

    event.target.value = "";
  };

  const removeAttachment = (name: string, size: number) => {
    setAttachments((prev) =>
      prev.filter((file) => !(file.name === name && file.size === size))
    );
  };

  const parseEntryReason = (rawReason: string): {
    text: string;
    attachments: Array<{ name: string; mime: string; size: number; dataUrl: string }>;
  } => {
    try {
      const parsed = JSON.parse(rawReason);
      if (parsed && typeof parsed === "object") {
        const textValue =
          typeof parsed.text === "string" ? parsed.text : rawReason;
        const parsedAttachments = Array.isArray(parsed.attachments)
          ? parsed.attachments.filter(
              (a: any) =>
                a &&
                typeof a.name === "string" &&
                typeof a.mime === "string" &&
                typeof a.dataUrl === "string"
            )
          : [];
        return { text: textValue, attachments: parsedAttachments };
      }
    } catch (_) {}
    return { text: rawReason, attachments: [] };
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

  const entryAccent: Record<string, string> = {
    note: "border-l-zinc-400 dark:border-l-zinc-500",
    warning: "border-l-amber-400 dark:border-l-amber-500",
    promotion: "border-l-primary",
    demotion: "border-l-red-400 dark:border-l-red-500",
    rank_change: "border-l-blue-400 dark:border-l-blue-500",
    termination: "border-l-red-600 dark:border-l-red-600",
  };

  const entryBadge: Record<string, string> = {
    note: "bg-zinc-100 text-zinc-600 dark:bg-zinc-700 dark:text-zinc-300",
    warning: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
    promotion: "bg-primary/10 text-primary",
    demotion: "bg-red-100 text-red-600 dark:bg-red-900/40 dark:text-red-300",
    rank_change: "bg-blue-100 text-blue-600 dark:bg-blue-900/40 dark:text-blue-300",
    termination: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300",
  };

  return (
    <div className="space-y-5">
      <div className="rounded-xl border border-zinc-200 dark:border-zinc-700/60 bg-white dark:bg-zinc-800/80 overflow-hidden">
        <div className="flex items-center gap-3 px-5 py-4 border-b border-zinc-100 dark:border-zinc-700/60">
          <div className="p-1.5 bg-primary/10 rounded-md">
            <IconPencil className="w-4 h-4 text-primary" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-zinc-900 dark:text-white">Add Entry</h2>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Log performance, rank changes, warnings, and updates.
            </p>
          </div>
        </div>

        <div className="p-5 space-y-3">
          <div>
            <label htmlFor="type" className="block text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wide mb-1.5">
              Entry Type
            </label>
            <select
              id="type"
              value={type}
              disabled={isSelf}
              onChange={(e) => setType(e.target.value)}
              className="block w-full rounded-lg border border-zinc-200 dark:border-zinc-700 disabled:bg-zinc-100 disabled:text-zinc-500 dark:disabled:bg-zinc-700/50 dark:disabled:text-zinc-400 bg-white dark:bg-zinc-700/50 text-zinc-900 dark:text-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition"
            >
              {isSelf && <option value="" selected>You can&apos;t add entries to yourself.</option>}
              {logbookPermissions?.note && <option value="note">Note</option>}
              {logbookPermissions?.warning && <option value="warning">Warning</option>}
              {logbookPermissions?.promotion && <option value="promotion">Promotion</option>}
              {logbookPermissions?.demotion && <option value="demotion">Demotion</option>}
              {rankingEnabled && logbookPermissions?.rank && (
                <option value="rank_change">Rank Change</option>
              )}
              {logbookPermissions?.termination && <option value="termination">Termination</option>}
            </select>
          </div>

          {rankingEnabled &&
            logbookPermissions?.rank &&
            (type === "promotion" || type === "demotion" || type === "rank_change" || type === "termination") && (
              <div className="flex items-start gap-2.5 p-3 rounded-lg border border-blue-200 dark:border-blue-800/60 bg-blue-50 dark:bg-blue-900/20">
                <IconRocket className="w-4 h-4 text-blue-600 dark:text-blue-400 mt-0.5 shrink-0" />
                <div>
                  <p className="text-xs font-semibold text-blue-800 dark:text-blue-200 mb-0.5">Ranking Integration Active</p>
                  <p className="text-xs text-blue-700 dark:text-blue-300">
                    {type === "promotion" && "This will automatically promote the user in the Roblox group."}
                    {type === "demotion" && "This will automatically demote the user in the Roblox group."}
                    {type === "rank_change" && "This will automatically change the user's rank to the specified rank."}
                    {type === "termination" && "This will automatically terminate the user and remove them from the workspace."}
                  </p>
                </div>
              </div>
            )}

          {rankingEnabled &&
            !logbookPermissions?.rank &&
            (type === "promotion" || type === "demotion" || type === "rank_change" || type === "termination") && (
              <div className="flex items-start gap-2.5 p-3 rounded-lg border border-amber-200 dark:border-amber-800/60 bg-amber-50 dark:bg-amber-900/20">
                <IconAlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
                <div>
                  <p className="text-xs font-semibold text-amber-800 dark:text-amber-200 mb-0.5">Entry Only — No Rank Action</p>
                  <p className="text-xs text-amber-700 dark:text-amber-300">
                    You need the "Logbook — Use Ranking" permission to execute automatic rank changes.
                  </p>
                </div>
              </div>
            )}

          {type === "rank_change" && (
            <div>
              <label className="block text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wide mb-1.5">
                Target Rank
              </label>
              {loadingRanks ? (
                <div className="flex items-center gap-2 py-2 text-sm text-zinc-400 dark:text-zinc-500">
                  <div className="animate-spin w-4 h-4 border-2 border-zinc-200 dark:border-zinc-700 border-t-primary rounded-full" />
                  Loading ranks...
                </div>
              ) : (
                <select
                  value={targetRank}
                  onChange={(e) => setTargetRank(e.target.value)}
                  className="block w-full rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-700/50 text-zinc-900 dark:text-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition"
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
            </div>
          )}

          <div>
            <label htmlFor="note" className="block text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wide mb-1.5">
              Note
            </label>
            <textarea
              id="note"
              rows={4}
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Enter your note here..."
              className="block w-full rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-700/50 text-zinc-900 dark:text-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition placeholder:text-zinc-400 dark:placeholder:text-zinc-500 resize-none"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wide mb-1.5">
              Attachments
            </label>
            <div className="rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50/60 dark:bg-zinc-800/40 p-3">
              <label className="inline-flex cursor-pointer items-center gap-2 rounded-md border border-zinc-200 dark:border-zinc-600 bg-white dark:bg-zinc-700/60 px-3 py-1.5 text-sm text-zinc-700 dark:text-zinc-200 hover:bg-zinc-50 dark:hover:bg-zinc-700 transition-colors">
                <IconPaperclip className="w-4 h-4" />
                Add files
                <input
                  type="file"
                  accept=".pdf,image/*"
                  multiple
                  disabled={isSelf}
                  className="hidden"
                  onChange={onAttachmentChange}
                />
              </label>
              <p className="mt-1.5 text-xs text-zinc-500 dark:text-zinc-400">
                Supports PDF, JPG, PNG, WEBP, and GIF (max 5 files).
              </p>

              {attachments.length > 0 && (
                <div className="mt-3 space-y-2">
                  {attachments.map((file) => {
                    const isImage = file.type.startsWith("image/");
                    return (
                      <div
                        key={`${file.name}-${file.size}`}
                        className="flex items-center justify-between gap-2 rounded-md border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-2.5 py-2"
                      >
                        <div className="min-w-0 flex items-center gap-2">
                          {isImage ? (
                            <IconPhoto className="w-4 h-4 text-zinc-500" />
                          ) : (
                            <IconFileDescription className="w-4 h-4 text-zinc-500" />
                          )}
                          <span className="truncate text-xs text-zinc-700 dark:text-zinc-300">
                            {file.name}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => removeAttachment(file.name, file.size)}
                          className="text-xs rounded px-2 py-1 text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20"
                        >
                          Remove
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          <button
            onClick={addNote}
            disabled={isSubmitting || isSelf}
            className="w-full flex justify-center items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium text-white bg-primary hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? (
              <>
                <div className="animate-spin w-4 h-4 border-2 border-white/30 border-t-white rounded-full" />
                {rankingEnabled && (type === "promotion" || type === "demotion" || type === "rank_change" || type === "termination")
                  ? "Executing..."
                  : "Adding..."}
              </>
            ) : rankingEnabled && logbookPermissions?.rank && (type === "promotion" || type === "demotion" || type === "rank_change" || type === "termination") ? (
              `Add Note & ${type === "rank_change" ? "Change Rank" : type === "promotion" ? "Promote" : type === "demotion" ? "Demote" : "Terminate"}`
            ) : (
              "Add Note"
            )}
          </button>
        </div>
      </div>

      {logbookPermissions?.view && (
        <div className="rounded-xl border border-zinc-200 dark:border-zinc-700/60 bg-white dark:bg-zinc-800/80 overflow-hidden">
          <div className="flex items-center gap-3 px-5 py-4 border-b border-zinc-100 dark:border-zinc-700/60">
            <div className="p-1.5 bg-primary/10 rounded-md">
              <IconClipboardList className="w-4 h-4 text-primary" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-zinc-900 dark:text-white">History</h2>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Notes, rank changes, and terminations for this member.
              </p>
            </div>
          </div>

          <div className="p-5">
            {localBook.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 gap-3">
                <div className="w-12 h-12 bg-zinc-100 dark:bg-zinc-700/50 rounded-full flex items-center justify-center">
                  <IconClipboardList className="w-6 h-6 text-zinc-400 dark:text-zinc-500" />
                </div>
                <div className="text-center">
                  <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300">No entries yet</p>
                  <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-0.5">Logbook entries will appear here</p>
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                {localBook.map((entry: any) => {
                  const rankChangeText = getRankChangeText(entry);
                  const accent = entryAccent[entry.type] || entryAccent.note;
                  const badge = entryBadge[entry.type] || entryBadge.note;
                  const parsedReason = parseEntryReason(entry.reason);
                  return (
                    <div
                      key={entry.id}
                      className={`flex gap-3 p-3.5 rounded-xl border border-zinc-100 dark:border-zinc-700/60 bg-zinc-50 dark:bg-zinc-700/30 border-l-2 ${accent}`}
                    >
                      <div className="flex-shrink-0 mt-0.5">{getIcon(entry.type)}</div>
                      <div className="flex-grow min-w-0">
                        <div className="flex items-start justify-between gap-2 mb-1">
                          <div className="flex items-center gap-2 flex-wrap min-w-0">
                            <span className={`text-xs font-semibold px-1.5 py-0.5 rounded ${badge}`}>
                              {getEntryTitle(entry.type)}
                            </span>
                            {rankChangeText && (
                              <span className="text-xs bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300 px-2 py-0.5 rounded font-medium whitespace-nowrap">
                                {rankChangeText}
                              </span>
                            )}
                            {entry.redacted && (
                              <span className="text-xs bg-zinc-100 text-zinc-500 dark:bg-zinc-700 dark:text-zinc-400 px-1.5 py-0.5 rounded">
                                Redacted
                              </span>
                            )}
                          </div>
                          <time className="text-xs text-zinc-400 dark:text-zinc-500 whitespace-nowrap shrink-0">
                            {moment(entry.createdAt).format("D MMM YYYY")}
                          </time>
                        </div>
                        <p className={`text-sm leading-relaxed ${entry.redacted ? "line-through opacity-50 text-zinc-500 dark:text-zinc-400" : "text-zinc-700 dark:text-zinc-300"}`}>
                          {parsedReason.text}
                        </p>
                        {parsedReason.attachments.length > 0 && (
                          <div className="mt-2 flex flex-wrap gap-2">
                            {parsedReason.attachments.map((attachment) => {
                              const isImage = attachment.mime.startsWith("image/");
                              return (
                                <a
                                  key={`${entry.id}-${attachment.name}-${attachment.size}`}
                                  href={attachment.dataUrl}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="inline-flex items-center gap-1.5 rounded-md border border-zinc-200 dark:border-zinc-600 bg-white dark:bg-zinc-800 px-2 py-1 text-xs text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-700"
                                >
                                  {isImage ? (
                                    <IconPhoto className="w-3.5 h-3.5" />
                                  ) : (
                                    <IconFileDescription className="w-3.5 h-3.5" />
                                  )}
                                  <span className="max-w-[12rem] truncate">{attachment.name}</span>
                                </a>
                              );
                            })}
                          </div>
                        )}
                        <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-1">
                          Logged by {entry.admin?.username || "Unknown"}
                          {entry.redacted && entry.redactedByUser?.username && (
                            <> · Redacted by {entry.redactedByUser.username} on {entry.redactedAt ? moment(entry.redactedAt).format("D MMM YYYY") : "Unknown"}</>
                          )}
                        </p>
                      </div>
                      {(logbookPermissions?.redact || logbookPermissions?.delete) && (
                        <div className="flex-shrink-0 flex flex-col items-end gap-1.5">
                          {logbookPermissions?.redact && (
                            <button
                              type="button"
                              onClick={() => redactEntry(entry)}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium rounded-lg text-amber-700 bg-amber-50 hover:bg-amber-100 dark:bg-amber-900/20 dark:text-amber-300 dark:hover:bg-amber-900/40 transition-colors"
                            >
                              <IconAlertTriangle className="w-3.5 h-3.5" />
                              {entry.redacted ? "Undo" : "Redact"}
                            </button>
                          )}
                          {logbookPermissions?.delete && (
                            <button
                              type="button"
                              onClick={() => deleteEntry(entry)}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium rounded-lg border border-red-200 text-red-700 bg-red-50/80 hover:bg-red-100 dark:border-red-500/35 dark:text-red-400 dark:bg-red-500/10 dark:hover:bg-red-500/15 transition-colors"
                            >
                              <IconTrash className="w-3.5 h-3.5" />
                              Delete
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {showRedactModal && redactTarget && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-zinc-800 rounded-xl border border-zinc-200 dark:border-zinc-700 shadow-xl p-6 w-full max-w-sm text-center">
            <div className="w-10 h-10 bg-amber-100 dark:bg-amber-900/30 rounded-full flex items-center justify-center mx-auto mb-3">
              <IconAlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400" />
            </div>
            <h2 className="text-base font-semibold text-zinc-900 dark:text-white mb-1">
              {redactTarget.redacted ? "Undo Redaction" : "Redact Entry"}
            </h2>
            <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-5">
              {redactTarget.redacted
                ? "Un-redacting will make this entry visible again."
                : "This will cross out the entry for all viewers."}
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => { setShowRedactModal(false); setRedactTarget(null); }}
                className="flex-1 px-4 py-2 rounded-lg text-sm font-medium bg-zinc-100 dark:bg-zinc-700 hover:bg-zinc-200 dark:hover:bg-zinc-600 text-zinc-800 dark:text-white transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={confirmRedact}
                className="flex-1 px-4 py-2 text-sm font-medium bg-amber-500 text-white rounded-lg hover:bg-amber-600 transition-colors"
              >
                {redactTarget.redacted ? "Undo" : "Redact"}
              </button>
            </div>
          </div>
        </div>
      )}

      {showDeleteModal && deleteTarget && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-zinc-800 rounded-xl border border-zinc-200 dark:border-zinc-700 shadow-xl p-6 w-full max-w-sm text-center">
            <div className="w-10 h-10 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-3">
              <IconTrash className="w-5 h-5 text-red-500 dark:text-red-400" />
            </div>
            <h2 className="text-base font-semibold text-zinc-900 dark:text-white mb-1">Delete Entry</h2>
            <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-5">
              This action is permanent and cannot be undone.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => { setShowDeleteModal(false); setDeleteTarget(null); }}
                className="flex-1 px-4 py-2 rounded-lg text-sm font-medium bg-zinc-100 dark:bg-zinc-700 hover:bg-zinc-200 dark:hover:bg-zinc-600 text-zinc-800 dark:text-white transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={confirmDeleteEntry}
                className="flex-1 px-4 py-2 text-sm font-medium bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
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
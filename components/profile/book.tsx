import React, { useState, useEffect } from "react";
import { FC } from "@/types/settingsComponent";
import {
  IconPencil,
  IconX,
  IconAlertTriangle,
  IconStar,
  IconClipboardList,
  IconRocket,
  IconTrash,
  IconPaperclip,
  IconPhoto,
  IconFileDescription,
  IconArrowRight,
} from "@tabler/icons-react";
import axios from "axios";
import { useRouter } from "next/router";
import { toast } from "react-hot-toast";
import moment from "moment";
import {
  ProfileEmptyState,
  profileInputClass,
  profilePrimaryButtonClass,
  profileSecondaryButtonClass,
} from "@/components/profile/shell";

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

  const isRankAction = type === "promotion" || type === "demotion" || type === "rank_change" || type === "termination";

  const submitLabel = isSubmitting
    ? (rankingEnabled && isRankAction ? "Executing…" : "Adding…")
    : rankingEnabled && logbookPermissions?.rank && isRankAction
      ? `Add note & ${type === "rank_change" ? "change rank" : type}`
      : "Add note";

  return (
    <div className="space-y-6">

      <div className="space-y-4">
        <h3 className="text-sm font-semibold text-zinc-900 dark:text-white">Add entry</h3>

        {!isSelf ? (
          <div>
            <p className="mb-2 text-[11px] font-medium uppercase tracking-wide text-zinc-400 dark:text-zinc-500">
              Entry type
            </p>
            <div className="flex flex-wrap gap-1.5">
              {logbookPermissions?.note && (
                <button onClick={() => setType("note")} className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors ${type === "note" ? "bg-primary text-white" : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-700"}`}>
                  <IconClipboardList className="h-3.5 w-3.5" /> Note
                </button>
              )}
              {logbookPermissions?.warning && (
                <button onClick={() => setType("warning")} className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors ${type === "warning" ? "bg-amber-500 text-white" : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-700"}`}>
                  <IconAlertTriangle className="h-3.5 w-3.5" /> Warning
                </button>
              )}
              {logbookPermissions?.promotion && (
                <button onClick={() => setType("promotion")} className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors ${type === "promotion" ? "bg-primary text-white" : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-700"}`}>
                  <IconStar className="h-3.5 w-3.5" /> Promotion
                </button>
              )}
              {logbookPermissions?.demotion && (
                <button onClick={() => setType("demotion")} className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors ${type === "demotion" ? "bg-red-500 text-white" : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-700"}`}>
                  <IconX className="h-3.5 w-3.5" /> Demotion
                </button>
              )}
              {rankingEnabled && logbookPermissions?.rank && (
                <button onClick={() => setType("rank_change")} className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors ${type === "rank_change" ? "bg-blue-500 text-white" : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-700"}`}>
                  <IconRocket className="h-3.5 w-3.5" /> Rank Change
                </button>
              )}
              {logbookPermissions?.termination && (
                <button onClick={() => setType("termination")} className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors ${type === "termination" ? "bg-red-600 text-white" : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-700"}`}>
                  <IconX className="h-3.5 w-3.5" /> Termination
                </button>
              )}
            </div>
          </div>
        ) : (
          <div className="rounded-xl bg-zinc-50 px-4 py-3 dark:bg-zinc-800/50">
            <p className="text-sm text-zinc-500 dark:text-zinc-400">You can&apos;t add entries to yourself.</p>
          </div>
        )}

        {!isSelf && rankingEnabled && isRankAction && (
          <div className={`flex items-start gap-2.5 rounded-xl px-4 py-3 ${logbookPermissions?.rank ? "bg-blue-500/10" : "bg-amber-500/10"}`}>
            {logbookPermissions?.rank ? (
              <IconRocket className="mt-0.5 h-4 w-4 shrink-0 text-blue-500" />
            ) : (
              <IconAlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
            )}
            <div>
              <p className={`text-xs font-semibold mb-0.5 ${logbookPermissions?.rank ? "text-blue-600 dark:text-blue-400" : "text-amber-600 dark:text-amber-400"}`}>
                {logbookPermissions?.rank ? "Ranking integration active" : "Entry only — no rank action"}
              </p>
              <p className={`text-xs ${logbookPermissions?.rank ? "text-blue-600/80 dark:text-blue-400/80" : "text-amber-600/80 dark:text-amber-400/80"}`}>
                {logbookPermissions?.rank
                  ? type === "promotion" ? "This will automatically promote the user in the Roblox group."
                    : type === "demotion" ? "This will automatically demote the user in the Roblox group."
                    : type === "rank_change" ? "This will change the user's rank to the specified rank."
                    : "This will terminate the user and remove them from the workspace."
                  : "You need the \"Logbook — Use Ranking\" permission to execute automatic rank changes."}
              </p>
            </div>
          </div>
        )}

        {!isSelf && type === "rank_change" && (
          <div>
            <label className="mb-1.5 block text-[11px] font-medium uppercase tracking-wide text-zinc-400 dark:text-zinc-500">
              Target rank
            </label>
            {loadingRanks ? (
              <div className="flex items-center gap-2 py-2 text-sm text-zinc-400">
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-zinc-200 border-t-primary dark:border-zinc-700" />
                Loading ranks…
              </div>
            ) : (
              <select value={targetRank} onChange={(e) => setTargetRank(e.target.value)} className={profileInputClass}>
                <option value="">Select a rank…</option>
                {ranks.filter((r) => r.rank > 0).map((r) => (
                  <option key={r.id} value={r.id}>{r.name}</option>
                ))}
              </select>
            )}
          </div>
        )}

        {!isSelf && (
          <div>
            <label htmlFor="note" className="mb-1.5 block text-[11px] font-medium uppercase tracking-wide text-zinc-400 dark:text-zinc-500">
              Note
            </label>
            <textarea
              id="note"
              rows={4}
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Enter your note here…"
              className={`${profileInputClass} resize-none`}
            />
          </div>
        )}

        {!isSelf && (
          <div>
            <label className="mb-1.5 block text-[11px] font-medium uppercase tracking-wide text-zinc-400 dark:text-zinc-500">
              Attachments
            </label>
            <div className="rounded-xl bg-zinc-50 p-3 dark:bg-zinc-800/50">
              <label className={`inline-flex cursor-pointer items-center gap-2 ${profileSecondaryButtonClass}`}>
                <IconPaperclip className="h-3.5 w-3.5" />
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
              <p className="mt-1.5 text-xs text-zinc-400 dark:text-zinc-500">
                PDF, JPG, PNG, WEBP, GIF — max 5 files.
              </p>
              {attachments.length > 0 && (
                <div className="mt-3 divide-y divide-zinc-200 dark:divide-zinc-700/60">
                  {attachments.map((file) => {
                    const isImage = file.type.startsWith("image/");
                    return (
                      <div key={`${file.name}-${file.size}`} className="flex items-center justify-between gap-2 py-2">
                        <div className="flex min-w-0 items-center gap-2">
                          {isImage
                            ? <IconPhoto className="h-4 w-4 shrink-0 text-zinc-400" />
                            : <IconFileDescription className="h-4 w-4 shrink-0 text-zinc-400" />}
                          <span className="truncate text-xs text-zinc-700 dark:text-zinc-300">{file.name}</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => removeAttachment(file.name, file.size)}
                          className="shrink-0 rounded-md px-2 py-1 text-xs font-medium text-red-600 hover:bg-red-500/10 dark:text-red-400 transition-colors"
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
        )}

        {!isSelf && (
          <button
            onClick={addNote}
            disabled={isSubmitting}
            className={`w-full justify-center ${profilePrimaryButtonClass} disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            {isSubmitting && (
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
            )}
            {submitLabel}
          </button>
        )}
      </div>

      {logbookPermissions?.view && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold text-zinc-900 dark:text-white">History</h3>
            {localBook.length > 0 && (
              <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs font-medium text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400">
                {localBook.length}
              </span>
            )}
          </div>

          {localBook.length === 0 ? (
            <ProfileEmptyState
              icon={IconClipboardList}
              title="No entries yet"
              description="Logbook entries will appear here"
            />
          ) : (
            <div className="divide-y divide-zinc-100 dark:divide-zinc-800/60">
              {localBook.map((entry: any) => {
                const rankChangeText = getRankChangeText(entry);
                const badge = entryBadge[entry.type] || entryBadge.note;
                const parsedReason = parseEntryReason(entry.reason);
                return (
                  <div key={entry.id} className="flex items-start gap-3 py-3.5">
                    <div className="mt-0.5 shrink-0">{getIcon(entry.type)}</div>
                    <div className="min-w-0 flex-1">
                      <div className="mb-0.5 flex flex-wrap items-center gap-2">
                        <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${badge}`}>
                          {getEntryTitle(entry.type)}
                        </span>
                        {rankChangeText && (
                          <span className="inline-flex items-center gap-1 text-xs text-zinc-500 dark:text-zinc-400">
                            <IconArrowRight className="h-3 w-3" />
                            {rankChangeText}
                          </span>
                        )}
                        {entry.redacted && (
                          <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400">
                            Redacted
                          </span>
                        )}
                      </div>
                      <p className={`text-sm leading-relaxed ${entry.redacted ? "line-through opacity-50 text-zinc-500 dark:text-zinc-400" : "text-zinc-900 dark:text-white"}`}>
                        {parsedReason.text}
                      </p>
                      {parsedReason.attachments.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-2">
                          {parsedReason.attachments.map((att) => {
                            const isImage = att.mime.startsWith("image/");
                            return (
                              <a
                                key={`${entry.id}-${att.name}-${att.size}`}
                                href={att.dataUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-1.5 rounded-lg bg-zinc-100 px-2 py-1 text-xs text-zinc-700 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700 transition-colors"
                              >
                                {isImage ? <IconPhoto className="h-3.5 w-3.5" /> : <IconFileDescription className="h-3.5 w-3.5" />}
                                <span className="max-w-[12rem] truncate">{att.name}</span>
                              </a>
                            );
                          })}
                        </div>
                      )}
                      <p className="mt-1 text-xs text-zinc-400 dark:text-zinc-500">
                        {moment(entry.createdAt).format("D MMM YYYY")} · Logged by {entry.admin?.username || "Unknown"}
                        {entry.redacted && entry.redactedByUser?.username && (
                          <> · Redacted by {entry.redactedByUser.username}{entry.redactedAt ? ` on ${moment(entry.redactedAt).format("D MMM YYYY")}` : ""}</>
                        )}
                      </p>
                    </div>
                    {(logbookPermissions?.redact || logbookPermissions?.delete) && (
                      <div className="flex shrink-0 flex-col items-end gap-1">
                        {logbookPermissions?.redact && (
                          <button
                            type="button"
                            onClick={() => redactEntry(entry)}
                            className="rounded-lg bg-amber-500/10 px-2.5 py-1.5 text-xs font-medium text-amber-600 transition hover:bg-amber-500/20 dark:text-amber-400"
                          >
                            {entry.redacted ? "Undo" : "Redact"}
                          </button>
                        )}
                        {logbookPermissions?.delete && (
                          <button
                            type="button"
                            onClick={() => deleteEntry(entry)}
                            className="rounded-lg bg-red-500/10 px-2.5 py-1.5 text-xs font-medium text-red-600 transition hover:bg-red-500/20 dark:text-red-400"
                          >
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
      )}

      {showRedactModal && redactTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 text-center shadow-2xl dark:bg-zinc-900">
            <div className="mx-auto mb-4 flex h-11 w-11 items-center justify-center rounded-2xl bg-amber-500/10">
              <IconAlertTriangle className="h-5 w-5 text-amber-500" />
            </div>
            <h2 className="mb-1 text-base font-semibold text-zinc-900 dark:text-white">
              {redactTarget.redacted ? "Undo redaction" : "Redact entry"}
            </h2>
            <p className="mb-5 text-sm text-zinc-500 dark:text-zinc-400">
              {redactTarget.redacted
                ? "This will make the entry visible again."
                : "This will cross out the entry for all viewers."}
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => { setShowRedactModal(false); setRedactTarget(null); }}
                className={`flex-1 justify-center ${profileSecondaryButtonClass}`}
              >
                Cancel
              </button>
              <button
                onClick={confirmRedact}
                className="flex-1 rounded-xl bg-amber-500 py-2 text-sm font-medium text-white transition hover:bg-amber-600"
              >
                {redactTarget.redacted ? "Undo" : "Redact"}
              </button>
            </div>
          </div>
        </div>
      )}

      {showDeleteModal && deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 text-center shadow-2xl dark:bg-zinc-900">
            <div className="mx-auto mb-4 flex h-11 w-11 items-center justify-center rounded-2xl bg-red-500/10">
              <IconTrash className="h-5 w-5 text-red-500" />
            </div>
            <h2 className="mb-1 text-base font-semibold text-zinc-900 dark:text-white">Delete entry</h2>
            <p className="mb-5 text-sm text-zinc-500 dark:text-zinc-400">
              This action is permanent and cannot be undone.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => { setShowDeleteModal(false); setDeleteTarget(null); }}
                className={`flex-1 justify-center ${profileSecondaryButtonClass}`}
              >
                Cancel
              </button>
              <button
                onClick={confirmDeleteEntry}
                className="flex-1 rounded-xl bg-red-500 py-2 text-sm font-medium text-white transition hover:bg-red-600"
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
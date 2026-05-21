import { Fragment, useState } from "react";
import { Dialog, Transition } from "@headlessui/react";
import clsx from "clsx";
import {
  IconAlertTriangle,
  IconExternalLink,
  IconFileText,
  IconLink,
  IconTrash,
  IconArrowLeft,
  IconPhoto,
  IconGif,
  IconVideo,
  IconUpload,
  IconFolder,
} from "@tabler/icons-react";
import { docsPanelShadow } from "./shell";
import {
  FolderIconBadge,
  FolderIconPicker,
  FOLDER_ICONS,
  normalizeFolderIcon,
  type FolderIconId,
} from "@/components/docs/folderIcons";

function DocsDialogShell({
  open,
  onClose,
  children,
}: {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <Transition appear show={open} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onClose}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-200"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-150"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black/30 backdrop-blur-sm" />
        </Transition.Child>
        <div className="fixed inset-0 overflow-y-auto p-4">
          <div className="flex min-h-full items-center justify-center">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-200"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-150"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel
                className={clsx(
                  "w-full max-w-md overflow-hidden rounded-2xl bg-white dark:bg-zinc-900",
                  docsPanelShadow
                )}
              >
                {children}
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
}

export function ExternalLinkModal({
  open,
  onClose,
  onProceed,
}: {
  open: boolean;
  onClose: () => void;
  onProceed: () => void;
}) {
  return (
    <DocsDialogShell open={open} onClose={onClose}>
      <div className="p-5 sm:p-6">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-100 dark:bg-amber-500/15">
            <IconAlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400" stroke={1.75} />
          </div>
          <div>
            <Dialog.Title className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
              External link
            </Dialog.Title>
            <p className="mt-1 text-sm leading-relaxed text-zinc-500 dark:text-zinc-400">
              This link was added by a workspace member and is not verified by Planetary. Proceed at
              your own risk.
            </p>
          </div>
        </div>
        <div className="mt-5 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={onProceed}
            className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary/90"
          >
            <IconExternalLink className="h-4 w-4" />
            Continue
          </button>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl px-4 py-2 text-sm font-medium text-zinc-600 transition-colors hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
          >
            Cancel
          </button>
        </div>
      </div>
    </DocsDialogShell>
  );
}

export function DocTypePickerModal({
  open,
  onClose,
  onChoose,
  backHref,
}: {
  open: boolean;
  onClose: () => void;
  onChoose: (mode: "internal" | "external") => void;
  backHref?: string;
}) {
  return (
    <DocsDialogShell open={open} onClose={onClose}>
      <div className="p-5 sm:p-6">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <Dialog.Title className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
              Create a document
            </Dialog.Title>
            <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
              How would you like to create this document?
            </p>
          </div>
          {backHref ? (
            <a
              href={backHref}
              className="rounded-lg p-1.5 text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-600 dark:hover:bg-zinc-800"
              aria-label="Back to documents"
            >
              <IconArrowLeft className="h-5 w-5" />
            </a>
          ) : null}
        </div>
        <div className="space-y-2">
          <button
            type="button"
            onClick={() => onChoose("internal")}
            className="flex w-full items-center gap-3 rounded-xl bg-zinc-50 p-3.5 text-left transition-colors hover:bg-zinc-100 dark:bg-zinc-800/50 dark:hover:bg-zinc-800"
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10">
              <IconFileText className="h-5 w-5 text-primary" stroke={1.75} />
            </div>
            <div>
              <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">Text editor</p>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Write content with markdown
              </p>
            </div>
          </button>
          <button
            type="button"
            onClick={() => onChoose("external")}
            className="flex w-full items-center gap-3 rounded-xl bg-zinc-50 p-3.5 text-left transition-colors hover:bg-zinc-100 dark:bg-zinc-800/50 dark:hover:bg-zinc-800"
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10">
              <IconLink className="h-5 w-5 text-primary" stroke={1.75} />
            </div>
            <div>
              <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">Off-site link</p>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Link to an external resource
              </p>
            </div>
          </button>
        </div>
      </div>
    </DocsDialogShell>
  );
}

export function LinkInsertModal({
  open,
  onClose,
  linkText,
  linkUrl,
  onLinkTextChange,
  onLinkUrlChange,
  onConfirm,
}: {
  open: boolean;
  onClose: () => void;
  linkText: string;
  linkUrl: string;
  onLinkTextChange: (v: string) => void;
  onLinkUrlChange: (v: string) => void;
  onConfirm: () => void;
}) {
  return (
    <DocsDialogShell open={open} onClose={onClose}>
      <div className="p-5 sm:p-6">
        <Dialog.Title className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
          Insert link
        </Dialog.Title>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
          Add a hyperlink to your document.
        </p>
        <div className="mt-4 space-y-3">
          <div>
            <label className="mb-1 block text-[11px] font-medium text-zinc-400">Link text</label>
            <input
              type="text"
              value={linkText}
              onChange={(e) => onLinkTextChange(e.target.value)}
              placeholder="Link text"
              className="w-full rounded-xl border-0 bg-zinc-100 px-3 py-2 text-sm text-zinc-900 focus:outline-none focus:ring-2 focus:ring-primary/40 dark:bg-zinc-800 dark:text-white"
              autoFocus
            />
          </div>
          <div>
            <label className="mb-1 block text-[11px] font-medium text-zinc-400">URL</label>
            <input
              type="url"
              value={linkUrl}
              onChange={(e) => onLinkUrlChange(e.target.value)}
              placeholder="https://example.com"
              className="w-full rounded-xl border-0 bg-zinc-100 px-3 py-2 text-sm text-zinc-900 focus:outline-none focus:ring-2 focus:ring-primary/40 dark:bg-zinc-800 dark:text-white"
              onKeyDown={(e) => {
                if (e.key === "Enter" && linkUrl.trim()) onConfirm();
              }}
            />
          </div>
        </div>
        <div className="mt-5 flex flex-wrap gap-2">
          <button
            type="button"
            disabled={!linkUrl.trim()}
            onClick={onConfirm}
            className="rounded-xl bg-primary px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary/90 disabled:opacity-50"
          >
            Insert link
          </button>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl px-4 py-2 text-sm font-medium text-zinc-600 transition-colors hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
          >
            Cancel
          </button>
        </div>
      </div>
    </DocsDialogShell>
  );
}

export function MediaInsertModal({
  open,
  onClose,
  kind,
  mediaUrl,
  onMediaUrlChange,
  onConfirm,
  onFileSelect,
  uploading,
  error,
}: {
  open: boolean;
  onClose: () => void;
  kind: "image" | "gif" | "video";
  mediaUrl: string;
  onMediaUrlChange: (v: string) => void;
  onConfirm: () => void;
  onFileSelect: (file: File) => void;
  uploading?: boolean;
  error?: string | null;
}) {
  const labels = {
    image: {
      title: "Insert image",
      description: "Add an image from a URL or upload a file.",
      placeholder: "https://example.com/image.png",
      accept: "image/jpeg,image/png,image/webp",
      uploadLabel: "Upload image",
    },
    gif: {
      title: "Insert GIF",
      description: "Add a GIF from a URL or upload a file.",
      placeholder: "https://example.com/animation.gif",
      accept: "image/gif",
      uploadLabel: "Upload GIF",
    },
    video: {
      title: "Insert video",
      description: "Paste a video or YouTube/Vimeo link, or upload a file.",
      placeholder: "https://youtube.com/watch?v=…",
      accept: "video/mp4,video/webm,video/quicktime",
      uploadLabel: "Upload video",
    },
  }[kind];

  const Icon = kind === "video" ? IconVideo : kind === "gif" ? IconGif : IconPhoto;

  return (
    <DocsDialogShell open={open} onClose={onClose}>
      <div className="p-5 sm:p-6">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10">
            <Icon className="h-5 w-5 text-primary" stroke={1.75} />
          </div>
          <div>
            <Dialog.Title className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
              {labels.title}
            </Dialog.Title>
            <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">{labels.description}</p>
          </div>
        </div>

        <div className="mt-4 space-y-3">
          <div>
            <label className="mb-1 block text-[11px] font-medium text-zinc-400">URL</label>
            <input
              type="url"
              value={mediaUrl}
              onChange={(e) => onMediaUrlChange(e.target.value)}
              placeholder={labels.placeholder}
              className="w-full rounded-xl border-0 bg-zinc-100 px-3 py-2 text-sm text-zinc-900 focus:outline-none focus:ring-2 focus:ring-primary/40 dark:bg-zinc-800 dark:text-white"
              autoFocus
            />
          </div>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-zinc-100 dark:border-zinc-800" />
            </div>
            <div className="relative flex justify-center text-[11px] uppercase tracking-wide">
              <span className="bg-white px-2 text-zinc-400 dark:bg-zinc-900">or</span>
            </div>
          </div>

          <label className="flex cursor-pointer items-center justify-center gap-2 rounded-xl bg-zinc-100 px-4 py-3 text-sm font-medium text-zinc-600 transition hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700">
            <IconUpload className="h-4 w-4" stroke={1.75} />
            {uploading ? "Uploading…" : labels.uploadLabel}
            <input
              type="file"
              accept={labels.accept}
              className="hidden"
              disabled={uploading}
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) onFileSelect(file);
                e.target.value = "";
              }}
            />
          </label>

          {error ? <p className="text-xs text-red-500">{error}</p> : null}
        </div>

        <div className="mt-5 flex flex-wrap gap-2">
          <button
            type="button"
            disabled={!mediaUrl.trim() || uploading}
            onClick={onConfirm}
            className="rounded-xl bg-primary px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary/90 disabled:opacity-50"
          >
            Insert
          </button>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl px-4 py-2 text-sm font-medium text-zinc-600 transition-colors hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
          >
            Cancel
          </button>
        </div>
      </div>
    </DocsDialogShell>
  );
}

export function FolderNameModal({
  open,
  onClose,
  mode,
  name,
  onNameChange,
  icon,
  onIconChange,
  onConfirm,
  loading,
  error,
}: {
  open: boolean;
  onClose: () => void;
  mode: "create" | "rename";
  name: string;
  onNameChange: (v: string) => void;
  icon: FolderIconId;
  onIconChange: (v: FolderIconId) => void;
  onConfirm: () => void;
  loading?: boolean;
  error?: string | null;
}) {
  const selectedIcon = normalizeFolderIcon(icon);

  return (
    <DocsDialogShell open={open} onClose={onClose}>
      <div className="p-5 sm:p-6">
        <div className="flex items-start gap-3">
          <FolderIconBadge icon={selectedIcon} />
          <div>
            <Dialog.Title className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
              {mode === "create" ? "New folder" : "Edit folder"}
            </Dialog.Title>
            <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
              {mode === "create"
                ? "Organize your documents into folders."
                : "Update the folder name or icon."}
            </p>
          </div>
        </div>
        <div className="mt-4 space-y-4">
          <div>
            <label className="mb-1 block text-[11px] font-medium text-zinc-400">Folder name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => onNameChange(e.target.value)}
              placeholder="e.g. Onboarding"
              className="w-full rounded-xl border-0 bg-zinc-100 px-3 py-2 text-sm text-zinc-900 focus:outline-none focus:ring-2 focus:ring-primary/40 dark:bg-zinc-800 dark:text-white"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === "Enter" && name.trim() && !loading) onConfirm();
              }}
            />
          </div>
          <div>
            <label className="mb-2 block text-[11px] font-medium text-zinc-400">Icon</label>
            <FolderIconPicker value={selectedIcon} onChange={onIconChange} />
            <p className="mt-2 text-xs text-zinc-400">
              {FOLDER_ICONS[selectedIcon].label}
            </p>
          </div>
          {error ? <p className="text-xs text-red-500">{error}</p> : null}
        </div>
        <div className="mt-5 flex flex-wrap gap-2">
          <button
            type="button"
            disabled={!name.trim() || loading}
            onClick={onConfirm}
            className="rounded-xl bg-primary px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary/90 disabled:opacity-50"
          >
            {loading ? "Saving…" : mode === "create" ? "Create folder" : "Save"}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl px-4 py-2 text-sm font-medium text-zinc-600 transition-colors hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
          >
            Cancel
          </button>
        </div>
      </div>
    </DocsDialogShell>
  );
}

export function DeleteFolderModal({
  open,
  onClose,
  onConfirm,
  folderName,
  loading,
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  folderName: string;
  loading?: boolean;
}) {
  return (
    <DocsDialogShell open={open} onClose={onClose}>
      <div className="p-5 sm:p-6">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-red-100 dark:bg-red-500/15">
            <IconTrash className="h-5 w-5 text-red-600 dark:text-red-400" stroke={1.75} />
          </div>
          <div>
            <Dialog.Title className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
              Delete folder
            </Dialog.Title>
            <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
              Delete <span className="font-medium text-zinc-700 dark:text-zinc-300">{folderName}</span>?
              Documents inside will move to the root level. Subfolders will be deleted.
            </p>
          </div>
        </div>
        <div className="mt-5 flex flex-wrap gap-2">
          <button
            type="button"
            disabled={loading}
            onClick={onConfirm}
            className="rounded-xl bg-red-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-red-700 disabled:opacity-50"
          >
            {loading ? "Deleting…" : "Delete folder"}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl px-4 py-2 text-sm font-medium text-zinc-600 transition-colors hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
          >
            Cancel
          </button>
        </div>
      </div>
    </DocsDialogShell>
  );
}

export function DeleteDocumentModal({
  open,
  onClose,
  onConfirm,
  loading,
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  loading?: boolean;
}) {
  return (
    <DocsDialogShell open={open} onClose={onClose}>
      <div className="p-5 sm:p-6">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-red-100 dark:bg-red-500/15">
            <IconTrash className="h-5 w-5 text-red-600 dark:text-red-400" stroke={1.75} />
          </div>
          <div>
            <Dialog.Title className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
              Delete document
            </Dialog.Title>
            <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
              This action cannot be undone. The document will be permanently removed.
            </p>
          </div>
        </div>
        <div className="mt-5 flex flex-wrap gap-2">
          <button
            type="button"
            disabled={loading}
            onClick={onConfirm}
            className="rounded-xl bg-red-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-red-700 disabled:opacity-50"
          >
            {loading ? "Deleting…" : "Delete"}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl px-4 py-2 text-sm font-medium text-zinc-600 transition-colors hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
          >
            Cancel
          </button>
        </div>
      </div>
    </DocsDialogShell>
  );
}

export function useExternalLinkModal() {
  const [open, setOpen] = useState(false);
  const [pendingUrl, setPendingUrl] = useState<string | null>(null);

  const prompt = (url: string) => {
    setPendingUrl(url);
    setOpen(true);
  };

  const close = () => {
    setOpen(false);
    setPendingUrl(null);
  };

  const proceed = () => {
    if (pendingUrl) window.open(pendingUrl, "_blank");
    close();
  };

  return { open, prompt, close, proceed };
}

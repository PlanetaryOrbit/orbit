import clsx from "clsx";
import type { ElementType } from "react";
import {
  IconFolder,
  IconFolderOpen,
  IconBook,
  IconSchool,
  IconClipboardList,
  IconStar,
  IconHeart,
  IconCode,
  IconUsers,
  IconShield,
  IconRocket,
  IconSettings,
  IconBriefcase,
  IconBulb,
} from "@tabler/icons-react";

export type FolderIconId =
  | "folder"
  | "folder-open"
  | "book"
  | "school"
  | "clipboard"
  | "star"
  | "heart"
  | "code"
  | "users"
  | "shield"
  | "rocket"
  | "settings"
  | "briefcase"
  | "bulb";

export const DEFAULT_FOLDER_ICON: FolderIconId = "folder";

type FolderIconConfig = {
  label: string;
  Icon: ElementType<{ className?: string; stroke?: string | number }>;
  bg: string;
  text: string;
};

export const FOLDER_ICONS: Record<FolderIconId, FolderIconConfig> = {
  folder: {
    label: "Folder",
    Icon: IconFolder,
    bg: "bg-amber-500/10",
    text: "text-amber-600 dark:text-amber-400",
  },
  "folder-open": {
    label: "Open folder",
    Icon: IconFolderOpen,
    bg: "bg-amber-500/10",
    text: "text-amber-600 dark:text-amber-400",
  },
  book: {
    label: "Book",
    Icon: IconBook,
    bg: "bg-blue-500/10",
    text: "text-blue-600 dark:text-blue-400",
  },
  school: {
    label: "Training",
    Icon: IconSchool,
    bg: "bg-indigo-500/10",
    text: "text-indigo-600 dark:text-indigo-400",
  },
  clipboard: {
    label: "Checklist",
    Icon: IconClipboardList,
    bg: "bg-zinc-500/10",
    text: "text-zinc-600 dark:text-zinc-400",
  },
  star: {
    label: "Featured",
    Icon: IconStar,
    bg: "bg-yellow-500/10",
    text: "text-yellow-600 dark:text-yellow-400",
  },
  heart: {
    label: "Favorites",
    Icon: IconHeart,
    bg: "bg-rose-500/10",
    text: "text-rose-600 dark:text-rose-400",
  },
  code: {
    label: "Technical",
    Icon: IconCode,
    bg: "bg-emerald-500/10",
    text: "text-emerald-600 dark:text-emerald-400",
  },
  users: {
    label: "Team",
    Icon: IconUsers,
    bg: "bg-violet-500/10",
    text: "text-violet-600 dark:text-violet-400",
  },
  shield: {
    label: "Policies",
    Icon: IconShield,
    bg: "bg-sky-500/10",
    text: "text-sky-600 dark:text-sky-400",
  },
  rocket: {
    label: "Launch",
    Icon: IconRocket,
    bg: "bg-orange-500/10",
    text: "text-orange-600 dark:text-orange-400",
  },
  settings: {
    label: "Setup",
    Icon: IconSettings,
    bg: "bg-zinc-500/10",
    text: "text-zinc-600 dark:text-zinc-400",
  },
  briefcase: {
    label: "Operations",
    Icon: IconBriefcase,
    bg: "bg-teal-500/10",
    text: "text-teal-600 dark:text-teal-400",
  },
  bulb: {
    label: "Guides",
    Icon: IconBulb,
    bg: "bg-lime-500/10",
    text: "text-lime-600 dark:text-lime-400",
  },
};

export const FOLDER_ICON_OPTIONS = Object.entries(FOLDER_ICONS).map(([id, config]) => ({
  id: id as FolderIconId,
  ...config,
}));

export function normalizeFolderIcon(icon: string | null | undefined): FolderIconId {
  if (icon && icon in FOLDER_ICONS) return icon as FolderIconId;
  return DEFAULT_FOLDER_ICON;
}

export function FolderIconBadge({
  icon,
  size = "md",
  className,
}: {
  icon: string | null | undefined;
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const id = normalizeFolderIcon(icon);
  const { Icon, bg, text } = FOLDER_ICONS[id];
  const sizes = {
    sm: { box: "h-7 w-7", icon: "h-3.5 w-3.5" },
    md: { box: "h-10 w-10", icon: "h-5 w-5" },
    lg: { box: "h-12 w-12", icon: "h-6 w-6" },
  };
  const s = sizes[size];

  return (
    <div
      className={clsx(
        "flex shrink-0 items-center justify-center rounded-xl",
        s.box,
        bg,
        className
      )}
    >
      <Icon className={clsx(s.icon, text)} stroke={1.75} />
    </div>
  );
}

export function FolderIconPicker({
  value,
  onChange,
}: {
  value: FolderIconId;
  onChange: (icon: FolderIconId) => void;
}) {
  return (
    <div className="grid grid-cols-7 gap-1.5 sm:grid-cols-8">
      {FOLDER_ICON_OPTIONS.map(({ id, Icon, bg, text, label }) => {
        const selected = value === id;
        return (
          <button
            key={id}
            type="button"
            title={label}
            onClick={() => onChange(id)}
            className={clsx(
              "flex h-9 w-9 items-center justify-center rounded-xl transition-all",
              bg,
              selected
                ? "ring-2 ring-primary ring-offset-2 ring-offset-white dark:ring-offset-zinc-900"
                : "opacity-80 hover:opacity-100"
            )}
          >
            <Icon className={clsx("h-4 w-4", text)} stroke={1.75} />
          </button>
        );
      })}
    </div>
  );
}

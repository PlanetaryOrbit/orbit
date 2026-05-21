import clsx from "clsx";
import type { ElementType, MouseEvent, ReactNode } from "react";
import { IconChevronRight, IconPin, IconPinFilled } from "@tabler/icons-react";

type WorkspaceIcon = ElementType<{ className?: string; stroke?: string | number }>;

export const workspacesPanelShadow =
  "shadow-[0_1px_3px_0_rgb(0,0,0,0.06),0_1px_2px_-1px_rgb(0,0,0,0.04)] dark:shadow-zinc-950/30";

export const workspacesPrimaryButtonClass =
  "inline-flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-sm font-medium text-white transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50";

export const workspacesSecondaryButtonClass =
  "inline-flex items-center gap-1.5 rounded-xl bg-zinc-100 px-4 py-2 text-sm font-medium text-zinc-700 transition hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-700";

export const workspacesFormInputOverride =
  "!rounded-xl !border-0 !bg-zinc-100 !px-3 !py-2 !text-sm !text-zinc-900 focus:!outline-none focus:!ring-2 focus:!ring-primary/40 dark:!bg-zinc-800 dark:!text-white !shadow-none";

export const workspacesModalPanelClass = clsx(
  "w-full transform overflow-hidden rounded-2xl bg-white text-left align-middle transition-all dark:bg-zinc-900",
  workspacesPanelShadow
);

export function WorkspacesPageShell({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className="pagePadding pb-10">
      <div className={clsx("mx-auto w-full max-w-6xl", className)}>{children}</div>
    </div>
  );
}

export function WorkspacesPageHeader({
  title,
  subtitle,
  dateLabel,
  action,
}: {
  title: string;
  subtitle?: string;
  dateLabel?: string;
  action?: ReactNode;
}) {
  const label =
    dateLabel ??
    new Date().toLocaleDateString(undefined, {
      weekday: "long",
      month: "long",
      day: "numeric",
    });

  return (
    <header className="mb-5 sm:mb-6">
      <div className="flex flex-col gap-4 border-b border-zinc-200 pb-5 dark:border-zinc-800 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <p className="text-xs text-zinc-500 dark:text-zinc-400">{label}</p>
          <h1 className="mt-0.5 text-xl font-semibold tracking-tight text-zinc-900 dark:text-white sm:text-2xl">
            {title}
          </h1>
          {subtitle ? (
            <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">{subtitle}</p>
          ) : null}
        </div>
        {action ? <div className="shrink-0 self-start sm:self-auto">{action}</div> : null}
      </div>
    </header>
  );
}

export function WorkspacesPanel({
  children,
  className,
  onClick,
}: {
  children: ReactNode;
  className?: string;
  onClick?: () => void;
}) {
  return (
    <div
      onClick={onClick}
      onKeyDown={
        onClick
          ? (e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onClick();
              }
            }
          : undefined
      }
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      className={clsx(
        "rounded-2xl bg-white dark:bg-zinc-900/70",
        workspacesPanelShadow,
        onClick &&
          "cursor-pointer transition-colors hover:bg-zinc-50/80 dark:hover:bg-zinc-800/40 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40",
        className
      )}
    >
      {children}
    </div>
  );
}

export function WorkspacesSectionLabel({ children }: { children: ReactNode }) {
  return (
    <p className="mb-3 text-[11px] font-medium uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
      {children}
    </p>
  );
}

export function WorkspacesEmptyState({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon: WorkspaceIcon;
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <WorkspacesPanel className="mx-auto max-w-md px-8 py-12 text-center">
      <div className="mx-auto mb-4 flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10">
        <Icon className="h-5 w-5 text-primary" stroke={1.75} />
      </div>
      <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">{title}</h3>
      <p className="mx-auto mt-1.5 max-w-sm text-sm leading-relaxed text-zinc-400 dark:text-zinc-500">
        {description}
      </p>
      {action ? <div className="mt-5">{action}</div> : null}
    </WorkspacesPanel>
  );
}

export type WorkspaceCardData = {
  groupId: number;
  groupName: string;
  groupLogo?: string;
  customName?: string;
};

function workspaceDisplayName(workspace: WorkspaceCardData) {
  if (workspace.customName && workspace.customName.length > 0) return workspace.customName;
  return workspace.groupName;
}

export function WorkspaceCard({
  workspace,
  featured = false,
  isPinned = false,
  onOpen,
  onTogglePin,
}: {
  workspace: WorkspaceCardData;
  featured?: boolean;
  isPinned?: boolean;
  onOpen: () => void;
  onTogglePin: (e: MouseEvent<HTMLButtonElement>) => void;
}) {
  const name = workspaceDisplayName(workspace);
  const logo = workspace.groupLogo || "/favicon-32x32.png";

  return (
    <WorkspacesPanel
      className={clsx("group overflow-hidden p-0", featured && "max-w-2xl")}
      onClick={onOpen}
    >
      {featured ? (
        <div className="relative aspect-[21/9] overflow-hidden sm:aspect-[3/1]">
          <img
            src={logo}
            alt=""
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.02]"
          />
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-white via-white/20 to-transparent dark:from-zinc-900 dark:via-zinc-900/20" />
        </div>
      ) : null}

      <div className={clsx("flex items-center gap-3", featured ? "p-4 sm:p-5" : "p-4")}>
        {!featured ? (
          <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-xl bg-zinc-100 ring-1 ring-zinc-200/80 dark:bg-zinc-800 dark:ring-zinc-700/60">
            <img src={logo} alt="" className="h-full w-full object-contain p-1" />
          </div>
        ) : null}

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h3 className="truncate text-sm font-semibold text-zinc-900 transition-colors group-hover:text-primary dark:text-zinc-100 sm:text-base">
              {name}
            </h3>
            {isPinned ? (
              <span className="shrink-0 rounded-md bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-primary">
                Pinned
              </span>
            ) : null}
          </div>
          <p className="mt-0.5 text-xs text-zinc-400 dark:text-zinc-500">Group {workspace.groupId}</p>
        </div>

        <div className="flex shrink-0 items-center gap-1">
          <button
            type="button"
            onClick={onTogglePin}
            className={clsx(
              "flex h-8 w-8 items-center justify-center rounded-lg transition-colors",
              isPinned
                ? "bg-primary/10 text-primary hover:bg-primary/15"
                : "text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600 dark:hover:bg-zinc-800 dark:hover:text-zinc-300"
            )}
            title={isPinned ? "Unpin workspace" : "Pin as featured workspace"}
          >
            {isPinned ? (
              <IconPinFilled className="h-4 w-4" stroke={1.5} />
            ) : (
              <IconPin className="h-4 w-4" stroke={1.5} />
            )}
          </button>
          <span className="flex h-8 w-8 items-center justify-center rounded-lg text-zinc-400 transition-colors group-hover:bg-primary/10 group-hover:text-primary">
            <IconChevronRight className="h-4 w-4" stroke={2} />
          </span>
        </div>
      </div>
    </WorkspacesPanel>
  );
}

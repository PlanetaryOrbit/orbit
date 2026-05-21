import clsx from "clsx";
import type { ReactNode } from "react";

export const viewsPanelShadow =
  "shadow-[0_1px_3px_0_rgb(0,0,0,0.06),0_1px_2px_-1px_rgb(0,0,0,0.04)] dark:shadow-zinc-950/30";

export function ViewsPageShell({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className="pagePadding pb-10">
      <div className={clsx("mx-auto w-full max-w-7xl", className)}>{children}</div>
    </div>
  );
}

export function ViewsPageHeader({
  title,
  subtitle,
  workspaceLabel,
  dateLabel,
  action,
}: {
  title: string;
  subtitle?: string;
  workspaceLabel?: string;
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
          {workspaceLabel ? (
            <p className="mt-0.5 text-xs text-zinc-400 dark:text-zinc-500">{workspaceLabel}</p>
          ) : null}
        </div>
        {action ? <div className="shrink-0 self-start sm:self-auto">{action}</div> : null}
      </div>
    </header>
  );
}

export function ViewsPanel({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={clsx(
        "rounded-2xl bg-white dark:bg-zinc-900/70",
        viewsPanelShadow,
        className
      )}
    >
      {children}
    </div>
  );
}

export function ViewsToolbarButton({
  children,
  active,
  disabled,
  className,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  active?: boolean;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      className={clsx(
        "inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium transition-colors",
        disabled
          ? "cursor-not-allowed bg-zinc-100 text-zinc-400 dark:bg-zinc-800 dark:text-zinc-600"
          : active
          ? "bg-primary/10 text-primary"
          : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200 hover:text-zinc-900 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700 dark:hover:text-white",
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
}

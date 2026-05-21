import clsx from "clsx";
import type { ElementType, ReactNode } from "react";

type SessionIcon = ElementType<{ className?: string; stroke?: string | number }>;

export const sessionsPanelShadow =
  "shadow-[0_1px_3px_0_rgb(0,0,0,0.06),0_1px_2px_-1px_rgb(0,0,0,0.04)] dark:shadow-zinc-950/30";

export function SessionsPageShell({
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

export function SessionsPageHeader({
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

export function SessionsPanel({
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
      className={clsx(
        "rounded-2xl bg-white dark:bg-zinc-900/70",
        sessionsPanelShadow,
        className
      )}
    >
      {children}
    </div>
  );
}

export function SessionsEmptyState({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon: SessionIcon;
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <SessionsPanel className="mx-auto max-w-md px-8 py-12 text-center">
      <div className="mx-auto mb-4 flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10">
        <Icon className="h-5 w-5 text-primary" stroke={1.75} />
      </div>
      <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">{title}</h3>
      <p className="mx-auto mt-1.5 max-w-sm text-sm leading-relaxed text-zinc-400 dark:text-zinc-500">
        {description}
      </p>
      {action ? <div className="mt-5">{action}</div> : null}
    </SessionsPanel>
  );
}

export const sessionFormInputClass =
  "w-full rounded-xl border-0 bg-zinc-100 px-3 py-2 text-sm text-zinc-900 focus:outline-none focus:ring-2 focus:ring-primary/40 dark:bg-zinc-800 dark:text-white";

export const sessionFormInputOverride =
  "!rounded-xl !border-0 !bg-zinc-100 !px-3 !py-2 !text-sm !text-zinc-900 focus:!outline-none focus:!ring-2 focus:!ring-primary/40 dark:!bg-zinc-800 dark:!text-white !shadow-none";

export const sessionFormLabelClass =
  "mb-1 block text-[11px] font-medium text-zinc-400 dark:text-zinc-500";

export const sessionTabListClass =
  "mb-5 flex w-fit max-w-full gap-0.5 overflow-x-auto rounded-xl bg-zinc-100 p-1 dark:bg-zinc-800/80 sm:mb-6";

export function sessionTabClass(selected: boolean) {
  return clsx(
    "flex shrink-0 items-center gap-2 whitespace-nowrap rounded-lg px-3 py-2 text-sm font-medium transition-all sm:px-4 sm:py-2.5",
    selected
      ? "bg-white text-zinc-900 shadow-sm dark:bg-zinc-700 dark:text-white"
      : "text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white"
  );
}

export function SessionFormSectionHeader({
  icon: Icon,
  title,
  subtitle,
}: {
  icon: SessionIcon;
  title: string;
  subtitle: string;
}) {
  return (
    <div className="mb-6 flex items-start gap-3">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10">
        <Icon className="h-5 w-5 text-primary" stroke={1.75} />
      </div>
      <div>
        <h2 className="text-base font-semibold text-zinc-900 dark:text-white">{title}</h2>
        <p className="mt-0.5 text-sm text-zinc-500 dark:text-zinc-400">{subtitle}</p>
      </div>
    </div>
  );
}

export function SessionFormInset({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={clsx(
        "rounded-xl bg-zinc-50/80 p-4 dark:bg-zinc-800/40",
        className
      )}
    >
      {children}
    </div>
  );
}

export const sessionPrimaryButtonClass =
  "inline-flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-sm font-medium text-white transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50";

export const sessionSecondaryButtonClass =
  "inline-flex items-center gap-1.5 rounded-xl bg-zinc-100 px-4 py-2 text-sm font-medium text-zinc-700 transition hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-700";

export function SessionFormFooter({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={clsx(
        "mt-8 flex items-center gap-3 border-t border-zinc-100 pt-6 dark:border-zinc-800",
        className
      )}
    >
      {children}
    </div>
  );
}

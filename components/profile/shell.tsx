import clsx from "clsx";
import type { ElementType, ReactNode } from "react";

type ProfileIcon = ElementType<{ className?: string; stroke?: string | number }>;

export const profilePanelShadow =
  "shadow-[0_1px_3px_0_rgb(0,0,0,0.06),0_1px_2px_-1px_rgb(0,0,0,0.04)] dark:shadow-zinc-950/30";

export function ProfilePageShell({
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

export function ProfilePanel({
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
        profilePanelShadow,
        className
      )}
    >
      {children}
    </div>
  );
}

export const profileTabListClass =
  "flex gap-0.5 rounded-xl bg-zinc-100 p-1 dark:bg-zinc-800/80 overflow-x-auto scrollbar-hide";

export function profileTabClass(selected: boolean) {
  return clsx(
    "flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-lg px-3 py-2 text-xs font-medium transition-all sm:gap-2 sm:px-4 sm:text-sm",
    selected
      ? "bg-white text-zinc-900 shadow-sm dark:bg-zinc-700 dark:text-white"
      : "text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white"
  );
}

export const profileInputClass =
  "w-full rounded-xl border-0 bg-zinc-100 px-3 py-2 text-sm text-zinc-900 focus:outline-none focus:ring-2 focus:ring-primary/40 dark:bg-zinc-800 dark:text-white";

export const profileFieldPanelClass =
  "rounded-xl bg-zinc-50/80 px-4 dark:bg-zinc-800/40 divide-y divide-zinc-100/80 dark:divide-zinc-700/40";

export const profileSecondaryButtonClass =
  "inline-flex items-center gap-1.5 rounded-xl bg-zinc-100 px-3 py-1.5 text-xs font-medium text-zinc-600 transition hover:bg-zinc-200 hover:text-zinc-900 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700 dark:hover:text-white";

export function ProfileStatCard({
  icon: Icon,
  label,
  value,
  description,
}: {
  icon: ProfileIcon;
  label: string;
  value: ReactNode;
  description: string;
}) {
  return (
    <div className="rounded-xl bg-zinc-50/80 p-5 dark:bg-zinc-800/40">
      <div className="mb-4 flex items-center gap-2.5">
        <div className="rounded-lg bg-primary/10 p-1.5">
          <Icon className="h-4 w-4 text-primary" stroke={1.75} />
        </div>
        <p className="text-[11px] font-medium uppercase tracking-wide text-zinc-400">
          {label}
        </p>
      </div>
      <div className="text-3xl font-bold tabular-nums text-zinc-900 dark:text-white">
        {value}
      </div>
      <p className="mt-0.5 text-sm text-zinc-500 dark:text-zinc-400">{description}</p>
    </div>
  );
}

export function ProfileSection({
  icon: Icon,
  title,
  subtitle,
  children,
  className,
}: {
  icon: ProfileIcon;
  title: string;
  subtitle: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={clsx("overflow-hidden rounded-xl bg-zinc-50/80 dark:bg-zinc-800/40", className)}>
      <div className="flex items-center gap-3 border-b border-zinc-100/80 px-5 py-4 dark:border-zinc-700/40">
        <div className="rounded-lg bg-primary/10 p-1.5">
          <Icon className="h-4 w-4 text-primary" stroke={1.75} />
        </div>
        <div>
          <h2 className="text-sm font-semibold text-zinc-900 dark:text-white">{title}</h2>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">{subtitle}</p>
        </div>
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
}

export function ProfileEmptyState({
  icon: Icon,
  title,
  description,
}: {
  icon: ProfileIcon;
  title: string;
  description: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-12">
      <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-zinc-100 dark:bg-zinc-700/50">
        <Icon className="h-5 w-5 text-zinc-400 dark:text-zinc-500" stroke={1.75} />
      </div>
      <div className="text-center">
        <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300">{title}</p>
        <p className="mt-0.5 text-xs text-zinc-400 dark:text-zinc-500">{description}</p>
      </div>
    </div>
  );
}

export const profilePrimaryButtonClass =
  "inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-medium text-white transition hover:bg-primary/90";


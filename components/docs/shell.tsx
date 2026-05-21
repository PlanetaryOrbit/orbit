import clsx from "clsx";
import Link from "next/link";
import type { ReactNode } from "react";
import { IconArrowLeft } from "@tabler/icons-react";

export const docsPanelShadow =
  "shadow-[0_1px_3px_0_rgb(0,0,0,0.06),0_1px_2px_-1px_rgb(0,0,0,0.04)] dark:shadow-zinc-950/30";

export function DocsPageShell({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className="pagePadding">
      <div className={clsx("mx-auto w-full", className ?? "max-w-6xl")}>{children}</div>
    </div>
  );
}

export function DocsPageHeader({
  title,
  subtitle,
  workspaceLabel,
  backHref,
  action,
}: {
  title: string;
  subtitle?: string;
  workspaceLabel?: string;
  backHref?: string;
  action?: ReactNode;
}) {
  const dateLabel = new Date().toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  return (
    <header className="mb-5 sm:mb-6">
      <div className="flex flex-col gap-4 border-b border-zinc-200 pb-5 dark:border-zinc-800 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          {backHref ? (
            <Link
              href={backHref}
              className="mb-2 inline-flex items-center gap-1 text-xs font-medium text-zinc-400 transition-colors hover:text-primary dark:text-zinc-500"
            >
              <IconArrowLeft className="h-3.5 w-3.5" stroke={2} />
              Back
            </Link>
          ) : (
            <p className="text-xs text-zinc-500 dark:text-zinc-400">{dateLabel}</p>
          )}
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

export function DocsPanel({
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
        docsPanelShadow,
        onClick &&
          "cursor-pointer transition-colors hover:bg-zinc-50/80 dark:hover:bg-zinc-800/40",
        className
      )}
    >
      {children}
    </div>
  );
}

export function DocsPanelHeader({
  icon: Icon,
  title,
  hint,
}: {
  icon: typeof IconArrowLeft;
  title: string;
  hint?: string;
}) {
  return (
    <div className="mb-4 flex items-start gap-3">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10">
        <Icon className="h-5 w-5 text-primary" stroke={1.75} />
      </div>
      <div className="min-w-0">
        <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">{title}</h2>
        {hint ? (
          <p className="mt-0.5 text-xs text-zinc-400 dark:text-zinc-500">{hint}</p>
        ) : null}
      </div>
    </div>
  );
}

export function DocsInset({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={clsx(
        "rounded-xl bg-zinc-50 px-3.5 py-3 dark:bg-zinc-800/40",
        className
      )}
    >
      {children}
    </div>
  );
}

export function DocsFormLabel({ children }: { children: ReactNode }) {
  return (
    <label className="mb-1 block text-[11px] font-medium text-zinc-400 dark:text-zinc-500">
      {children}
    </label>
  );
}

export function DocsEmptyState({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon: typeof IconArrowLeft;
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <DocsPanel className="mx-auto max-w-md px-8 py-12 text-center">
      <div className="mx-auto mb-4 flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10">
        <Icon className="h-5 w-5 text-primary" stroke={1.75} />
      </div>
      <h3 className="text-base font-semibold text-zinc-900 dark:text-white">{title}</h3>
      <p className="mt-1.5 text-sm leading-relaxed text-zinc-400 dark:text-zinc-500">
        {description}
      </p>
      {action ? <div className="mt-5">{action}</div> : null}
    </DocsPanel>
  );
}

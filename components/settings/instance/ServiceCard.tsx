import clsx from "clsx";
import type { ComponentType, ReactNode } from "react";

export function ServiceCard({
  icon: Icon,
  title,
  description,
  badge,
  children,
  footer,
  className,
}: {
  icon: ComponentType<Record<string, unknown>>;
  title: string;
  description: string;
  badge?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={clsx(
        "flex h-full flex-col overflow-hidden rounded-2xl border border-zinc-200/90 bg-white shadow-sm dark:border-zinc-700/80 dark:bg-zinc-900/40",
        className
      )}
    >
      <div className="border-b border-zinc-100 bg-gradient-to-br from-zinc-50/90 to-white px-4 py-4 dark:border-zinc-800/80 dark:from-zinc-800/40 dark:to-zinc-900/50 sm:px-5">
        <div className="flex gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[color:rgb(var(--group-theme)/0.12)] text-[color:rgb(var(--group-theme))]">
            <Icon className="h-5 w-5" stroke={1.5} />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-base font-semibold tracking-tight text-zinc-900 dark:text-white">{title}</h3>
              {badge}
            </div>
            <p className="mt-1 text-sm leading-relaxed text-zinc-500 dark:text-zinc-400">{description}</p>
          </div>
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-4 p-4 sm:p-5">{children}</div>

      {footer ? (
        <div className="mt-auto border-t border-zinc-100 bg-zinc-50/40 px-4 py-3 dark:border-zinc-800/80 dark:bg-zinc-950/20 sm:px-5">
          {footer}
        </div>
      ) : null}
    </div>
  );
}

export function ServiceToggle({
  enabled,
  onToggle,
  label,
}: {
  enabled: boolean;
  onToggle: () => void;
  label: string;
}) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-xl border border-zinc-200/80 bg-white px-3 py-2.5 dark:border-zinc-700/60 dark:bg-zinc-950/30">
      <span className="min-w-0 flex-1 text-sm text-zinc-600 dark:text-zinc-300">{label}</span>
      <button
        type="button"
        role="switch"
        aria-checked={enabled}
        onClick={onToggle}
        className={clsx(
          "relative inline-flex h-7 w-12 shrink-0 items-center rounded-full transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[color:rgb(var(--group-theme)/0.5)] focus-visible:ring-offset-2 dark:focus-visible:ring-offset-zinc-900",
          enabled ? "bg-[color:rgb(var(--group-theme))]" : "bg-zinc-300 dark:bg-zinc-600"
        )}
      >
        <span
          className={clsx(
            "inline-block h-5 w-5 transform rounded-full bg-white shadow-sm transition-transform",
            enabled ? "translate-x-6" : "translate-x-1"
          )}
        />
      </button>
    </div>
  );
}

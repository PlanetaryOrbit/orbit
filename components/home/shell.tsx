import type { ReactNode } from "react";
import Link from "next/link";
import { IconChevronRight } from "@tabler/icons-react";
import clsx from "clsx";

export function HomeSection({
  title,
  action,
  children,
  className,
}: {
  title: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={clsx("", className)}>
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}

export function HomePanel({
  title,
  href,
  linkLabel = "Open",
  children,
  className,
}: {
  title: string;
  href?: string;
  linkLabel?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={clsx(
        "flex min-h-[9rem] sm:min-h-[11rem] flex-col rounded-2xl bg-white shadow-[0_1px_3px_0_rgb(0,0,0,0.06),0_1px_2px_-1px_rgb(0,0,0,0.04)] dark:bg-zinc-900/70 dark:shadow-zinc-950/30",
        className
      )}
    >
      <div className="flex items-center justify-between gap-2 px-4 pb-2.5 pt-4">
        <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">{title}</h2>
        {href ? <HomeTextLink href={href} label={linkLabel} /> : null}
      </div>
      <div className="flex flex-1 flex-col px-4 pb-4">{children}</div>
    </section>
  );
}

export function HomeTextLink({
  href,
  label,
  onClick,
}: {
  href?: string;
  label: string;
  onClick?: () => void;
}) {
  const className =
    "inline-flex shrink-0 items-center gap-0.5 text-xs font-medium text-zinc-400 transition-colors hover:text-primary dark:text-zinc-500";

  if (onClick) {
    return (
      <button type="button" onClick={onClick} className={className}>
        {label}
        <IconChevronRight className="h-3.5 w-3.5" stroke={2} />
      </button>
    );
  }

  if (!href) return null;

  return (
    <Link href={href} className={className}>
      {label}
      <IconChevronRight className="h-3.5 w-3.5" stroke={2} />
    </Link>
  );
}

export function HomeEmpty({
  children,
  action,
}: {
  children: ReactNode;
  action?: { label: string; onClick: () => void };
}) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center py-8 text-center">
      <p className="max-w-[16rem] text-sm leading-relaxed text-zinc-400 dark:text-zinc-500">{children}</p>
      {action ? (
        <button
          type="button"
          onClick={action.onClick}
          className="mt-3 text-sm font-medium text-primary hover:text-primary/80"
        >
          {action.label}
        </button>
      ) : null}
    </div>
  );
}

export function HomeList({ children }: { children: ReactNode }) {
  return <ul className="divide-y divide-zinc-100 dark:divide-zinc-800">{children}</ul>;
}

export function HomeListItem({ children }: { children: ReactNode }) {
  return <li className="py-2.5 first:pt-0 last:pb-0">{children}</li>;
}

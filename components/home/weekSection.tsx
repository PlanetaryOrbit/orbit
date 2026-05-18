import type { ReactNode } from "react";
import { Children } from "react";

export function WeekSubsection({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <div>
      <h3 className="mb-3 text-sm font-medium text-zinc-600 dark:text-zinc-400">{title}</h3>
      {children}
    </div>
  );
}

export function HomeWeekSection({
  workspaceName,
  children,
}: {
  workspaceName: string;
  children: ReactNode;
}) {
  const items = Children.toArray(children).filter(Boolean);
  if (items.length === 0) return null;

  return (
    <section>
      <h2 className="mb-5 text-lg font-semibold tracking-tight text-zinc-900 dark:text-white">
        This week at {workspaceName}
      </h2>
      <div className="space-y-6">{items}</div>
    </section>
  );
}

import Link from "next/link";
import clsx from "clsx";
import type { ReactNode } from "react";
import { IconArrowLeft } from "@tabler/icons-react";
import { docsPanelShadow } from "./shell";
import { AccessControlPanel } from "./AccessControl";

export function DocEditorPage({
  backHref,
  backLabel = "Documents",
  actions,
  sidebar,
  children,
  dimmed,
}: {
  backHref: string;
  backLabel?: string;
  actions?: ReactNode;
  sidebar: ReactNode;
  children: ReactNode;
  dimmed?: boolean;
}) {
  return (
    <div className="pagePadding pb-10">
      <div className="mx-auto max-w-6xl">
        <div
          className={clsx(
            "mb-4 flex items-center justify-between gap-3",
            dimmed && "pointer-events-none opacity-40"
          )}
        >
          <Link
            href={backHref}
            className="inline-flex items-center gap-1.5 text-sm font-medium text-zinc-400 transition-colors hover:text-zinc-700 dark:hover:text-zinc-200"
          >
            <IconArrowLeft className="h-4 w-4" stroke={2} />
            {backLabel}
          </Link>
          {actions ? <div className="flex items-center gap-2">{actions}</div> : null}
        </div>

        <div
          className={clsx(
            "grid grid-cols-1 gap-5 lg:grid-cols-[1fr_15rem] xl:grid-cols-[1fr_17rem]",
            dimmed && "pointer-events-none select-none opacity-40"
          )}
        >
          <div className="min-w-0">{children}</div>
          <aside className="lg:sticky lg:top-6 lg:self-start">{sidebar}</aside>
        </div>
      </div>
    </div>
  );
}

export function DocWritingSurface({
  title,
  onTitleChange,
  titleError,
  titleDisabled,
  titlePlaceholder = "Untitled document",
  footer,
  children,
}: {
  title: string;
  onTitleChange: (value: string) => void;
  titleError?: string;
  titleDisabled?: boolean;
  titlePlaceholder?: string;
  footer?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div
      className={clsx(
        "flex min-h-[calc(100vh-11rem)] flex-col rounded-2xl bg-white dark:bg-zinc-900/80",
        docsPanelShadow
      )}
    >
      <div className="px-6 pt-8 pb-2 sm:px-10 sm:pt-10">
        <input
          type="text"
          value={title}
          onChange={(e) => onTitleChange(e.target.value)}
          disabled={titleDisabled}
          placeholder={titlePlaceholder}
          className="w-full border-0 bg-transparent text-2xl font-semibold tracking-tight text-zinc-900 placeholder-zinc-300 focus:outline-none focus:ring-0 disabled:opacity-60 dark:text-white dark:placeholder-zinc-600 sm:text-3xl"
        />
        {titleError ? (
          <p className="mt-1 text-xs text-red-500">{titleError}</p>
        ) : null}
      </div>

      <div className="mx-6 border-t border-zinc-100 dark:border-zinc-800 sm:mx-10" />

      <div className="flex flex-1 flex-col px-2 py-2 sm:px-4 sm:py-4">{children}</div>

      {footer ? (
        <>
          <div className="mx-6 border-t border-zinc-100 dark:border-zinc-800 sm:mx-10" />
          <div className="px-6 py-4 sm:px-10">{footer}</div>
        </>
      ) : null}
    </div>
  );
}

export function DocEditorSidebar(
  props: React.ComponentProps<typeof AccessControlPanel>
) {
  return <AccessControlPanel {...props} variant="sidebar" />;
}

const AVATAR_BG_COLORS = [
  "bg-rose-300",
  "bg-lime-300",
  "bg-teal-200",
  "bg-amber-300",
  "bg-rose-200",
  "bg-lime-200",
  "bg-green-100",
  "bg-red-100",
  "bg-yellow-200",
  "bg-amber-200",
  "bg-emerald-300",
  "bg-green-300",
  "bg-red-300",
  "bg-emerald-200",
  "bg-green-200",
  "bg-red-200",
];

function getRandomBg(userid: string, username?: string) {
  const key = `${userid ?? ""}:${username ?? ""}`;
  let hash = 5381;
  for (let i = 0; i < key.length; i++) {
    hash = ((hash << 5) - hash) ^ key.charCodeAt(i);
  }
  return AVATAR_BG_COLORS[(hash >>> 0) % AVATAR_BG_COLORS.length];
}

function formatDocDate(value: string) {
  return new Date(value).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function DocViewMeta({
  authorName,
  authorId,
  workspaceId,
  createdAt,
  updatedAt,
}: {
  authorName: string;
  authorId?: string;
  workspaceId: number;
  createdAt: string;
  updatedAt?: string;
}) {
  const profileHref =
    authorId && workspaceId
      ? `/workspace/${workspaceId}/profile/${authorId}`
      : undefined;
  const created = formatDocDate(createdAt);
  const updated =
    updatedAt &&
    new Date(updatedAt).getTime() !== new Date(createdAt).getTime()
      ? formatDocDate(updatedAt)
      : null;

  const avatar = (
    <div
      className={clsx(
        "flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full",
        getRandomBg(authorId ?? "", authorName)
      )}
    >
      {authorId ? (
        <img
          src={`/api/user/${authorId}/avatar`}
          alt={authorName}
          className="h-10 w-10 rounded-full border-2 border-white object-cover dark:border-zinc-900"
          style={{ background: "transparent" }}
        />
      ) : (
        <span className="text-sm font-semibold text-zinc-700">
          {authorName.charAt(0).toUpperCase()}
        </span>
      )}
    </div>
  );

  return (
    <div className="flex items-center gap-3">
      {profileHref ? <Link href={profileHref}>{avatar}</Link> : avatar}
      <div className="min-w-0 text-sm">
        {profileHref ? (
          <Link
            href={profileHref}
            className="font-medium text-zinc-700 transition-colors hover:text-primary dark:text-zinc-200"
          >
            {authorName}
          </Link>
        ) : (
          <p className="font-medium text-zinc-700 dark:text-zinc-200">{authorName}</p>
        )}
        <p className="text-xs text-zinc-400">
          Created {created}
          {updated ? ` · Edited ${updated}` : null}
        </p>
      </div>
    </div>
  );
}

export function DocViewSurface({
  title,
  meta,
  children,
  footer,
}: {
  title: string;
  meta?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <div
      className={clsx(
        "flex min-h-[calc(100vh-11rem)] flex-col rounded-2xl bg-white dark:bg-zinc-900/80",
        docsPanelShadow
      )}
    >
      <div className="px-6 pt-8 pb-4 sm:px-10 sm:pt-10">
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-white sm:text-3xl">
          {title}
        </h1>
        {meta ? <div className="mt-4">{meta}</div> : null}
      </div>

      <div className="mx-6 border-t border-zinc-100 dark:border-zinc-800 sm:mx-10" />

      <div className="flex flex-1 flex-col px-6 py-6 sm:px-10 sm:py-8">{children}</div>

      {footer ? (
        <>
          <div className="mx-6 border-t border-zinc-100 dark:border-zinc-800 sm:mx-10" />
          <div className="px-6 py-4 sm:px-10">{footer}</div>
        </>
      ) : null}
    </div>
  );
}

type PermissionItem = { id: string; name: string; color?: string | null };

export function DocPermissionsSidebar({
  roles,
  departments,
}: {
  roles: PermissionItem[];
  departments: PermissionItem[];
}) {
  const openToAll = roles.length === 0 && departments.length === 0;

  return (
    <div
      className={clsx(
        "rounded-2xl bg-white p-4 dark:bg-zinc-900/80",
        docsPanelShadow
      )}
    >
      <p className="mb-3 text-xs font-semibold text-zinc-700 dark:text-zinc-200">
        Permissions
      </p>

      {openToAll ? (
        <p className="text-xs text-zinc-400">Visible to everyone in the workspace</p>
      ) : (
        <div className="space-y-3">
          {roles.length > 0 && (
            <div>
              <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-zinc-400">
                Roles
              </p>
              <div className="flex flex-wrap gap-1">
                {roles.map((r) => (
                  <span
                    key={r.id}
                    className="inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-medium text-white/95"
                    style={{ backgroundColor: r.color || "#71717a" }}
                  >
                    {r.name}
                  </span>
                ))}
              </div>
            </div>
          )}
          {departments.length > 0 && (
            <div>
              <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-zinc-400">
                Departments
              </p>
              <div className="flex flex-wrap gap-1">
                {departments.map((d) => (
                  <span
                    key={d.id}
                    className="inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-medium text-white/95"
                    style={{ backgroundColor: d.color || "#71717a" }}
                  >
                    {d.name}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

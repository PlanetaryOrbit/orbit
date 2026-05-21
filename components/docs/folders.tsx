import clsx from "clsx";
import { IconFolder } from "@tabler/icons-react";
import { DocsPanel, docsPanelShadow } from "./shell";
import { FolderIconBadge } from "./folderIcons";

export type DocFolderOption = {
  id: string;
  name: string;
  parentId: string | null;
  icon?: string | null;
};

export function buildFolderPath(
  folderId: string | null | undefined,
  folders: DocFolderOption[]
): DocFolderOption[] {
  if (!folderId) return [];
  const byId = new Map(folders.map((f) => [f.id, f]));
  const path: DocFolderOption[] = [];
  let current = byId.get(folderId);
  while (current) {
    path.unshift(current);
    current = current.parentId ? byId.get(current.parentId) : undefined;
  }
  return path;
}

export function FolderPicker({
  folders,
  value,
  onChange,
  disabled,
  className,
}: {
  folders: DocFolderOption[];
  value: string | null;
  onChange: (folderId: string | null) => void;
  disabled?: boolean;
  className?: string;
}) {
  const options = [{ id: "", name: "No folder (root)", parentId: null as string | null }, ...folders];

  return (
    <DocsPanel className={clsx("p-4", className)}>
      <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-zinc-400">Folder</p>
      <select
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value || null)}
        disabled={disabled}
        className="w-full rounded-xl border-0 bg-zinc-100 px-3 py-2 text-xs font-medium text-zinc-700 focus:outline-none focus:ring-2 focus:ring-primary/40 disabled:opacity-60 dark:bg-zinc-800 dark:text-zinc-200"
      >
        {options.map((folder) => {
          const depth = buildFolderPath(folder.id || null, folders).length;
          const prefix = folder.id ? `${"— ".repeat(Math.max(0, depth - 1))}` : "";
          return (
            <option key={folder.id || "root"} value={folder.id}>
              {prefix}
              {folder.name}
            </option>
          );
        })}
      </select>
    </DocsPanel>
  );
}

export function DocsBreadcrumbs({
  items,
  className,
}: {
  items: { id?: string; label: string; href?: string }[];
  className?: string;
}) {
  return (
    <nav className={clsx("flex flex-wrap items-center gap-1 text-xs text-zinc-400", className)}>
      {items.map((item, index) => (
        <span key={`${item.label}-${index}`} className="inline-flex items-center gap-1">
          {index > 0 ? <span className="text-zinc-300 dark:text-zinc-600">/</span> : null}
          {item.href ? (
            <a
              href={item.href}
              className="font-medium transition-colors hover:text-primary"
            >
              {item.label}
            </a>
          ) : (
            <span className="font-medium text-zinc-600 dark:text-zinc-300">{item.label}</span>
          )}
        </span>
      ))}
    </nav>
  );
}

export function DocsFolderCard({
  name,
  icon,
  documentCount,
  childFolderCount,
  onOpen,
  onRename,
  onDelete,
  canManage,
}: {
  name: string;
  icon?: string | null;
  documentCount: number;
  childFolderCount: number;
  onOpen: () => void;
  onRename?: () => void;
  onDelete?: () => void;
  canManage?: boolean;
}) {
  const parts: string[] = [];
  if (documentCount > 0) parts.push(`${documentCount} document${documentCount === 1 ? "" : "s"}`);
  if (childFolderCount > 0) parts.push(`${childFolderCount} folder${childFolderCount === 1 ? "" : "s"}`);

  return (
    <DocsPanel className="group p-4" onClick={onOpen}>
      <div className="flex items-start gap-3">
        <FolderIconBadge icon={icon} />
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <h3 className="truncate text-sm font-semibold text-zinc-900 group-hover:text-primary dark:text-zinc-100">
              {name}
            </h3>
            {canManage && (onRename || onDelete) ? (
              <div className="flex shrink-0 gap-0.5">
                {onRename ? (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onRename();
                    }}
                    className="rounded-lg px-2 py-1 text-[11px] font-medium text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-700 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
                  >
                    Edit
                  </button>
                ) : null}
                {onDelete ? (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onDelete();
                    }}
                    className="rounded-lg px-2 py-1 text-[11px] font-medium text-zinc-400 transition-colors hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-500/10 dark:hover:text-red-400"
                  >
                    Delete
                  </button>
                ) : null}
              </div>
            ) : null}
          </div>
          <p className="mt-0.5 text-xs text-zinc-400">
            {parts.length > 0 ? parts.join(" · ") : "Empty folder"}
          </p>
        </div>
      </div>
    </DocsPanel>
  );
}

export function DocsFolderSidebarPanel({
  folders,
  currentFolderId,
  workspaceId,
}: {
  folders: DocFolderOption[];
  currentFolderId: string | null;
  workspaceId: string;
}) {
  const rootHref = `/workspace/${workspaceId}/docs`;

  return (
    <div className={clsx("rounded-2xl bg-white p-4 dark:bg-zinc-900/80", docsPanelShadow)}>
      <p className="mb-3 text-xs font-semibold text-zinc-700 dark:text-zinc-200">Folders</p>
      <div className="space-y-0.5">
        <a
          href={rootHref}
          className={clsx(
            "flex items-center gap-2 rounded-lg px-2 py-1.5 text-xs font-medium transition-colors",
            !currentFolderId
              ? "bg-primary/8 text-primary dark:bg-primary/10"
              : "text-zinc-600 hover:bg-zinc-50 dark:text-zinc-300 dark:hover:bg-zinc-800/50"
          )}
        >
          <IconFolder className="h-3.5 w-3.5" stroke={1.75} />
          All documents
        </a>
        {folders.map((folder) => {
          const depth = buildFolderPath(folder.id, folders).length;
          return (
            <a
              key={folder.id}
              href={`${rootHref}?folder=${folder.id}`}
              className={clsx(
                "flex items-center gap-2 rounded-lg py-1.5 text-xs font-medium transition-colors",
                currentFolderId === folder.id
                  ? "bg-primary/8 text-primary dark:bg-primary/10"
                  : "text-zinc-600 hover:bg-zinc-50 dark:text-zinc-300 dark:hover:bg-zinc-800/50"
              )}
              style={{ paddingLeft: `${8 + Math.max(0, depth - 1) * 12}px`, paddingRight: "8px" }}
            >
              <FolderIconBadge icon={folder.icon} size="sm" className="!h-5 !w-5 !rounded-lg" />
              <span className="truncate">{folder.name}</span>
            </a>
          );
        })}
      </div>
    </div>
  );
}

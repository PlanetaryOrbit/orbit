import type { pageWithLayout } from "@/layoutTypes";
import { workspacestate } from "@/state";
import Workspace from "@/layouts/workspace";
import { useRecoilState } from "recoil";
import { useRouter } from "next/router";
import prisma, { document } from "@/utils/database";
import { withPermissionCheckSsr } from "@/utils/permissionsManager";
import {
  IconFileText,
  IconPlus,
  IconClock,
  IconLink,
  IconPencil,
  IconFolder,
} from "@tabler/icons-react";
import { useState } from "react";
import axios from "axios";
import { toast } from "react-hot-toast";
import {
  DocsPageShell,
  DocsPageHeader,
  DocsPanel,
  DocsEmptyState,
} from "@/components/docs/shell";
import {
  ExternalLinkModal,
  FolderNameModal,
  DeleteFolderModal,
  useExternalLinkModal,
} from "@/components/docs/modals";
import {
  DocsBreadcrumbs,
  DocsFolderCard,
  type DocFolderOption,
} from "@/components/docs/folders";
import { isExternalContent } from "@/components/docs/content";
import {
  DEFAULT_FOLDER_ICON,
  normalizeFolderIcon,
  type FolderIconId,
} from "@/components/docs/folderIcons";

type FolderWithCounts = DocFolderOption & {
  _count: { documents: number; children: number };
};

function buildDocumentAccessFilter(
  userRoleIds: string[],
  userDepartmentIds: string[]
) {
  return {
    OR: [
      ...(userRoleIds.length > 0
        ? [{ roles: { some: { id: { in: userRoleIds } } } }]
        : []),
      ...(userDepartmentIds.length > 0
        ? [{ departments: { some: { id: { in: userDepartmentIds } } } }]
        : []),
      { roles: { none: {} }, departments: { none: {} } },
    ],
  };
}

async function buildBreadcrumbs(
  folderId: string,
  workspaceGroupId: number
): Promise<DocFolderOption[]> {
  const path: DocFolderOption[] = [];
  let currentId: string | null = folderId;

  while (currentId) {
    const folder: DocFolderOption | null = await prisma.documentFolder.findFirst({
      where: { id: currentId, workspaceGroupId },
      select: { id: true, name: true, parentId: true, icon: true },
    });
    if (!folder) break;
    path.unshift(folder);
    currentId = folder.parentId;
  }

  return path;
}

export const getServerSideProps = withPermissionCheckSsr(async (context: any) => {
  const { id, folder: folderQuery } = context.query;
  const userid = context.req.auth.userId;
  if (!userid || !id) {
    return { redirect: { destination: "/login" } };
  }

  const workspaceGroupId = parseInt(id as string);
  const currentFolderId =
    typeof folderQuery === "string" && folderQuery ? folderQuery : null;

  const user = await prisma.user.findFirst({
    where: { userid },
    include: {
      roles: { where: { workspaceGroupId } },
      workspaceMemberships: {
        where: { workspaceGroupId },
        include: { departmentMembers: true },
      },
    },
  });

  if (!user) return { redirect: { destination: "/login" } };

  const config = await prisma.config.findFirst({
    where: { workspaceGroupId, key: "guides" },
  });

  let guidesEnabled = false;
  if (config?.value) {
    let val = config.value;
    if (typeof val === "string") {
      try {
        val = JSON.parse(val);
      } catch {
        val = {};
      }
    }
    guidesEnabled =
      typeof val === "object" && val !== null && "enabled" in val
        ? (val as { enabled?: boolean }).enabled ?? false
        : false;
  }

  if (!guidesEnabled) return { notFound: true };

  const membership = user.workspaceMemberships?.[0];
  const isAdmin = membership?.isAdmin || false;
  const userRoleIds = (user.roles || []).map((r: any) => r.id);
  const userDepartmentIds = (membership?.departmentMembers || []).map(
    (d: any) => d.departmentId
  );

  const canCreate =
    isAdmin ||
    (user.roles || []).some((r: any) => (r.permissions || []).includes("create_docs"));
  const canEdit =
    isAdmin ||
    (user.roles || []).some((r: any) => (r.permissions || []).includes("edit_docs"));
  const canDelete =
    isAdmin ||
    (user.roles || []).some((r: any) => (r.permissions || []).includes("delete_docs"));
  const canManage = canCreate || canEdit || canDelete;

  if (currentFolderId) {
    const currentFolder = await prisma.documentFolder.findFirst({
      where: { id: currentFolderId, workspaceGroupId },
    });
    if (!currentFolder) return { notFound: true };
  }

  const baseWhere = {
    workspaceGroupId,
    requiresAcknowledgment: false,
  };

  const docAccessFilter = buildDocumentAccessFilter(userRoleIds, userDepartmentIds);

  const docs = await prisma.document.findMany({
    where: canManage
      ? { ...baseWhere, folderId: currentFolderId }
      : {
          ...baseWhere,
          folderId: currentFolderId,
          ...docAccessFilter,
        },
    include: {
      owner: { select: { username: true, picture: true } },
    },
    orderBy: { updatedAt: "desc" },
  });

  const folders = await prisma.documentFolder.findMany({
    where: canManage
      ? { workspaceGroupId, parentId: currentFolderId }
      : {
          workspaceGroupId,
          parentId: currentFolderId,
          OR: [
            { documents: { some: { ...baseWhere, ...docAccessFilter } } },
            { children: { some: { documents: { some: { ...baseWhere, ...docAccessFilter } } } } },
          ],
        },
    include: {
      _count: {
        select: { documents: true, children: true },
      },
    },
    orderBy: { name: "asc" },
  });

  const breadcrumbs = currentFolderId
    ? await buildBreadcrumbs(currentFolderId, workspaceGroupId)
    : [];

  return {
    props: {
      documents: JSON.parse(
        JSON.stringify(docs, (_k, v) => (typeof v === "bigint" ? v.toString() : v))
      ) as (document & { owner: { username: string; picture: string } })[],
      folders: JSON.parse(JSON.stringify(folders)) as FolderWithCounts[],
      breadcrumbs: JSON.parse(JSON.stringify(breadcrumbs)) as DocFolderOption[],
      currentFolderId,
      canCreate,
      canEdit,
      canDelete,
    },
  };
});

type pageProps = {
  documents: (document & { owner: { username: string; picture: string } })[];
  folders: FolderWithCounts[];
  allFolders: DocFolderOption[];
  breadcrumbs: DocFolderOption[];
  currentFolderId: string | null;
  canCreate: boolean;
  canEdit: boolean;
  canDelete: boolean;
};

const DocsLibrary: pageWithLayout<pageProps> = ({
  documents,
  folders,
  breadcrumbs,
  currentFolderId,
  canCreate,
  canEdit,
  canDelete,
}) => {
  const router = useRouter();
  const [workspace] = useRecoilState(workspacestate);
  const workspaceId = router.query.id as string;
  const workspaceLabel = workspace.customName || workspace.groupName;
  const externalLink = useExternalLinkModal();

  const [folderModalMode, setFolderModalMode] = useState<"create" | "rename" | null>(null);
  const [folderName, setFolderName] = useState("");
  const [folderIcon, setFolderIcon] = useState<FolderIconId>(DEFAULT_FOLDER_ICON);
  const [folderModalError, setFolderModalError] = useState<string | null>(null);
  const [folderModalLoading, setFolderModalLoading] = useState(false);
  const [renamingFolder, setRenamingFolder] = useState<FolderWithCounts | null>(null);
  const [deletingFolder, setDeletingFolder] = useState<FolderWithCounts | null>(null);
  const [deleteFolderLoading, setDeleteFolderLoading] = useState(false);

  const docsBase = `/workspace/${workspaceId}/docs`;
  const isEmpty = documents.length === 0 && folders.length === 0;

  const openDoc = (doc: (typeof documents)[0]) => {
    if (isExternalContent(doc.content)) {
      externalLink.prompt(doc.content.url);
      return;
    }
    router.push(`${docsBase}/${doc.id}`);
  };

  const refreshPage = () => {
    router.replace(router.asPath);
  };

  const openCreateFolder = () => {
    setFolderModalMode("create");
    setFolderName("");
    setFolderIcon(DEFAULT_FOLDER_ICON);
    setFolderModalError(null);
  };

  const openRenameFolder = (folder: FolderWithCounts) => {
    setRenamingFolder(folder);
    setFolderModalMode("rename");
    setFolderName(folder.name);
    setFolderIcon(normalizeFolderIcon(folder.icon));
    setFolderModalError(null);
  };

  const submitFolderModal = async () => {
    if (!folderName.trim()) return;
    setFolderModalLoading(true);
    setFolderModalError(null);

    try {
      if (folderModalMode === "create") {
        await axios.post(`/api/workspace/${workspaceId}/guides/folders/create`, {
          name: folderName.trim(),
          parentId: currentFolderId,
          icon: folderIcon,
        });
        toast.success("Folder created");
      } else if (renamingFolder) {
        await axios.post(
          `/api/workspace/${workspaceId}/guides/folders/${renamingFolder.id}/update`,
          { name: folderName.trim(), icon: folderIcon }
        );
        toast.success("Folder updated");
      }
      setFolderModalMode(null);
      setRenamingFolder(null);
      refreshPage();
    } catch (err: any) {
      setFolderModalError(err?.response?.data?.error || "Something went wrong");
    } finally {
      setFolderModalLoading(false);
    }
  };

  const confirmDeleteFolder = async () => {
    if (!deletingFolder) return;
    setDeleteFolderLoading(true);
    try {
      await axios.post(
        `/api/workspace/${workspaceId}/guides/folders/${deletingFolder.id}/delete`
      );
      toast.success("Folder deleted");
      setDeletingFolder(null);
      if (currentFolderId === deletingFolder.id) {
        const parentHref = deletingFolder.parentId
          ? `${docsBase}?folder=${deletingFolder.parentId}`
          : docsBase;
        router.push(parentHref);
      } else {
        refreshPage();
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.error || "Failed to delete folder");
    } finally {
      setDeleteFolderLoading(false);
    }
  };

  const breadcrumbItems = [
    { label: "Documents", href: docsBase },
    ...breadcrumbs.map((folder, index) => ({
      label: folder.name,
      href: index < breadcrumbs.length - 1 ? `${docsBase}?folder=${folder.id}` : undefined,
    })),
  ];

  return (
    <DocsPageShell>
      <DocsPageHeader
        title={breadcrumbs.length ? breadcrumbs[breadcrumbs.length - 1].name : "Documents"}
        subtitle="Create and manage your workspace documentation"
        workspaceLabel={workspaceLabel}
        action={
          canCreate ? (
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={openCreateFolder}
                className="inline-flex items-center gap-1.5 rounded-xl bg-zinc-100 px-4 py-2 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-700"
              >
                <IconFolder className="h-4 w-4" stroke={1.75} />
                New folder
              </button>
              <button
                type="button"
                onClick={() =>
                  router.push(
                    `${docsBase}/new${currentFolderId ? `?folder=${currentFolderId}` : ""}`
                  )
                }
                className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary/90"
              >
                <IconPlus className="h-4 w-4" />
                New document
              </button>
            </div>
          ) : undefined
        }
      />

      {breadcrumbs.length > 0 ? (
        <DocsBreadcrumbs items={breadcrumbItems} className="mb-4" />
      ) : null}

      <div className="flex flex-col gap-4 sm:gap-5">
        {!canCreate && (
          <DocsPanel className="px-4 py-3 text-sm text-zinc-500 dark:text-zinc-400">
            You don&apos;t have permission to create documents.
          </DocsPanel>
        )}

        {isEmpty ? (
          <DocsEmptyState
            icon={currentFolderId ? IconFolder : IconFileText}
            title={currentFolderId ? "This folder is empty" : "No documents yet"}
            description={
              canCreate
                ? currentFolderId
                  ? "Add a document or create a subfolder to get started."
                  : "Get started by creating your first document or folder for the workspace."
                : "Contact your workspace admin to publish documentation."
            }
            action={
              canCreate ? (
                <div className="flex flex-wrap items-center justify-center gap-2">
                  <button
                    type="button"
                    onClick={openCreateFolder}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-zinc-100 px-4 py-2 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-200"
                  >
                    <IconFolder className="h-4 w-4" stroke={1.75} />
                    Create folder
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      router.push(
                        `${docsBase}/new${currentFolderId ? `?folder=${currentFolderId}` : ""}`
                      )
                    }
                    className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary/90"
                  >
                    <IconPlus className="h-4 w-4" />
                    Create document
                  </button>
                </div>
              ) : undefined
            }
          />
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {folders.map((folder) => (
              <DocsFolderCard
                key={folder.id}
                name={folder.name}
                icon={folder.icon}
                documentCount={folder._count.documents}
                childFolderCount={folder._count.children}
                onOpen={() => router.push(`${docsBase}?folder=${folder.id}`)}
                onRename={canEdit ? () => openRenameFolder(folder) : undefined}
                onDelete={canDelete ? () => setDeletingFolder(folder) : undefined}
                canManage={canEdit || canDelete}
              />
            ))}

            {documents.map((doc) => {
              const external = isExternalContent(doc.content);
              return (
                <DocsPanel key={doc.id} className="group p-4" onClick={() => openDoc(doc)}>
                  <div className="flex items-start gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10">
                      {external ? (
                        <IconLink className="h-5 w-5 text-primary" stroke={1.75} />
                      ) : (
                        <IconFileText className="h-5 w-5 text-primary" stroke={1.75} />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="truncate text-sm font-semibold text-zinc-900 group-hover:text-primary dark:text-zinc-100">
                          {doc.name}
                        </h3>
                        {(canEdit || canDelete) && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              router.push(`${docsBase}/${doc.id}/edit`);
                            }}
                            className="shrink-0 rounded-lg p-1.5 text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-700 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
                            aria-label="Edit document"
                          >
                            <IconPencil className="h-4 w-4" stroke={1.75} />
                          </button>
                        )}
                      </div>
                      <p className="mt-0.5 text-xs text-zinc-400">
                        {external ? "External link" : "Markdown document"}
                      </p>
                      <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-zinc-400">
                        <span>{doc.owner?.username ?? "Unknown"}</span>
                        <span className="inline-flex items-center gap-1">
                          <IconClock className="h-3.5 w-3.5" />
                          {new Date(doc.updatedAt ?? doc.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  </div>
                </DocsPanel>
              );
            })}
          </div>
        )}
      </div>

      <ExternalLinkModal
        open={externalLink.open}
        onClose={externalLink.close}
        onProceed={externalLink.proceed}
      />

      {folderModalMode ? (
        <FolderNameModal
          open={!!folderModalMode}
          onClose={() => {
            setFolderModalMode(null);
            setRenamingFolder(null);
            setFolderModalError(null);
          }}
          mode={folderModalMode}
          name={folderName}
          onNameChange={setFolderName}
          icon={folderIcon}
          onIconChange={setFolderIcon}
          onConfirm={submitFolderModal}
          loading={folderModalLoading}
          error={folderModalError}
        />
      ) : null}

      <DeleteFolderModal
        open={!!deletingFolder}
        onClose={() => setDeletingFolder(null)}
        onConfirm={confirmDeleteFolder}
        folderName={deletingFolder?.name ?? ""}
        loading={deleteFolderLoading}
      />
    </DocsPageShell>
  );
};

DocsLibrary.layout = Workspace;

export default DocsLibrary;

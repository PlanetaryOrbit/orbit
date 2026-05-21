import type { pageWithLayout } from "@/layoutTypes";
import { workspacestate } from "@/state";
import Workspace from "@/layouts/workspace";
import { useRecoilState } from "recoil";
import { useState } from "react";
import { IconCheck, IconWorld, IconTrash } from "@tabler/icons-react";
import { useRouter } from "next/router";
import { withPermissionCheckSsr } from "@/utils/permissionsManager";
import axios from "axios";
import prisma from "@/utils/database";
import { FormProvider, useForm } from "react-hook-form";
import { GetServerSideProps } from "next";
import { toast } from "react-hot-toast";
import { AuthenticatedRequest } from "@/lib/withAuth";
import {
  DocEditorPage,
  DocWritingSurface,
  DocEditorSidebar,
} from "@/components/docs/DocEditorPage";
import {
  DeleteDocumentModal,
  ExternalLinkModal,
  useExternalLinkModal,
} from "@/components/docs/modals";
import { MarkdownEditor } from "@/components/docs/MarkdownEditor";
import { FolderPicker, type DocFolderOption } from "@/components/docs/folders";
import {
  documentContentToMarkdown,
  getDocumentMode,
  isExternalContent,
} from "@/components/docs/content";

export const getServerSideProps: GetServerSideProps = withPermissionCheckSsr(
  async (context) => {
    const { id, gid } = context.query;
    if (!gid) return { notFound: true };
    const authReq = context.req as AuthenticatedRequest;

    const user = await prisma.user.findFirst({
      where: { userid: BigInt(authReq.auth.userId) },
      include: {
        roles: { where: { workspaceGroupId: Number(id) } },
        workspaceMemberships: { where: { workspaceGroupId: Number(id) } },
      },
    });

    const membership = user?.workspaceMemberships?.[0];
    const isAdmin = membership?.isAdmin || false;
    const canEdit =
      isAdmin ||
      (user?.roles || []).some((r: any) => r.permissions?.includes("edit_docs"));
    const canDelete =
      isAdmin ||
      (user?.roles || []).some((r: any) => r.permissions?.includes("delete_docs"));

    const [roles, departments, folders, document] = await Promise.all([
      prisma.role.findMany({
        where: { workspaceGroupId: Number(id) },
        orderBy: { isOwnerRole: "desc" },
      }),
      prisma.department.findMany({
        where: { workspaceGroupId: Number(id) },
        orderBy: { name: "asc" },
        select: { id: true, name: true, color: true },
      }),
      prisma.documentFolder.findMany({
        where: { workspaceGroupId: Number(id) },
        select: { id: true, name: true, parentId: true, icon: true },
        orderBy: { name: "asc" },
      }),
      prisma.document.findUnique({
        where: { id: gid as string },
        include: { roles: true, departments: true },
      }),
    ]);

    if (!document) return { notFound: true };

    return {
      props: {
        roles: JSON.parse(JSON.stringify(roles)),
        departments: JSON.parse(JSON.stringify(departments)),
        folders: JSON.parse(JSON.stringify(folders)),
        document: JSON.parse(
          JSON.stringify(document, (_k, v) =>
            typeof v === "bigint" ? v.toString() : v
          )
        ),
        canEdit,
        canDelete,
      },
    };
  },
  ["edit_docs", "delete_docs"]
);

const EditDocument: pageWithLayout<any> = ({
  roles,
  departments,
  folders,
  document,
  canEdit,
  canDelete,
}) => {
  const [workspace] = useRecoilState(workspacestate);
  const router = useRouter();
  const form = useForm({ defaultValues: { name: document.name } });
  const externalLink = useExternalLinkModal();

  const [mode] = useState<"internal" | "external">(() => getDocumentMode(document.content));
  const [markdownContent, setMarkdownContent] = useState(() =>
    documentContentToMarkdown(document.content)
  );
  const [externalUrl, setExternalUrl] = useState(() =>
    isExternalContent(document.content) ? document.content.url : ""
  );
  const [selectedRoles, setSelectedRoles] = useState<string[]>(
    document.roles.map((r: any) => r.id)
  );
  const [selectedDepartments, setSelectedDepartments] = useState<string[]>(
    document.departments?.map((d: any) => d.id) ?? []
  );
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(
    document.folderId ?? null
  );
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const docsHref = document.folderId
    ? `/workspace/${workspace.groupId}/docs?folder=${document.folderId}`
    : `/workspace/${workspace.groupId}/docs`;
  const docHref = `${docsHref}/${document.id}`;

  const toggleRole = (roleId: string) => {
    if (!canEdit) return;
    setSelectedRoles((prev) =>
      prev.includes(roleId) ? prev.filter((r) => r !== roleId) : [...prev, roleId]
    );
  };

  const toggleDepartment = (departmentId: string) => {
    if (!canEdit) return;
    setSelectedDepartments((prev) =>
      prev.includes(departmentId)
        ? prev.filter((d) => d !== departmentId)
        : [...prev, departmentId]
    );
  };

  const updateDoc = async () => {
    if (!canEdit) return;

    const name = form.getValues().name?.trim();
    if (!name) {
      form.setError("name", { type: "required", message: "Title is required" });
      return;
    }

    let content: unknown =
      mode === "external"
        ? { external: true, url: externalUrl.trim(), title: form.getValues().name }
        : markdownContent;

    if (mode === "external" && !externalUrl.trim()) {
      form.setError("name", { type: "custom", message: "External URL required" });
      return;
    }

    try {
      await axios.post(`/api/workspace/${workspace.groupId}/guides/${document.id}/update`, {
        name: form.getValues().name.trim(),
        content,
        roles: selectedRoles,
        departments: selectedDepartments,
        folderId: selectedFolderId,
      });
      toast.success("Document saved");
      router.push(mode === "external" ? docsHref : docHref);
    } catch (err: any) {
      form.setError("name", {
        type: "custom",
        message: err?.response?.data?.error || "Failed to save",
      });
    }
  };

  const deleteDoc = async () => {
    setDeleting(true);
    try {
      await axios.post(
        `/api/workspace/${workspace.groupId}/guides/${document.id}/delete`,
        {}
      );
      toast.success("Document deleted");
      router.push(docsHref);
    } catch {
      toast.error("Failed to delete");
      setDeleting(false);
    }
  };

  const titleValue = form.watch("name") ?? "";

  return (
    <>
      <FormProvider {...form}>
        <DocEditorPage
          backHref={docHref}
          actions={
            <div className="flex items-center gap-2">
              {canDelete && (
                <button
                  type="button"
                  onClick={() => setShowDeleteModal(true)}
                  className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-sm font-medium text-red-500 transition-colors hover:bg-red-50 dark:hover:bg-red-500/10"
                >
                  <IconTrash className="h-4 w-4" stroke={1.75} />
                </button>
              )}
              {canEdit && (
                <button
                  type="button"
                  onClick={form.handleSubmit(updateDoc)}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3.5 py-1.5 text-sm font-medium text-white transition-colors hover:bg-primary/90"
                >
                  <IconCheck className="h-4 w-4" stroke={2} />
                  Save
                </button>
              )}
            </div>
          }
          sidebar={
            <div className="space-y-4">
              <FolderPicker
                folders={folders as DocFolderOption[]}
                value={selectedFolderId}
                onChange={setSelectedFolderId}
                disabled={!canEdit}
              />
              <DocEditorSidebar
                roles={roles}
                departments={departments}
                selectedRoles={selectedRoles}
                selectedDepartments={selectedDepartments}
                onToggleRole={toggleRole}
                onToggleDepartment={toggleDepartment}
                disabled={!canEdit}
              />
            </div>
          }
        >
          <DocWritingSurface
            title={titleValue}
            onTitleChange={(v) =>
              form.setValue("name", v, { shouldValidate: true, shouldDirty: true })
            }
            titleError={
              form.formState.errors.name
                ? String(form.formState.errors.name.message)
                : undefined
            }
            titleDisabled={!canEdit}
            titlePlaceholder={
              mode === "external" ? "Link title" : "Untitled document"
            }
            footer={
              mode === "external" ? (
                <div className="flex items-center gap-2">
                  <IconWorld className="h-4 w-4 shrink-0 text-zinc-400" stroke={1.75} />
                  <input
                    type="url"
                    value={externalUrl}
                    onChange={(e) => setExternalUrl(e.target.value)}
                    disabled={!canEdit}
                    placeholder="https://docs.example.com"
                    className="w-full border-0 bg-transparent text-sm text-zinc-600 placeholder-zinc-300 focus:outline-none focus:ring-0 disabled:opacity-60 dark:text-zinc-300 dark:placeholder-zinc-600"
                  />
                </div>
              ) : undefined
            }
          >
            {mode === "internal" ? (
              <MarkdownEditor
                value={markdownContent}
                onChange={setMarkdownContent}
                onExternalLink={externalLink.prompt}
                disabled={!canEdit}
              />
            ) : (
              <p className="px-4 text-sm text-zinc-400 sm:px-6">
                This document links to an external page.
              </p>
            )}
          </DocWritingSurface>
        </DocEditorPage>
      </FormProvider>

      <ExternalLinkModal
        open={externalLink.open}
        onClose={externalLink.close}
        onProceed={externalLink.proceed}
      />

      <DeleteDocumentModal
        open={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={deleteDoc}
        loading={deleting}
      />
    </>
  );
};

EditDocument.layout = Workspace;

export default EditDocument;

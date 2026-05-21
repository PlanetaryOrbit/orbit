import type { pageWithLayout } from "@/layoutTypes";
import { workspacestate } from "@/state";
import Workspace from "@/layouts/workspace";
import { useRecoilState } from "recoil";
import { useState } from "react";
import { IconCheck, IconWorld } from "@tabler/icons-react";
import { useRouter } from "next/router";
import { withPermissionCheckSsr } from "@/utils/permissionsManager";
import axios from "axios";
import prisma from "@/utils/database";
import { FormProvider, useForm } from "react-hook-form";
import { GetServerSideProps, InferGetServerSidePropsType } from "next";
import { toast } from "react-hot-toast";
import {
  DocEditorPage,
  DocWritingSurface,
  DocEditorSidebar,
} from "@/components/docs/DocEditorPage";
import {
  DocTypePickerModal,
  ExternalLinkModal,
  useExternalLinkModal,
} from "@/components/docs/modals";
import { MarkdownEditor } from "@/components/docs/MarkdownEditor";
import { FolderPicker, type DocFolderOption } from "@/components/docs/folders";

const serializeBigInt = (obj: unknown) =>
  JSON.parse(
    JSON.stringify(obj, (_k, v) => (typeof v === "bigint" ? v.toString() : v))
  );

export const getServerSideProps: GetServerSideProps = withPermissionCheckSsr(
  async (context) => {
    const { id } = context.query;
    const [roles, departments, folders] = await Promise.all([
      prisma.role.findMany({
        where: { workspaceGroupId: Number(id) },
        orderBy: { isOwnerRole: "desc" },
      }),
      prisma.department.findMany({
        where: { workspaceGroupId: Number(id) },
        orderBy: { name: "asc" },
      }),
      prisma.documentFolder.findMany({
        where: { workspaceGroupId: Number(id) },
        select: { id: true, name: true, parentId: true, icon: true },
        orderBy: { name: "asc" },
      }),
    ]);
    return { props: serializeBigInt({ roles, departments, folders }) };
  },
  "create_docs"
);

const CreateDocument: pageWithLayout<
  InferGetServerSidePropsType<typeof getServerSideProps>
> = ({ roles, departments, folders }) => {
  const [workspace] = useRecoilState(workspacestate);
  const router = useRouter();
  const form = useForm({ defaultValues: { name: "" } });
  const externalLink = useExternalLinkModal();

  const initialFolderId =
    typeof router.query.folder === "string" ? router.query.folder : null;

  const [showTypeModal, setShowTypeModal] = useState(true);
  const [mode, setMode] = useState<"internal" | "external">("internal");
  const [markdownContent, setMarkdownContent] = useState("");
  const [externalUrl, setExternalUrl] = useState("");
  const [selectedRoles, setSelectedRoles] = useState<string[]>([]);
  const [selectedDepartments, setSelectedDepartments] = useState<string[]>([]);
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(initialFolderId);

  const docsHref = initialFolderId
    ? `/workspace/${workspace.groupId}/docs?folder=${initialFolderId}`
    : `/workspace/${workspace.groupId}/docs`;

  const toggleRole = (roleId: string) => {
    setSelectedRoles((prev) =>
      prev.includes(roleId) ? prev.filter((r) => r !== roleId) : [...prev, roleId]
    );
  };

  const toggleDepartment = (departmentId: string) => {
    setSelectedDepartments((prev) =>
      prev.includes(departmentId)
        ? prev.filter((d) => d !== departmentId)
        : [...prev, departmentId]
    );
  };

  const createDoc = async () => {
    const name = form.getValues().name?.trim();
    if (!name) {
      form.setError("name", { type: "required", message: "Title is required" });
      return;
    }

    let content: unknown = mode === "external"
      ? { external: true, url: externalUrl.trim(), title: form.getValues().name }
      : markdownContent;

    if (mode === "external" && !externalUrl.trim()) {
      form.setError("name", { type: "custom", message: "External URL required" });
      return;
    }

    try {
      const session = await axios.post(
        `/api/workspace/${workspace.groupId}/guides/create`,
        {
          name: form.getValues().name.trim(),
          content,
          roles: selectedRoles,
          departments: selectedDepartments,
          folderId: selectedFolderId,
        }
      );
      toast.success("Document created!");
      if (mode === "external") {
        router.push(docsHref);
      } else {
        router.push(`${docsHref}/${session.data.document.id}`);
      }
    } catch (err: any) {
      form.setError("name", {
        type: "custom",
        message: err?.response?.data?.error || "Failed to create",
      });
    }
  };

  const titleValue = form.watch("name") ?? "";

  return (
    <>
      <FormProvider {...form}>
        <DocEditorPage
          backHref={docsHref}
          dimmed={showTypeModal}
          actions={
            <button
              type="button"
              onClick={form.handleSubmit(createDoc)}
              className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3.5 py-1.5 text-sm font-medium text-white transition-colors hover:bg-primary/90"
            >
              <IconCheck className="h-4 w-4" stroke={2} />
              Create
            </button>
          }
          sidebar={
            <div className="space-y-4">
              <FolderPicker
                folders={folders as DocFolderOption[]}
                value={selectedFolderId}
                onChange={setSelectedFolderId}
              />
              <DocEditorSidebar
                roles={roles}
                departments={departments}
                selectedRoles={selectedRoles}
                selectedDepartments={selectedDepartments}
                onToggleRole={toggleRole}
                onToggleDepartment={toggleDepartment}
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
                    placeholder="https://docs.example.com"
                    className="w-full border-0 bg-transparent text-sm text-zinc-600 placeholder-zinc-300 focus:outline-none focus:ring-0 dark:text-zinc-300 dark:placeholder-zinc-600"
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
              />
            ) : (
              <p className="px-4 text-sm text-zinc-400 sm:px-6">
                This document links to an external page. Add the URL below.
              </p>
            )}
          </DocWritingSurface>
        </DocEditorPage>
      </FormProvider>

      <DocTypePickerModal
        open={showTypeModal}
        onClose={() => router.push(docsHref)}
        onChoose={(t) => {
          setMode(t);
          setShowTypeModal(false);
        }}
        backHref={docsHref}
      />

      <ExternalLinkModal
        open={externalLink.open}
        onClose={externalLink.close}
        onProceed={externalLink.proceed}
      />
    </>
  );
};

CreateDocument.layout = Workspace;

export default CreateDocument;

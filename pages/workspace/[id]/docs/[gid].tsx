import type { pageWithLayout } from "@/layoutTypes";
import { workspacestate } from "@/state";
import Workspace from "@/layouts/workspace";
import { useRecoilState } from "recoil";
import prisma from "@/utils/database";
import { withPermissionCheckSsr } from "@/utils/permissionsManager";
import { GetServerSideProps } from "next";
import { useRouter } from "next/router";
import { IconPencil, IconTrash, IconExternalLink, IconLink } from "@tabler/icons-react";
import { toast } from "react-hot-toast";
import axios from "axios";
import { useState } from "react";
import {
  DocEditorPage,
  DocViewSurface,
  DocViewMeta,
  DocPermissionsSidebar,
} from "@/components/docs/DocEditorPage";
import {
  DeleteDocumentModal,
  ExternalLinkModal,
  useExternalLinkModal,
} from "@/components/docs/modals";
import { DocViewer } from "@/components/docs/DocViewer";
import { isExternalContent } from "@/components/docs/content";
import { AuthenticatedRequest } from "@/lib/withAuth";

type Props = {
  document: any;
  canEdit: boolean;
  canDelete: boolean;
};

export const getServerSideProps: GetServerSideProps = withPermissionCheckSsr(
  async (context) => {
    const { gid, id } = context.query;
    const authReq = context.req as AuthenticatedRequest;
    if (!gid || !id) return { notFound: true };

    const workspaceGroupId = parseInt(id as string);

    const [user, guide, membership] = await Promise.all([
      prisma.user.findUnique({
        where: { userid: BigInt(authReq.auth.userId) },
        include: {
          roles: { where: { workspaceGroupId } },
        },
      }),
      prisma.document.findUnique({
        where: { id: gid as string },
        include: {
          owner: { select: { userid: true, username: true, picture: true } },
          roles: true,
          departments: true,
        },
      }),
      prisma.workspaceMember.findFirst({
        where: {
          workspaceGroupId,
          userId: BigInt(authReq.auth.userId),
        },
        include: { departmentMembers: true },
      }),
    ]);

    if (!guide || guide.requiresAcknowledgment) return { notFound: true };

    const userRoles = user?.roles || [];
    const isAdmin = membership?.isAdmin || false;
    const isOwner = userRoles.some((r: any) => r.isOwnerRole);
    const canEdit =
      isAdmin || userRoles.some((r: any) => r.permissions?.includes("edit_docs"));
    const canDelete =
      isAdmin || userRoles.some((r: any) => r.permissions?.includes("delete_docs"));
    const canManageDocs =
      canEdit ||
      canDelete ||
      userRoles.some((r: any) => r.permissions?.includes("create_docs"));

    const userRoleIds = userRoles.map((r: any) => r.id);
    const userDepartmentIds =
      membership?.departmentMembers.map((d) => d.departmentId) ?? [];

    const hasRoleAccess = guide.roles.some((gr) => userRoleIds.includes(gr.id));
    const hasDeptAccess = guide.departments.some((gd) =>
      userDepartmentIds.includes(gd.id)
    );
    const isOpenToAll =
      guide.roles.length === 0 && guide.departments.length === 0;

    if (!isOwner && !canManageDocs && !isOpenToAll && !hasRoleAccess && !hasDeptAccess) {
      return { notFound: true };
    }

    return {
      props: {
        document: JSON.parse(
          JSON.stringify(guide, (_k, v) => (typeof v === "bigint" ? v.toString() : v))
        ),
        canEdit,
        canDelete,
      },
    };
  }
);

const ViewDocument: pageWithLayout<Props> = ({ document, canEdit, canDelete }) => {
  const [workspace] = useRecoilState(workspacestate);
  const router = useRouter();
  const externalLink = useExternalLinkModal();
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const docsHref = `/workspace/${workspace.groupId}/docs`;
  const external = isExternalContent(document.content);
  const authorName = document.owner?.username ?? "Unknown";
  const authorId = document.owner?.userid;

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
      toast.error("Failed to delete document");
      setDeleting(false);
    }
  };

  return (
    <>
      <DocEditorPage
        backHref={docsHref}
        actions={
          canEdit || canDelete ? (
            <div className="flex items-center gap-1">
              {canEdit && (
                <button
                  type="button"
                  onClick={() => router.push(`${docsHref}/${document.id}/edit`)}
                  className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm font-medium text-zinc-500 transition-colors hover:bg-zinc-100 hover:text-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
                >
                  <IconPencil className="h-4 w-4" stroke={1.75} />
                  Edit
                </button>
              )}
              {canDelete && (
                <button
                  type="button"
                  onClick={() => setShowDeleteModal(true)}
                  className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm font-medium text-red-500 transition-colors hover:bg-red-50 dark:hover:bg-red-500/10"
                >
                  <IconTrash className="h-4 w-4" stroke={1.75} />
                </button>
              )}
            </div>
          ) : undefined
        }
        sidebar={
          <DocPermissionsSidebar
            roles={document.roles ?? []}
            departments={document.departments ?? []}
          />
        }
      >
        <DocViewSurface
          title={document.name}
          meta={
            <DocViewMeta
              authorName={authorName}
              authorId={authorId}
              workspaceId={workspace.groupId}
              createdAt={document.createdAt}
              updatedAt={document.updatedAt}
            />
          }
        >
          {external ? (
            <div className="flex flex-col items-start gap-4 py-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
                <IconLink className="h-5 w-5 text-primary" stroke={1.75} />
              </div>
              <div>
                <p className="text-sm font-medium text-zinc-700 dark:text-zinc-200">
                  External link
                </p>
                <p className="mt-1 max-w-md text-sm text-zinc-400">
                  This document points to a resource outside your workspace.
                </p>
              </div>
              <button
                type="button"
                onClick={() => externalLink.prompt(document.content.url)}
                className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3.5 py-1.5 text-sm font-medium text-white transition-colors hover:bg-primary/90"
              >
                <IconExternalLink className="h-4 w-4" stroke={2} />
                Open link
              </button>
            </div>
          ) : (
            <DocViewer content={document.content} onExternalLink={externalLink.prompt} />
          )}
        </DocViewSurface>
      </DocEditorPage>

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

ViewDocument.layout = Workspace;

export default ViewDocument;

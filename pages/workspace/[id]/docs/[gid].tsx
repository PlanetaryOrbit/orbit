import type { pageWithLayout } from "@/layoutTypes";
import { loginState, workspacestate } from "@/state";
import Workspace from "@/layouts/workspace";
import { useState, useMemo, useEffect } from "react";
import prisma from "@/utils/database";
import { useRecoilState } from "recoil";
import axios from "axios";
import Button from "@/components/button";
import StarterKit from "@tiptap/starter-kit";
import { withPermissionCheckSsr } from "@/utils/permissionsManager";
import { GetServerSideProps } from "next";
import { useRouter } from "next/router";
import { generateHTML } from "@tiptap/html";
import ReactMarkdown from "react-markdown";
import rehypeSanitize from "rehype-sanitize";
import {
  IconArrowLeft,
  IconTrash,
  IconClock,
  IconUser,
  IconEdit,
  IconExternalLink,
  IconAlertTriangle,
} from "@tabler/icons-react";
import { Toaster, toast } from "react-hot-toast";
import clsx from "clsx";
import { motion } from "framer-motion";

const BG_COLORS = [
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
  const index = (hash >>> 0) % BG_COLORS.length;
  return BG_COLORS[index];
}

type Props = {
  document: any;
  canEdit: boolean;
  canDelete: boolean;
};

export const getServerSideProps: GetServerSideProps = withPermissionCheckSsr(
  async (context) => {
    const { gid } = context.query;
    if (!gid) return { notFound: true };
    const user = await prisma.user.findUnique({
      where: {
        userid: BigInt(context.req.session.userid),
      },
      include: {
        roles: {
          where: {
            workspaceGroupId: parseInt(context.query.id as string),
          },
        },
      },
    });
    const guide = await prisma.document
      .findUnique({
        where: {
          id: gid as string,
        },
        include: {
          owner: {
            select: {
              username: true,
              picture: true,
            },
          },
          roles: true,
        },
      })
      .catch(() => null);
    if (!guide) return { notFound: true };
    const userRoles = user?.roles || [];
    const membership = await prisma.workspaceMember.findFirst({
      where: {
        workspaceGroupId: parseInt(context.query.id as string),
        userId: BigInt(context.req.session.userid),
      },
    });
    const isAdmin = membership?.isAdmin || false;
    const isOwner = userRoles.some((r: any) => r.isOwnerRole);
    const canEdit = isAdmin || userRoles.some((r: any) => r.permissions?.includes("edit_docs"));
    const canDelete = isAdmin || userRoles.some((r: any) => r.permissions?.includes("delete_docs"));
    const canManageDocs = canEdit || canDelete || userRoles.some((r: any) => r.permissions?.includes("create_docs"));
    const hasRoleAccess = guide.roles.some((gr: any) =>
      userRoles.some((ur: any) => ur.id === gr.id)
    );

    if (!isOwner && !canManageDocs && !hasRoleAccess) return { notFound: true };

    return {
      props: {
        document: JSON.parse(
          JSON.stringify(guide, (key, value) =>
            typeof value === "bigint" ? value.toString() : value
          )
        ),
        canEdit,
        canDelete,
      },
    };
  }
);

const Settings: pageWithLayout<Props> = ({ document, canEdit, canDelete }) => {
  const [login, setLogin] = useRecoilState(loginState);
  const [workspace, setWorkspace] = useRecoilState(workspacestate);
  const router = useRouter();
  const [wallMessage, setWallMessage] = useState("");
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showExternalLinkModal, setShowExternalLinkModal] = useState(false);
  const [pendingUrl, setPendingUrl] = useState<string | null>(null);
  const friendlyDate = `${new Date(
    document.createdAt
  ).toLocaleDateString()} at ${new Date(
    document.createdAt
  ).toLocaleTimeString()}`;

  const output = useMemo(() => {
    try {
      if (typeof document.content === "string") {
        return { type: "markdown", content: document.content };
      }
      if (document.content && (document.content as any).external) {
        return { type: "external", content: document.content };
      }
      const html = generateHTML(document.content as Object, [StarterKit]);
      return { type: "html", content: html };
    } catch (e) {
      return { type: "markdown", content: String(document.content) };
    }
  }, [document.content]);

  useEffect(() => {
    try {
      if (output?.type === "external") {
        const target = `/workspace/${workspace.groupId}/docs`;
        if (router.asPath !== target) {
          router.replace(target);
        }
      }
    } catch (e) {

    }
  }, [output, router, workspace.groupId]);

  const deleteDoc = async () => {
    await axios.post(
      `/api/workspace/${workspace.groupId}/guides/${document.id}/delete`,
      {},
      {}
    );
    toast.success("Deleted");
    router.push(`/workspace/${workspace.groupId}/docs`);
  };

  const confirmDelete = async () => {
    await deleteDoc();
    setShowDeleteModal(false);
  };

  const handleExternalLink = (url: string) => {
    setPendingUrl(url);
    setShowExternalLinkModal(true);
  };

  const proceedWithLink = () => {
    if (pendingUrl) {
      window.open(pendingUrl, "_blank");
    }
    setShowExternalLinkModal(false);
    setPendingUrl(null);
  };

  const cancelLink = () => {
    setShowExternalLinkModal(false);
    setPendingUrl(null);
  };

  return (
    <div className="pagePadding">
      <Toaster position="bottom-center" />
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <div className="flex items-center gap-4 mb-6">
            <button
              onClick={() =>
                router.push(`/workspace/${workspace.groupId}/docs`)
              }
              className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors"
            >
              <IconArrowLeft className="w-5 h-5 text-zinc-500" />
            </button>
            <h1 className="text-4xl font-bold text-zinc-900 dark:text-white">
              {document.name}
            </h1>
          </div>

          <div className="flex items-center gap-6 text-sm text-zinc-500">
            <div className="flex items-center gap-2">
              <div
                className={`h-5 w-5 rounded-full flex items-center justify-center overflow-hidden ${getRandomBg(
                  "",
                  document.owner?.username || ""
                )}`}
              >
                <img
                  src={document.owner?.picture || "/default-avatar.jpg"}
                  alt={`${document.owner?.username}'s avatar`}
                  className="h-5 w-5 object-cover rounded-full border-2 border-white"
                />
              </div>
              <span>Created by {document.owner.username}</span>
            </div>
            <div className="flex items-center gap-2">
              <IconClock className="w-4 h-4" />
              <span>Last updated {friendlyDate}</span>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-zinc-800 rounded-xl shadow-sm p-8">
          <div className="prose dark:prose-invert max-w-none">
            {output.type === "html" && (
              <div
                dangerouslySetInnerHTML={{ __html: output.content }}
                onClick={(e) => {
                  const target = e.target as HTMLElement;
                  const link = target.closest("a");
                  if (link && link.href) {
                    const href = link.getAttribute("href");
                    if (
                      href &&
                      (href.startsWith("http://") ||
                        href.startsWith("https://"))
                    ) {
                      e.preventDefault();
                      handleExternalLink(href);
                    }
                  }
                }}
              />
            )}
            {output.type === "markdown" && (
              <ReactMarkdown
                rehypePlugins={[rehypeSanitize]}
                components={{
                  a: ({ node, href, children, ...props }: any) => {
                    const isExternal =
                      href &&
                      (href.startsWith("http://") ||
                        href.startsWith("https://"));
                    return (
                      <a
                        {...props}
                        href={href}
                        onClick={(e) => {
                          if (isExternal && href) {
                            e.preventDefault();
                            handleExternalLink(href);
                          }
                        }}
                        className="text-primary hover:text-primary/80 underline"
                      >
                        {children}
                      </a>
                    );
                  },
                }}
              >
                {output.content}
              </ReactMarkdown>
            )}
            {output.type === "external" && <div className=""></div>}
          </div>
        </div>
      </div>
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-zinc-800 rounded-lg shadow-xl p-6 w-full max-w-sm text-center">
            <h2 className="text-lg font-semibold text-zinc-900 dark:text-white mb-4">
              Confirm Deletion
            </h2>
            <p className="text-sm text-zinc-600 dark:text-zinc-300 mb-6">
              Are you sure you want to delete this Document? This action cannot
              be undone.
            </p>
            <div className="flex justify-center gap-4">
              <button
                onClick={() => setShowDeleteModal(false)}
                className="px-4 py-2 rounded-md bg-zinc-100 dark:bg-zinc-700 hover:bg-zinc-200 dark:hover:bg-zinc-600 text-zinc-800 dark:text-white"
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {showExternalLinkModal && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/50 z-50 p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.18 }}
            role="dialog"
            aria-modal="true"
            aria-labelledby="external-link-title"
            className="w-full max-w-md bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl border border-zinc-800 overflow-hidden"
          >
            <div className="px-6 py-5 sm:px-8">
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 mt-0.5">
                  <div className="h-12 w-12 rounded-lg bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-white shadow-md">
                    <IconAlertTriangle size={24} />
                  </div>
                </div>

                <div className="flex-1">
                  <h2
                    id="external-link-title"
                    className="text-lg font-semibold text-zinc-900 dark:text-zinc-100"
                  >
                    External Link Warning
                  </h2>
                  <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                    This is a link submitted by a member in this workspace.
                    Links are not verified by Planetary so please proceed at
                    your own risk.
                  </p>
                </div>
              </div>

              <div className="mt-5 flex items-center gap-3">
                <button
                  type="button"
                  onClick={proceedWithLink}
                  className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-[#ff0099] hover:bg-[#ff0099]/95 text-white font-medium shadow-md"
                >
                  <IconExternalLink size={18} />
                  Continue
                </button>

                <button
                  type="button"
                  onClick={cancelLink}
                  className="inline-flex items-center justify-center px-4 py-2 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-100/90"
                >
                  Cancel
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
};

Settings.layout = Workspace;

export default Settings;

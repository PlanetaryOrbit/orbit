import type { pageWithLayout } from "@/layoutTypes";
import { loginState } from "@/state";
import Workspace from "@/layouts/workspace";
import { useRecoilState } from "recoil";
import { useRouter } from "next/router";
import { useMemo } from "react";
import prisma, { document } from "@/utils/database";
import { GetServerSideProps } from "next";
import randomText from "@/utils/randomText";
import { withPermissionCheckSsr } from "@/utils/permissionsManager";
import {
  IconFileText,
  IconPlus,
  IconClock,
  IconUser,
  IconArrowLeft,
  IconAlertTriangle,
  IconExternalLink,
  IconLink,
} from "@tabler/icons-react";
import clsx from "clsx";
import { Toaster } from "react-hot-toast";
import { motion } from "framer-motion";
import { useState } from "react";

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

export const getServerSideProps = withPermissionCheckSsr(
  async (context: any) => {
    const { id } = context.query;
    const userid = context.req.session.userid;
    if (!userid) {
      return {
        redirect: {
          destination: "/login",
        },
      };
    }
    if (!id) {
      return {
        notFound: true,
      };
    }
    const user = await prisma.user.findFirst({
      where: {
        userid: userid,
      },
      include: {
        roles: {
          where: {
            workspaceGroupId: parseInt(id as string),
          },
        },
        workspaceMemberships: {
          where: {
            workspaceGroupId: parseInt(id as string),
          },
        },
      },
    });
    if (!user) {
      return {
        redirect: {
          destination: "/login",
        },
      };
    }

    const config = await prisma.config.findFirst({
      where: {
        workspaceGroupId: parseInt(id as string),
        key: "guides",
      },
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

    if (!guidesEnabled) {
      return { notFound: true };
    }

    const membership = user.workspaceMemberships?.[0];
    const isAdmin = membership?.isAdmin || false;
    const userRoleIds = (user.roles || []).map((r: any) => r.id);
    const canCreate = isAdmin || (user.roles || []).some(
      (r: any) => (r.permissions || []).includes("create_docs")
    );
    const canEdit = isAdmin || (user.roles || []).some(
      (r: any) => (r.permissions || []).includes("edit_docs")
    );
    const canDelete = isAdmin || (user.roles || []).some(
      (r: any) => (r.permissions || []).includes("delete_docs")
    );
    const canManage = canCreate || canEdit || canDelete;
    if (canManage) {
      const docs = await prisma.document.findMany({
        where: {
          workspaceGroupId: parseInt(id as string),
          requiresAcknowledgment: false,
        },
        include: {
          owner: {
            select: {
              username: true,
              picture: true,
            },
          },
        },
      });
      return {
        props: {
          documents: JSON.parse(
            JSON.stringify(docs, (key, value) =>
              typeof value === "bigint" ? value.toString() : value
            )
          ) as typeof docs,
          canCreate,
          canEdit,
          canDelete,
        },
      };
    }
    const docs = await prisma.document.findMany({
      where: {
        workspaceGroupId: parseInt(id as string),
        requiresAcknowledgment: false,
        roles: {
          some: {
            id: { in: userRoleIds },
          },
        },
      },
      include: {
        owner: {
          select: {
            username: true,
            picture: true,
          },
        },
      },
    });
    return {
      props: {
        documents: JSON.parse(
          JSON.stringify(docs, (key, value) =>
            typeof value === "bigint" ? value.toString() : value
          )
        ),
        canCreate: false,
        canEdit: false,
        canDelete: false,
      },
    };
  }
);

type pageProps = {
  documents: (document & { owner: { username: string; picture: string } })[];
  canCreate: boolean;
  canEdit: boolean;
  canDelete: boolean;
};
const Home: pageWithLayout<pageProps> = ({ documents, canCreate, canEdit, canDelete }) => {
  const [login, setLogin] = useRecoilState(loginState);
  const text = useMemo(
    () => randomText(login.displayname),
    [login.displayname]
  );
  const router = useRouter();
  const [showExternalLinkModal, setShowExternalLinkModal] = useState(false);
  const [pendingUrl, setPendingUrl] = useState<string | null>(null);

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

  const goToGuide = (doc: any) => {
    if (doc && doc.content && (doc.content as any).external) {
      try {
        const url = (doc.content as any).url;
        handleExternalLink(url);
        return;
      } catch (e) {
        // icba to add ts
      }
    }
    router.push(`/workspace/${router.query.id}/docs/${doc.id}`);
  };

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-900">
      <Toaster position="bottom-center" />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <div>
            <h1 className="text-xl font-medium text-zinc-900 dark:text-white">
              Documents
            </h1>
            <p className="text-sm text-zinc-500 dark:text-zinc-300">
              Create and manage your workspace documentation
            </p>
          </div>
        </div>

        {/* New Document Button */}
        {canCreate ? (
          <button
            onClick={() =>
              router.push(`/workspace/${router.query.id}/docs/new`)
            }
            className="w-full bg-white dark:bg-zinc-800 rounded-lg shadow-sm p-4 mb-4 hover:shadow-md transition-shadow group"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                <IconPlus className="w-5 h-5 text-primary" />
              </div>
              <div className="flex-1 text-left">
                <h3 className="text-lg font-medium text-zinc-900 dark:text-white">
                  New Document
                </h3>
                <p className="text-sm text-zinc-500 dark:text-zinc-300 mt-0.5">
                  Create a new document for your workspace
                </p>
              </div>
            </div>
          </button>
        ) : (
          <div className="bg-white dark:bg-zinc-800 border border-zinc-100 dark:border-zinc-700 rounded-xl shadow-sm p-4 mb-8 text-sm text-zinc-600 dark:text-zinc-400">
            You don't have permission to create documents.
          </div>
        )}

        {/* Documents Grid */}
        {documents.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {documents.map((document) => (
              <div
                key={document.id}
                onClick={() => goToGuide(document)}
                className="relative bg-white dark:bg-zinc-800 rounded-lg shadow-sm p-4 hover:shadow-md transition-all text-left group cursor-pointer"
              >
                {(canEdit || canDelete) && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      router.push(
                        `/workspace/${router.query.id}/docs/${document.id}/edit`
                      );
                    }}
                    className="absolute right-3 top-3 p-1.5 rounded-md text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-700"
                    aria-label="Edit document"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="w-4 h-4"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M12 20h9" />
                      <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z" />
                    </svg>
                  </button>
                )}
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                    {document.content && (document.content as any).external ? (
                      <IconLink className="w-5 h-5 text-primary" />
                    ) : (
                      <IconFileText className="w-5 h-5 text-primary" />
                    )}
                  </div>
                  <div className="flex-1">
                    <h3 className="text-base font-medium text-zinc-900 dark:text-white group-hover:text-primary transition-colors">
                      {document.name}
                    </h3>
                    <div className="mt-3 flex items-center gap-3 text-xs text-zinc-500 dark:text-zinc-300">
                      <div className="flex items-center gap-1.5">
                        <div
                          className={`h-5 w-5 rounded-full flex items-center justify-center overflow-hidden ${getRandomBg(
                            "",
                            document.owner?.username || ""
                          )}`}
                        >
                          <img
                            src={
                              document.owner?.picture || "/default-avatar.jpg"
                            }
                            alt={`${document.owner?.username}'s avatar`}
                            className="h-5 w-5 object-cover rounded-full border-2 border-white"
                            onError={(e) => {
                              e.currentTarget.src = "/default-avatar.jpg";
                            }}
                          />
                        </div>
                        <span>{document.owner?.username}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <IconClock className="w-3.5 h-3.5" />
                        <span>
                          {new Date(document.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-white dark:bg-zinc-800 rounded-lg shadow-sm p-8 text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-primary/10 flex items-center justify-center">
              <IconFileText className="w-8 h-8 text-primary" />
            </div>
            <h3 className="text-lg font-medium text-zinc-900 dark:text-white mb-1">
              No documents yet
            </h3>
            {canCreate && (
              <>
                <p className="text-sm text-zinc-500 dark:text-zinc-300 mb-4">
                  Get started by creating your first document
                </p>
                <button
                  onClick={() =>
                    router.push(`/workspace/${router.query.id}/docs/new`)
                  }
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-primary text-white text-sm rounded-md hover:bg-primary/90 transition-colors"
                >
                  <IconPlus className="w-4 h-4" />
                  Create Document
                </button>
              </>
            )}
            {!canCreate && (
              <>
                <p className="text-sm text-zinc-500 dark:text-zinc-300 mb-4">
                  Contact your workspace admin to create a document.
                </p>
              </>
            )}
          </div>
        )}
      </div>

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

Home.layout = Workspace;

export default Home;

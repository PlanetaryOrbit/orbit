import axios from "axios";
import React, { useState } from "react";
import type { document, user } from "@/utils/database";
import { useRouter } from "next/router";
import { IconFileText, IconAlertTriangle, IconExternalLink } from "@tabler/icons-react";
import { motion } from "framer-motion";
import { HomeEmpty, HomeList, HomeListItem } from "@/components/home/shell";

const Docs: React.FC = () => {
  const [docs, setDocs] = useState<(document & { owner: user })[]>([]);
  const [showExternalLinkModal, setShowExternalLinkModal] = useState(false);
  const [pendingUrl, setPendingUrl] = useState<string | null>(null);
  const router = useRouter();
  const workspaceId = router.query.id as string;

  React.useEffect(() => {
    if (!workspaceId) return;
    axios.get(`/api/workspace/${workspaceId}/home/docs`).then((res) => {
      if (res.status === 200) setDocs(res.data.docs);
    });
  }, [workspaceId]);

  const openDoc = (doc: document) => {
    if (
      doc.content &&
      typeof doc.content === "object" &&
      (doc.content as { external?: boolean; url?: string }).external &&
      (doc.content as { url?: string }).url
    ) {
      setPendingUrl((doc.content as { url: string }).url);
      setShowExternalLinkModal(true);
      return;
    }
    router.push(`/workspace/${workspaceId}/docs/${doc.id}`);
  };

  if (docs.length === 0) {
    return (
      <HomeEmpty
        action={{
          label: "Browse documents",
          onClick: () => router.push(`/workspace/${workspaceId}/docs`),
        }}
      >
        No documents published yet.
      </HomeEmpty>
    );
  }

  return (
    <>
      <HomeList>
        {docs.slice(0, 3).map((doc) => (
          <HomeListItem key={doc.id}>
            <button
              type="button"
              onClick={() => openDoc(doc)}
              className="flex w-full items-start gap-3 text-left"
            >
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-zinc-100 dark:bg-zinc-800">
                <IconFileText className="h-4 w-4 text-zinc-500 dark:text-zinc-400" stroke={1.75} />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-zinc-900 dark:text-white truncate">
                  {doc.name}
                </p>
                <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
                  {doc.owner?.username ? `By ${doc.owner.username}` : "Unknown author"}
                </p>
              </div>
            </button>
          </HomeListItem>
        ))}
      </HomeList>

      {showExternalLinkModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.18 }}
            role="dialog"
            aria-modal="true"
            className="w-full max-w-md overflow-hidden rounded-lg border border-zinc-200 bg-white shadow-xl dark:border-zinc-700 dark:bg-zinc-900"
          >
            <div className="px-5 py-4">
              <div className="flex items-start gap-3">
                <IconAlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-zinc-500" stroke={1.75} />
                <div>
                  <h2 className="text-base font-semibold text-zinc-900 dark:text-white">
                    External link
                  </h2>
                  <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                    This link was added by a workspace member and is not verified by Planetary.
                  </p>
                </div>
              </div>
              <div className="mt-4 flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    if (pendingUrl) window.open(pendingUrl, "_blank");
                    setShowExternalLinkModal(false);
                    setPendingUrl(null);
                  }}
                  className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-white hover:bg-primary/90"
                >
                  <IconExternalLink className="h-4 w-4" />
                  Continue
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowExternalLinkModal(false);
                    setPendingUrl(null);
                  }}
                  className="rounded-md border border-zinc-200 px-3 py-1.5 text-sm font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
                >
                  Cancel
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </>
  );
};

export default Docs;

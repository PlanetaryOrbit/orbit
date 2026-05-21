import axios from "axios";
import React, { useState } from "react";
import type { document, user } from "@/utils/database";
import { useRouter } from "next/router";
import { IconFileText, IconLink } from "@tabler/icons-react";
import { HomeEmpty, HomeList, HomeListItem } from "@/components/home/shell";
import { ExternalLinkModal, useExternalLinkModal } from "@/components/docs/modals";
import { isExternalContent } from "@/components/docs/content";

const Docs: React.FC = () => {
  const [docs, setDocs] = useState<(document & { owner: user })[]>([]);
  const router = useRouter();
  const workspaceId = router.query.id as string;
  const externalLink = useExternalLinkModal();

  React.useEffect(() => {
    if (!workspaceId) return;
    axios.get(`/api/workspace/${workspaceId}/home/docs`).then((res) => {
      if (res.status === 200) setDocs(res.data.docs);
    });
  }, [workspaceId]);

  const openDoc = (doc: document) => {
    if (isExternalContent(doc.content)) {
      externalLink.prompt(doc.content.url);
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
        {docs.slice(0, 3).map((doc) => {
          const external = isExternalContent(doc.content);
          return (
            <HomeListItem key={doc.id}>
              <button
                type="button"
                onClick={() => openDoc(doc)}
                className="flex w-full items-start gap-3 text-left"
              >
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-zinc-100 dark:bg-zinc-800">
                  {external ? (
                    <IconLink className="h-4 w-4 text-zinc-500 dark:text-zinc-400" stroke={1.75} />
                  ) : (
                    <IconFileText className="h-4 w-4 text-zinc-500 dark:text-zinc-400" stroke={1.75} />
                  )}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-zinc-900 dark:text-white">
                    {doc.name}
                  </p>
                  <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
                    {doc.owner?.username ? `By ${doc.owner.username}` : "Unknown author"}
                  </p>
                </div>
              </button>
            </HomeListItem>
          );
        })}
      </HomeList>

      <ExternalLinkModal
        open={externalLink.open}
        onClose={externalLink.close}
        onProceed={externalLink.proceed}
      />
    </>
  );
};

export default Docs;

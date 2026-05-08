"use client";

import type toast from "react-hot-toast";
import { useRecoilState } from "recoil";
import { workspacestate, loginState } from "@/state";
import type { FC } from "@/types/settingsComponent";
import { IconShieldLock, IconTrash, IconTransfer } from "@tabler/icons-react";
import clsx from "clsx";
import { useState } from "react";
import DeleteWorkspace from "./delete";
import TransferOwnership from "./transfer";
import { useRouter } from "next/router";

type props = {
  triggerToast: typeof toast;
  isAdmin?: boolean;
};

const Admin: FC<props> = ({ triggerToast, isAdmin }) => {
  const [workspace] = useRecoilState(workspacestate);
  const [loginInfo] = useRecoilState(loginState);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showTransferModal, setShowTransferModal] = useState(false);
  const router = useRouter();
  
  const isOwner = isAdmin !== undefined ? isAdmin : workspace.isAdmin === true;

  if (!isOwner) {
    return null;
  }

  return (
    <div className="space-y-5">
      <div className="flex gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary ring-1 ring-primary/20">
          <IconShieldLock size={20} stroke={1.75} />
        </div>
        <p className="text-sm text-zinc-600 dark:text-zinc-300 leading-relaxed">
          As the workspace owner, you can transfer ownership to another member or permanently delete this workspace and its data.
        </p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
        <button
          type="button"
          onClick={() => setShowTransferModal(true)}
          className={clsx(
            "flex flex-col items-start text-left gap-2 rounded-xl border-2 border-primary/25 bg-primary/5 dark:bg-primary/10 px-4 py-4 transition-all",
            "hover:border-primary/50 hover:bg-primary/10 dark:hover:bg-primary/15 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 dark:focus-visible:ring-offset-zinc-900"
          )}
        >
          <span className="flex items-center gap-2 text-sm font-semibold text-zinc-900 dark:text-white">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-white shadow-sm">
              <IconTransfer size={18} stroke={1.75} />
            </span>
            Transfer ownership
          </span>
          <span className="text-xs text-zinc-500 dark:text-zinc-400 pl-[2.75rem]">
            Hand off admin control to a trusted member. You will lose owner privileges after confirmation.
          </span>
        </button>
        <button
          type="button"
          onClick={() => setShowDeleteModal(true)}
          className={clsx(
            "flex flex-col items-start text-left gap-2 rounded-xl border-2 border-red-200 dark:border-red-900/50 bg-red-50/50 dark:bg-red-950/20 px-4 py-4 transition-all",
            "hover:border-red-300 dark:hover:border-red-800 hover:bg-red-50 dark:hover:bg-red-950/30 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-zinc-900"
          )}
        >
          <span className="flex items-center gap-2 text-sm font-semibold text-red-800 dark:text-red-200">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-red-600 text-white shadow-sm dark:bg-red-500">
              <IconTrash size={18} stroke={1.75} />
            </span>
            Delete workspace
          </span>
          <span className="text-xs text-red-700/80 dark:text-red-300/80 pl-[2.75rem]">
            Irreversible. All workspace data, settings, and history tied to this space will be removed.
          </span>
        </button>
      </div>

      <DeleteWorkspace
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        workspaceId={workspace.groupId}
        workspaceName={workspace.groupName || ""}
        onSuccess={() => router.push("/")}
      />
      <TransferOwnership
        isOpen={showTransferModal}
        onClose={() => setShowTransferModal(false)}
        workspaceId={workspace.groupId}
        currentOwnerId={BigInt(loginInfo.userId || 0)}
        onSuccess={() => {
          setShowTransferModal(false);
          triggerToast.success("You are no longer the workspace owner");
          setTimeout(() => router.push("/"), 2000);
        }}
      />
    </div>
  );
};

Admin.title = "Workspace Administration";

export default Admin;

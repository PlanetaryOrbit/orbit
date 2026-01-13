"use client";

import type toast from "react-hot-toast";
import { useRecoilState } from "recoil";
import { workspacestate, loginState } from "@/state";
import type { FC } from "@/types/settingsComponent";
import { IconTrash, IconTransfer } from "@tabler/icons-react";
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
    <div>
      <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-4">
        As the workspace owner, you can transfer ownership or delete this workspace.
      </p>
      <div className="flex flex-col sm:flex-row gap-3">
        <button
          onClick={() => setShowTransferModal(true)}
          className={clsx(
            "flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium rounded-md transition-colors",
            "bg-blue-600 dark:bg-blue-500 text-white",
            "hover:bg-blue-700 dark:hover:bg-blue-600"
          )}
        >
          <IconTransfer size={18} />
          Transfer Ownership
        </button>
        <button
          onClick={() => setShowDeleteModal(true)}
          className={clsx(
            "flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium rounded-md transition-colors",
            "bg-red-600 dark:bg-red-500 text-white",
            "hover:bg-red-700 dark:hover:bg-red-600"
          )}
        >
          <IconTrash size={18} />
          Delete Workspace
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

import React, { FC, useState } from "react";
import { IconAlertTriangle, IconX } from "@tabler/icons-react";
import axios from "axios";
import toast from "react-hot-toast";
import clsx from "clsx";

interface DeleteWorkspaceProps {
  isOpen: boolean;
  onClose: () => void;
  workspaceId: number;
  workspaceName: string;
  onSuccess: () => void;
}

const DeleteWorkspace: FC<DeleteWorkspaceProps> = ({
  isOpen,
  onClose,
  workspaceId,
  workspaceName,
  onSuccess,
}) => {
  const [inputValue, setInputValue] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    if (inputValue !== workspaceName) {
      toast.error("Workspace name does not match");
      return;
    }

    setIsDeleting(true);
    try {
      const res = await axios.delete(
        `/api/workspace/${workspaceId}/settings/general/deletews`
      );

      if (res.status === 200) {
        toast.success("Workspace deleted successfully");
        setInputValue("");
        onClose();
        onSuccess();
      }
    } catch (error: any) {
      console.error("Failed to delete workspace:", error);
      toast.error(
        error?.response?.data?.error || "Failed to delete workspace"
      );
    } finally {
      setIsDeleting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white dark:bg-zinc-900 rounded-lg shadow-xl max-w-md w-full mx-4">
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-zinc-700">
          <div className="flex items-center gap-3">
            <IconAlertTriangle className="text-red-500" size={24} />
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              Delete Workspace
            </h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            <IconX size={20} />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              This action is <strong>permanent and cannot be undone</strong>.
            </p>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              All workspace data, including members, sessions, documents, and settings will be completely removed.
            </p>
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            To confirm deletion, please type the workspace name below:
          </p>
          <div>
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Workspace name: <span className="text-red-500 font-bold">{workspaceName}</span>
            </p>
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder="Type workspace name to confirm"
              className={clsx(
                "w-full px-3 py-2 border rounded-md text-sm transition-colors",
                "bg-white dark:bg-zinc-800 text-gray-900 dark:text-white",
                "border-gray-300 dark:border-zinc-600",
                "focus:outline-none focus:ring-2",
                inputValue === workspaceName
                  ? "focus:ring-red-500 border-red-500 dark:border-red-500"
                  : "focus:ring-zinc-500"
              )}
            />
          </div>
        </div>

        <div className="flex gap-3 p-6 border-t border-gray-200 dark:border-zinc-700">
          <button
            onClick={onClose}
            disabled={isDeleting}
            className={clsx(
              "flex-1 px-4 py-2 text-sm font-medium rounded-md transition-colors",
              "border border-gray-300 dark:border-zinc-600",
              "text-gray-700 dark:text-gray-300",
              "hover:bg-gray-50 dark:hover:bg-zinc-800",
              isDeleting && "opacity-50 cursor-not-allowed"
            )}
          >
            Cancel
          </button>
          <button
            onClick={handleDelete}
            disabled={inputValue !== workspaceName || isDeleting}
            className={clsx(
              "flex-1 px-4 py-2 text-sm font-medium rounded-md transition-colors",
              "text-white",
              inputValue === workspaceName
                ? "bg-red-500 hover:bg-red-600"
                : "bg-gray-400 cursor-not-allowed",
              isDeleting && "opacity-70 cursor-not-allowed"
            )}
          >
            {isDeleting ? "Deleting..." : "Delete Workspace"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default DeleteWorkspace;

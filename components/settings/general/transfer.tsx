import React, { FC, useState, useEffect } from "react";
import { IconArrowRight, IconX, IconCheck, IconTransfer } from "@tabler/icons-react";
import axios from "axios";
import toast from "react-hot-toast";
import clsx from "clsx";

interface WorkspaceMember {
  userId: bigint;
  username: string;
  displayName?: string;
  thumbnail?: string;
  registered?: boolean;
}

interface TransferOwnershipProps {
  isOpen: boolean;
  onClose: () => void;
  workspaceId: number;
  currentOwnerId: bigint;
  onSuccess: () => void;
}

const TransferOwnership: FC<TransferOwnershipProps> = ({
  isOpen,
  onClose,
  workspaceId,
  currentOwnerId,
  onSuccess,
}) => {
  const [members, setMembers] = useState<WorkspaceMember[]>([]);
  const [selectedMemberId, setSelectedMemberId] = useState<bigint | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isTransferring, setIsTransferring] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [isCloudUser, setIsCloudUser] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchMembers();
    }
  }, [isOpen]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      setIsCloudUser(window.location.hostname.endsWith(".planetaryapp.cloud"));
    }
  }, []);

  const fetchMembers = async () => {
    setIsLoading(true);
    try {
      const res = await axios.get(`/api/workspace/${workspaceId}/users`);
      if (res.data && Array.isArray(res.data)) {
        const filteredMembers = res.data
          .filter((m: any) => Boolean(m.registered))
          .filter((m: any) => BigInt(m.userid) !== currentOwnerId)
          .map((m: any) => ({
            userId: BigInt(m.userid),
            username: m.username || "Unknown",
            displayName: m.username || "Unknown",
            thumbnail: m.picture || "",
            registered: Boolean(m.registered),
          }));
        setMembers(filteredMembers);
      }
    } catch (error: any) {
      console.error("Failed to fetch members:", error);
      toast.error("Failed to load workspace members");
    } finally {
      setIsLoading(false);
    }
  };

  const handleTransfer = async () => {
    if (!selectedMemberId) {
      toast.error("Please select a member");
      return;
    }

    setIsTransferring(true);
    try {
      const res = await axios.patch(
        `/api/workspace/${workspaceId}/settings/general/transfer`,
        {
          newOwnerId: selectedMemberId.toString(),
        }
      );

      if (res.status === 200) {
        toast.success("Ownership transferred successfully");
        setSelectedMemberId(null);
        setShowConfirm(false);
        onClose();
        onSuccess();
      }
    } catch (error: any) {
      console.error("Failed to transfer ownership:", error);
      toast.error(
        error?.response?.data?.error || "Failed to transfer ownership"
      );
    } finally {
      setIsTransferring(false);
    }
  };

  if (!isOpen) return null;

  const selectedMember = members.find((m) => m.userId === selectedMemberId);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white dark:bg-zinc-900 rounded-lg shadow-xl max-w-md w-full mx-4">
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-zinc-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            Transfer Ownership
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            <IconX size={20} />
          </button>
        </div>

        <div className="p-6 space-y-4">
          {isCloudUser && (
            <div className="mb-4 p-3 rounded-md bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
              <h2 className="text-sm text-blue-800 dark:text-blue-200 font-medium">
                Planetary Cloud
              </h2>
              <p className="text-xs text-blue-700 dark:text-blue-300 mt-1">
                This action only transfers workspace ownership, not the
                Planetary Cloud instance.
              </p>
            </div>
          )}

          {!showConfirm ? (
            <>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Select a workspace member to transfer ownership to.
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  They must already be a member of this workspace.
                </p>
              </div>

              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="text-gray-500 dark:text-gray-400">
                    Loading members...
                  </div>
                </div>
              ) : members.length === 0 ? (
                <div className="flex items-center justify-center py-8">
                  <div className="text-gray-500 dark:text-gray-400">
                    No registered members found
                  </div>
                </div>
              ) : (
                <div className="max-h-64 overflow-y-auto space-y-2">
                  {members.map((member) => (
                    <button
                      key={member.userId.toString()}
                      onClick={() => setSelectedMemberId(member.userId)}
                      className={clsx(
                        "w-full flex items-center gap-3 p-3 rounded-lg border transition-colors text-left",
                        selectedMemberId === member.userId
                          ? "border-blue-500 bg-blue-50 dark:bg-blue-950"
                          : "border-gray-200 dark:border-zinc-700 hover:border-gray-300 dark:hover:border-zinc-600"
                      )}
                    >
                      {member.thumbnail && (
                        <img
                          src={member.thumbnail}
                          alt={member.username}
                          className="w-10 h-10 rounded-full"
                        />
                      )}
                      <div className="flex-1">
                        <p className="font-medium text-gray-900 dark:text-white">
                          {member.displayName || member.username}
                        </p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          @{member.username}
                        </p>
                      </div>
                      {selectedMemberId === member.userId && (
                        <IconCheck size={20} className="text-blue-500" />
                      )}
                    </button>
                  ))}
                </div>
              )}
            </>
          ) : (
            <>
              <div className="space-y-4">
                <p className="text-sm font-medium text-gray-900 dark:text-white">
                  Confirm ownership transfer:
                </p>
                <div className="flex items-center gap-3">
                  <div className="flex-1">
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      Current Owner
                    </p>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      You
                    </p>
                  </div>
                  <IconArrowRight size={20} className="text-gray-400" />
                  <div className="flex-1 text-right">
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      New Owner
                    </p>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      {selectedMember?.displayName || selectedMember?.username}
                    </p>
                  </div>
                </div>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                This action is <strong>permanent</strong>. The new owner will
                have full control over the workspace, and you will lose owner
                privileges.
              </p>
            </>
          )}
        </div>

        <div className="flex gap-3 p-6 border-t border-gray-200 dark:border-zinc-700">
          <button
            onClick={showConfirm ? () => setShowConfirm(false) : onClose}
            disabled={isTransferring}
            className={clsx(
              "flex-1 px-4 py-2 text-sm font-medium rounded-md transition-colors",
              "border border-gray-300 dark:border-zinc-600",
              "text-gray-700 dark:text-gray-300",
              "hover:bg-gray-50 dark:hover:bg-zinc-800",
              isTransferring && "opacity-50 cursor-not-allowed"
            )}
          >
            {showConfirm ? "Back" : "Cancel"}
          </button>
          <button
            onClick={showConfirm ? handleTransfer : () => setShowConfirm(true)}
            disabled={!selectedMemberId || isTransferring}
            className={clsx(
              "flex-1 px-4 py-2 text-sm font-medium rounded-md transition-colors",
              "text-white",
              selectedMemberId
                ? "bg-blue-500 hover:bg-blue-600"
                : "bg-gray-400 cursor-not-allowed",
              isTransferring && "opacity-70 cursor-not-allowed"
            )}
          >
            {isTransferring
              ? "Transferring..."
              : showConfirm
              ? "Confirm Transfer"
              : "Next"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default TransferOwnership;

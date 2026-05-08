"use client";

import { useState, useEffect } from "react";
import {
  IconKey,
  IconTrash,
  IconCopy,
  IconPlus,
  IconCalendar,
  IconClock,
  IconChevronDown,
} from "@tabler/icons-react";
import axios from "axios";
import { useRouter } from "next/router";
import { Dialog } from "@headlessui/react";
import { motion } from "framer-motion";
import clsx from "clsx";

interface ApiKey {
  id: string;
  name: string;
  key: string;
  lastUsedAt: string | null;
  createdAt: string;
  expiresAt: string | null;
  createdBy: {
    userid: number;
    username: string;
    picture: string;
  } | null;
}

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

export const ApiKeys = ({ triggerToast }: { triggerToast: any }) => {
  const router = useRouter();
  const { id: workspaceId } = router.query;
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedKey, setSelectedKey] = useState<ApiKey | null>(null);
  const [newKeyData, setNewKeyData] = useState({
    name: "",
    expiresIn: "90days",
  });
  const [createdKey, setCreatedKey] = useState<{ key: string } | null>(null);

  useEffect(() => {
    fetchApiKeys();
  }, [workspaceId]);

  const fetchApiKeys = async () => {
    try {
      const { data } = await axios.get(
        `/api/workspace/${workspaceId}/settings/api-keys`
      );
      if (data.success) {
        setApiKeys(data.apiKeys);
      }
    } catch (error) {
      console.error("Error fetching API keys:", error);
      triggerToast.error("Failed to fetch API keys");
    } finally {
      setLoading(false);
    }
  };

  const createApiKey = async () => {
    try {
      const { data } = await axios.post(
        `/api/workspace/${workspaceId}/settings/api-keys/create`,
        newKeyData
      );
      if (data.success) {
        setCreatedKey(data.apiKey);
        fetchApiKeys();
        triggerToast.success("API key created successfully");
      }
    } catch (error: any) {
      if (axios.isAxiosError(error) && error.response) {
        const status = error.response.status;
        const message = error.response.data?.error || "An error occurred";
        if (status === 400 || status === 500) {
          triggerToast.error(message);
          return;
        }
      }
      console.error("Error creating API key:", error);
      triggerToast.error("Failed to create API key");
    }
  };

  const deleteApiKey = async (keyId: string) => {
    try {
      const { data } = await axios.delete(
        `/api/workspace/${workspaceId}/settings/api-keys/${keyId}/delete`
      );
      if (data.success) {
        fetchApiKeys();
        triggerToast.success("API key deleted successfully");
        setIsDeleteModalOpen(false);
      }
    } catch (error) {
      console.error("Error deleting API key:", error);
      triggerToast.error("Failed to delete API key");
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    triggerToast.success("Copied to clipboard");
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h3 className="text-lg font-medium text-zinc-900 dark:text-white">
            API Keys
          </h3>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
            Manage API keys for accessing workspace data programmatically
          </p>
        </div>
        <button
          onClick={() => setIsCreateModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
        >
          <IconPlus size={18} />
          Create API Key
        </button>
      </div>

      {apiKeys.length === 0 ? (
        <div className="text-center py-12 bg-zinc-50 dark:bg-zinc-800/50 rounded-lg">
          <IconKey size={48} className="mx-auto text-zinc-400 mb-4" />
          <p className="text-zinc-500 dark:text-zinc-400">
            No API keys created yet
          </p>
          <p className="text-sm text-zinc-400 dark:text-zinc-500 mt-2">
            Create an API key to start using the public API
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {apiKeys.map((key) => (
            <div
              key={key.id}
              className="bg-zinc-50 dark:bg-zinc-800/50 rounded-lg p-4 flex items-center justify-between"
            >
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <h4 className="font-medium text-zinc-900 dark:text-white">
                    {key.name}
                  </h4>
                  <code className="text-sm bg-zinc-200 dark:bg-zinc-700 dark:text-zinc-300 px-2 py-1 rounded">
                    {key.key}
                  </code>
                </div>
                <div className="flex items-center gap-4 text-sm text-zinc-500 dark:text-zinc-400 flex-wrap">
                  <span className="flex items-center gap-1">
                    <IconCalendar size={14} />
                    Created {formatDate(key.createdAt)}
                  </span>
                  {key.expiresAt && (
                    <span className="flex items-center gap-1">
                      <IconClock size={14} />
                      Expires {formatDate(key.expiresAt)}
                    </span>
                  )}
                  {key.createdBy && (
                    <span className="flex items-center gap-1.5">
                      <div
                        className={`h-4 w-4 rounded-full flex items-center justify-center overflow-hidden ${getRandomBg(
                          key.createdBy.userid.toString()
                        )}`}
                      >
                        <img
                          src={key.createdBy.picture || "/default-avatar.jpg"}
                          alt={key.createdBy.username}
                          className="h-4 w-4 object-cover rounded-full border border-white"
                        />
                      </div>
                      Created by {key.createdBy.username}
                    </span>
                  )}
                </div>
              </div>
              <button
                onClick={() => {
                  setSelectedKey(key);
                  setIsDeleteModalOpen(true);
                }}
                className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
              >
                <IconTrash size={18} />
              </button>
            </div>
          ))}
        </div>
      )}

      {isCreateModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/55 p-4 backdrop-blur-[2px]"
          onClick={(e) => {
            if (e.target === e.currentTarget && !createdKey) {
              setIsCreateModalOpen(false);
              setNewKeyData({ name: "", expiresIn: "90days" });
            }
          }}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.97, y: 6 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            role="dialog"
            aria-modal="true"
            aria-labelledby="api-key-title"
            className="w-full max-w-md overflow-hidden rounded-2xl border border-zinc-200/90 bg-white shadow-2xl shadow-zinc-900/10 dark:border-zinc-700/80 dark:bg-zinc-900 dark:shadow-black/40"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="h-1 w-full bg-gradient-to-r from-primary/20 via-primary to-primary/20" />
            <div className="px-6 py-6 sm:px-8 sm:py-7">
              <div className="flex items-start gap-4">
                <div className="mt-0.5 flex shrink-0">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-white shadow-lg shadow-primary/25 ring-4 ring-primary/10">
                    <IconKey size={24} stroke={1.5} />
                  </div>
                </div>

                <div className="min-w-0 flex-1">
                  <h2
                    id="api-key-title"
                    className="text-lg font-semibold tracking-tight text-zinc-900 dark:text-zinc-50"
                  >
                    {createdKey ? "API key created" : "Create API key"}
                  </h2>
                  {!createdKey && (
                    <p className="mt-1.5 text-sm leading-relaxed text-zinc-500 dark:text-zinc-400">
                      Uses your workspace accent. Keys can access workspace data
                      from scripts and integrations—treat them like passwords.
                    </p>
                  )}
                </div>
              </div>

              {createdKey ? (
                <div className="mt-6 space-y-4">
                  <div className="rounded-xl border border-amber-200/90 bg-amber-50/90 p-4 dark:border-amber-800/60 dark:bg-amber-950/30">
                    <p className="text-sm font-medium text-amber-900 dark:text-amber-100">
                      Copy it now
                    </p>
                    <p className="mt-1 text-sm text-amber-800/90 dark:text-amber-200/90">
                      You won&apos;t be able to see this secret again after you
                      close this dialog.
                    </p>
                    <div className="mt-3 flex gap-2">
                      <code className="flex-1 break-all rounded-lg border border-amber-200/80 bg-white px-3 py-2.5 font-mono text-xs text-zinc-800 dark:border-amber-900/50 dark:bg-zinc-950 dark:text-zinc-100">
                        {createdKey.key}
                      </code>
                      <button
                        type="button"
                        onClick={() => copyToClipboard(createdKey.key)}
                        className="inline-flex shrink-0 items-center justify-center rounded-lg bg-primary px-3 text-white shadow-md shadow-primary/20 transition-colors hover:bg-primary/90 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 dark:focus-visible:ring-offset-zinc-900"
                        aria-label="Copy API key"
                      >
                        <IconCopy size={18} />
                      </button>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setIsCreateModalOpen(false);
                      setCreatedKey(null);
                      setNewKeyData({ name: "", expiresIn: "90days" });
                    }}
                    className="w-full rounded-xl bg-primary py-2.5 text-sm font-semibold text-white shadow-md shadow-primary/25 transition-colors hover:bg-primary/90 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 dark:focus-visible:ring-offset-zinc-900"
                  >
                    Done
                  </button>
                </div>
              ) : (
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (newKeyData.name.trim()) {
                      createApiKey();
                    }
                  }}
                  className="mt-6"
                >
                  <div className="space-y-5">
                    <div>
                      <label
                        htmlFor="api-key-name"
                        className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400"
                      >
                        Key name
                      </label>
                      <input
                        id="api-key-name"
                        type="text"
                        value={newKeyData.name}
                        onChange={(e) =>
                          setNewKeyData({ ...newKeyData, name: e.target.value })
                        }
                        placeholder="e.g. Production integration"
                        autoComplete="off"
                        className="w-full rounded-xl border border-zinc-200 bg-zinc-50/50 px-3.5 py-2.5 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/25 dark:border-zinc-600 dark:bg-zinc-800/80 dark:text-zinc-100 dark:placeholder:text-zinc-500"
                      />
                    </div>
                    <div>
                      <label
                        htmlFor="api-key-expiration"
                        className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400"
                      >
                        Expires after
                      </label>
                      <div className="relative">
                        <select
                          id="api-key-expiration"
                          value={newKeyData.expiresIn}
                          onChange={(e) =>
                            setNewKeyData({
                              ...newKeyData,
                              expiresIn: e.target.value,
                            })
                          }
                          className="w-full appearance-none rounded-xl border border-zinc-200 bg-zinc-50/50 px-3.5 py-2.5 pr-10 text-sm text-zinc-900 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/25 dark:border-zinc-600 dark:bg-zinc-800/80 dark:text-zinc-100"
                        >
                          <option value="30days">30 days</option>
                          <option value="90days">90 days</option>
                          <option value="1year">1 year</option>
                          <option value="never">Never</option>
                        </select>
                        <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400">
                          <IconChevronDown size={18} stroke={2} aria-hidden />
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end sm:gap-3">
                    <button
                      type="button"
                      onClick={() => {
                        setIsCreateModalOpen(false);
                        setNewKeyData({ name: "", expiresIn: "90days" });
                      }}
                      className="inline-flex items-center justify-center rounded-xl border border-zinc-200 bg-white px-4 py-2.5 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-700/80"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={!newKeyData.name.trim()}
                      className="inline-flex items-center justify-center rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-white shadow-md shadow-primary/25 transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 dark:focus-visible:ring-offset-zinc-900"
                    >
                      Create key
                    </button>
                  </div>
                </form>
              )}
            </div>
          </motion.div>
        </div>
      )}

      <Dialog
        open={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        className="relative z-50"
      >
        <div
          className="fixed inset-0 bg-zinc-950/55 backdrop-blur-[2px]"
          aria-hidden="true"
        />
        <div className="fixed inset-0 flex items-center justify-center p-4">
          <Dialog.Panel className="mx-auto w-full max-w-md overflow-hidden rounded-2xl border border-zinc-200/90 bg-white shadow-2xl shadow-zinc-900/10 dark:border-zinc-700/80 dark:bg-zinc-900 dark:shadow-black/40">
            <div className="h-1 w-full bg-gradient-to-r from-red-500/30 via-red-500 to-red-500/30" />
            <div className="p-6 sm:p-7">
              <div className="flex gap-4">
                <div
                  className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-red-500 text-white shadow-lg shadow-red-500/25 ring-4 ring-red-500/10"
                  aria-hidden
                >
                  <IconTrash size={22} stroke={1.5} />
                </div>
                <div className="min-w-0 flex-1">
                  <Dialog.Title className="text-lg font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
                    Delete API key
                  </Dialog.Title>
                  <Dialog.Description className="mt-2 text-sm leading-relaxed text-zinc-500 dark:text-zinc-400">
                    This revokes access immediately for{" "}
                    <span className="font-semibold text-zinc-700 dark:text-zinc-200">
                      {selectedKey?.name ?? "this key"}
                    </span>
                    . Apps using it will start failing. This can&apos;t be
                    undone.
                  </Dialog.Description>
                </div>
              </div>
              <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end sm:gap-3">
                <button
                  type="button"
                  onClick={() => setIsDeleteModalOpen(false)}
                  className="inline-flex items-center justify-center rounded-xl border border-zinc-200 bg-white px-4 py-2.5 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-700/80"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => selectedKey && deleteApiKey(selectedKey.id)}
                  className="inline-flex items-center justify-center rounded-xl bg-red-600 px-5 py-2.5 text-sm font-semibold text-white shadow-md shadow-red-600/25 transition-colors hover:bg-red-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-zinc-900"
                >
                  Delete key
                </button>
              </div>
            </div>
          </Dialog.Panel>
        </div>
      </Dialog>
    </div>
  );
};

ApiKeys.title = "API Keys";

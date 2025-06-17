"use client"

import { useState, useEffect } from "react"
import { IconKey, IconTrash, IconCopy, IconPlus, IconCalendar, IconClock } from "@tabler/icons"
import axios from "axios"
import { useRouter } from "next/router"
import { Dialog } from "@headlessui/react"
import clsx from "clsx"

interface ApiKey {
  id: string
  name: string
  key: string
  lastUsedAt: string | null
  createdAt: string
  expiresAt: string | null
  createdBy: {
    userid: number
    username: string
    picture: string
  }
}

export const ApiKeys = ({ triggerToast }: { triggerToast: any }) => {
  const router = useRouter()
  const { id: workspaceId } = router.query
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([])
  const [loading, setLoading] = useState(true)
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
  const [selectedKey, setSelectedKey] = useState<ApiKey | null>(null)
  const [newKeyData, setNewKeyData] = useState({ name: "", expiresIn: "90days" })
  const [createdKey, setCreatedKey] = useState<{ key: string } | null>(null)

  useEffect(() => {
    fetchApiKeys()
  }, [workspaceId])

  const fetchApiKeys = async () => {
    try {
      const { data } = await axios.get(`/api/workspace/${workspaceId}/settings/api-keys`)
      if (data.success) {
        setApiKeys(data.apiKeys)
      }
    } catch (error) {
      console.error("Error fetching API keys:", error)
      triggerToast.error("Failed to fetch API keys")
    } finally {
      setLoading(false)
    }
  }

const createApiKey = async () => {
	try {
		const { data } = await axios.post(`/api/workspace/${workspaceId}/settings/api-keys/create`, newKeyData)
		if (data.success) {
			setCreatedKey(data.apiKey)
			fetchApiKeys()
			triggerToast.success("API key created successfully")
		}
	} catch (error: any) {
		if (axios.isAxiosError(error) && error.response) {
			const status = error.response.status
			const message = error.response.data?.error || "An error occurred"
			if (status === 400 || status === 500) {
				triggerToast.error(message)
				return
			}
		}
		console.error("Error creating API key:", error)
		triggerToast.error("Failed to create API key")
	}
}

  const deleteApiKey = async (keyId: string) => {
    try {
      const { data } = await axios.delete(`/api/workspace/${workspaceId}/settings/api-keys/${keyId}/delete`)
      if (data.success) {
        fetchApiKeys()
        triggerToast.success("API key deleted successfully")
        setIsDeleteModalOpen(false)
      }
    } catch (error) {
      console.error("Error deleting API key:", error)
      triggerToast.error("Failed to delete API key")
    }
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    triggerToast.success("Copied to clipboard")
  }

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    })
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h3 className="text-lg font-medium text-gray-900 dark:text-white">API Keys</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
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
        <div className="text-center py-12 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
          <IconKey size={48} className="mx-auto text-gray-400 mb-4" />
          <p className="text-gray-500 dark:text-gray-400">No API keys created yet</p>
          <p className="text-sm text-gray-400 dark:text-gray-500 mt-2">
            Create an API key to start using the public API
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {apiKeys.map((key) => (
            <div
              key={key.id}
              className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-4 flex items-center justify-between"
            >
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <h4 className="font-medium text-gray-900 dark:text-white">{key.name}</h4>
                  <code className="text-sm bg-gray-200 dark:bg-gray-700 dark:text-gray-300 px-2 py-1 rounded">{key.key}</code>
                </div>
                <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
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
                  {key.lastUsedAt && <span>Last used {formatDate(key.lastUsedAt)}</span>}
                </div>
              </div>
              <button
                onClick={() => {
                  setSelectedKey(key)
                  setIsDeleteModalOpen(true)
                }}
                className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
              >
                <IconTrash size={18} />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Create API Key Modal */}
      <Dialog
        open={isCreateModalOpen}
        onClose={() => {
          setIsCreateModalOpen(false)
          setCreatedKey(null)
          setNewKeyData({ name: "", expiresIn: "90days" })
        }}
        className="relative z-50"
      >
        <div className="fixed inset-0 bg-black/30" aria-hidden="true" />
        <div className="fixed inset-0 flex items-center justify-center p-4">
          <Dialog.Panel className="mx-auto max-w-md w-full rounded-lg bg-white dark:bg-gray-800 p-6 shadow-xl">
            <Dialog.Title className="text-lg font-medium text-gray-900 dark:text-white mb-4">
              {createdKey ? "API Key Created" : "Create API Key"}
            </Dialog.Title>

            {createdKey ? (
              <div>
                <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4 mb-4">
                  <p className="text-sm text-amber-800 dark:text-amber-200 mb-2">
                    Make sure to copy your API key now. You won't be able to see it again!
                  </p>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 bg-white dark:bg-gray-900 dark:text-white p-2 rounded text-sm break-all">
                      {createdKey.key}
                    </code>
                    <button
                      onClick={() => copyToClipboard(createdKey.key)}
                      className="p-2 bg-primary text-white rounded hover:bg-primary/90"
                    >
                      <IconCopy size={18} />
                    </button>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setIsCreateModalOpen(false)
                    setCreatedKey(null)
                    setNewKeyData({ name: "", expiresIn: "90days" })
                  }}
                  className="w-full px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90"
                >
                  Done
                </button>
              </div>
            ) : (
              <div>
                <div className="space-y-4 mb-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Key Name</label>
                    <input
                      type="text"
                      value={newKeyData.name}
                      onChange={(e) => setNewKeyData({ ...newKeyData, name: e.target.value })}
                      placeholder="e.g., Production API Key"
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Expiration
                    </label>
                    <select
                      value={newKeyData.expiresIn}
                      onChange={(e) => setNewKeyData({ ...newKeyData, expiresIn: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent"
                    >
                      <option value="30days">30 days</option>
                      <option value="90days">90 days</option>
                      <option value="1year">1 year</option>
                      <option value="never">Never</option>
                    </select>
                  </div>
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={() => setIsCreateModalOpen(false)}
                    className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={createApiKey}
                    disabled={!newKeyData.name}
                    className={clsx(
                      "flex-1 px-4 py-2 rounded-lg",
                      newKeyData.name
                        ? "bg-primary text-white hover:bg-primary/90"
                        : "bg-gray-200 dark:bg-gray-700 text-gray-400 cursor-not-allowed",
                    )}
                  >
                    Create
                  </button>
                </div>
              </div>
            )}
          </Dialog.Panel>
        </div>
      </Dialog>

      {/* Delete Confirmation Modal */}
      <Dialog open={isDeleteModalOpen} onClose={() => setIsDeleteModalOpen(false)} className="relative z-50">
        <div className="fixed inset-0 bg-black/30" aria-hidden="true" />
        <div className="fixed inset-0 flex items-center justify-center p-4">
          <Dialog.Panel className="mx-auto max-w-sm rounded-lg bg-white dark:bg-gray-800 p-6 shadow-xl">
            <Dialog.Title className="text-lg font-medium text-gray-900 dark:text-white mb-4">
              Delete API Key
            </Dialog.Title>
            <p className="text-gray-500 dark:text-gray-400 mb-6">
              Are you sure you want to delete "{selectedKey?.name}"? This action cannot be undone.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setIsDeleteModalOpen(false)}
                className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                Cancel
              </button>
              <button
                onClick={() => selectedKey && deleteApiKey(selectedKey.id)}
                className="flex-1 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600"
              >
                Delete
              </button>
            </div>
          </Dialog.Panel>
        </div>
      </Dialog>
    </div>
  )
}

ApiKeys.title = "API Keys"

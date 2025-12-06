"use client"

import type { NextPage } from "next"
import Head from "next/head"
import { useRouter } from "next/router"
import { loginState } from "@/state"
import { Transition, Dialog } from "@headlessui/react"
import { useState, useEffect, Fragment } from "react"
import axios from "axios"
import { useForm, FormProvider } from "react-hook-form"
import { useRecoilState } from "recoil"
import { toast } from "react-hot-toast"
import { useTheme } from "next-themes"
import {
  IconPlus,
  IconRefresh,
  IconChevronRight,
  IconBuildingSkyscraper,
  IconSettings,
  IconX,
  IconSearch,
  IconRocket,
  IconLogout,
  IconSun,
  IconMoon,
  IconChevronDown,
  IconExternalLink,
} from "@tabler/icons-react"
import SpaceBackground from "@/components/SpaceBackground"

// Separate components for better organization
const UserMenu = ({ login, logout }) => {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 p-1.5 pr-3 rounded-lg bg-white/10 hover:bg-white/20 transition-colors"
      >
        <img
          src={login?.thumbnail || "/placeholder.svg"}
          alt={login?.displayname}
          className="w-8 h-8 rounded-lg object-cover"
        />
        <span className="text-sm font-medium text-white hidden sm:block">
          {login?.displayname}
        </span>
        <IconChevronDown className="w-4 h-4 text-white/60" />
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setIsOpen(false)} />
          <div className="absolute right-0 mt-2 w-64 bg-white dark:bg-slate-800 rounded-lg shadow-xl border border-slate-200 dark:border-slate-700 z-20">
            <div className="p-4 border-b border-slate-200 dark:border-slate-700">
              <div className="flex items-center gap-3">
                <img
                  src={login?.thumbnail || "/placeholder.svg"}
                  alt={login?.displayname}
                  className="w-12 h-12 rounded-lg object-cover"
                />
                <div>
                  <p className="font-semibold text-slate-900 dark:text-white">
                    {login?.displayname}
                  </p>
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    @{login?.username}
                  </p>
                </div>
              </div>
            </div>
            <div className="p-2">
              <button
                onClick={logout}
                className="w-full flex items-center gap-3 px-3 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg transition-colors"
              >
                <IconLogout className="w-5 h-5" />
                Sign out
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

const WorkspaceCard = ({ workspace, onClick }) => (
  <div
    onClick={onClick}
    className="group bg-slate-900 rounded-lg border border-slate-800 overflow-hidden cursor-pointer hover:border-slate-700 transition-all"
  >
    <div className="aspect-video relative overflow-hidden bg-slate-800">
      <img
        src={workspace.groupThumbnail}
        alt={workspace.groupName}
        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
      />
    </div>
    <div className="p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-white truncate">
            {workspace.groupName}
          </h3>
          <p className="mt-1 text-sm text-slate-400">
            Group ID: {workspace.groupId}
          </p>
        </div>
        <IconChevronRight className="w-5 h-5 text-slate-400 group-hover:text-pink-400 transition-colors" />
      </div>
    </div>
  </div>
)

const CreateWorkspaceCard = ({ onClick }) => (
  <div
    onClick={onClick}
    className="group bg-slate-900 rounded-lg border border-dashed border-slate-700 overflow-hidden cursor-pointer hover:border-pink-500 transition-all"
  >
    <div className="aspect-video flex items-center justify-center bg-slate-800">
      <IconPlus className="w-12 h-12 text-slate-600 group-hover:text-pink-400 transition-colors" />
    </div>
    <div className="p-4">
      <h3 className="font-semibold text-white">Create Workspace</h3>
      <p className="text-sm text-slate-400 mt-1">Start managing a new group</p>
    </div>
  </div>
)

const EmptyState = ({ isOwner, searchQuery, onCreateClick, onClearSearch }) => {
  if (searchQuery) {
    return (
      <div className="bg-slate-900 rounded-lg border border-slate-800 p-12 text-center">
        <IconBuildingSkyscraper className="w-12 h-12 text-slate-600 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-white mb-2">
          No results for "{searchQuery}"
        </h3>
        <p className="text-sm text-slate-400 mb-4">
          Try adjusting your search or browse all workspaces.
        </p>
        <button
          onClick={onClearSearch}
          className="inline-flex items-center gap-2 px-4 py-2 bg-slate-800 text-white rounded-lg hover:bg-slate-700 transition-colors"
        >
          <IconX className="w-4 h-4" />
          Clear Search
        </button>
      </div>
    )
  }

  return (
    <div className="bg-slate-900 rounded-lg border border-slate-800 p-12 text-center">
      <IconBuildingSkyscraper className="w-12 h-12 text-slate-600 mx-auto mb-4" />
      <h3 className="text-lg font-semibold text-white mb-2">
        {isOwner ? "Create your first workspace" : "No workspaces available"}
      </h3>
      <p className="text-sm text-slate-400 mb-6">
        {isOwner 
          ? "Get started by creating a workspace for your Roblox group."
          : "Contact your administrator to get access."}
      </p>
      {isOwner && (
        <button
          onClick={onCreateClick}
          className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-pink-500 to-pink-600 text-white font-medium rounded-lg hover:from-pink-600 hover:to-pink-700 transition-all"
        >
          <IconPlus className="w-5 h-5" />
          Create Workspace
        </button>
      )}
    </div>
  )
}

const CreateWorkspaceModal = ({ isOpen, onClose, onSubmit, loading }) => {
  const methods = useForm()

  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onClose}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-200"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-150"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-200"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-150"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel className="w-full max-w-md bg-white dark:bg-slate-800 rounded-lg shadow-xl">
                <div className="p-6 border-b border-slate-200 dark:border-slate-700">
                  <div className="flex items-center justify-between">
                    <Dialog.Title className="text-lg font-semibold text-slate-900 dark:text-white">
                      Create Workspace
                    </Dialog.Title>
                    <button
                      onClick={onClose}
                      className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                    >
                      <IconX className="w-5 h-5 text-slate-400" />
                    </button>
                  </div>
                </div>

                <div className="p-6">
                  <FormProvider {...methods}>
                    <form onSubmit={methods.handleSubmit(onSubmit)} className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                          Group ID
                        </label>
                        <input
                          {...methods.register("groupID", {
                            required: "Group ID is required",
                            pattern: { value: /^[0-9]+$/, message: "Must be a valid number" },
                          })}
                          placeholder="12345678"
                          className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent"
                        />
                        {methods.formState.errors.groupID && (
                          <p className="mt-1 text-sm text-red-500">
                            {methods.formState.errors.groupID.message as string}
                          </p>
                        )}
                      </div>

                      <div className="flex gap-3 pt-2">
                        <button
                          type="button"
                          onClick={onClose}
                          className="flex-1 py-2 px-4 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 font-medium rounded-lg hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          disabled={loading}
                          className="flex-1 py-2 px-4 bg-gradient-to-r from-pink-500 to-pink-600 text-white font-medium rounded-lg hover:from-pink-600 hover:to-pink-700 disabled:opacity-50 transition-all"
                        >
                          {loading ? "Creating..." : "Create"}
                        </button>
                      </div>
                    </form>
                  </FormProvider>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  )
}

const InstanceSettingsModal = ({ isOpen, onClose, config, setConfig, onSave, loading, message }) => (
  <Transition appear show={isOpen} as={Fragment}>
    <Dialog as="div" className="relative z-50" onClose={onClose}>
      <Transition.Child
        as={Fragment}
        enter="ease-out duration-200"
        enterFrom="opacity-0"
        enterTo="opacity-100"
        leave="ease-in duration-150"
        leaveFrom="opacity-100"
        leaveTo="opacity-0"
      >
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" />
      </Transition.Child>

      <div className="fixed inset-0 overflow-y-auto">
        <div className="flex min-h-full items-center justify-center p-4">
          <Transition.Child
            as={Fragment}
            enter="ease-out duration-200"
            enterFrom="opacity-0 scale-95"
            enterTo="opacity-100 scale-100"
            leave="ease-in duration-150"
            leaveFrom="opacity-100 scale-100"
            leaveTo="opacity-0 scale-95"
          >
            <Dialog.Panel className="w-full max-w-lg bg-white dark:bg-slate-800 rounded-lg shadow-xl">
              <div className="p-6 border-b border-slate-200 dark:border-slate-700">
                <div className="flex items-center justify-between">
                  <Dialog.Title className="text-lg font-semibold text-slate-900 dark:text-white">
                    Instance Settings
                  </Dialog.Title>
                  <button
                    onClick={onClose}
                    className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                  >
                    <IconX className="w-5 h-5 text-slate-400" />
                  </button>
                </div>
              </div>

              <div className="p-6 space-y-4">
                <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
                  Roblox OAuth Configuration
                </h3>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                      Client ID
                    </label>
                    <input
                      type="text"
                      value={config.clientId}
                      onChange={(e) => setConfig(prev => ({ ...prev, clientId: e.target.value }))}
                      placeholder="Enter Client ID"
                      className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-pink-500"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                      Client Secret
                    </label>
                    <input
                      type="password"
                      value={config.clientSecret}
                      onChange={(e) => setConfig(prev => ({ ...prev, clientSecret: e.target.value }))}
                      placeholder="Enter Client Secret"
                      className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-pink-500"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                      Redirect URI <span className="text-xs text-slate-400">(auto-generated)</span>
                    </label>
                    <input
                      type="text"
                      value={config.redirectUri}
                      readOnly
                      className="w-full px-4 py-2 bg-slate-100 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-500 dark:text-slate-400"
                    />
                  </div>
                </div>
                
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Need help?{' '}
                  <a 
                    href="https://docs.planetaryapp.us/workspace/oauth" 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    className="text-pink-600 dark:text-pink-400 hover:underline inline-flex items-center gap-1"
                  >
                    View documentation
                    <IconExternalLink className="w-3 h-3" />
                  </a>
                </p>

                {message && (
                  <div className={`p-3 rounded-lg text-sm ${
                    message.includes('success') 
                      ? 'bg-green-50 dark:bg-green-500/10 text-green-700 dark:text-green-300'
                      : 'bg-red-50 dark:bg-red-500/10 text-red-700 dark:text-red-300'
                  }`}>
                    {message}
                  </div>
                )}

                <div className="flex gap-3 pt-2">
                  <button
                    onClick={onClose}
                    disabled={loading}
                    className="flex-1 py-2 px-4 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 font-medium rounded-lg hover:bg-slate-200 dark:hover:bg-slate-600 disabled:opacity-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={onSave}
                    disabled={loading}
                    className="flex-1 py-2 px-4 bg-gradient-to-r from-pink-500 to-pink-600 text-white font-medium rounded-lg hover:from-pink-600 hover:to-pink-700 disabled:opacity-50 transition-all"
                  >
                    {loading ? "Saving..." : "Save"}
                  </button>
                </div>
              </div>
            </Dialog.Panel>
          </Transition.Child>
        </div>
      </div>
    </Dialog>
  </Transition>
)

const Home: NextPage = () => {
  const [login, setLogin] = useRecoilState(loginState)
  const [loading, setLoading] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const methods = useForm()
  const router = useRouter()
  const { theme, setTheme } = useTheme()
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [isOwner, setIsOwner] = useState(false)
  const [showInstanceSettings, setShowInstanceSettings] = useState(false)
  const [robloxConfig, setRobloxConfig] = useState({
    clientId: '',
    clientSecret: '',
    redirectUri: ''
  })
  const [configLoading, setConfigLoading] = useState(false)
  const [saveMessage, setSaveMessage] = useState('')

  const filteredWorkspaces = login.workspaces?.filter(workspace =>
    workspace.groupName.toLowerCase().includes(searchQuery.toLowerCase())
  ) || []

  const gotoWorkspace = (id: number) => {
    router.push(`/workspace/${id}`)
  }

  const createWorkspace = async (data) => {
    setLoading(true)
    const t = toast.loading("Creating workspace...")

    try {
      await axios.post("/api/createws", { groupId: Number(data.groupID) })
      toast.success("Workspace created!", { id: t })
      setShowCreateModal(false)
      router.push(`/workspace/${data.groupID}?new=true`)
    } catch (err: any) {
      const error = err.response?.data?.error
      if (error === "You are not a high enough rank") {
        methods.setError("groupID", {
          type: "custom",
          message: "You need to be rank 10 or higher",
        })
      } else if (error === "Workspace already exists") {
        methods.setError("groupID", {
          type: "custom",
          message: "This group already has a workspace",
        })
      }
      toast.error("Failed to create workspace", { id: t })
    } finally {
      setLoading(false)
    }
  }

  const checkRoles = async () => {
    const request = axios.post("/api/auth/checkRoles", {})
      .then(() => router.reload())
      .catch(console.error)

    toast.promise(request, {
      loading: "Checking roles...",
      success: "Roles updated!",
      error: "An error occurred",
    })
  }

  const logout = async () => {
    await axios.post("/api/auth/logout")
    setLogin({
      userId: 1,
      username: '',
      displayname: '',
      canMakeWorkspace: false,
      thumbnail: '',
      workspaces: [],
      isOwner: false
    })
    router.push('/login')
  }

  const saveRobloxConfig = async () => {
    setConfigLoading(true)
    setSaveMessage('')
    try {
      await axios.post('/api/admin/instance-config', {
        robloxClientId: robloxConfig.clientId,
        robloxClientSecret: robloxConfig.clientSecret,
        robloxRedirectUri: robloxConfig.redirectUri
      })
      setSaveMessage('Settings saved successfully!')
      setTimeout(() => setSaveMessage(''), 3000)
    } catch (error) {
      setSaveMessage('Failed to save settings.')
      setTimeout(() => setSaveMessage(''), 3000)
    } finally {
      setConfigLoading(false)
    }
  }

  useEffect(() => {
    const init = async () => {
      try {
        const [userRes, ownerRes] = await Promise.all([
          axios.get("/api/@me"),
          axios.get("/api/auth/checkOwner").catch(() => ({ data: { isOwner: false } }))
        ])

        setLogin({
          ...userRes.data.user,
          workspaces: userRes.data.workspaces,
        })
        setIsOwner(ownerRes.data.isOwner)
      } catch (err: any) {
        if (err.response?.data.error === "Workspace not setup") {
          router.push("/welcome")
        } else if (err.response?.data.error === "Not logged in") {
          router.push("/login")
        }
      } finally {
        setLoading(false)
      }
    }

    init()
  }, [])

  useEffect(() => {
    if (showInstanceSettings && isOwner) {
      axios.get('/api/admin/instance-config')
        .then(res => {
          const origin = typeof window !== 'undefined' ? window.location.origin : ''
          setRobloxConfig({
            clientId: res.data.robloxClientId || '',
            clientSecret: res.data.robloxClientSecret || '',
            redirectUri: `${origin}/api/auth/roblox/callback`
          })
        })
        .catch(console.error)
    }
  }, [showInstanceSettings, isOwner])

  return (
    <div className="min-h-screen bg-black">
      <SpaceBackground />
      <Head>
        <title>Orbit - Your Workspaces</title>
      </Head>

      <nav className="sticky top-0 z-50 bg-black/60 backdrop-blur-md border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-pink-500 to-pink-600 flex items-center justify-center">
                <IconRocket className="w-6 h-6 text-white" />
              </div>
              <span className="text-xl font-bold text-white">Orbit</span>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                className="p-2 rounded-lg bg-white/10 text-white hover:bg-white/20 transition-colors"
              >
                {theme === "dark" ? <IconSun className="w-5 h-5" /> : <IconMoon className="w-5 h-5" />}
              </button>
              <UserMenu login={login} logout={logout} />
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6 mb-8">
          <div>
            <h1 className="text-2xl font-bold text-white">Your Workspaces</h1>
            <p className="mt-1 text-slate-400">Manage your Roblox groups</p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative">
              <IconSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-white/40" />
              <input
                type="text"
                placeholder="Search..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full sm:w-64 pl-10 pr-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-pink-500"
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={checkRoles}
                className="flex items-center gap-2 px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white hover:bg-white/20 transition-colors"
              >
                <IconRefresh className="w-5 h-5" />
                <span className="hidden sm:inline">Sync</span>
              </button>

              {isOwner && (
                <>
                  <button
                    onClick={() => setShowCreateModal(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-pink-500 to-pink-600 rounded-lg text-white hover:from-pink-600 hover:to-pink-700 transition-all"
                  >
                    <IconPlus className="w-5 h-5" />
                    <span className="hidden sm:inline">New</span>
                  </button>

                  <button
                    onClick={() => setShowInstanceSettings(true)}
                    className="p-2 bg-white/10 border border-white/20 rounded-lg text-white hover:bg-white/20 transition-colors"
                  >
                    <IconSettings className="w-5 h-5" />
                  </button>
                </>
              )}
            </div>
          </div>
        </div>

        {filteredWorkspaces.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {isOwner && !searchQuery && (
              <CreateWorkspaceCard onClick={() => setShowCreateModal(true)} />
            )}
            {filteredWorkspaces.map(workspace => (
              <WorkspaceCard
                key={workspace.groupId}
                workspace={workspace}
                onClick={() => gotoWorkspace(workspace.groupId)}
              />
            ))}
          </div>
        ) : (
          <EmptyState
            isOwner={isOwner}
            searchQuery={searchQuery}
            onCreateClick={() => setShowCreateModal(true)}
            onClearSearch={() => setSearchQuery("")}
          />
        )}
      </main>

      <CreateWorkspaceModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSubmit={createWorkspace}
        loading={loading}
      />

      <InstanceSettingsModal
        isOpen={showInstanceSettings}
        onClose={() => setShowInstanceSettings(false)}
        config={robloxConfig}
        setConfig={setRobloxConfig}
        onSave={saveRobloxConfig}
        loading={configLoading}
        message={saveMessage}
      />
    </div>
  )
}

export default Home
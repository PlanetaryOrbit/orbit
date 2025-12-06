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
import { motion, AnimatePresence } from "framer-motion"
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
  IconUsers,
  IconChevronDown,
  IconExternalLink,
} from "@tabler/icons-react"

const Home: NextPage = () => {
  const [login, setLogin] = useRecoilState(loginState)
  const [loading, setLoading] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const methods = useForm()
  const router = useRouter()
  const { theme, setTheme } = useTheme()
  const [isOpen, setIsOpen] = useState(false)
  const [isOwner, setIsOwner] = useState(false)
  const [showInstanceSettings, setShowInstanceSettings] = useState(false)
  const [showUserMenu, setShowUserMenu] = useState(false)
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

  const createWorkspace = async () => {
    setLoading(true)
    const t = toast.loading("Creating workspace...")

    const request = await axios
      .post("/api/createws", {
        groupId: Number(methods.getValues("groupID")),
      })
      .catch((err) => {
        setLoading(false)
        if (err.response?.data?.error === "You are not a high enough rank") {
          methods.setError("groupID", {
            type: "custom",
            message: "You need to be a rank 10 or higher to create a workspace",
          })
        }
        if (err.response?.data?.error === "Workspace already exists") {
          methods.setError("groupID", {
            type: "custom",
            message: "This group already has a workspace",
          })
        }
        toast.error("Failed to create workspace", { id: t })
      })

    if (request) {
      toast.success("Workspace created!", { id: t })
      setIsOpen(false)
      router.push(`/workspace/${methods.getValues("groupID")}?new=true`)
    }
  }

  useEffect(() => {
    const checkLogin = async () => {
      let req
      try {
        req = await axios.get("/api/@me")
      } catch (err: any) {
        if (err.response?.data.error === "Workspace not setup") {
          if (router.pathname !== "/welcome") {
            router.push("/welcome")
          }
          setLoading(false)
          return
        }
        if (err.response?.data.error === "Not logged in") {
          router.push("/login")
          setLoading(false)
          return
        }
      } finally {
        if (req?.data) {
          setLogin({
            ...req.data.user,
            workspaces: req.data.workspaces,
          })
        }
        setLoading(false)
      }
    }

    const checkOwnerStatus = async () => {
      try {
        const response = await axios.get("/api/auth/checkOwner")
        if (response.data.success) {
          setIsOwner(response.data.isOwner)
        }
      } catch (error: any) {
        if (error.response?.status !== 401) {
          console.error("Failed to check owner status:", error)
        }
      }
    }

    checkLogin()
    checkOwnerStatus()
  }, [])

  const checkRoles = async () => {
    const request = axios
      .post("/api/auth/checkRoles", {})
      .then(() => {
        router.reload()
      })
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

  useEffect(() => {
    if (showInstanceSettings && isOwner) {
      loadRobloxConfig()
    }
  }, [showInstanceSettings, isOwner])

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const currentOrigin = window.location.origin
      const autoRedirectUri = `${currentOrigin}/api/auth/roblox/callback`
      setRobloxConfig(prev => ({ ...prev, redirectUri: autoRedirectUri }))
    }
  }, [])

  const loadRobloxConfig = async () => {
    try {
      const response = await axios.get('/api/admin/instance-config')
      const { robloxClientId, robloxClientSecret } = response.data
      const currentOrigin = typeof window !== 'undefined' ? window.location.origin : ''
      const autoRedirectUri = `${currentOrigin}/api/auth/roblox/callback`
      
      setRobloxConfig({
        clientId: robloxClientId || '',
        clientSecret: robloxClientSecret || '',
        redirectUri: autoRedirectUri
      })
    } catch (error) {
      console.error('Failed to load OAuth config:', error)
    }
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
      console.error('Failed to save OAuth config:', error)
      setSaveMessage('Failed to save settings. Please try again.')
      setTimeout(() => setSaveMessage(''), 3000)
    } finally {
      setConfigLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      <Head>
        <title>Orbit - Your Workspaces</title>
        <meta name="description" content="Manage your Roblox workspaces with Orbit" />
      </Head>

      {/* Navigation */}
      <nav className="sticky top-0 z-50 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border-b border-slate-200 dark:border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-pink-500 flex items-center justify-center shadow-lg shadow-indigo-500/20">
                <IconRocket className="w-6 h-6 text-white" />
              </div>
              <span className="text-xl font-bold text-slate-900 dark:text-white">Orbit</span>
            </div>

            {/* Right Side */}
            <div className="flex items-center gap-3">
              {/* Theme Toggle */}
              <button
                onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
              >
                {theme === "dark" ? <IconSun className="w-5 h-5" /> : <IconMoon className="w-5 h-5" />}
              </button>

              {/* User Menu */}
              <div className="relative">
                <button
                  onClick={() => setShowUserMenu(!showUserMenu)}
                  className="flex items-center gap-3 p-1.5 pr-3 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                >
                  <img
                    src={login?.thumbnail || "/placeholder.svg"}
                    alt={login?.displayname}
                    className="w-8 h-8 rounded-lg object-cover"
                  />
                  <span className="text-sm font-medium text-slate-700 dark:text-slate-200 hidden sm:block">
                    {login?.displayname}
                  </span>
                  <IconChevronDown className="w-4 h-4 text-slate-400" />
                </button>

                <AnimatePresence>
                  {showUserMenu && (
                    <>
                      <div 
                        className="fixed inset-0 z-10" 
                        onClick={() => setShowUserMenu(false)} 
                      />
                      <motion.div
                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 10, scale: 0.95 }}
                        transition={{ duration: 0.15 }}
                        className="absolute right-0 mt-2 w-64 bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-700 overflow-hidden z-20"
                      >
                        <div className="p-4 border-b border-slate-200 dark:border-slate-700">
                          <div className="flex items-center gap-3">
                            <img
                              src={login?.thumbnail || "/placeholder.svg"}
                              alt={login?.displayname}
                              className="w-12 h-12 rounded-xl object-cover"
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
                            className="w-full flex items-center gap-3 px-3 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-xl transition-colors"
                          >
                            <IconLogout className="w-5 h-5" />
                            Sign out
                          </button>
                        </div>
                      </motion.div>
                    </>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 dark:text-white">
              Your Workspaces
            </h1>
            <p className="mt-1 text-slate-500 dark:text-slate-400">
              Select a workspace to manage your group
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            {/* Search */}
            <div className="relative">
              <IconSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input
                type="text"
                placeholder="Search workspaces..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full sm:w-64 pl-10 pr-4 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
              />
            </div>

            {/* Actions */}
            <div className="flex gap-3">
              <button
                onClick={checkRoles}
                className="flex items-center gap-2 px-4 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
              >
                <IconRefresh className="w-5 h-5" />
                <span className="hidden sm:inline">Sync Roles</span>
              </button>

              {isOwner && (
                <>
                  <button
                    onClick={() => setIsOpen(true)}
                    className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-indigo-500 to-indigo-600 rounded-xl text-sm font-medium text-white hover:from-indigo-600 hover:to-indigo-700 shadow-lg shadow-indigo-500/20 transition-all"
                  >
                    <IconPlus className="w-5 h-5" />
                    <span className="hidden sm:inline">New Workspace</span>
                  </button>

                  <button
                    onClick={() => setShowInstanceSettings(true)}
                    className="p-2.5 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                  >
                    <IconSettings className="w-5 h-5" />
                  </button>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Workspaces Grid */}
        {filteredWorkspaces.length > 0 ? (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
          >
            {filteredWorkspaces.map((workspace, i) => (
              <motion.div
                key={workspace.groupId}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                onClick={() => gotoWorkspace(workspace.groupId)}
                className="group relative bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden cursor-pointer hover:shadow-xl hover:shadow-slate-200/50 dark:hover:shadow-slate-900/50 hover:-translate-y-1 transition-all duration-300"
              >
                {/* Thumbnail */}
                <div className="aspect-video relative overflow-hidden">
                  <img
                    src={workspace.groupThumbnail}
                    alt={workspace.groupName}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/0 to-black/0 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                </div>

                {/* Content */}
                <div className="p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-slate-900 dark:text-white truncate group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                        {workspace.groupName}
                      </h3>
                      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                        Group ID: {workspace.groupId}
                      </p>
                    </div>
                    <div className="p-2 rounded-xl bg-slate-100 dark:bg-slate-700 text-slate-400 group-hover:bg-indigo-100 dark:group-hover:bg-indigo-500/20 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                      <IconChevronRight className="w-5 h-5" />
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-12 text-center"
          >
            <div className="w-16 h-16 mx-auto mb-6 rounded-2xl bg-slate-100 dark:bg-slate-700 flex items-center justify-center">
              <IconBuildingSkyscraper className="w-8 h-8 text-slate-400" />
            </div>
            <h3 className="text-xl font-semibold text-slate-900 dark:text-white mb-2">
              {searchQuery ? "No workspaces found" : "No workspaces yet"}
            </h3>
            <p className="text-slate-500 dark:text-slate-400 mb-6 max-w-md mx-auto">
              {searchQuery 
                ? `No workspaces match "${searchQuery}". Try a different search.`
                : isOwner 
                  ? "Create your first workspace to start managing your Roblox group."
                  : "You don't have access to any workspaces yet. Contact an administrator."}
            </p>
            {isOwner && !searchQuery && (
              <button
                onClick={() => setIsOpen(true)}
                className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-indigo-500 to-indigo-600 rounded-xl text-sm font-medium text-white hover:from-indigo-600 hover:to-indigo-700 shadow-lg shadow-indigo-500/20 transition-all"
              >
                <IconPlus className="w-5 h-5" />
                Create Workspace
              </button>
            )}
          </motion.div>
        )}
      </main>

      {/* Create Workspace Modal */}
      <Transition appear show={isOpen} as={Fragment}>
        <Dialog as="div" className="relative z-50" onClose={() => setIsOpen(false)}>
          <Transition.Child
            as={Fragment}
            enter="ease-out duration-300"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="ease-in duration-200"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" />
          </Transition.Child>

          <div className="fixed inset-0 overflow-y-auto">
            <div className="flex min-h-full items-center justify-center p-4">
              <Transition.Child
                as={Fragment}
                enter="ease-out duration-300"
                enterFrom="opacity-0 scale-95"
                enterTo="opacity-100 scale-100"
                leave="ease-in duration-200"
                leaveFrom="opacity-100 scale-100"
                leaveTo="opacity-0 scale-95"
              >
                <Dialog.Panel className="w-full max-w-md bg-white dark:bg-slate-800 rounded-2xl shadow-2xl overflow-hidden">
                  <div className="p-6 border-b border-slate-200 dark:border-slate-700">
                    <div className="flex items-center justify-between">
                      <Dialog.Title className="text-xl font-semibold text-slate-900 dark:text-white">
                        Create Workspace
                      </Dialog.Title>
                      <button
                        onClick={() => setIsOpen(false)}
                        className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                      >
                        <IconX className="w-5 h-5 text-slate-400" />
                      </button>
                    </div>
                    <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                      Enter your Roblox group ID to create a new workspace
                    </p>
                  </div>

                  <div className="p-6">
                    <FormProvider {...methods}>
                      <form onSubmit={methods.handleSubmit(createWorkspace)} className="space-y-6">
                        <div>
                          <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1.5">
                            Group ID
                          </label>
                          <input
                            {...methods.register("groupID", {
                              required: "Group ID is required",
                              pattern: { value: /^[0-9]+$/, message: "Must be a valid number" },
                            })}
                            placeholder="e.g. 12345678"
                            className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                          />
                          {methods.formState.errors.groupID && (
                            <p className="mt-1.5 text-sm text-red-500">
                              {methods.formState.errors.groupID.message as string}
                            </p>
                          )}
                        </div>

                        <div className="flex gap-3">
                          <button
                            type="button"
                            onClick={() => setIsOpen(false)}
                            className="flex-1 py-3 px-4 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 font-medium rounded-xl hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
                          >
                            Cancel
                          </button>
                          <button
                            type="submit"
                            disabled={loading}
                            className="flex-1 py-3 px-4 bg-gradient-to-r from-indigo-500 to-indigo-600 text-white font-medium rounded-xl hover:from-indigo-600 hover:to-indigo-700 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
                          >
                            {loading ? (
                              <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                              </svg>
                            ) : (
                              "Create"
                            )}
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

      {/* Instance Settings Modal */}
      <Transition appear show={showInstanceSettings} as={Fragment}>
        <Dialog as="div" className="relative z-50" onClose={() => setShowInstanceSettings(false)}>
          <Transition.Child
            as={Fragment}
            enter="ease-out duration-300"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="ease-in duration-200"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" />
          </Transition.Child>

          <div className="fixed inset-0 overflow-y-auto">
            <div className="flex min-h-full items-center justify-center p-4">
              <Transition.Child
                as={Fragment}
                enter="ease-out duration-300"
                enterFrom="opacity-0 scale-95"
                enterTo="opacity-100 scale-100"
                leave="ease-in duration-200"
                leaveFrom="opacity-100 scale-100"
                leaveTo="opacity-0 scale-95"
              >
                <Dialog.Panel className="w-full max-w-lg bg-white dark:bg-slate-800 rounded-2xl shadow-2xl overflow-hidden">
                  <div className="p-6 border-b border-slate-200 dark:border-slate-700">
                    <div className="flex items-center justify-between">
                      <Dialog.Title className="text-xl font-semibold text-slate-900 dark:text-white">
                        Instance Settings
                      </Dialog.Title>
                      <button
                        onClick={() => setShowInstanceSettings(false)}
                        className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                      >
                        <IconX className="w-5 h-5 text-slate-400" />
                      </button>
                    </div>
                  </div>

                  <div className="p-6 space-y-6">
                    <div>
                      <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-4">
                        Roblox OAuth Configuration
                      </h3>
                      
                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                            Client ID
                          </label>
                          <input
                            type="text"
                            value={robloxConfig.clientId}
                            onChange={(e) => setRobloxConfig(prev => ({ ...prev, clientId: e.target.value }))}
                            placeholder="Enter your Client ID"
                            className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                          />
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                            Client Secret
                          </label>
                          <input
                            type="password"
                            value={robloxConfig.clientSecret}
                            onChange={(e) => setRobloxConfig(prev => ({ ...prev, clientSecret: e.target.value }))}
                            placeholder="Enter your Client Secret"
                            className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                          />
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                            Redirect URI
                            <span className="ml-2 text-xs text-slate-400">(auto-generated)</span>
                          </label>
                          <input
                            type="text"
                            value={robloxConfig.redirectUri}
                            readOnly
                            className="w-full px-4 py-2.5 bg-slate-100 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-500 dark:text-slate-400 cursor-not-allowed"
                          />
                        </div>
                      </div>
                      
                      <p className="mt-4 text-xs text-slate-500 dark:text-slate-400">
                        Need help? Check our{' '}
                        <a 
                          href="https://docs.planetaryapp.us/workspace/oauth" 
                          target="_blank" 
                          rel="noopener noreferrer" 
                          className="text-indigo-600 dark:text-indigo-400 hover:underline inline-flex items-center gap-1"
                        >
                          documentation
                          <IconExternalLink className="w-3 h-3" />
                        </a>
                      </p>
                    </div>

                    {saveMessage && (
                      <div className={`p-4 rounded-xl text-sm ${
                        saveMessage.includes('successfully') 
                          ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-500/20'
                          : 'bg-red-50 dark:bg-red-500/10 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-500/20'
                      }`}>
                        {saveMessage}
                      </div>
                    )}

                    <div className="flex gap-3 pt-2">
                      <button
                        onClick={() => setShowInstanceSettings(false)}
                        disabled={configLoading}
                        className="flex-1 py-3 px-4 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 font-medium rounded-xl hover:bg-slate-200 dark:hover:bg-slate-600 disabled:opacity-50 transition-colors"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={saveRobloxConfig}
                        disabled={configLoading}
                        className="flex-1 py-3 px-4 bg-gradient-to-r from-indigo-500 to-indigo-600 text-white font-medium rounded-xl hover:from-indigo-600 hover:to-indigo-700 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
                      >
                        {configLoading ? (
                          <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                          </svg>
                        ) : (
                          "Save Settings"
                        )}
                      </button>
                    </div>
                  </div>
                </Dialog.Panel>
              </Transition.Child>
            </div>
          </div>
        </Dialog>
      </Transition>
    </div>
  )
}

export default Home

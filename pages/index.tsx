"use client"

import type { NextPage } from "next"
import Head from "next/head"
import Topbar from "@/components/topbar"
import { useRouter } from "next/router"
import { loginState } from "@/state"
import { Transition, Dialog } from "@headlessui/react"
import { useState, useEffect, Fragment } from "react"
import Button from "@/components/button"
import axios from "axios"
import Input from "@/components/input"
import { useForm, FormProvider } from "react-hook-form"
import { useRecoilState } from "recoil"
import { toast } from "react-hot-toast"
import { IconPlus, IconRefresh, IconChevronRight, IconBuildingSkyscraper, IconSettings, IconX } from "@tabler/icons-react"

const Home: NextPage = () => {
	const [login, setLogin] = useRecoilState(loginState)
	const [loading, setLoading] = useState(false)
	const methods = useForm()
	const router = useRouter()
	const [isOpen, setIsOpen] = useState(false)
	const [isOwner, setIsOwner] = useState(false)
	const [showInstanceSettings, setShowInstanceSettings] = useState(false)
	const [robloxConfig, setRobloxConfig] = useState({
		clientId: '',
		clientSecret: '',
		redirectUri: '',
		redirect_wid: '',
		oauthOnlyLogin: false
	})
	const [configLoading, setConfigLoading] = useState(false)
	const [saveMessage, setSaveMessage] = useState('')
	const [usingEnvVars, setUsingEnvVars] = useState(false)

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
				console.log(err)
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
					const currentPath = router.pathname
					if (currentPath !== "/welcome") {
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
			success: "Roles checked!",
			error: "An error occurred",
		})
	}

	useEffect(() => {
		if (!isOwner) return
		if (showInstanceSettings) {
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
			const { robloxClientId, robloxClientSecret, oauthOnlyLogin, usingEnvVars: envVars, redirectWorkspace } = response.data
			const currentOrigin = typeof window !== 'undefined' ? window.location.origin : ''
			const autoRedirectUri = `${currentOrigin}/api/auth/roblox/callback`

			setRobloxConfig({
				clientId: robloxClientId || '',
				clientSecret: robloxClientSecret || '',
				redirectUri: response.data.robloxRedirectUri || autoRedirectUri,
				oauthOnlyLogin: oauthOnlyLogin || false,
				redirect_wid: redirectWorkspace
			})
			setUsingEnvVars(envVars || false)

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
				robloxRedirectUri: robloxConfig.redirectUri,
				oauthOnlyLogin: robloxConfig.oauthOnlyLogin,
				redirectWorkspaceID: robloxConfig.redirect_wid

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

	useEffect(() => {
		if (isOwner) return

		if (showInstanceSettings || configLoading) {
			return
		}

		if (robloxConfig.redirect_wid && robloxConfig.redirect_wid.length >= 1 && login.workspaces?.length) {
			const redirectWorkspaceId = Number(robloxConfig.redirect_wid)
			const hasAccess = login.workspaces.some(workspace => workspace.groupId === redirectWorkspaceId)

			if (hasAccess) {
				gotoWorkspace(redirectWorkspaceId)
			} else {
				router.push('/404')
			}
		}
	}, [login.workspaces, robloxConfig.redirect_wid, showInstanceSettings, configLoading])



	return (
		<div>
			<Head>
				<title>Orbit - Workspaces</title>
				<meta name="description" content="Manage your Roblox workspaces with Orbit" />
			</Head>

			<div className="min-h-screen bg-zinc-50 dark:bg-zinc-800">
				<Topbar />
				<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
					<div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-8">
						<h1 className="text-3xl font-bold text-zinc-900 dark:text-white mb-4 sm:mb-0">Your Workspaces</h1>
						<div className="flex space-x-3">
							{isOwner && (
								<Button onClick={() => setIsOpen(true)} classoverride="flex items-center">
									<IconPlus className="mr-2 h-5 w-5" />
									New Workspace
								</Button>
							)}
							<Button
								onClick={checkRoles}
								classoverride="flex items-center bg-zinc-200 hover:bg-zinc-300 text-zinc-800 dark:bg-zinc-700 dark:hover:bg-zinc-600 dark:text-white"
							>
								<IconRefresh className="mr-2 h-5 w-5" />
								Check Roles
							</Button>
							{isOwner && (
								<Button
									onClick={() => setShowInstanceSettings(true)}
									classoverride="flex items-center bg-blue-600 hover:bg-blue-700 dark:bg-blue-200 dark:hover:bg-blue-300 text-white">
									<IconSettings className="h-5 w-5" />
								</Button>
							)}
						</div>
					</div>

					{login.workspaces?.length ? (
						<div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-4">
							{login.workspaces.map((workspace, i) => (
								<div
									key={i}
									className="bg-white dark:bg-zinc-700 rounded-xl shadow-sm overflow-hidden transition-all duration-200 hover:shadow-md hover:scale-[1.02] cursor-pointer aspect-square flex flex-col"
									onClick={() => gotoWorkspace(workspace.groupId)}
								>
									<div
										className="flex-1 bg-cover bg-center"
										style={{ backgroundImage: `url(${workspace.groupThumbnail})` }}
									/>
									<div className="p-4 flex items-center justify-between">
										<h3 className="text-lg font-semibold text-zinc-900 dark:text-white truncate">
											{workspace.groupName}
										</h3>
										<IconChevronRight className="h-5 w-5 text-zinc-500 dark:text-zinc-400" />
									</div>
								</div>
							))}
						</div>
					) : (
						<div className="bg-white dark:bg-zinc-700 rounded-xl shadow-sm p-8 flex flex-col items-center justify-center text-center">
							<div className="bg-zinc-100 dark:bg-zinc-600 rounded-full p-4 mb-4">
								<IconBuildingSkyscraper className="h-12 w-12 text-zinc-400 dark:text-zinc-500" />
							</div>
							<h3 className="text-xl font-semibold text-zinc-900 dark:text-white mb-2">No workspaces available</h3>
							<p className="text-zinc-500 dark:text-zinc-400 mb-6">
								{isOwner ? "Create a new workspace to get started" : "You don't have permission to create workspaces"}
							</p>
							{isOwner ? (
								<Button onClick={() => setIsOpen(true)} classoverride="flex items-center">
									<IconPlus className="mr-2 h-5 w-5" />
									Create Workspace
								</Button>
							) : (
								<p className="text-sm text-zinc-500 dark:text-zinc-400">
									Contact an administrator if you need to create a workspace
								</p>
							)}
						</div>
					)}

					<Transition appear show={isOpen} as={Fragment}>
						<Dialog as="div" className="relative z-10" onClose={() => setIsOpen(false)}>
							<Transition.Child
								as={Fragment}
								enter="ease-out duration-300"
								enterFrom="opacity-0"
								enterTo="opacity-100"
								leave="ease-in duration-200"
								leaveFrom="opacity-100"
								leaveTo="opacity-0"
							>
								<div className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm" />
							</Transition.Child>

							<div className="fixed inset-0 overflow-y-auto">
								<div className="flex min-h-full items-center justify-center p-4 text-center">
									<Transition.Child
										as={Fragment}
										enter="ease-out duration-300"
										enterFrom="opacity-0 scale-95"
										enterTo="opacity-100 scale-100"
										leave="ease-in duration-200"
										leaveFrom="opacity-100 scale-100"
										leaveTo="opacity-0 scale-95"
									>
										<Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-xl bg-white dark:bg-zinc-800 p-6 text-left align-middle shadow-xl transition-all">
											<Dialog.Title as="h3" className="text-2xl font-bold text-zinc-900 dark:text-white">
												Create New Workspace
											</Dialog.Title>

											<div className="mt-4">
												<FormProvider {...methods}>
													<form>
														<Input
															label="Group ID"
															placeholder="Enter your Roblox group ID"
															{...methods.register("groupID", {
																required: "This field is required",
																pattern: { value: /^[a-zA-Z0-9-.]*$/, message: "No spaces or special characters" },
																maxLength: { value: 10, message: "Length must be below 10 characters" },
															})}
														/>
													</form>
												</FormProvider>
											</div>

											<div className="mt-6 flex justify-end space-x-3">
												<Button
													onClick={() => setIsOpen(false)}
													classoverride="bg-zinc-200 hover:bg-zinc-300 text-zinc-800 dark:bg-zinc-700 dark:hover:bg-zinc-600 dark:text-white"
												>
													Cancel
												</Button>
												<Button onClick={methods.handleSubmit(createWorkspace)} loading={loading}>
													Create
												</Button>
											</div>
										</Dialog.Panel>
									</Transition.Child>
								</div>
							</div>
						</Dialog>
					</Transition>

					<Transition appear show={showInstanceSettings} as={Fragment}>
						<Dialog as="div" className="relative z-10" onClose={() => setShowInstanceSettings(false)}>
							<Transition.Child
								as={Fragment}
								enter="ease-out duration-300"
								enterFrom="opacity-0"
								enterTo="opacity-100"
								leave="ease-in duration-200"
								leaveFrom="opacity-100"
								leaveTo="opacity-0"
							>
								<div className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm" />
							</Transition.Child>

							<div className="fixed inset-0 overflow-y-auto">
								<div className="flex min-h-full items-center justify-center p-4 text-center">
									<Transition.Child
										as={Fragment}
										enter="ease-out duration-300"
										enterFrom="opacity-0 scale-95"
										enterTo="opacity-100 scale-100"
										leave="ease-in duration-200"
										leaveFrom="opacity-100 scale-100"
										leaveTo="opacity-0 scale-95"
									>
										<Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-xl bg-white dark:bg-zinc-800 p-6 text-left align-middle shadow-xl transition-all">
											<div className="flex items-center justify-between mb-6">
												<Dialog.Title className="text-lg font-semibold text-zinc-900 dark:text-white">
													Instance Settings
												</Dialog.Title>
												<button
													onClick={() => setShowInstanceSettings(false)}
													className="p-1 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-700"
												>
													<IconX className="w-5 h-5 text-zinc-500" />
												</button>
											</div>

											<div className="space-y-4">
												<div>
													<h3 className="text-sm font-medium text-zinc-900 dark:text-white mb-3">
														Roblox OAuth Configuration
													</h3>

													{usingEnvVars && (
														<div className="mb-4 p-3 rounded-md bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
															<p className="text-sm text-blue-800 dark:text-blue-200 font-medium">
																🔒 Using Environment Variables
															</p>
															<p className="text-xs text-blue-700 dark:text-blue-300 mt-1">
																Database configuration is disabled.
															</p>
														</div>
													)}

													<div className="space-y-3">
														<div>
															<label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
																Client ID
															</label>
															<input
																type="text"
																value={robloxConfig.clientId}
																onChange={(e) => setRobloxConfig(prev => ({ ...prev, clientId: e.target.value }))}
																placeholder="e.g. 23748326747865334"
																disabled={usingEnvVars}
																className={`w-full px-3 py-2 border rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent ${usingEnvVars
																	? 'bg-zinc-100 dark:bg-zinc-800 border-zinc-300 dark:border-zinc-600 text-zinc-500 dark:text-zinc-400 cursor-not-allowed'
																	: 'border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white'
																	}`}
															/>
														</div>

														<div>
															<label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
																Client Secret
															</label>
															<input
																type="password"
																value={robloxConfig.clientSecret}
																onChange={(e) => setRobloxConfig(prev => ({ ...prev, clientSecret: e.target.value }))}
																placeholder="e.g. JHJD_NMIRHNSD$ER$6dj38"
																disabled={usingEnvVars}
																className={`w-full px-3 py-2 border rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent ${usingEnvVars
																	? 'bg-zinc-100 dark:bg-zinc-800 border-zinc-300 dark:border-zinc-600 text-zinc-500 dark:text-zinc-400 cursor-not-allowed'
																	: 'border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white'
																	}`}
															/>
														</div>

														<div>
															<label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
																Redirect URI <span className="text-xs text-zinc-500">(auto-generated)</span>
															</label>
															<input
																type="url"
																value={robloxConfig.redirectUri}
																readOnly
																placeholder="https://instance.planetaryapp.cloud/api/auth/roblox/callback"
																className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-600 rounded-md bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 text-sm cursor-not-allowed"
																title="This field is automatically generated based on your current domain"
															/>
														</div>

														<div>
															<label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
																Redirect to workspace
															</label>
															<input
																type="text"
																value={robloxConfig.redirect_wid}
																onChange={(e) => setRobloxConfig(prev => ({ ...prev, redirect_wid: e.target.value }))}
																placeholder="35724790"
																disabled={usingEnvVars}
																className={`w-full px-3 py-2 border rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent ${usingEnvVars
																	? 'bg-zinc-100 dark:bg-zinc-800 border-zinc-300 dark:border-zinc-600 text-zinc-500 dark:text-zinc-400 cursor-not-allowed'
																	: 'border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white'
																	}`}
															/>
														</div>
													</div>

													<p className="text-xs text-zinc-500 dark:text-zinc-400 mt-2">
														Need a hand? Check our documentation at{' '}
														<a href="https://docs.planetaryapp.us/workspace/oauth" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
															docs.planetaryapp.us
														</a>
													</p>
												</div>

												<div className="mt-4 pt-4 border-t border-zinc-200 dark:border-zinc-700">
													<label className="flex items-center cursor-pointer">
														<input
															type="checkbox"
															checked={robloxConfig.oauthOnlyLogin}
															onChange={(e) => setRobloxConfig(prev => ({ ...prev, oauthOnlyLogin: e.target.checked }))}
															disabled={usingEnvVars}
															className={`w-4 h-4 text-blue-600 border-zinc-300 dark:border-zinc-600 rounded focus:ring-blue-500 focus:ring-2 ${usingEnvVars ? 'bg-zinc-100 dark:bg-zinc-800 cursor-not-allowed' : 'bg-white dark:bg-zinc-700'
																}`}
														/>
														<span className={`ml-2 text-sm ${usingEnvVars ? 'text-zinc-500 dark:text-zinc-400' : 'text-zinc-700 dark:text-zinc-300'}`}>
															Enforce OAuth login
														</span>
													</label>
													<p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 ml-6">
														When enabled, users will only see the Roblox OAuth login button.
													</p>
												</div>
											</div>

											{saveMessage && (
												<div className={`mt-4 p-3 rounded-md text-sm ${saveMessage.includes('successfully')
													? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300'
													: 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300'
													}`}>
													{saveMessage}
												</div>
											)}

											<div className="flex justify-end space-x-3 mt-6">
												<Button
													onClick={() => setShowInstanceSettings(false)}
													disabled={configLoading}
													classoverride="bg-zinc-200 hover:bg-zinc-300 text-zinc-800 dark:bg-zinc-700 dark:hover:bg-zinc-600 dark:text-white"
												>
													Cancel
												</Button>
												<Button
													onClick={saveRobloxConfig}
													loading={configLoading}
													disabled={configLoading || usingEnvVars}
													classoverride={usingEnvVars ? "bg-zinc-300 dark:bg-zinc-700 text-zinc-500 dark:text-zinc-400 cursor-not-allowed" : ""}
												>
													{usingEnvVars ? 'Using Env Vars' : 'Save Settings'}
												</Button>
											</div>
										</Dialog.Panel>
									</Transition.Child>
								</div>
							</div>
						</Dialog>
					</Transition>
				</div>
			</div>
		</div>
	)
}

export default Home

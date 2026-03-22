import type { NextPage } from "next";
import { Dialog } from "@headlessui/react";
import { loginState } from "@/state";
import { useRecoilState } from "recoil";
import { Menu, Transition } from "@headlessui/react";
import Router, { useRouter } from "next/router";
import { IconLogout, IconChevronDown, IconSun, IconMoon, IconSettings, IconX } from "@tabler/icons-react";
import axios from "axios";
import { Fragment, useEffect, useRef, useState } from "react";
import ThemeToggle from "./ThemeToggle";
import { themeState } from "@/state/theme";
import Image from "next/image";
import toast, { Toaster } from "react-hot-toast";

const Topbar: NextPage = () => {
	const [login, setLogin] = useRecoilState(loginState);
	const [theme, setTheme] = useRecoilState(themeState);
	const [showSettings, setShowSettings] = useState(false);
	const router = useRouter();
	const errorToastShown = useRef(false)


	async function logout() {
		await axios.post("/api/auth/logout");
		setLogin({
			userId: 1,
			username: '',
			displayname: '',
			canMakeWorkspace: false,
			thumbnail: '',
			workspaces: [],
			isOwner: false
		});
		router.push('/login');
	}

	async function unlink() {
		const toastId = toast.loading("Unlinking your Discord account...");
		try {
			await axios.post("/api/auth/discord/unlink");
			toast.success("Discord account unlinked", { id: toastId });
			setLogin(prev => ({ ...prev, discordUser: undefined }));
			setShowSettings(false);
		} catch (err) {
			toast.error("Failed to unlink Discord account", { id: toastId });
		}
	}

	const toggleTheme = () => {
		const newTheme = theme === "dark" ? "light" : "dark";
		setTheme(newTheme);
		if (typeof window !== "undefined") localStorage.setItem("theme", newTheme);
	};

	useEffect(() => {
		if (!Router.isReady || errorToastShown.current) return

		const { action, ...rest } = Router.query

		if (action) {
			if (action == "linked") {
				toast.success("Successfully linked your Discord Account")
			} else {
				toast.error("There was an error while logging in.")
			}
			errorToastShown.current = true
			Router.replace(
				{ pathname: Router.pathname, query: rest },
				undefined,
				{ shallow: true }
			)
		}
	}, [Router.isReady, Router.query])

	return (
		<>
			<Toaster position="bottom-center" />
			<header className="sticky top-0 z-50 bg-white/80 dark:bg-zinc-800/80 backdrop-blur-sm border-b border-gray-200 dark:border-zinc-700">
				<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
					<div className="flex justify-between items-center h-16">
						<div className="flex items-center space-x-4">
							<img
								src='/planetary.svg'
								className="h-8 w-32"
								alt="Planetary logo"
							/>
							<ThemeToggle />
						</div>

						<Menu as="div" className="relative">
							<Menu.Button className="flex items-center space-x-3 px-3 py-2 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-colors">
								<img
									src={login?.thumbnail}
									className="h-8 w-8 rounded-full bg-zinc-200 dark:bg-zinc-600"
									alt={`${login?.displayname}'s avatar`}
								/>
								<span className="text-sm font-medium text-zinc-700 dark:text-zinc-200">
									{login?.displayname}
								</span>
								<IconChevronDown className="h-4 w-4 text-zinc-500 dark:text-zinc-400" />
							</Menu.Button>

							<Transition
								as={Fragment}
								enter="transition ease-out duration-100"
								enterFrom="transform opacity-0 scale-95"
								enterTo="transform opacity-100 scale-100"
								leave="transition ease-in duration-75"
								leaveFrom="transform opacity-100 scale-100"
								leaveTo="transform opacity-0 scale-95"
							>
								<Menu.Items className="absolute right-0 mt-2 w-56 origin-top-right rounded-lg bg-white dark:bg-zinc-800 shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none">
									<div className="p-2">
										<div className="px-3 py-2">
											<div className="flex items-center space-x-3">
												<img
													src={login?.thumbnail}
													className="h-10 w-10 rounded-full bg-zinc-200 dark:bg-zinc-600"
													alt={`${login?.displayname}'s avatar`}
												/>
												<div>
													<div className="text-sm font-medium text-zinc-900 dark:text-white">
														{login?.displayname}
													</div>
													<div className="text-xs text-zinc-500 dark:text-zinc-400">
														@{login?.username}
													</div>
												</div>
											</div>
										</div>

										<div className="h-px bg-zinc-200 dark:bg-zinc-700 my-2" />

										<Menu.Item>
											{({ active }) => (
												<button
													type="button"
													onClick={toggleTheme}
													className={`${active ? "bg-zinc-100 dark:bg-zinc-700" : ""
														} group flex w-full items-center rounded-md px-3 py-2 text-sm`}
												>
													{theme === "dark" ? (
														<IconSun className="mr-2 h-5 w-5 text-zinc-500 dark:text-zinc-400" />
													) : (
														<IconMoon className="mr-2 h-5 w-5 text-zinc-500 dark:text-zinc-400" />
													)}

													<span className="text-zinc-700 dark:text-zinc-200">
														{theme === "dark" ? "Light mode" : "Dark mode"}
													</span>
												</button>
											)}
										</Menu.Item>
										<Menu.Item>
											{({ active }) => (
												<button
													onClick={() => setShowSettings(true)}
													className={`${active ? 'bg-zinc-100 dark:bg-zinc-700' : ''
														} group flex w-full items-center rounded-md px-3 py-2 text-sm`}
												>
													<IconSettings className="mr-2 h-5 w-5 text-zinc-500 dark:text-zinc-400" />
													<span className="text-zinc-700 dark:text-zinc-200">Settings</span>
												</button>
											)}
										</Menu.Item>
										<Menu.Item>
											{({ active }) => (
												<button
													onClick={logout}
													className={`${active ? 'bg-zinc-100 dark:bg-zinc-700' : ''
														} group flex w-full items-center rounded-md px-3 py-2 text-sm`}
												>
													<IconLogout className="mr-2 h-5 w-5 text-zinc-500 dark:text-zinc-400" />
													<span className="text-zinc-700 dark:text-zinc-200">Sign out</span>
												</button>
											)}
										</Menu.Item>

									</div>
								</Menu.Items>
							</Transition>
						</Menu>
					</div>
				</div>
				<Dialog open={showSettings} onClose={() => setShowSettings(false)} className="relative z-50">
					<div className="fixed inset-0 bg-black/30" aria-hidden="true" />
					<div className="fixed inset-0 flex items-center justify-center p-4">
						<Dialog.Panel className="mx-auto max-w-md w-full rounded-lg bg-white dark:bg-zinc-800 p-6 shadow-xl">
							<div className="flex items-center justify-between mb-6">
								<Dialog.Title className="text-lg font-medium text-zinc-900 dark:text-white">
									Settings
								</Dialog.Title>
								<button
									onClick={() => setShowSettings(false)}
									className="p-1 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-700"
								>
									<IconX className="w-5 h-5 text-zinc-500" />
								</button>
							</div>

							<div className="space-y-4">
								<div className="flex items-center gap-4 p-4">
									<img
										src={login?.thumbnail}
										alt={login?.displayname}
										className="h-24 w-24 rounded-full bg-zinc-200 dark:bg-zinc-600 shrink-0"
									/>
									<div>
										<p className="text-2xl font-semibold text-zinc-900 dark:text-white">{login?.displayname}</p>
										<p className="text-xs text-zinc-500 dark:text-zinc-400">@{login?.username}</p>
									</div>
								</div>
								{login.discordUser ? (
									<div className="flex items-center gap-3 p-4 rounded-xl border border-zinc-200 dark:border-zinc-600">
										<img
											src={`https://cdn.discordapp.com/avatars/${login.discordUser.discordUserId}/${login.discordUser.avatar}.png`}
											alt={login.discordUser.username}
											className="h-10 w-10 rounded-full bg-zinc-200 dark:bg-zinc-600 shrink-0"
										/>
										<div className="flex-1 min-w-0">
											<p className="text-sm font-medium text-zinc-900 dark:text-white truncate">
												{login.discordUser.username}
											</p>
											<p className="text-xs text-zinc-500 dark:text-zinc-400">Discord linked</p>
										</div>
										<button
											type="button"
											onClick={unlink}
											className="text-xs text-red-500 hover:text-red-600 transition-colors"
										>
											Unlink
										</button>
									</div>
								) : (
									<button
										type="button"
										onClick={() => (window.location.href = "/api/auth/discord/start")}
										className="w-full flex items-center justify-center px-4 py-2.5 border border-zinc-200 dark:border-zinc-600 rounded-xl text-sm font-medium text-zinc-700 dark:text-zinc-200 hover:bg-zinc-50 dark:hover:bg-zinc-700/50 disabled:opacity-50 transition-colors"
									>
										<img
											src="/discord.svg"
											alt="Discord"
											className="w-5 h-5 mr-2 dark:invert-0 invert"
										/>
										Link your Discord account
									</button>
								)}
							</div>
						</Dialog.Panel>
					</div>
				</Dialog>
			</header>
		</>
	);
};

export default Topbar;

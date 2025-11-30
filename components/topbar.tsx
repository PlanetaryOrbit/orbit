import type { NextPage } from "next";
import { loginState } from "@/state";
import { useRecoilState } from "recoil";
import { Menu, Transition } from "@headlessui/react";
import { useRouter } from "next/router";
import { IconLogout, IconChevronDown } from "@tabler/icons-react";
import axios from "axios";
import { Fragment } from "react";
import ThemeToggle from "./ThemeToggle";

const Topbar: NextPage = () => {
	const [login, setLogin] = useRecoilState(loginState);
	const router = useRouter();

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

	return (
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
												onClick={logout}
												className={`${
													active ? 'bg-zinc-100 dark:bg-zinc-700' : ''
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
		</header>
	);
};

export default Topbar;

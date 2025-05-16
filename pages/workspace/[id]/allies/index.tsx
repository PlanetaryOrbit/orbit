import workspace from "@/layouts/workspace";
import { pageWithLayout } from "@/layoutTypes";
import { loginState } from "@/state";
import axios from "axios";
import { useRouter } from "next/router";
import { useState, Fragment, useMemo } from "react";
import randomText from "@/utils/randomText";
import { useRecoilState } from "recoil";
import toast, { Toaster } from 'react-hot-toast';
import { InferGetServerSidePropsType } from "next";
import { withSessionSsr } from "@/lib/withSession";
import { Dialog, Transition } from "@headlessui/react";
import { withPermissionCheckSsr } from "@/utils/permissionsManager";
import { FormProvider, SubmitHandler, useForm } from "react-hook-form";
import Input from "@/components/input";
import prisma from "@/utils/database";
import { getUsername, getThumbnail } from "@/utils/userinfoEngine";
import Checkbox from "@/components/checkbox";
import Tooltip from "@/components/tooltip";
import { IconUsers, IconPlus, IconTrash, IconClipboardList, IconArrowLeft } from "@tabler/icons";

type Form = {
	group: string;
	notes: string;
}

export const getServerSideProps = withPermissionCheckSsr(
	async ({ req, res, params }) => {
		let users = await prisma.user.findMany({
			where: {
				OR: [
					{
						roles: {
							some: {
								workspaceGroupId: parseInt(params?.id as string),
								permissions: {
									has: 'admin'
								}
							}
						}
					},
					{
						roles: {
							some: {
								workspaceGroupId: parseInt(params?.id as string),
								permissions: {
									has: 'represent_alliance'
								}
							}
						}
					},
					{
						roles: {
							some: {
								workspaceGroupId: parseInt(params?.id as string),
								permissions: {
									has: 'manage_alliances'
								}
							}
						}
					}
				]
			}
		});
		const infoUsers: any = await Promise.all(users.map(async (user: any) => {
			return {
				...user,
				userid: Number(user.userid),
				thumbnail: await getThumbnail(user.userid)
			}
		}))

		const allies: any = await prisma.ally.findMany({
			where: {
				workspaceGroupId: parseInt(params?.id as string)
			},
			include: {
				reps: true
			}
		})
		const infoAllies = await Promise.all(allies.map(async (ally: any) => {
			const infoReps = await Promise.all(ally.reps.map(async (rep: any) => {
				return {
					...rep,
					userid: Number(rep.userid),
					username: await getUsername(rep.userid),
					thumbnail: await getThumbnail(rep.userid)
				}
			}))

			return {
				...ally,
				reps: infoReps
			}
		}))

		return {
			props: {
				infoUsers,
				infoAllies
			}
		}
	},'manage_alliances')

type pageProps = InferGetServerSidePropsType<typeof getServerSideProps>

const Allies: pageWithLayout<pageProps> = (props) => {
	const router = useRouter();
	const { id } = router.query;
	const [selectedRoles, setSelectedRoles] = useState<string[]>([])
	const [login, setLogin] = useRecoilState(loginState);
	const text = useMemo(() => randomText(login.displayname), []);

	const form = useForm<Form>();
	const { register, handleSubmit, setError, watch } = form;

	const toggleRole = async (role: string) => {
		const roles = selectedRoles;
		if (roles.includes(role)) {
			roles.splice(roles.indexOf(role), 1);
		}
		else {
			roles.push(role);
		}
		setSelectedRoles(roles);
	}

	const [reps, setReps] = useState<string[]>([])

	const handleCheckboxChange = (event: React.ChangeEvent<HTMLInputElement>) => {
		const { value, checked } = event.target
		if(checked) {
			setReps([...reps, value])
		} else {
			setReps(reps.filter((r) => r !== value))
		}
	}

	const onSubmit: SubmitHandler<Form> = async ({ group, notes }) => {
		const axiosPromise = axios.post(
			`/api/workspace/${id}/allies/new`,
			{ groupId: group, notes: notes, reps: reps }
		).then(req => {
			router.reload()
		});
		toast.promise(
			axiosPromise,
			{
				loading: "Creating ally...",
				success: () => {
					setIsOpen(false);
					return "Ally created!";
				},
				error: "Ally was not created due to an unknown error."
			}
		);
	}

	const [isOpen, setIsOpen] = useState(false);

	const colors = [
		'bg-red-500',
		'bg-yellow-500',
		'bg-green-500',
		'bg-blue-500',
		'bg-indigo-500',
		'bg-purple-500',
		'bg-pink-500',
	]

	const getRandomColor = () => {
		return colors[Math.floor(Math.random() * colors.length)];
	}

	const allies: any = props.infoAllies
	const users: any = props.infoUsers

	return <>
		<Toaster position="bottom-center" />

		<div className="pagePadding bg-gray-50 dark:bg-gray-900">
			<div className="max-w-7xl mx-auto">
				<div className="flex items-center gap-3 mb-6">
					<div>
						<h1 className="text-2xl font-medium text-gray-900 dark:text-white">Alliances</h1>
						<p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Manage and view your group’s alliances with other communities</p>
					</div>
				</div>

				<div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm overflow-hidden mb-6">
					<div className="p-6">
						<div className="flex items-center justify-between mb-6">
							<div className="flex items-center gap-3">
								<div className="bg-primary/10 p-2 rounded-lg">
									<IconUsers className="w-5 h-5 text-primary" />
								</div>
								<div>
									<h2 className="text-lg font-medium text-gray-900 dark:text-white">Allies</h2>
									<p className="text-sm text-gray-500 dark:text-gray-400">Manage your group alliances</p>
								</div>
							</div>
							<button
								onClick={() => setIsOpen(true)}
								className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
							>
								<IconPlus className="w-4 h-4" />
								<span className="text-sm font-medium">New Ally</span>
							</button>
						</div>

						{allies.length === 0 ? (
							<div className="text-center py-12">
								<div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-8 max-w-md mx-auto">
									<div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4">
										<IconClipboardList className="w-8 h-8 text-primary" />
									</div>
									<h3 className="text-lg font-medium text-gray-900 dark:text-white mb-1">No Allies</h3>
									<p className="text-sm text-gray-500 dark:text-gray-400 mb-4">You haven't created any allies yet</p>
									<button
										onClick={() => setIsOpen(true)}
										className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
									>
										<IconPlus className="w-4 h-4" />
										<span className="text-sm font-medium">Create Ally</span>
									</button>
								</div>
							</div>
						) : (
							<div className="grid gap-4 grid-cols-1 md:grid-cols-2 xl:grid-cols-3">
								{allies.map((ally: any) => (
									<div key={ally.id} className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
										<div className="flex items-start justify-between mb-3">
											<div className="flex items-center gap-3">
												<img src={ally.icon} className="w-12 h-12 rounded-full" />
												<div>
													<h3 className="text-sm font-medium text-gray-900 dark:text-white">{ally.name}</h3>
													<p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Group ID: {ally.groupId}</p>
												</div>
											</div>
											<button
												onClick={() => {
													const axiosPromise = axios.delete(`/api/workspace/${id}/allies/${ally.id}/delete`).then(req => {
														router.reload()
													});
													toast.promise(
														axiosPromise,
														{
															loading: "Deleting ally...",
															success: "Ally deleted!",
															error: "Failed to delete ally"
														}
													);
												}}
												className="p-1 text-gray-400 hover:text-red-500 transition-colors"
											>
												<IconTrash className="w-4 h-4" />
											</button>
										</div>
										<div className="flex flex-wrap gap-2 mb-4">
											{ally.reps.map((rep: any) => (
												<Tooltip key={rep.userid} orientation="top" tooltipText={rep.username}>
													<img 
														src={rep.thumbnail} 
														className="w-8 h-8 rounded-full bg-primary border-2 border-gray-200 dark:border-gray-700 transition-transform"
														alt={rep.username}
													/>
												</Tooltip>
											))}
										</div>
										<button
											onClick={() => router.push(`/workspace/${id}/allies/manage/${ally.id}`)}
											className="flex items-center gap-3 p-2 rounded-lg dark:text-white hover:bg-gray-50 dark:bg-gray-600 dark:hover:bg-gray-500 cursor-pointer">
											Manage Ally
										</button>
									</div>
								))}
							</div>
						)}
					</div>
				</div>
			</div>
		</div>

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
					<div className="fixed inset-0 bg-black/30 backdrop-blur-sm" />
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
							<Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-xl bg-white dark:bg-gray-800 p-6 text-left align-middle shadow-xl transition-all">
								<Dialog.Title as="h3" className="text-lg font-medium text-gray-900 dark:text-white mb-4">
									Create New Ally
								</Dialog.Title>

								<div className="mt-2">
									<FormProvider {...form}>
										<form onSubmit={handleSubmit(onSubmit)}>
											<div className="space-y-4">
												<Input 
													label="Group ID" 
													type="number" 
													{...register("group", { required: true })} 
												/>
												<Input 
													textarea 
													label="Notes" 
													{...register("notes")} 
												/>
												<div>
													<label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
														Representatives
													</label>
													{users.length < 1 ? (
														<p className="text-sm text-gray-500">You don't have anyone who can represent yet</p>
													) : (
														<>
															<p className="text-sm text-gray-500 mb-2">{reps.length} Reps Selected (Minimum 1)</p>
															<div className="space-y-2 max-h-48 overflow-y-auto">
																{users.map((user: any) => (
																	<label
																		key={user.userid}
																		className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer"
																	>
																		<input
																			type="checkbox"
																			value={user.userid}
																			onChange={handleCheckboxChange}
																			className="rounded border-gray-300 text-primary focus:ring-primary"
																		/>
																		<img 
																			src={user.thumbnail} 
																			className="w-8 h-8 rounded-full bg-primary" 
																			alt={user.username}
																		/>
																		<span className="text-sm text-gray-900 dark:text-white">{user.username}</span>
																	</label>
																))}
															</div>
														</>
													)}
												</div>
											</div>
											<input type="submit" className="hidden" />
										</form>
									</FormProvider>
								</div>

								<div className="mt-6 flex gap-3">
									<button
										type="button"
										className="flex-1 justify-center rounded-lg bg-gray-100 dark:bg-gray-700 px-4 py-2 text-sm font-medium text-gray-900 dark:text-white hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
										onClick={() => setIsOpen(false)}
									>
										Cancel
									</button>
									<button
										type="button"
										className="flex-1 justify-center rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90 transition-colors"
										onClick={handleSubmit(onSubmit)}
									>
										Create Ally
									</button>
								</div>
							</Dialog.Panel>
						</Transition.Child>
					</div>
				</div>
			</Dialog>
		</Transition>
	</>;
}

Allies.layout = workspace

export default Allies
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
import moment from "moment";
import { Dialog, Transition } from "@headlessui/react";
import { withPermissionCheckSsr } from "@/utils/permissionsManager";
import { FormProvider, SubmitHandler, useForm } from "react-hook-form";
import Input from "@/components/input";
import prisma, { inactivityNotice } from "@/utils/database";
import { IconChartBar, IconPlus, IconTrash, IconUsers, IconClipboardList, IconArrowLeft } from "@tabler/icons";

type Form = {
	type: string;
	requirement: number;
	name: string;
}

export const getServerSideProps = withPermissionCheckSsr(
	async ({ req, res, params }) => {
		const quotas = await prisma.quota.findMany({
			where: {
				workspaceGroupId: parseInt(params?.id as string)
			},
			include: {
				quotaRoles: {
				  include: {
					role: true
				  }
				}
			  }
			  
		});

		const roles = await prisma.role.findMany({
			where: {
				workspaceGroupId: Number(params?.id),
				isOwnerRole: false
			},
		});

		return {
			props: {
				quotas: JSON.parse(JSON.stringify(quotas, (_key, value) => (typeof value === 'bigint' ? value.toString() : value))),
				roles
			}
		}
	}, 'manage_activity'
)

type pageProps = InferGetServerSidePropsType<typeof getServerSideProps>

const Quotas: pageWithLayout<pageProps> = (props) => {
	const router = useRouter();
	const { id } = router.query;
	const [quotas, setQuotas] = useState<inactivityNotice[]>(props.quotas as inactivityNotice[]);
	const [selectedRoles, setSelectedRoles] = useState<string[]>([])
	const roles: any = props.roles
	const [login, setLogin] = useRecoilState(loginState);
	const text = useMemo(() => randomText(login.displayname), []);

	const form = useForm<Form>();
	const { register, handleSubmit, setError, watch } = form;

	const toggleRole = async (role: string) => {
		const updatedRoles = [...selectedRoles];
		if (updatedRoles.includes(role)) {
			setSelectedRoles(updatedRoles.filter(r => r !== role));
		} else {
			setSelectedRoles([...updatedRoles, role]);
		}
	};

	const onSubmit: SubmitHandler<Form> = async ({ type, requirement, name }) => {
		const axiosPromise = axios.post(
			`/api/workspace/${id}/activity/quotas/new`,
			{ value: Number(requirement), type, roles: selectedRoles, name }
		).then(req => {
			setQuotas([...quotas, req.data.quota]);
			setSelectedRoles([]);
		});
		toast.promise(
			axiosPromise,
			{
				loading: "Creating your quota...",
				success: () => {
					setIsOpen(false);
					return "Quota created!";
				},
				error: "Quota was not created due to an unknown error."
			}
		);
	}

	const [isOpen, setIsOpen] = useState(false);

	const types: {
		[key: string]: string;
	} = {
		'mins': 'Minutes in game',
		'sessions_hosted': 'Sessions hosted',
		'sessions_attended': 'Sessions attended',
	}

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

	return <>
		<Toaster position="bottom-center" />

		<div className="pagePadding">
			<div className="max-w-7xl mx-auto">
				<div className="flex items-center gap-3 mb-6">
					<button onClick={() => router.back()} className="p-2 text-gray-500 hover:text-gray-700 rounded-lg hover:bg-gray-100 transition-colors">
						<IconArrowLeft className="w-5 h-5" />
					</button>
					<div>
						<h1 className="text-2xl font-medium text-gray-900 dark:text-white">Activity Quotas</h1>
					</div>
				</div>

				<div className="bg-white dark:bg-gray-700 rounded-xl shadow-sm overflow-hidden mb-6">
					<div className="p-6">
						<div className="flex items-center justify-between mb-6">
							<div className="flex items-center gap-3">
								<div className="bg-primary/10 p-2 rounded-lg">
									<IconChartBar className="w-5 h-5 text-primary" />
								</div>
								<div>
									<h2 className="text-lg font-medium text-gray-900 dark:text-white">Quotas</h2>
									<p className="text-sm text-gray-500 dark:text-gray-400">Set requirements for your staff</p>
								</div>
							</div>
							<button
								onClick={() => setIsOpen(true)}
								className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
							>
								<IconPlus className="w-4 h-4" />
								<span className="text-sm font-medium">New Quota</span>
							</button>
						</div>

						{quotas.length === 0 ? (
							<div className="text-center py-12">
								<div className="bg-gray-50 dark:bg-gray-600 rounded-xl p-8 max-w-md mx-auto">
									<div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4">
										<IconClipboardList className="w-8 h-8 text-primary" />
									</div>
									<h3 className="text-lg font-medium text-gray-900 dark:text-white mb-1">No Quotas</h3>
									<p className="text-sm text-gray-500 mb-4">You haven't set up any activity quotas yet</p>
									<button
										onClick={() => setIsOpen(true)}
										className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
									>
										<IconPlus className="w-4 h-4" />
										<span className="text-sm font-medium">Create Quota</span>
									</button>
								</div>
							</div>
						) : (
							<div className="grid gap-4 grid-cols-1 md:grid-cols-2 xl:grid-cols-3">
								{quotas.map((quota: any) => (
									<div key={quota.id} className="bg-gray-50 dark:bg-gray-500 rounded-lg p-4">
										<div className="flex items-start justify-between mb-3">
											<div>
												<h3 className="text-sm font-medium text-gray-900 dark:text-white">{quota.name}</h3>
												<p className="text-xs text-gray-500 mt-1 dark:text-gray-400">
													{quota.value} {types[quota.type]} per timeframe
												</p>
											</div>
											<button
												onClick={() => {
													const axiosPromise = axios.delete(`/api/workspace/${id}/activity/quotas/${quota.id}/delete`).then(req => {
														setQuotas(quotas.filter((q: any) => q.id !== quota.id));
													});
													toast.promise(
														axiosPromise,
														{
															loading: "Deleting quota...",
															success: "Quota deleted!",
															error: "Failed to delete quota"
														}
													);
												}}
												className="p-1 text-gray-400 hover:text-red-500 transition-colors"
											>
												<IconTrash className="w-4 h-4" />
											</button>
										</div>
										<div className="flex flex-wrap gap-2">
											{quota.quotaRoles?.map((qr: any) => (
												<div 
													key={qr.role.id}
													className={`${getRandomColor()} text-white py-1 px-2 rounded-full text-xs font-medium flex items-center gap-1`}
												>
													<IconUsers className="w-3 h-3" />
													{qr.role.name}
												</div>
											))}
										</div>
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
								<Dialog.Title as="h3" className="text-lg font-medium text-gray-900 mb-4 dark:text-white">
									Create Activity Quota
								</Dialog.Title>

								<div className="mt-2">
									<FormProvider {...form}>
										<form onSubmit={handleSubmit(onSubmit)}>
											<div className="space-y-4">
												<div>
													<label className="block text-sm font-medium dark:text-white text-gray-700 mb-2">
														Assigned Roles
													</label>
													<div className="space-y-2">
														{roles.map((role: any) => (
															<label
																key={role.id}
																className="flex items-center gap-2 p-2 rounded-lg hover:bg-gray-50 cursor-pointer"
															>
																<input
																	type="checkbox"
																	onChange={() => toggleRole(role.id)}
																	className="rounded border-gray-300 text-primary focus:ring-primary"
																/>
																<span className="text-sm text-gray-900 dark:text-white">{role.name}</span>
															</label>
														))}
													</div>
												</div>

												<div>
													<label className="block text-sm font-medium text-gray-700 mb-2 dark:text-white">
														Quota Type
													</label>
													<select 
														{...register('type')} 
														className="w-full rounded-lg border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-600 text-gray-900 dark:text-white focus:border-primary focus:ring-primary"
													>
														<option value='sessions_hosted'>Sessions Hosted</option>
														<option value='sessions_attended'>Sessions Attended</option>
														<option value='mins'>Minutes in Game</option>
													</select>
												</div>

												<Input 
													label="Requirement" 
													type="number" 
													append={watch('type') === 'mins' ? 'Minutes' : 'Sessions'} 
													classoverride="dark:text-white"
													{...register("requirement", { required: true })} 
												/>
												<Input 
													label="Name" 
													placeholder="Enter a name for this quota..."
													classoverride="dark:text-white"
													{...register("name", { required: true })} 
												/>
											</div>
											<input type="submit" className="hidden" />
										</form>
									</FormProvider>
								</div>

								<div className="mt-6 flex gap-3">
									<button
										type="button"
										className="flex-1 justify-center rounded-lg bg-gray-100 px-4 py-2 text-sm font-medium text-gray-900 hover:bg-gray-200 transition-colors"
										onClick={() => setIsOpen(false)}
									>
										Cancel
									</button>
									<button
										type="button"
										className="flex-1 justify-center rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90 transition-colors"
										onClick={handleSubmit(onSubmit)}
									>
										Submit
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

Quotas.layout = workspace

export default Quotas

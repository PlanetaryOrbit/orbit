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
import { IconCalendarTime, IconPlus, IconCheck, IconX, IconClock, IconClipboardList, IconArrowLeft } from "@tabler/icons";

type Form = {
	startTime: string;
	endTime: string;
	reason: string;
}

export const getServerSideProps = withPermissionCheckSsr(
	async ({ req, res, params }) => {
		const notices: inactivityNotice[] = await prisma.inactivityNotice.findMany({
			where: {
				userId: req.session.userid,
				workspaceGroupId: parseInt(params?.id as string),
			},
			orderBy: [
				{
					startTime: "desc"
				}
			]
		});

		return {
			props: {
				notices: (JSON.parse(JSON.stringify(notices, (key, value) => (typeof value === 'bigint' ? value.toString() : value))) as typeof notices)
			}
		}
	}
)

type pageProps = InferGetServerSidePropsType<typeof getServerSideProps>

const Notices: pageWithLayout<pageProps> = (props) => {
	const router = useRouter();
	const { id } = router.query;
	const [notices, setNotices] = useState<inactivityNotice[]>(props.notices as inactivityNotice[]);
	const [login, setLogin] = useRecoilState(loginState);
	const text = useMemo(() => randomText(login.displayname), []);
	
	const form = useForm<Form>();
	const { register, handleSubmit, setError } = form;

	const onSubmit: SubmitHandler<Form> = async ({ startTime, endTime, reason }) => {
		const start = new Date();
		const end = new Date();
		start.setDate(parseInt(startTime.split("-")[2]));
		start.setMonth(parseInt(startTime.split("-")[1]) - 1);
		start.setFullYear(parseInt(startTime.split("-")[0]));
		end.setDate(parseInt(endTime.split("-")[2]));
		end.setMonth(parseInt(endTime.split("-")[1]) - 1);
		end.setFullYear(parseInt(endTime.split("-")[0]));

		const axiosPromise = axios.post(
			`/api/workspace/${id}/activity/notices/create`,
			{ startTime: start.getTime(), endTime: end.getTime(), reason }
		).then(req => {
			setNotices([...notices, req.data.notice])
		});
		toast.promise(
			axiosPromise,
			{
				loading: "Creating your inactivity notice...",
				success: () => {
					setIsOpen(false);
					return "Inactivity notice submitted!";
				},
				error: "Inactivity notice was not created due to an unknown error."
			}
		);
	}

	const [isOpen, setIsOpen] = useState(false);

	const getStatusIcon = (status: string) => {
		switch (status) {
			case "approved":
				return <IconCheck className="w-5 h-5 text-green-500" />;
			case "declined":
				return <IconX className="w-5 h-5 text-red-500" />;
			default:
				return <IconClock className="w-5 h-5 text-yellow-500" />;
		}
	};

	const getStatusText = (status: string) => {
		switch (status) {
			case "approved":
				return "Approved";
			case "declined":
				return "Declined";
			default:
				return "Under Review";
		}
	};

	return <>
		<Toaster position="bottom-center" />

		<div className="pagePadding">
			<div className="max-w-7xl mx-auto">
				<div className="flex items-center gap-3 mb-6">
					<button onClick={() => router.back()} className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-white rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
						<IconArrowLeft className="w-5 h-5" />
					</button>
					<div>
						<h1 className="text-2xl font-medium text-gray-900 dark:text-white">Notices</h1>
					</div>
				</div>

				<div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm overflow-hidden mb-6">
					<div className="p-6">
						<div className="flex items-center justify-between mb-6">
							<div className="flex items-center gap-3">
								<div className="bg-primary/10 p-2 rounded-lg">
									<IconCalendarTime className="w-5 h-5 text-primary" />
								</div>
								<div>
									<h2 className="text-lg font-medium text-gray-900 dark:text-white">Inactivity Notices</h2>
									<p className="text-sm text-gray-500 dark:text-gray-400">Manage your inactivity periods</p>
								</div>
							</div>
							<button
								onClick={() => setIsOpen(true)}
								className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
							>
								<IconPlus className="w-4 h-4" />
								<span className="text-sm font-medium">New Notice</span>
							</button>
						</div>

						{notices.length === 0 ? (
							<div className="text-center py-12">
								<div className="bg-gray-50 dark:bg-gray-700 rounded-xl p-8 max-w-md mx-auto">
									<div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4">
										<IconClipboardList className="w-8 h-8 text-primary" />
									</div>
									<h3 className="text-lg font-medium text-gray-900 mb-1 dark:text-white">No Notices</h3>
									<p className="text-sm text-gray-500 mb-4">You haven't submitted any inactivity notices yet</p>
									<button
										onClick={() => setIsOpen(true)}
										className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
									>
										<IconPlus className="w-4 h-4" />
										<span className="text-sm font-medium">Create Notice</span>
									</button>
								</div>
							</div>
						) : (
							<div className="space-y-4">
								{notices.map((notice: any) => (
									<div key={notice.id} className="flex gap-4 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
										<div className="flex-shrink-0">
											{getStatusIcon(notice.approved ? "approved" : notice.reviewed ? "declined" : "pending")}
										</div>
										<div className="flex-grow">
											<div className="flex items-center justify-between mb-1">
												<div className="flex items-center gap-2">
													<span className={`text-sm font-medium ${
														notice.approved ? "text-green-600" : 
														notice.reviewed ? "text-red-600" : 
														"text-yellow-600"
													}`}>
														{getStatusText(notice.approved ? "approved" : notice.reviewed ? "declined" : "pending")}
													</span>
													<span className="text-xs text-gray-500">
														{moment(new Date(notice.startTime)).format("MMM Do")} - {moment(new Date(notice.endTime)).format("MMM Do YYYY")}
													</span>
												</div>
											</div>
											<p className="text-sm text-gray-600 dark:text-gray-300">{notice.reason}</p>
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
								<Dialog.Title as="h3" className="text-lg font-medium text-gray-900 dark:text-white mb-4">
									Create Inactivity Notice
								</Dialog.Title>

								<div className="mt-2">
									<FormProvider {...form}>
										<form onSubmit={handleSubmit(onSubmit)}>
											<div className="grid gap-3 grid-cols-2">
												<Input 
													label="Start Date" 
													type="date" 
													id="startTime" 
													{...register("startTime", { 
														required: { value: true, message: "This field is required" }, 
														validate: {
															future: (value) => {
																const date = new Date();
																date.setMilliseconds(0);
																date.setSeconds(0);
																date.setMinutes(0);
																date.setHours(0);
																date.setDate(parseInt(value.split("-")[2]));
																date.setMonth(parseInt(value.split("-")[1]) - 1);
																date.setFullYear(parseInt(value.split("-")[0]));

																if (date.getTime() < new Date().getTime()) return "Please select a date in the future";
															}
														} 
													})} 
												/>
												<Input 
													label="End Date" 
													type="date" 
													id="endTime" 
													{...register("endTime", { 
														required: { value: true, message: "This field is required" }, 
														validate: {
															afterStart: (value) => {
																if (new Date(value).getTime() < new Date(form.getValues().startTime).getTime()) return "Please select a date after the start date";
															}
														}
													})} 
												/>
											</div>
											<Input 
												label="Reason" 
												type="text" 
												id="reason" 
												placeholder="Enter your reason for inactivity..."
												{...register("reason", { 
													required: { value: true, message: "This field is required" } 
												})} 
											/>
											<input type="submit" className="hidden" />
										</form>
									</FormProvider>
								</div>

								<div className="mt-6 flex gap-3">
									<button
										type="button"
										className="flex-1 justify-center rounded-lg bg-gray-100 dark:bg-gray-700 dark:hover:bg-gray-600 px-4 py-2 text-sm font-medium text-gray-900 dark:text-white hover:bg-gray-200 transition-colors"
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

Notices.layout = workspace

export default Notices

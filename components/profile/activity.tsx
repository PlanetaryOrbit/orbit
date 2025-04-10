import React, { Fragment, useEffect, useState } from "react";
import { useRecoilState } from "recoil";
import { workspacestate } from "@/state";
import { FC } from '@/types/settingsComponent'
import { Chart, ChartData, ScatterDataPoint } from "chart.js"
import { Line } from "react-chartjs-2";
import type { ActivitySession, Quota, inactivityNotice } from "@prisma/client";
import Tooltip from "@/components/tooltip";
import moment from "moment";
import { Dialog, Transition } from "@headlessui/react";
import Button from "../button";
import { IconMessages, IconMoon, IconPlayerPlay, IconWalk, IconCalendarTime, IconChartBar, IconUsers, IconClipboardList } from "@tabler/icons";
import axios from "axios";
import { Toaster, toast } from "react-hot-toast";
import { useRouter } from "next/router";

type Props = {
	timeSpent: number;
	timesPlayed: number;
	data: any;
	quotas: Quota[];
	sessionsHosted: number;
	sessionsAttended: number;
	avatar: string;
	sessions: (ActivitySession & {
		user: {
			picture: string | null;
		};
	})[];
	notices: inactivityNotice[];
}

const Activity: FC<Props> = ({ timeSpent, timesPlayed, data, quotas, sessionsAttended, sessionsHosted, avatar, sessions, notices }) => {
	const router = useRouter();
	const { id } = router.query;

	const [workspace, setWorkspace] = useRecoilState(workspacestate);
	const [loading, setLoading] = useState(true)
	const [chartData, setChartData] = useState<ChartData<"line", (number | ScatterDataPoint | null)[], unknown>>({
		datasets: []
	});
	const [chartOptions, setChartOptions] = useState({});
	const [timeline, setTimeline] = useState<any>([
		...sessions,
		...notices.filter(notice => notice.approved === true) // Only show approved notices
	]);
	const [isOpen, setIsOpen] = useState(false);
	const [dialogData, setDialogData] = useState<any>({});

	useEffect(() => {
		setTimeline(
			[...sessions, ...notices.filter(notice => notice.approved === true)]
				.sort((a: any, b: any) => {
					const dateA = new Date(a.startTime).getTime();
					const dateB = new Date(b.endTime).getTime();
					return dateB - dateA;
				})
		);

		setChartData({
			labels: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"],
			datasets: [
				{
					label: "Activity in minutes",
					data,
					borderColor: "rgb(var(--group-theme))",
					backgroundColor: "rgb(var(--group-theme))",
					tension: 0.25,
				}
			]
		});

		setChartOptions({
			responsive: true,
			maintainAspectRatio: false,
			plugins: {
				legend: {
					position: "top"
				},
			},
			scales: {
				y: {
					beginAtZero: true,
					grid: {
						color: "rgba(0, 0, 0, 0.05)"
					}
				},
				x: {
					grid: {
						color: "rgba(0, 0, 0, 0.05)"
					}
				}
			}
		})
	}, []);

	const getQuotaPercentage = (quota: Quota) => {
		switch (quota.type) {
			case "mins": {
				return (timeSpent / quota.value) * 100;
			}
			case "sessions_hosted": {
				return (sessionsHosted / quota.value) * 100;
			}
			case "sessions_attended": {
				return (sessionsAttended / quota.value) * 100;
			}
		}
	}

	const getQuotaProgress = (quota: Quota) => {
		switch (quota.type) {
			case "mins": {
				return `${timeSpent} / ${quota.value} minutes`;
			}
			case "sessions_hosted": {
				return `${sessionsHosted} / ${quota.value} sessions hosted`;
			}
			case "sessions_attended": {
				return `${sessionsAttended} / ${quota.value} sessions attended`;
			}
		}
	}

	const idleMins = sessions.reduce((acc, session) => { return acc + Number(session.idleTime) }, 0);
	const messages = sessions.reduce((acc, session) => { return acc + Number(session.messages) }, 0);

	const fetchSession = async (sessionId: string) => {
		setLoading(true);
		setIsOpen(true);
		try {
			const { data, status } = await axios.get(`/api/workspace/${id}/activity/${sessionId}`);
			if (status !== 200) return toast.error("Could not fetch session.");
			if (!data.universe) {
				setLoading(false)
				return setDialogData({
					type: "session",
					data: data.message,
					universe: null
				});

			}

			setDialogData({
				type: "session",
				data: data.message,
				universe: data.universe
			});
			setLoading(false)
		} catch (error) {
			return toast.error("Could not fetch session.");
		}
	}

	const types: {
		[key: string]: string

	} = {
		"mins": "minutes",
		"sessions_hosted": "sessions hosted",
		"sessions_attended": "sessions attended"
	}

	return (
		<>
			<Toaster position="bottom-center" />
			<div>
				<div className="grid gap-4 xl:grid-cols-2">
					<div className="space-y-4">
						<div className="bg-white dark:bg-gray-700 rounded-xl shadow-sm overflow-hidden">
							<div className="flex items-center gap-3 p-4 border-b">
								<div className="bg-primary/10 p-2 rounded-lg">
									<IconChartBar className="w-5 h-5 text-primary" />
								</div>
								<h2 className="text-lg font-medium text-gray-900 dark:text-white">Activity Chart</h2>
							</div>
							<div className="p-4 h-[300px]">
								<Line options={chartOptions} data={chartData} />
							</div>
						</div>

						<div className="bg-white dark:bg-gray-700 rounded-xl shadow-sm overflow-hidden">
							<div className="flex items-center gap-3 p-4 border-b">
								<div className="bg-primary/10 p-2 rounded-lg">
									<IconCalendarTime className="w-5 h-5 text-primary" />
								</div>
								<h2 className="text-lg font-medium text-gray-900 dark:text-white">Timeline</h2>
							</div>
							<div className="p-4">
								{timeline.length === 0 ? (
									<div className="text-center py-12">
										<div className="bg-white dark:bg-gray-700 rounded-xl p-8 max-w-md mx-auto">
											<div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4">
												<IconClipboardList className="w-8 h-8 text-primary" />
											</div>
											<h3 className="text-lg font-medium  text-gray-900 dark:text-white mb-1">No Activity</h3>
											<p className="text-sm  text-gray-900 dark:text-white mb-4">No activity has been recorded yet</p>
										</div>
									</div>
								) : (
									<ol className="relative border-l ml-3 mt-3">
										{timeline.map((item: any, index: number) => (
											<div key={item.id}>
												{"reason" in item ? (
													<li className="mb-6 ml-6">
														<span className="flex absolute -left-3 justify-center items-center w-6 h-6 bg-primary rounded-full ring-4 ring-white">
															<img className="rounded-full" src={avatar} alt="timeline avatar" />
														</span>
														<div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-100 dark:border-gray-600">
															<div className="flex justify-between items-center mb-1">
																<p className="text-sm dark:text-white font-medium text-gray-900">Inactivity Notice</p>
																<time className="text-xs text-gray-500">
																	{moment(item.startTime).format("DD MMM")} - {moment(item.endTime).format("DD MMM YYYY")}
																</time>
															</div>
															<p className="text-sm text-gray-600 dark:text-gray-300">{item.reason}</p>
														</div>
													</li>
												) : (
													<li className="mb-6 ml-6">
														<span className="flex absolute -left-3 justify-center items-center w-6 h-6 bg-primary rounded-full ring-4 ring-white">
															<img className="rounded-full" src={item.user.picture ? item.user.picture : avatar} alt="timeline avatar" />
														</span>
														<div
															onClick={() => fetchSession(item.id)}
															className="p-4 bg-gray-50 dark:bg-gray-500 rounded-lg border border-gray-100 cursor-pointer hover:bg-gray-100 transition-colors"
														>
															<div className="flex justify-between items-center mb-1 dark:bg-gray-500">
																<p className="text-sm font-medium text-gray-900 dark:text-white">Activity Session</p>
																<time className="text-xs text-gray-500">
																	{moment(item.startTime).format("HH:mm")} - {moment(item.endTime).format("HH:mm")} on {moment(item.startTime).format("DD MMM YYYY")}
																</time>
															</div>
														</div>
													</li>
												)}
											</div>
										))}
									</ol>
								)}
							</div>
						</div>
					</div>

					<div className="space-y-4">
						<div className="grid grid-cols-2 gap-4">
							<div className="bg-white dark:bg-gray-700 rounded-xl p-5 shadow-sm">
								<div className="flex items-center gap-3 mb-3">
									<div className="bg-primary/10 p-2 rounded-lg">
										<IconPlayerPlay className="w-5 h-5 text-primary" />
									</div>
									<p className="text-sm font-medium text-gray-600 dark:text-white">Time Active</p>
								</div>
								<p className="text-3xl font-semibold dark:text-white text-gray-600">{timeSpent}m</p>
							</div>
							<div className="bg-white dark:bg-gray-700 rounded-xl p-5 shadow-sm">
								<div className="flex items-center gap-3 mb-3">
									<div className="bg-primary/10 p-2 rounded-lg">
										<IconUsers className="w-5 h-5 text-primary" />
									</div>
									<p className="text-sm font-medium text-gray-600 dark:text-white">Sessions</p>
								</div>
								<p className="text-3xl font-semibold dark:text-white text-gray-600">{timesPlayed}</p>
							</div>
							<div className="bg-white dark:bg-gray-700 rounded-xl p-5 shadow-sm">
								<div className="flex items-center gap-3 mb-3">
									<div className="bg-primary/10 p-2 rounded-lg">
										<IconMessages className="w-5 h-5 text-primary" />
									</div>
									<p className="text-sm font-medium text-gray-600 dark:text-white">Messages</p>
								</div>
								<p className="text-3xl font-semibold dark:text-white text-gray-600">{messages}</p>
							</div>
							<div className="bg-white dark:bg-gray-700 rounded-xl p-5 shadow-sm">
								<div className="flex items-center gap-3 mb-3">
									<div className="bg-primary/10 p-2 rounded-lg">
										<IconMoon className="w-5 h-5 text-primary" />
									</div>
									<p className="text-sm font-medium text-gray-600 dark:text-white">Idle Time</p>
								</div>
								<p className="text-3xl font-semibold dark:text-white text-gray-600">{idleMins}m</p>
							</div>
						</div>

						{quotas.length > 0 && (
							<div className="bg-white dark:bg-gray-700 rounded-xl shadow-sm overflow-hidden">
								<div className="flex items-center gap-3 p-4 border-b">
									<div className="bg-primary/10 p-2 rounded-lg">
										<IconChartBar className="w-5 h-5 text-primary" />
									</div>
									<h2 className="text-lg font-medium text-gray-900">Activity Quotas</h2>
								</div>
								<div className="p-4">
									<div className="grid gap-4">
										{quotas.map((quota: any) => (
											<div key={quota.id} className="bg-gray-50 rounded-lg p-4">
												<div className="flex justify-between items-center mb-2">
													<h3 className="text-sm font-medium text-gray-900">{quota.name}</h3>
													<p className="text-xs text-gray-500">{getQuotaProgress(quota)}</p>
												</div>
												<Tooltip orientation="top" tooltipText={getQuotaProgress(quota)}>
													<div className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
														<div
															className="h-full bg-primary transition-all"
															style={{
																width: `${Math.min(getQuotaPercentage(quota) || 0, 100)}%`
															}}
														/>
													</div>
												</Tooltip>
											</div>
										))}
									</div>
								</div>
							</div>
						)}
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
									<Dialog.Title as="h3" className="text-lg dark:text-white font-medium text-gray-900 mb-4">
										Session Details
									</Dialog.Title>
									{loading ? (
										<div className="flex items-center justify-center h-32">
											<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
										</div>
									) : (
										<div>
											{dialogData.universe && (
												<div>
													<h4 className="text-sm font-medium text-gray-900 mb-1 dark:text-white dark:bg-gray-800">Universe</h4>
													<p className="text-sm text-gray-600 dark:text-gray-400">{dialogData.universe.name}</p>
												</div>
											)}
											<div className="space-y-4">
												<div>
													<h4 className="text-sm font-medium text-gray-900 mb-1 dark:text-white dark:bg-gray-800">Duration</h4>
													<p className="text-sm text-gray-600 dark:text-gray-400">
														{moment.duration(moment(dialogData.data?.endTime).diff(moment(dialogData.data?.startTime))).humanize()}
													</p>
												</div>
												<div>
													<h4 className="text-sm font-medium text-gray-900 mb-1 dark:bg-gray-800 dark:text-white">Messages Sent</h4>
													<p className="text-sm text-gray-600 dark:text-gray-400">{dialogData.data?.messages || 0}</p>
												</div>
												<div>
													<h4 className="text-sm font-medium text-gray-900 mb-1 dark:bg-gray-800 dark:text-white">Idle Time</h4>
													<p className="text-sm text-gray-600 dark:text-gray-400">{dialogData.data?.idleTime || 0} minutes</p>
												</div>
											</div>
										</div>
									)}
									<div className="mt-6">
										<button
											type="button"
											className="w-full justify-center rounded-lg bg-gray-100 px-4 py-2 text-sm font-medium text-gray-900 hover:bg-gray-200 transition-colors"
											onClick={() => setIsOpen(false)}
										>
											Close
										</button>
									</div>
								</Dialog.Panel>
							</Transition.Child>
						</div>
					</div>
				</Dialog>
			</Transition>
		</>
	);
};

export default Activity;

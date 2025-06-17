import type { pageWithLayout } from "@/layoutTypes";
import { loginState, workspacestate } from "@/state";
import Button from "@/components/button";
import Workspace from "@/layouts/workspace";
import { useRecoilState } from "recoil";
import { useEffect, useState, useMemo, Fragment } from "react";
import randomText from "@/utils/randomText";
import { Dialog, Transition, Menu } from "@headlessui/react";
import Tooltip from "@/components/tooltip";
import axios from "axios";
import { useRouter } from "next/router";
import prisma, { schedule, SessionType, Session, user, role, sessionUser } from "@/utils/database";
import { GetServerSideProps } from "next";
import { withPermissionCheckSsr } from "@/utils/permissionsManager";
import moment from "moment";
import toast, { Toaster } from 'react-hot-toast';
import { IconArrowLeft, IconCalendarEvent, IconPlus, IconUserCircle, IconUsers, IconX } from "@tabler/icons";

export const getServerSideProps: GetServerSideProps = withPermissionCheckSsr(async ({ query }) => {
	const sessions = await prisma.schedule.findMany({
		where: {
			sessionType: {
				workspaceGroupId: parseInt(query.id as string)
			}
		},
		include: {
			sessionType: {
				include: {
					hostingRoles: true
				}
			},
			sessions: {
				include: {
					owner: true,
					users: {
						include: {
							user: true
						}
					}
				}
			}
		}
	});

	//find sessions that are already claimed by a user
	//get date 3 days from now
	const threeDaysFromNow = new Date();
	threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3);
	const threeDaysBeforeNow = new Date();
	threeDaysBeforeNow.setDate(threeDaysBeforeNow.getDate() - 3);



	return {
		props: {
			sessions: JSON.parse(JSON.stringify(sessions, (key, value) => (typeof value === 'bigint' ? value.toString() : value))) as typeof sessions,
		}
	}
});
type esession = (schedule & {
	sessionType: (SessionType & {
		hostingRoles: role[]
	});
	sessions: (Session & {
		owner: user,
		users: (sessionUser & {
			user: user
		})[]
	})[];
})

const Home: pageWithLayout<{
	sessions: esession[]
}> = ({ sessions }) => {
	const [login, setLogin] = useRecoilState(loginState);
	const [workspace, setWorkspace] = useRecoilState(workspacestate);
	const router = useRouter();
	const [selectedSession, setSelectedSession] = useState<esession | null>(null);
	const [selectedDate, setSelectedDate] = useState(new Date());
	const [activeSessions, setActiveSessions] = useState<esession[]>([]);
	const [sessionsData, setSessionsData] = useState(sessions);
	const [isLoading, setIsLoading] = useState(false);
	const text = useMemo(() => randomText(login.displayname), []);

	const gradients = [
		`to-[#8f75e5] from-[#5c3e8d]`,
		`to-orange-500 from-orange-700`,
		`to-[#f7b733] from-[#de751f]`,
		`to-blue-500 from-blue-700`,
		`to-red-500 from-red-700`,
		`to-green-500 from-green-700`,
		`to-purple-500 from-purple-700`,
		`to-yellow-500 from-yellow-700`,
		`to-pink-500 from-pink-700`,
	]

	const getLastThreeDays = useMemo(() => {
		const today = new Date();
		const lastThreeDays = [];
		const nextThreeDays = [];
		for (let i = 0; i < 4; i++) {
			const day = new Date(today);
			day.setDate(day.getDate() - i);
			day.setMinutes(0)
			day.setHours(0)
			lastThreeDays.push(day);
		}
		for (let i = 0; i < 3; i++) {
			const day = new Date(today);
			day.setDate(day.getDate() + i + 1);
			day.setMinutes(0)
			day.setHours(0)
			nextThreeDays.push(day);
		}
		return [...lastThreeDays, ...nextThreeDays].sort((a, b) => a.getTime() - b.getTime());
	}, []);

	const isSessionInPastLocal = (session: esession) => {
		console.log('Session:', session.sessionType?.name, 'Hour:', session.Hour, 'Minute:', session.Minute);
		const localSessionDate = new Date(
			selectedDate.getFullYear(),
			selectedDate.getMonth(),
			selectedDate.getDate(),
			session.Hour,
			session.Minute,
			0,
			0
		);
		const now = new Date();
		const isPast = localSessionDate < now;
		console.log(
			'Session:', session.sessionType?.name,
			'| Local session date:', localSessionDate,
			'| Now:', now,
			'| isPast:', isPast
		);
		return isPast;
	};

	const claimSession = async (schedule: esession) => {
		try {
			setIsLoading(true);
			const res = await axios.post(`/api/workspace/${router.query.id}/sessions/manage/${schedule.id}/claim`, {
				date: selectedDate.getTime(),
				timezoneOffset: new Date().getTimezoneOffset()
			});

			if (res.status === 200) {
				// Debug log
				console.log('Claim response:', res.data.session);
				const updatedSessions = sessionsData.map(s => {
					if (s.id === schedule.id) {
						return res.data.session;
					}
					return s;
				});
				console.log('Updated sessionsData:', updatedSessions);
				setSessionsData(updatedSessions);
				setSelectedSession(res.data.session);
				toast.success('Session claimed successfully');
			}
		} catch (error: any) {
			toast.error(error.response?.data?.error || 'Failed to claim session');
		} finally {
			setIsLoading(false);
		}
	};

	const claimSessionSlot = async (schedule: esession, slotId: string, slotNum: number) => {
		try {
			setIsLoading(true);
			const res = await axios.post(`/api/workspace/${router.query.id}/sessions/manage/${schedule.id}/claimSlot`, {
				date: selectedDate.getTime(),
				slotId,
				slotNum,
				timezoneOffset: new Date().getTimezoneOffset()
			});

			if (res.status === 200) {
				const newSessions = sessionsData.filter((session) => session.id !== schedule.id);
				setSessionsData([...newSessions, res.data.session]);
				setSelectedSession(res.data.session);
				toast.success('Slot claimed successfully');
			}
		} catch (error: any) {
			toast.error(error.response?.data?.error || 'Failed to claim slot');
		} finally {
			setIsLoading(false);
		}
	};

	const unclaimSessionSlot = async (schedule: esession, slotId: string, slotNum: number) => {
		try {
			setIsLoading(true);
			const res = await axios.post(`/api/workspace/${router.query.id}/sessions/manage/${schedule.id}/unclaimSlot`, {
				date: selectedDate.getTime(),
				slotId,
				slotNum,
				timezoneOffset: new Date().getTimezoneOffset()
			});

			if (res.status === 200) {
				const newSessions = sessionsData.filter((session) => session.id !== schedule.id);
				setSessionsData([...newSessions, res.data.session]);
				setSelectedSession(res.data.session);
				toast.success('Slot unclaimed successfully');
			}
		} catch (error: any) {
			toast.error(error.response?.data?.error || 'Failed to unclaim slot');
		} finally {
			setIsLoading(false);
		}
	};

	const unclaimSession = async (schedule: esession) => {
		try {
			setIsLoading(true);
			const res = await axios.post(`/api/workspace/${router.query.id}/sessions/manage/${schedule.id}/unclaim`, {
				date: selectedDate.getTime(),
				timezoneOffset: new Date().getTimezoneOffset()
			});

			if (res.status === 200) {
				// Update the sessions data with the new session
				const updatedSessions = sessionsData.map(s => {
					if (s.id === schedule.id) {
						return {
							...s,
							...res.data.session,
							sessions: res.data.session.sessions
						};
					}
					return s;
				});
				setSessionsData(updatedSessions);
				setSelectedSession(updatedSessions.find(s => s.id === schedule.id));
				toast.success('Session unclaimed successfully');
			}
		} catch (error: any) {
			toast.error(error.response?.data?.error || 'Failed to unclaim session');
		} finally {
			setIsLoading(false);
		}
	};

	useEffect(() => {
		const activeSessions = sessionsData.filter((session) => {
			return Array.isArray(session.Days) && session.Days.includes(selectedDate.getDay());
		});
		setActiveSessions(activeSessions);
	}, [selectedDate, sessionsData]);

	const checkDisabled = (session: esession) => {
		const s = session.sessions.find(e => new Date(e.date).getUTCDate() === selectedDate.getUTCDate());
		const findRole = session.sessionType?.hostingRoles?.find(e => e.id === workspace.yourRole);
		if (!findRole && !workspace.yourPermission.includes('manage_sessions')) return {
			disabled: true,
			text: "You don't have the required role to host this session"
		};
		const date = new Date();
		date.setUTCDate(selectedDate.getUTCDate());
		date.setUTCFullYear(selectedDate.getUTCFullYear());
		date.setUTCMonth(selectedDate.getUTCMonth());
		date.setUTCHours(session.Hour)
		date.setUTCMinutes(session.Minute)
		date.setUTCSeconds(0);
		date.setUTCMilliseconds(0);
		//if the session already started or ended
		if (date < new Date()) return {
			disabled: true,
			text: "This session has already started"
		};

		if (!s?.date) return { disabled: false, text: "Claims the session so people know you\'re the host" };
		if (s.date < new Date()) {
			return {
				disabled: true,
				text: "Session already started"
			};
		}
		return { disabled: false, text: "Claims the session so people know you\'re the host" }
	}

	// Compute the session for the selected date
	const sessionForSelectedDate = selectedSession && Array.isArray(selectedSession.sessions)
		? selectedSession.sessions.find(s => new Date(s.date).getUTCDate() === selectedDate.getUTCDate())
		: undefined;
	const canUnclaimHost = sessionForSelectedDate?.owner?.userid?.toString() === login.userId?.toString() || workspace.yourPermission?.includes('manage_sessions');

	return (
		<div className="min-h-screen bg-gray-50 dark:bg-gray-900">
			<Toaster position="bottom-center" />
			<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
				<div className="flex items-center gap-3 mb-8">
					<button onClick={() => router.back()} className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-300 dark:hover:text-white rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
						<IconArrowLeft className="w-5 h-5" />
					</button>
					<h1 className="text-2xl font-medium text-gray-900 dark:text-white">Sessions</h1>
				</div>

				<div className="mb-8">
					<div className="flex items-center justify-between mb-6">
						<div className="flex items-center gap-3">
							<div className="bg-primary/10 p-2 rounded-lg">
								<IconCalendarEvent className="w-5 h-5 text-primary" />
							</div>
							<div>
								<h2 className="text-lg font-medium text-gray-900 dark:text-white">Session Schedule</h2>
								<p className="text-sm text-gray-500 dark:text-gray-400">View and manage upcoming sessions</p>
							</div>
						</div>
						<button onClick={() => router.push(`/workspace/${router.query.id}/sessions/new`)} className="inline-flex items-center px-4 py-2 shadow-sm text-sm font-medium rounded-md text-white bg-primary hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary transition-colors">
							<IconPlus className="w-4 h-4 mr-2" />
							New Session Type
						</button>
					</div>

					<div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
						<div className="lg:col-span-3">
							<div className="bg-white dark:bg-gray-800 rounded-lg shadow">
								<div className="p-4 border-b border-gray-200 dark:border-gray-700">
									<h3 className="text-sm font-medium text-gray-900 dark:text-white">Select Date</h3>
								</div>
								<div className="p-4 space-y-2">
									{getLastThreeDays.map((day, i) => (
										<button
											key={i}
											onClick={() => setSelectedDate(day)}
											className={`w-full px-4 py-3 rounded-lg text-left transition-colors ${
												selectedDate.getDate() === day.getDate()
												? 'bg-primary/10 text-primary dark:bg-primary/20'
												: 'hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300'
											}`}
										>
											<div className="font-medium">{day.toLocaleDateString("en-US", { weekday: "long" })}</div>
											<div className="text-sm opacity-75">{day.toLocaleDateString()}</div>
										</button>
									))}
								</div>
							</div>
						</div>

						<div className="lg:col-span-9">
							{activeSessions.length > 0 ? (
								<div className="space-y-4">
									{activeSessions.map((session) => {
										const displayDate = new Date(
											selectedDate.getFullYear(),
											selectedDate.getMonth(),
											selectedDate.getDate(),
											session.Hour,
											session.Minute,
											0,
											0
										);

										const currentSession = session.sessions.find(s => 
										  new Date(s.date).getUTCDate() === selectedDate.getUTCDate()
										);

										const check = checkDisabled(session);
										const isDisabled = check.disabled || isSessionInPastLocal(session);

										return (
											<div key={session.id} className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
												<div className="p-6">
													<div className="flex items-center justify-between">
														<div>
															<h3 className="text-lg font-medium text-gray-900 dark:text-white">
																{session.sessionType.name}
															</h3>
															<p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
																{displayDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true })}
															</p>
														</div>
														<div className="flex items-center gap-2">
															{currentSession?.owner ? (
																<div className="flex items-center gap-2">
																	<img
																		src={currentSession.owner.picture || '/default-avatar.png'}
																		alt={currentSession.owner.username || ''}
																		className="w-8 h-8 rounded-full"
																	/>
																	<div className="text-sm">
																		<div className="font-medium text-gray-900 dark:text-white">
																			{currentSession.owner.username}
																		</div>
																		<div className="text-gray-500 dark:text-gray-400">Host</div>
																	</div>
																	{(currentSession.owner.userid === BigInt(login.userId) || workspace.yourPermission?.includes('manage_sessions')) && (
																		<button onClick={() => unclaimSession(session)} disabled={isLoading} className="ml-2 p-2 text-gray-400 hover:text-red-500 transition-colors">
																			<IconX className="w-5 h-5" />
																		</button>
																	)}
																</div>
															) : (
																!isSessionInPastLocal(session) && (
																	<Button onPress={() => claimSession(session)} loading={isLoading} disabled={isDisabled}>
																		Claim Session
																	</Button>
																)
															)}
															{session.sessionType.slots && (
																<Button onPress={() => setSelectedSession(session)} classoverride="bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-white" disabled={isLoading}>
																	View Slots
																</Button>
															)}
														</div>
													</div>
												</div>
											</div>
										);
									})}
								</div>
							) : (
						<div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-8 text-center">
							<div className="mx-auto w-12 h-12 bg-primary/10 dark:bg-primary/20 rounded-full flex items-center justify-center mb-4">
								<IconCalendarEvent className="w-6 h-6 text-primary" />
							</div>
							<h3 className="text-sm font-medium text-gray-900 dark:text-white mb-1">No Sessions Scheduled</h3>
							<p className="text-sm text-gray-500 dark:text-gray-400">There are no sessions scheduled for this date.</p>
						</div>
					)}
				</div>
			</div>
		</div>
	</div>

			<Transition appear show={!!selectedSession} as={Fragment}>
				<Dialog as="div" className="relative z-10" onClose={() => setSelectedSession(null)}>
					<Transition.Child
						as={Fragment}
						enter="ease-out duration-300"
						enterFrom="opacity-0"
						enterTo="opacity-100"
						leave="ease-in duration-200"
						leaveFrom="opacity-100"
						leaveTo="opacity-0"
					>
						<div className="fixed inset-0 bg-black bg-opacity-25" />
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
								<Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-2xl bg-white p-6 text-left align-middle shadow-xl transition-all">
									<Dialog.Title as="div" className="flex items-center justify-between mb-4">
										<h3 className="text-lg font-medium text-gray-900">
											Session Slots
										</h3>
										<button
											onClick={() => setSelectedSession(null)}
											className="p-2 text-gray-400 hover:text-gray-500 transition-colors"
										>
											<IconX className="w-5 h-5" />
										</button>
									</Dialog.Title>

									<div className="space-y-4 max-h-96 overflow-y-auto">
										<div className="bg-gray-50 rounded-lg p-4 mb-4">
											<h4 className="text-sm font-medium text-gray-900 mb-3">Host</h4>
											<div className="flex items-center justify-between bg-white rounded-md p-2">
												<div className="flex items-center gap-2">
													{sessionForSelectedDate?.owner ? (
														<>
															<img
																src={sessionForSelectedDate.owner.picture || '/default-avatar.png'}
																alt={sessionForSelectedDate.owner.username || ''}
																className="w-6 h-6 rounded-full"
															/>
															<span className="text-sm text-gray-600">
																{sessionForSelectedDate.owner.username}
															</span>
														</>
													) : (
														<span className="text-sm text-gray-500">Unclaimed</span>
													)}
												</div>
												{sessionForSelectedDate?.owner && (sessionForSelectedDate.owner.userid === BigInt(login.userId) || workspace.yourPermission?.includes('manage_sessions')) && selectedSession && (
													<button
														onClick={() => unclaimSession(selectedSession)}
														disabled={isLoading}
														className="p-1 text-gray-400 hover:text-red-500 transition-colors"
													>
														<IconX className="w-4 h-4" />
													</button>
												)}
												{!sessionForSelectedDate?.owner && selectedSession && !isSessionInPastLocal(selectedSession) && (
													<Button
														onPress={() => claimSession(selectedSession)}
														classoverride="text-sm px-3 py-1"
														loading={isLoading}
													>
														Claim
													</Button>
												)}
											</div>
										</div>
										{selectedSession?.sessionType?.slots && Array.isArray(selectedSession.sessionType.slots) && selectedSession.sessionType.slots.map((slot: any, index: number) => {
										if (typeof slot !== 'object') return null;
										const slotData = JSON.parse(JSON.stringify(slot));
										const session = Array.isArray(selectedSession?.sessions)
											? selectedSession.sessions.find(s =>
												new Date(s.date).getUTCDate() === selectedDate.getUTCDate()
											)
											: undefined;
										const matchedUser = session?.users?.find(u =>
													u.roleID === slotData.id && u.slot === index
												);
										return (
											<div key={index} className="bg-gray-50 rounded-lg p-4">
													<h4 className="text-sm font-medium text-gray-900 mb-3">{slotData.name}</h4>
											<div className="space-y-2">
												{Array.from(Array(slotData.slots)).map((_, i) => {
															const matchedUser = session?.users?.find(u =>
													u.roleID === slotData.id && u.slot === i
												);
												return (
													<div key={i} className="flex items-center justify-between bg-white rounded-md p-2">
													<div className="flex items-center gap-2">
																		{matchedUser ? (
																			<>
														<img
																					src={matchedUser.user.picture || '/default-avatar.png'}
																					alt={matchedUser.user.username || 'Unclaimed'}
																					className="w-6 h-6 rounded-full"
														/>
																				<span className="text-sm font-medium text-gray-900">
																					{matchedUser.user.username}
														</span>
																			</>
																		) : (
																			<span className="text-sm text-gray-500">Unclaimed</span>
																		)}
													</div>
													{!matchedUser && !isSessionInPastLocal(selectedSession) && (
														<Button
															onPress={() => claimSessionSlot(selectedSession, slotData.id, i)}
															classoverride="text-sm px-3 py-1"
															loading={isLoading}
														>
															Claim
														</Button>
													)}
													</div>
												);
												})}
											</div>
											</div>
										);
										})}
									</div>
								</Dialog.Panel>
							</Transition.Child>
						</div>
					</div>
				</Dialog>
			</Transition>
		</div>
	);
};

Home.layout = Workspace;

export default Home;

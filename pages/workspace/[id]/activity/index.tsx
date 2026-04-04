import workspace from "@/layouts/workspace";
import { pageWithLayout } from "@/layoutTypes";
import { loginState, workspacestate } from "@/state";
import axios from "axios";
import { useRouter } from "next/router";
import { useEffect, useState, useMemo, Fragment } from "react";
import { useRecoilState } from "recoil";
import moment from "moment";
import {
	IconChevronRight,
	IconUsers,
	IconClock,
	IconUserCircle,
	IconMessageCircle2,
	IconArrowLeft,
	IconCalendarTime,
	IconTarget,
	IconClipboardList,
	IconChartBar,
	IconPlayerPlay,
	IconMoon,
	IconTrophy,
	IconMedal,
	IconCrown,
	IconAward,
	IconLaurelWreath1,
} from "@tabler/icons-react";
import Tooltip from "@/components/tooltip";
import randomText from "@/utils/randomText";
import toast, { Toaster } from "react-hot-toast";
import { Dialog, Transition } from "@headlessui/react";

const Activity: pageWithLayout = () => {
	const router = useRouter();
	const { id } = router.query;
	const [login] = useRecoilState(loginState);
	const [workspace] = useRecoilState(workspacestate);
	const text = useMemo(() => randomText(login.displayname), []);
	const [myData, setMyData] = useState<any>(null);
	const [myQuotas, setMyQuotas] = useState<any[]>([]);
	const [myAssignments, setMyAssignments] = useState<any[]>([]);
	const [timeline, setTimeline] = useState<any[]>([]);
	const [isSessionModalOpen, setIsSessionModalOpen] = useState(false);
	const [sessionDetails, setSessionDetails] = useState<any>({});
	const [concurrentUsers, setConcurrentUsers] = useState<any[]>([]);
	const [loadingSession, setLoadingSession] = useState(false);
	const [topStaff, setTopStaff] = useState<any[]>([]);
	const [activeUsers, setActiveUsers] = useState<any[]>([]);
	const [inactiveUsers, setInactiveUsers] = useState<any[]>([]);
	const [leaderboardEnabled, setLeaderboardEnabled] = useState(false);
	const [leaderboardStyle, setLeaderboardStyle] = useState<"list" | "podium">(
		"list"
	);
	const [idleTimeEnabled, setIdleTimeEnabled] = useState(true);
	const [accessApiKey, setaccessApiKey] = useState('');

	useEffect(() => {
		async function fetchUserData() {
			try {
				const profileRes = await axios.get(
					`/api/workspace/${id}/profile/${login.userId}`
				);
				const profileData = profileRes.data.data;

				// Fetch activity config to check if idle time tracking is enabled
				const configRes = await axios.get(
					`/api/workspace/${id}/settings/activity/getConfig`
				);
				const idleTracking = configRes.data.idleTimeEnabled ?? true;
				setIdleTimeEnabled(idleTracking);
				
				// Fetch the API key from the config endpoint
				if (configRes.data.apiKey) {
					setaccessApiKey(configRes.data.apiKey);
				}

				let totalMinutes = 0;
				let totalMessages = 0;
				let totalIdleTime = 0;

				(profileData.sessions || []).forEach((session: any) => {
					if (session.endTime) {
						const duration = Math.round(
							(new Date(session.endTime).getTime() -
								new Date(session.startTime).getTime()) /
							60000
						);
						totalMinutes += duration;
					}
					totalMessages += session.messages || 0;
					totalIdleTime += Number(session.idleTime) || 0;
				});

				totalMinutes += (profileData.adjustments || []).reduce(
					(sum: number, adj: any) => sum + adj.minutes,
					0
				);

				const totalIdleMinutes = Math.round(totalIdleTime);
				const activeMinutes = idleTracking
					? Math.max(0, totalMinutes - totalIdleMinutes)
					: totalMinutes;

				const sessionsHosted = profileData.roleBasedSessionsHosted || 0;
				const sessionsAttended = profileData.roleBasedSessionsAttended || 0;
				const totalPlaySessions = (profileData.sessions || []).length;

				setMyData({
					minutes: activeMinutes,
					totalMinutes: totalMinutes,
					messages: totalMessages,
					idleTime: totalIdleMinutes,
					sessionsHosted,
					sessionsAttended,
					totalPlaySessions,
					picture: profileData.avatar,
					username: login.displayname,
				});

				if (profileData.quotas) {
					const quotasWithProgress = profileData.quotas.map((quota: any) => {
						let currentValue = 0;
						let percentage = 0;

						switch (quota.type) {
							case "mins":
								currentValue = activeMinutes;
								percentage = (activeMinutes / quota.value) * 100;
								break;
							case "sessions_hosted":
								const hostedCount =
									quota.sessionType && quota.sessionType !== "all"
										? profileData.sessionsLogged?.byType[quota.sessionType] || 0
										: sessionsHosted;
								currentValue = hostedCount;
								percentage = (hostedCount / quota.value) * 100;
								break;
							case "sessions_attended":
								currentValue = sessionsAttended;
								percentage = (sessionsAttended / quota.value) * 100;
								break;
							case "sessions_logged":
								let loggedCount = 0;
								if (quota.sessionRole === "host") {
									loggedCount = profileData.sessionsLogged?.byRole.host || 0;
								} else if (quota.sessionRole === "cohost") {
									loggedCount = profileData.sessionsLogged?.byRole.cohost || 0;
								} else {
									loggedCount = profileData.sessionsLogged?.all || 0;
								}
								if (quota.sessionType && quota.sessionType !== "all") {
									loggedCount =
										profileData.sessionsLogged?.byType[quota.sessionType] || 0;
								}
								currentValue = loggedCount;
								percentage = (loggedCount / quota.value) * 100;
								break;
							case "alliance_visits":
								currentValue = profileData.allianceVisitsCount || 0;
								percentage =
									((profileData.allianceVisitsCount || 0) / quota.value) * 100;
								break;
						}
						return {
							...quota,
							currentValue,
							percentage: Math.min(percentage, 100),
						};
					});
					setMyQuotas(quotasWithProgress);
				}

				if (profileData.assignments) {
					setMyAssignments(profileData.assignments);
				}
				const timelineData = [];
				if (profileData.sessions) {
					timelineData.push(
						...profileData.sessions.map((s: any) => ({
							...s,
							__type: "session",
						}))
					);
				}
				if (profileData.adjustments) {
					timelineData.push(
						...profileData.adjustments.map((a: any) => ({
							...a,
							__type: "adjustment",
						}))
					);
				}
				if (profileData.notices) {
					const approvedNotices = profileData.notices.filter(
						(n: any) => n.approved === true
					);
					timelineData.push(
						...approvedNotices.map((n: any) => ({ ...n, __type: "notice" }))
					);
				}
				timelineData.sort((a, b) => {
					const aDate =
						a.__type === "adjustment"
							? new Date(a.createdAt).getTime()
							: new Date(a.startTime || a.createdAt).getTime();
					const bDate =
						b.__type === "adjustment"
							? new Date(b.createdAt).getTime()
							: new Date(b.startTime || b.createdAt).getTime();
					return bDate - aDate;
				});

				setTimeline(timelineData);
			} catch (error) {
				console.error("Error fetching user data:", error);
			}
		}

		if (id && login.userId) {
			fetchUserData();
			const interval = setInterval(() => {
				fetchUserData();
			}, 30000);
			return () => clearInterval(interval);
		}


	}, [id, login.userId]);

	useEffect(() => {
		async function fetchLeaderboardData() {
			try {
				const configRes = await axios.get(
					`/api/workspace/${id}/settings/general/leaderboard`
				);
				const isEnabled = configRes.data?.value?.enabled || false;
				const style = configRes.data?.value?.style || "list";
				setLeaderboardStyle(style);

				if (isEnabled) {
					const usersRes = await axios.get(
						`/api/workspace/${id}/activity/users`
					);
					setLeaderboardEnabled(true);
					setTopStaff(usersRes.data.message.topStaff || []);
					setActiveUsers(usersRes.data.message.activeUsers || []);
					setInactiveUsers(usersRes.data.message.inactiveUsers || []);
				} else {
					setLeaderboardEnabled(false);
				}
			} catch (error) {
				console.error("Error fetching leaderboard data:", error);
			}
		}

		if (id) {
			fetchLeaderboardData();
			const interval = setInterval(fetchLeaderboardData, 60000);
			return () => clearInterval(interval);
		}
	}, [id]);

	const fetchSessionDetails = async (sessionId: string) => {
		setLoadingSession(true);
		setIsSessionModalOpen(true);
		setConcurrentUsers([]);

		try {
			const sessionResponse = await axios.get(
				`/api/workspace/${id}/activity/${sessionId}`, {
					headers: {
						authorization: accessApiKey
					}
				}
			);
			if (sessionResponse.status !== 200) {
				toast.error("Could not fetch session details.");
				setIsSessionModalOpen(false);
				return;
			}
			const sessionData = sessionResponse.data;
			setSessionDetails(sessionData);

			if (sessionData.message?.startTime && sessionData.message?.endTime) {
				try {
					const concurrentResponse = await axios.get(
						`/api/workspace/${id}/activity/concurrent?sessionId=${sessionId}&startTime=${sessionData.message.startTime}&endTime=${sessionData.message.endTime}`
					);

					if (concurrentResponse.status === 200) {
						setConcurrentUsers(concurrentResponse.data.users || []);
					}
				} catch (error) {
					console.error("Failed to fetch concurrent users:", error);
				}
			}
		} catch (error) {
			toast.error("Could not fetch session details.");
			setIsSessionModalOpen(false);
		} finally {
			setLoadingSession(false);
		}
	};

	const getQuotaTypeLabel = (type: string) => {
		switch (type) {
			case "mins":
				return "minutes";
			case "sessions_hosted":
				return "sessions hosted";
			case "sessions_attended":
				return "sessions attended";
			case "sessions_logged":
				return "sessions logged";
			case "alliance_visits":
				return "alliance visits";
			default:
				return type;
		}
	};

	return (
		<div className="pagePadding">
			<div className="max-w-7xl mx-auto">
				<div className="flex items-center gap-3 mb-6">
					<div>
						<h1 className="text-2xl font-medium text-zinc-900 dark:text-white">
							Activity Dashboard
						</h1>
						<p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
							Monitor your performance and track detailed activity metrics
						</p>
					</div>
				</div>

				{leaderboardEnabled && topStaff.length > 0 && (
					<>
						<div className="mb-8">
							{leaderboardStyle === "podium" ? (
								<>
									<div className="bg-white dark:bg-zinc-800 border border-white/10 rounded-xl p-6 shadow-sm mb-8">
										<div className="flex items-center gap-3 mb-6">
											<div className="bg-primary/10 p-3 rounded-xl">
												<IconTrophy className="w-6 h-6 text-primary" />
											</div>
											<div>
												<h2 className="text-2xl font-bold text-zinc-900 dark:text-white">
													Leaderboard
												</h2>
												<p className="text-sm text-zinc-500 dark:text-zinc-400">
													Top performers this period
												</p>
											</div>
										</div>
										<div className="flex items-end justify-center gap-4 sm:gap-6">
											{topStaff[1] && (
												<div className="flex flex-col items-center flex-1 max-w-[120px]">
													<div className="relative mb-4">
														<div
															className={`w-20 h-20 rounded-full flex items-center justify-center ${getRandomBg(
																topStaff[1].userId
															)}`}
														>
															<img
																src={topStaff[1].picture}
																alt={topStaff[1].username}
																className="w-20 h-20 rounded-full border-4 border-gray-400 shadow-lg object-cover"
																style={{ background: "transparent" }}
															/>
														</div>
														<div className="absolute -top-2 -right-2 bg-white dark:bg-zinc-800 rounded-full p-1">
															{getPodiumIcon(1)}
														</div>
													</div>
													<div
														className={`${getPodiumHeight(1)} ${getPodiumColors(
															1
														)} border-2 rounded-t-lg w-24 flex flex-col items-center justify-center shadow-lg`}
													>
														<span className="text-white font-bold text-lg">
															2
														</span>
													</div>
													<div className="mt-4 text-center">
														<p className="font-semibold text-zinc-900 dark:text-white">
															{topStaff[1].username}
														</p>
														<p className="text-sm text-zinc-600 dark:text-zinc-400">
															{(() => {
																const minutes = Math.floor(
																	topStaff[1].ms / 1000 / 60
																);
																return `${minutes} ${minutes === 1 ? "minute" : "minutes"
																	}`;
															})()}
														</p>
													</div>
												</div>
											)}

											<div className="flex flex-col items-center flex-1 max-w-[140px]">
												<div className="relative mb-4">
													<div
														className={`w-24 h-24 rounded-full flex items-center justify-center ${getRandomBg(
															topStaff[0].userId
														)}`}
													>
														<img
															src={topStaff[0].picture}
															alt={topStaff[0].username}
															className="w-24 h-24 rounded-full border-4 border-yellow-400 shadow-xl object-cover"
															style={{ background: "transparent" }}
														/>
													</div>
													<div className="absolute -top-3 -right-3 bg-white dark:bg-zinc-800 rounded-full p-2">
														{getPodiumIcon(0)}
													</div>
												</div>
												<div
													className={`${getPodiumHeight(0)} ${getPodiumColors(
														0
													)} border-2 rounded-t-lg w-28 flex flex-col items-center justify-center shadow-xl relative`}
												>
													<div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
														<div className="bg-yellow-500 text-white text-xs font-bold px-2 py-1 rounded-full">
															CHAMPION
														</div>
													</div>
													<span className="text-white font-bold text-xl">
														1
													</span>
												</div>
												<div className="mt-4 text-center">
													<p className="font-bold text-lg text-zinc-900 dark:text-white">
														{topStaff[0].username}
													</p>
													<p className="text-sm text-zinc-600 dark:text-zinc-400">
														{(() => {
															const minutes = Math.floor(
																topStaff[0].ms / 1000 / 60
															);
															return `${minutes} ${minutes === 1 ? "minute" : "minutes"
																}`;
														})()}
													</p>
												</div>
											</div>

											{topStaff[2] && (
												<div className="flex flex-col items-center flex-1 max-w-[120px]">
													<div className="relative mb-4">
														<div
															className={`w-20 h-20 rounded-full flex items-center justify-center ${getRandomBg(
																topStaff[2].userId
															)}`}
														>
															<img
																src={topStaff[2].picture}
																alt={topStaff[2].username}
																className="w-20 h-20 rounded-full border-4 border-amber-600 shadow-lg object-cover"
																style={{ background: "transparent" }}
															/>
														</div>
														<div className="absolute -top-2 -right-2 bg-white dark:bg-zinc-800 rounded-full p-1">
															{getPodiumIcon(2)}
														</div>
													</div>
													<div
														className={`${getPodiumHeight(2)} ${getPodiumColors(
															2
														)} border-2 rounded-t-lg w-20 flex flex-col items-center justify-center shadow-lg`}
													>
														<span className="text-white font-bold text-base">
															3
														</span>
													</div>
													<div className="mt-4 text-center">
														<p className="font-semibold text-zinc-900 dark:text-white">
															{topStaff[2].username}
														</p>
														<p className="text-sm text-zinc-600 dark:text-zinc-400">
															{(() => {
																const minutes = Math.floor(
																	topStaff[2].ms / 1000 / 60
																);
																return `${minutes} ${minutes === 1 ? "minute" : "minutes"
																	}`;
															})()}
														</p>
													</div>
												</div>
											)}
										</div>
									</div>
								</>
							) : (
								<>
									<div className="bg-white dark:bg-zinc-800 border border-white/10 rounded-xl p-4 shadow-sm mb-8">
										<div className="flex items-center gap-3 mb-4">
											<div className="bg-primary/10 p-3 rounded-xl">
												<IconTrophy className="w-6 h-6 text-primary" />
											</div>
											<div>
												<h2 className="text-2xl font-bold text-zinc-900 dark:text-white">
													Leaderboard
												</h2>
												<p className="text-sm text-zinc-500 dark:text-zinc-400">
													Top performers this period
												</p>
											</div>
										</div>
										<div className="space-y-2">
											{topStaff.slice(0, 3).map((user: any, index: number) => {
												const position = index + 1;
												let bgColor = "bg-zinc-50 dark:bg-zinc-700";
												let positionColor =
													"bg-zinc-300 dark:bg-zinc-600 text-zinc-700 dark:text-zinc-300";
												let borderColor = "border-transparent";

												if (position === 1) {
													bgColor =
														"bg-gradient-to-r from-yellow-50 to-amber-50 dark:from-yellow-900/20 dark:to-amber-900/20";
													positionColor =
														"bg-gradient-to-br from-yellow-400 to-amber-500 text-white";
													borderColor =
														"border-yellow-300 dark:border-yellow-700";
												} else if (position === 2) {
													bgColor =
														"bg-gradient-to-r from-gray-50 to-slate-50 dark:from-gray-800/50 dark:to-slate-800/50";
													positionColor =
														"bg-gradient-to-br from-gray-400 to-slate-500 text-white";
													borderColor = "border-gray-300 dark:border-gray-600";
												} else if (position === 3) {
													bgColor =
														"bg-gradient-to-r from-orange-50 to-amber-50 dark:from-orange-900/20 dark:to-amber-900/20";
													positionColor =
														"bg-gradient-to-br from-orange-500 to-amber-600 text-white";
													borderColor =
														"border-orange-300 dark:border-orange-700";
												}

												return (
													<div
														key={user.userId}
														className={`flex items-center justify-between p-2.5 rounded-lg ${bgColor} border ${borderColor} transition-all gap-2`}
													>
														<div className="flex items-center gap-2 flex-1 min-w-0">
															<div
																className={`flex items-center justify-center w-8 h-8 rounded-full font-bold ${positionColor} text-sm flex-shrink-0 shadow-md`}
															>
																{position}
															</div>
															<div
																className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 ${getRandomBg(
																	user.userId
																)} ring-2 ring-white dark:ring-zinc-700`}
															>
																<img
																	src={user.picture}
																	alt={user.username}
																	className="w-9 h-9 rounded-full border-2 border-white dark:border-zinc-700 shadow-sm object-cover"
																	style={{ background: "transparent" }}
																/>
															</div>
															<div className="min-w-0 flex-1">
																<span className="font-semibold text-sm text-zinc-900 dark:text-white truncate block">
																	{user.username}
																</span>
															</div>
														</div>
														<div className="text-right flex-shrink-0">
															<p className="font-bold text-base text-zinc-900 dark:text-white whitespace-nowrap">
																{(() => {
																	const minutes = Math.floor(
																		user.ms / 1000 / 60
																	);
																	return `${minutes}m`;
																})()}
															</p>
														</div>
													</div>
												);
											})}
										</div>
									</div>
								</>
							)}
						</div>
					</>
				)}

				<div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 lg:gap-6 mb-8">
					<div className="bg-white dark:bg-zinc-800 rounded-xl p-4 lg:p-6 border border-white/10 min-w-0">
						<div className="flex items-center justify-between mb-4 lg:mb-6">
							<div className="min-w-0 flex-1">
								<h3 className="text-xs lg:text-sm font-medium text-zinc-900 dark:text-zinc-300 uppercase tracking-wide truncate">
									Active Time
								</h3>
							</div>
							<div className="bg-emerald-500/20 p-2 lg:p-3 rounded-lg">
								<IconClock className="w-4 h-4 lg:w-5 lg:h-5 text-emerald-400" />
							</div>
						</div>
						<div className="text-2xl lg:text-3xl font-bold mb-1 lg:mb-2 text-zinc-900 dark:text-white">
							{myData ? myData.minutes : 0}
						</div>
						<div className="text-xs lg:text-sm text-zinc-500 dark:text-zinc-400">
							Time spent
						</div>
					</div>

					{idleTimeEnabled && (
						<div className="bg-white dark:bg-zinc-800 rounded-xl p-4 lg:p-6 border border-white/10 min-w-0">
							<div className="flex items-center justify-between mb-4 lg:mb-6">
								<div className="min-w-0 flex-1">
									<h3 className="text-xs lg:text-sm font-medium text-zinc-900 dark:text-zinc-300 uppercase tracking-wide truncate">
										Idle Time
									</h3>
								</div>
								<div className="bg-blue-500/20 p-2 lg:p-3 rounded-lg">
									<IconMoon className="w-4 h-4 lg:w-5 lg:h-5 text-blue-400" />
								</div>
							</div>
							<div className="text-2xl lg:text-3xl font-bold mb-1 lg:mb-2 text-zinc-900 dark:text-white">
								{myData ? myData.idleTime : 0}
							</div>
							<div className="text-xs lg:text-sm text-zinc-500 dark:text-zinc-400">
								Time spent away from keyboard
							</div>
						</div>
					)}

					<div className="bg-white dark:bg-zinc-800 rounded-xl p-4 lg:p-6 border border-white/10 min-w-0">
						<div className="flex items-center justify-between mb-4 lg:mb-6">
							<div className="min-w-0 flex-1">
								<h3 className="text-xs lg:text-sm font-medium text-zinc-900 dark:text-zinc-300 uppercase tracking-wide truncate">
									Messages
								</h3>
							</div>
							<div className="bg-purple-500/20 p-2 lg:p-3 rounded-lg">
								<IconMessageCircle2 className="w-4 h-4 lg:w-5 lg:h-5 text-purple-400" />
							</div>
						</div>
						<div className="text-2xl lg:text-3xl font-bold mb-1 lg:mb-2 text-zinc-900 dark:text-white">
							{myData ? myData.messages : 0}
						</div>
						<div className="text-xs lg:text-sm text-zinc-500 dark:text-zinc-400">
							Chat messages
						</div>
					</div>

					<div className="bg-white dark:bg-zinc-800 rounded-xl p-4 lg:p-6 border border-white/10 min-w-0">
						<div className="flex items-center justify-between mb-4 lg:mb-6">
							<div className="min-w-0 flex-1">
								<h3 className="text-xs lg:text-sm font-medium text-zinc-900 dark:text-zinc-300 uppercase tracking-wide truncate">
									Total Sessions
								</h3>
							</div>
							<div className="bg-orange-500/20 p-2 lg:p-3 rounded-lg">
								<IconPlayerPlay className="w-4 h-4 lg:w-5 lg:h-5 text-orange-400" />
							</div>
						</div>
						<div className="text-2xl lg:text-3xl font-bold mb-1 lg:mb-2 text-zinc-900 dark:text-white">
							{myData ? myData.totalPlaySessions : 0}
						</div>
						<div className="text-sm text-zinc-500 dark:text-zinc-400">
							Play sessions
						</div>
					</div>
				</div>

				{myData && (
					<div className="mb-8">
						<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
							<div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl p-6 text-white shadow-lg">
								<div className="flex items-center justify-between mb-4">
									<div>
										<h3 className="text-sm font-medium text-blue-100 uppercase tracking-wide">
											Sessions Hosted
										</h3>
									</div>
									<div className="bg-white/20 p-3 rounded-lg">
										<IconUsers className="w-6 h-6 text-white" />
									</div>
								</div>
								<div className="text-4xl font-bold mb-2 text-white">
									{myData.sessionsHosted}
								</div>
								<div className="text-sm text-blue-100">Sessions you Hosted</div>
							</div>

							<div className="bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-xl p-6 text-white shadow-lg">
								<div className="flex items-center justify-between mb-4">
									<div>
										<h3 className="text-sm font-medium text-emerald-100 uppercase tracking-wide">
											Sessions Attended
										</h3>
									</div>
									<div className="bg-white/20 p-3 rounded-lg">
										<IconChartBar className="w-6 h-6 text-white" />
									</div>
								</div>
								<div className="text-4xl font-bold mb-2 text-white">
									{myData.sessionsAttended}
								</div>
								<div className="text-sm text-emerald-100">
									Sessions you participated in
								</div>
							</div>
						</div>
					</div>
				)}

				{myQuotas.length > 0 && (
					<div className="bg-white dark:bg-zinc-800 rounded-xl p-5 shadow-sm mb-6">
						<div className="flex items-center gap-3 mb-4">
							<div className="bg-primary/10 p-2 rounded-lg">
								<IconTarget className="w-5 h-5 text-primary" />
							</div>
							<h3 className="text-base font-medium text-zinc-900 dark:text-white">
								Quotas
							</h3>
						</div>
						<div className="grid gap-4">
							{myQuotas.map((quota: any) => (
								<div
									key={quota.id}
									className="flex items-center justify-between p-3 bg-zinc-50 dark:bg-zinc-700 rounded-lg"
								>
									<div>
										<p className="text-sm font-medium text-zinc-900 dark:text-white">
											{quota.name}
										</p>
										<p className="text-xs text-zinc-500 dark:text-zinc-400">
											{quota.currentValue} / {quota.value}{" "}
											{getQuotaTypeLabel(quota.type)}
										</p>
									</div>
									<div className="flex items-center gap-3">
										<div className="w-24 bg-gray-200 dark:bg-gray-600 rounded-full h-2">
											<div
												className={`h-2 rounded-full ${quota.percentage >= 100
													? "bg-green-500"
													: quota.percentage >= 70
														? "bg-yellow-500"
														: "bg-red-500"
													}`}
												style={{
													width: `${Math.min(quota.percentage, 100)}%`,
												}}
											></div>
										</div>
										<span
											className={`text-sm font-medium ${quota.percentage >= 100
												? "text-green-600 dark:text-green-400"
												: quota.percentage >= 70
													? "text-yellow-600 dark:text-yellow-400"
													: "text-red-600 dark:text-red-400"
												}`}
										>
											{Math.round(quota.percentage)}%
										</span>
									</div>
								</div>
							))}
						</div>
					</div>
				)}
				{myAssignments.length > 0 && (
					<div className="bg-white dark:bg-zinc-800 rounded-xl shadow-sm overflow-hidden mb-8">
						<div className="flex items-center gap-3 p-4 border-b dark:border-zinc-600">
							<div className="bg-primary/10 p-2 rounded-lg">
								<IconTarget className="w-5 h-5 text-primary" />
							</div>
							<h2 className="text-lg font-medium text-zinc-900 dark:text-white">
								Assignments
							</h2>
						</div>
						<div className="p-4">
							<div className="grid gap-4">
								{myAssignments.map((assignment: any) => (
									<div
										key={assignment.id}
										className="bg-zinc-50 dark:bg-zinc-700 rounded-lg p-4"
									>
										<div className="flex justify-between items-center mb-2">
											<h3 className="text-sm font-medium text-zinc-900 dark:text-white">
												{assignment.name}
											</h3>
											<p className="text-xs text-zinc-500 dark:text-zinc-400">
												Assigned to your role
											</p>
										</div>
										<p className="text-sm text-zinc-600 dark:text-zinc-300 mb-3">
											{assignment.description ||
												`${assignment.value} ${getQuotaTypeLabel(
													assignment.type
												)} required`}
										</p>
										<div className="flex items-center gap-3">
											<div className="flex-1 bg-gray-200 dark:bg-gray-600 rounded-full h-2">
												<div
													className="h-2 rounded-full bg-primary"
													style={{
														width: `${Math.min(
															assignment.progress || 0,
															100
														)}%`,
													}}
												></div>
											</div>
											<span className="text-sm font-medium text-zinc-900 dark:text-white min-w-[3rem] text-right">
												{Math.round(assignment.progress || 0)}%
											</span>
										</div>
									</div>
								))}
							</div>
						</div>
					</div>
				)}

				{leaderboardEnabled && topStaff.length > 0 && (
					<div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
						{[
							{
								title: "In-game Staff",
								subtitle: "Currently active members",
								users: activeUsers,
								emptyText: "No staff are currently in-game",
								icon: IconUsers,
							},
							{
								title: "Inactive Staff",
								subtitle: "Staff on inactivity notice",
								users: inactiveUsers,
								emptyText: "No staff are currently inactive",
								icon: IconUserCircle,
							},
						].map(({ title, subtitle, users, emptyText, icon: Icon }) => (
							<div
								key={title}
								className="bg-white dark:bg-zinc-800 rounded-xl p-6 shadow-sm"
							>
								<div className="flex items-center gap-3 mb-4">
									<div className="bg-primary/10 p-2 rounded-lg">
										<Icon className="w-5 h-5 text-primary" />
									</div>
									<div>
										<h3 className="text-base font-medium text-zinc-900 dark:text-white">
											{title}
										</h3>
										<p className="text-sm text-zinc-500 dark:text-zinc-400">
											{subtitle}
										</p>
									</div>
								</div>
								<div className="flex flex-wrap gap-2">
									{users.map((user: any) => (
										<Tooltip
											key={user.userId}
											tooltipText={
												user.reason
													? `${user.username} | ${moment(user.from).format(
														"DD MMM"
													)} - ${moment(user.to).format("DD MMM")}`
													: `${user.username}`
											}
											orientation="top"
										>
											<div
												className={`w-10 h-10 rounded-full flex items-center justify-center ${getRandomBg(
													user.userId
												)} ring-2 ring-primary/10 hover:ring-primary/30 transition-all`}
											>
												<img
													src={user.picture}
													alt={user.username}
													className="w-10 h-10 rounded-full object-cover border-2 border-white"
													style={{ background: "transparent" }}
												/>
											</div>
										</Tooltip>
									))}
									{users.length === 0 && (
										<p className="text-sm text-zinc-500 dark:text-zinc-400 italic">
											{emptyText}
										</p>
									)}
								</div>
							</div>
						))}
					</div>
				)}
				<div className="mt-8">
					<div className="bg-white dark:bg-zinc-800 rounded-xl shadow-sm overflow-hidden">
						<div className="flex items-center gap-3 p-4 border-b border-zinc-200 dark:border-zinc-600">
							<div className="bg-primary/10 p-2 rounded-lg">
								<IconCalendarTime className="w-5 h-5 text-primary" />
							</div>
							<h2 className="text-lg font-medium text-zinc-900 dark:text-white">
								Your Activity Timeline
							</h2>
						</div>
						<div className="p-4">
							{timeline.length === 0 ? (
								<div className="text-center py-12">
									<div className="bg-white dark:bg-zinc-800 rounded-xl p-8 max-w-md mx-auto">
										<div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4">
											<IconClipboardList className="w-8 h-8 text-primary" />
										</div>
										<h3 className="text-lg font-medium text-zinc-900 dark:text-white mb-1">
											No Activity
										</h3>
										<p className="text-sm text-zinc-900 dark:text-white mb-4">
											No activity or adjustments have been recorded yet
										</p>
									</div>
								</div>
							) : (
								<ol className="relative border-l border-gray-200 ml-3 mt-3">
									{timeline.map((item: any) => {
										if (item.__type === "session") {
											const isLive = item.active && !item.endTime;
											const sessionDuration = isLive
												? Math.floor(
													(new Date().getTime() -
														new Date(item.startTime).getTime()) /
													(1000 * 60)
												)
												: Math.floor(
													(new Date(item.endTime || new Date()).getTime() -
														new Date(item.startTime).getTime()) /
													(1000 * 60)
												);

											return (
												<div key={`session-${item.id}`}>
													<li className="mb-6 ml-6">
														<span
															className={`flex absolute -left-3 justify-center items-center w-6 h-6 ${isLive
																? "bg-green-500 animate-pulse"
																: "bg-primary"
																} rounded-full ring-4 ring-white`}
														>
															{isLive ? (
																<div className="w-3 h-3 bg-white rounded-full"></div>
															) : (
																<img
																	className="rounded-full"
																	src={
																		item.user?.picture ||
																		myData?.picture ||
																		"/default-avatar.jpg"
																	}
																	alt="timeline avatar"
																/>
															)}
														</span>
														<div
															onClick={() =>
																!isLive && fetchSessionDetails(item.id)
															}
															className={`p-4 ${isLive
																? "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-700"
																: "bg-zinc-50 dark:bg-zinc-500 border-zinc-100"
																} rounded-lg border ${!isLive
																	? "cursor-pointer hover:bg-zinc-100 dark:hover:bg-zinc-600 transition-colors"
																	: ""
																}`}
														>
															<div className="flex justify-between items-center mb-1">
																<div className="flex items-center gap-2">
																	<p className="text-sm font-medium text-zinc-900 dark:text-white">
																		Activity Session
																	</p>
																	{isLive && (
																		<span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
																			LIVE
																		</span>
																	)}
																</div>
																<time className="text-xs text-zinc-500 dark:text-white">
																	{isLive ? (
																		<>
																			Started at{" "}
																			{moment(item.startTime).format("HH:mm")} •{" "}
																			{sessionDuration}m
																		</>
																	) : (
																		<>
																			{moment(item.startTime).format("HH:mm")} -{" "}
																			{moment(item.endTime).format("HH:mm")} on{" "}
																			{moment(item.startTime).format(
																				"DD MMM YYYY"
																			)}{" "}
																			• {sessionDuration}m
																		</>
																	)}
																</time>
															</div>
															{isLive && (
																<p className="text-xs text-zinc-600 dark:text-zinc-300">
																	Currently active in game
																</p>
															)}
														</div>
													</li>
												</div>
											);
										}
										if (item.__type === "notice") {
											return (
												<div key={`notice-${item.id}`}>
													<li className="mb-6 ml-6">
														<span className="flex absolute -left-3 justify-center items-center w-6 h-6 bg-primary rounded-full ring-4 ring-white">
															<img
																className="rounded-full"
																src={myData?.picture || "/default-avatar.jpg"}
																alt="timeline avatar"
															/>
														</span>
														<div className="p-4 bg-zinc-50 dark:bg-zinc-700 rounded-lg border border-zinc-100 dark:border-zinc-600">
															<div className="flex justify-between items-center mb-1">
																<p className="text-sm font-medium text-zinc-900 dark:text-white">
																	Inactivity Notice
																</p>
																<time className="text-xs text-zinc-500 dark:text-zinc-400">
																	{moment(item.startTime).format("DD MMM")} -{" "}
																	{moment(item.endTime).format("DD MMM YYYY")}
																</time>
															</div>
															<p className="text-sm text-zinc-600 dark:text-zinc-300">
																{item.reason}
															</p>
														</div>
													</li>
												</div>
											);
										}
										if (item.__type === "adjustment") {
											const positive = item.minutes > 0;
											return (
												<div key={`adjust-${item.id}`}>
													<li className="mb-6 ml-6">
														<span
															className={`flex absolute -left-3 justify-center items-center w-6 h-6 rounded-full ring-4 ring-white ${positive ? "bg-green-500" : "bg-red-500"
																} ${getRandomBg(item.actorId?.toString() || "")}`}
														>
															{item.actor?.picture ? (
																<img
																	className="rounded-full w-6 h-6"
																	src={item.actor.picture}
																	alt={item.actor.username || "Actor"}
																/>
															) : (
																<span className="text-white text-xs font-bold">
																	{positive ? "+" : "-"}
																</span>
															)}
														</span>
														<div className="p-4 bg-zinc-50 dark:bg-zinc-600 rounded-lg border border-zinc-100 dark:border-zinc-600">
															<div className="flex justify-between items-center mb-1">
																<p className="text-sm font-medium text-zinc-900 dark:text-white">
																	Manual Adjustment
																</p>
																<time className="text-xs text-zinc-500 dark:text-zinc-300">
																	{moment(item.createdAt).format(
																		"DD MMM YYYY, HH:mm"
																	)}
																</time>
															</div>
															<p className="text-sm text-zinc-600 dark:text-zinc-200">
																{positive ? "Awarded" : "Removed"}{" "}
																{Math.abs(item.minutes)} minutes by{" "}
																{item.actor?.username || "Unknown"}
															</p>
															{item.reason && (
																<p className="text-xs italic text-zinc-500 dark:text-zinc-400 mt-1">
																	Reason: {item.reason}
																</p>
															)}
														</div>
													</li>
												</div>
											);
										}
									})}
								</ol>
							)}
						</div>
					</div>
				</div>
			</div>

			<Transition appear show={isSessionModalOpen} as={Fragment}>
				<Dialog
					as="div"
					className="relative z-10"
					onClose={() => setIsSessionModalOpen(false)}
				>
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
								<Dialog.Panel className="w-full max-w-lg transform overflow-hidden rounded-xl bg-white dark:bg-zinc-800 text-left align-middle shadow-xl transition-all">
									{sessionDetails?.universe?.thumbnail && (
										<div className="relative h-32 bg-gradient-to-r from-blue-500 to-purple-600">
											<img
												src={sessionDetails.universe.thumbnail}
												alt="Game thumbnail"
												className="w-full h-full object-cover"
											/>
											<div className="absolute inset-0 bg-black bg-opacity-20"></div>
										</div>
									)}
									<div className="p-6 border-b border-zinc-200 dark:border-zinc-700">
										<div className="flex items-center gap-3 mb-4">
											<div className="bg-primary/10 p-2 rounded-lg">
												<IconClock className="w-5 h-5 text-primary" />
											</div>
											<div>
												<Dialog.Title
													as="h3"
													className="text-xl font-semibold text-zinc-900 dark:text-white"
												>
													{sessionDetails?.message?.sessionMessage ||
														sessionDetails?.universe?.name ||
														"Unknown Game"}
												</Dialog.Title>
												<p className="text-sm text-zinc-500 dark:text-zinc-400">
													Activity Session Details
												</p>
											</div>
										</div>
										{concurrentUsers.length > 0 && (
											<div className="flex items-center gap-3">
												<span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
													Played with:
												</span>
												<div className="flex flex-wrap gap-2">
													{concurrentUsers.map((user: any) => (
														<div
															key={user.userId}
															className={`w-8 h-8 rounded-full overflow-hidden ring-2 ring-white dark:ring-zinc-800 ${getRandomBg(
																user.userId,
																user.username
															)}`}
															title={user.username}
														>
															<img
																src={user.picture || "/default-avatar.jpg"}
																alt={user.username}
																className="w-full h-full object-cover"
															/>
														</div>
													))}
												</div>
											</div>
										)}
									</div>
									<div className="p-6">
										{loadingSession ? (
											<div className="flex items-center justify-center h-32">
												<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
											</div>
										) : (
											<div className="grid grid-cols-1 gap-4">
												<div className="bg-zinc-50 dark:bg-zinc-700/50 rounded-lg p-4 text-center">
													<div className="text-2xl font-bold text-zinc-900 dark:text-white mb-1">
														{(() => {
															if (
																!sessionDetails.message?.endTime ||
																!sessionDetails.message?.startTime
															) {
																return "Ended";
															}
															const duration = moment.duration(
																moment(sessionDetails.message.endTime).diff(
																	moment(sessionDetails.message.startTime)
																)
															);
															const minutes = Math.floor(duration.asMinutes());
															return `${minutes} ${minutes === 1 ? "minute" : "minutes"
																}`;
														})()}
													</div>
													<div className="text-sm text-zinc-600 dark:text-zinc-400">
														Duration
													</div>
												</div>
												<div
													className={`grid ${idleTimeEnabled ? "grid-cols-2" : "grid-cols-1"
														} gap-4`}
												>
													{idleTimeEnabled && (
														<div className="bg-zinc-50 dark:bg-zinc-700/50 rounded-lg p-4 text-center">
															<div className="text-xl font-semibold text-zinc-900 dark:text-white mb-1">
																{sessionDetails.message?.idleTime || 0}
															</div>
															<div className="text-sm text-zinc-600 dark:text-zinc-400">
																Idle{" "}
																{(sessionDetails.message?.idleTime || 0) === 1
																	? "minute"
																	: "minutes"}
															</div>
														</div>
													)}
													<div className="bg-zinc-50 dark:bg-zinc-700/50 rounded-lg p-4 text-center">
														<div className="text-xl font-semibold text-zinc-900 dark:text-white mb-1">
															{sessionDetails.message?.messages || 0}
														</div>
														<div className="text-sm text-zinc-600 dark:text-zinc-400">
															{(sessionDetails.message?.messages || 0) === 1
																? "Message"
																: "Messages"}
														</div>
													</div>
												</div>
											</div>
										)}
										<div className="mt-6">
											<button
												type="button"
												className="w-full justify-center rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90 transition-colors"
												onClick={() => setIsSessionModalOpen(false)}
											>
												Close
											</button>
										</div>
									</div>
								</Dialog.Panel>
							</Transition.Child>
						</div>
					</div>
				</Dialog>
			</Transition>

			<Toaster position="bottom-center" />
		</div>
	);
};

const ActionButton = ({ icon: Icon, title, desc, onClick }: any) => (
	<button
		onClick={onClick}
		className="flex items-center gap-3 bg-white dark:bg-zinc-800 p-4 rounded-xl shadow-sm hover:shadow-md transition-all text-left"
	>
		<div className="bg-primary/10 p-2 rounded-lg">
			<Icon className="w-5 h-5 text-primary" />
		</div>
		<div>
			<p className="text-sm font-medium text-zinc-900 dark:text-white">
				{title}
			</p>
			<p className="text-xs text-zinc-500 dark:text-zinc-400">{desc}</p>
		</div>
	</button>
);

const BG_COLORS = [
	"bg-rose-300",
	"bg-lime-300",
	"bg-teal-200",
	"bg-amber-300",
	"bg-rose-200",
	"bg-lime-200",
	"bg-green-100",
	"bg-red-100",
	"bg-yellow-200",
	"bg-amber-200",
	"bg-emerald-300",
	"bg-green-300",
	"bg-red-300",
	"bg-emerald-200",
	"bg-green-200",
	"bg-red-200",
];

function getRandomBg(userid: string, username?: string) {
	const key = `${userid ?? ""}:${username ?? ""}`;
	let hash = 5381;
	for (let i = 0; i < key.length; i++) {
		hash = ((hash << 5) - hash) ^ key.charCodeAt(i);
	}
	const index = (hash >>> 0) % BG_COLORS.length;
	return BG_COLORS[index];
}

const getPodiumIcon = (position: number) => {
	switch (position) {
		case 0:
			return <IconCrown className="w-8 h-8 text-yellow-500" />;
		case 1:
			return <IconMedal className="w-7 h-7 text-gray-400" />;
		case 2:
			return <IconAward className="w-6 h-6 text-amber-600" />;
		default:
			return null;
	}
};

const getPodiumHeight = (position: number) => {
	switch (position) {
		case 0:
			return "h-32";
		case 1:
			return "h-24";
		case 2:
			return "h-20";
		default:
			return "h-16";
	}
};

const getPodiumColors = (position: number) => {
	switch (position) {
		case 0:
			return "bg-gradient-to-t from-yellow-400 to-yellow-300 border-yellow-500";
		case 1:
			return "bg-gradient-to-t from-gray-400 to-gray-300 border-gray-500";
		case 2:
			return "bg-gradient-to-t from-amber-600 to-amber-500 border-amber-700";
		default:
			return "bg-gradient-to-t from-zinc-300 to-zinc-200 border-zinc-400";
	}
};

Activity.layout = workspace;

export default Activity;

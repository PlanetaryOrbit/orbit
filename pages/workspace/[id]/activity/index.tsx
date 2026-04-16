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
			<div className="flex items-center gap-4 mb-8">
				{myData?.picture && (
					<img
						src={myData.picture}
						alt={myData.username}
						className="w-14 h-14 rounded-full ring-2 ring-primary/20 shadow-md flex-shrink-0 object-cover"
					/>
				)}
				<div>
					<h1 className="text-2xl font-semibold text-zinc-900 dark:text-white leading-tight">
						Activity Dashboard
					</h1>
					<p className="text-sm text-zinc-500 dark:text-zinc-400 mt-0.5">
						{myData
							? `Welcome back, ${myData.username} — here's your activity summary`
							: "Monitor your performance and track detailed activity metrics"}
					</p>
				</div>
			</div>

			{leaderboardEnabled && topStaff.length > 0 && (
				<div className="mb-8">
					<div className="bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl p-6 shadow-sm">
						<div className="flex items-center gap-3 mb-8">
							<div className="bg-primary/10 p-2.5 rounded-xl">
								<IconTrophy className="w-5 h-5 text-primary" />
							</div>
							<div>
								<h2 className="text-lg font-bold text-zinc-900 dark:text-white">Leaderboard</h2>
								<p className="text-xs text-zinc-500 dark:text-zinc-400">Top performers this period</p>
							</div>
						</div>

						{(() => {
							const podiumOrder = [topStaff[1], topStaff[0], topStaff[2]].filter(Boolean);
							const positions = topStaff[1] ? [2, 1, 3] : [1, 3].filter((_, i) => topStaff[i]);

							const blockHeights = { 1: "h-28", 2: "h-20", 3: "h-14" };
							const blockColors = {
								1: "bg-gradient-to-b from-amber-400 to-amber-500",
								2: "bg-gradient-to-b from-zinc-400 to-zinc-500",
								3: "bg-gradient-to-b from-amber-600 to-amber-700",
							};
							const ringColors = {
								1: "ring-amber-400",
								2: "ring-zinc-400",
								3: "ring-amber-600",
							};
							const labelColors = {
								1: "text-amber-500",
								2: "text-zinc-400",
								3: "text-amber-600",
							};
							const medals = { 1: "🥇", 2: "🥈", 3: "🥉" };

							return (
								<div className="flex items-end justify-center gap-3 sm:gap-6">
									{podiumOrder.map((user: any, i: number) => {
										const pos = topStaff[1] ? [2, 1, 3][i] : [1, 3][i];
										const minutes = Math.floor(user.ms / 1000 / 60);
										return (
											<div key={user.userId} className="flex flex-col items-center flex-1 max-w-[140px]">
												<div className="flex flex-col items-center mb-2">
													<span className="text-xl mb-1">{medals[pos as keyof typeof medals]}</span>
													<div className={`relative ring-4 ${ringColors[pos as keyof typeof ringColors]} ring-offset-2 ring-offset-white dark:ring-offset-zinc-800 rounded-full`}>
														<img
															src={user.picture}
															alt={user.username}
															className={`rounded-full object-cover ${pos === 1 ? "w-20 h-20" : "w-16 h-16"}`}
														/>
													</div>
													<p className={`mt-2 font-bold text-sm text-zinc-900 dark:text-white text-center truncate w-full ${pos === 1 ? "text-base" : ""}`}>
														{user.username}
													</p>
													<p className={`text-xs font-semibold ${labelColors[pos as keyof typeof labelColors]}`}>
														{formatMinutes(minutes)}
													</p>
												</div>
												<div className={`w-full rounded-t-xl ${blockHeights[pos as keyof typeof blockHeights]} ${blockColors[pos as keyof typeof blockColors]} flex items-center justify-center shadow-lg`}>
													<span className="text-white font-black text-2xl opacity-60">{pos}</span>
												</div>
											</div>
										);
									})}
								</div>
							);
						})()}

						{topStaff.length > 3 && (
							<div className="mt-6 pt-4 border-t border-zinc-100 dark:border-zinc-700 space-y-1.5">
								{topStaff.slice(3).map((user: any, index: number) => {
									const minutes = Math.floor(user.ms / 1000 / 60);
									return (
										<div key={user.userId} className="flex items-center gap-3 px-2 py-1.5 rounded-lg hover:bg-zinc-50 dark:hover:bg-zinc-700/50 transition-colors">
											<span className="text-xs font-bold text-zinc-400 dark:text-zinc-500 w-5 text-right flex-shrink-0">{index + 4}</span>
											<img src={user.picture} alt={user.username} className="w-7 h-7 rounded-full object-cover flex-shrink-0" />
											<span className="text-sm font-medium text-zinc-900 dark:text-white flex-1 truncate">{user.username}</span>
											<span className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 flex-shrink-0">{formatMinutes(minutes)}</span>
										</div>
									);
								})}
							</div>
						)}
					</div>
				</div>
			)}

			<div className="grid grid-cols-2 xl:grid-cols-4 gap-4 mb-8">
				<div className="bg-white dark:bg-zinc-800 rounded-xl p-5 border border-zinc-200 dark:border-zinc-700">
					<div className="flex items-center justify-between mb-5">
						<span className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
							Active Time
						</span>
						<div className="bg-primary/10 p-2 rounded-lg">
							<IconClock className="w-4 h-4 text-primary" />
						</div>
					</div>
					<div className="text-3xl font-bold text-zinc-900 dark:text-white tabular-nums">
						{formatMinutes(myData ? myData.minutes : 0)}
					</div>
					<div className="text-xs text-zinc-400 dark:text-zinc-500 mt-1.5">
						Time spent in-game
					</div>
				</div>

				{idleTimeEnabled && (
					<div className="bg-white dark:bg-zinc-800 rounded-xl p-5 border border-zinc-200 dark:border-zinc-700">
						<div className="flex items-center justify-between mb-5">
							<span className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
								Idle Time
							</span>
							<div className="bg-primary/10 p-2 rounded-lg">
								<IconMoon className="w-4 h-4 text-primary" />
							</div>
						</div>
						<div className="text-3xl font-bold text-zinc-900 dark:text-white tabular-nums">
							{formatMinutes(myData ? myData.idleTime : 0)}
						</div>
						<div className="text-xs text-zinc-400 dark:text-zinc-500 mt-1.5">
							Away from keyboard
						</div>
					</div>
				)}

				<div className="bg-white dark:bg-zinc-800 rounded-xl p-5 border border-zinc-200 dark:border-zinc-700">
					<div className="flex items-center justify-between mb-5">
						<span className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
							Messages
						</span>
						<div className="bg-primary/10 p-2 rounded-lg">
							<IconMessageCircle2 className="w-4 h-4 text-primary" />
						</div>
					</div>
					<div className="text-3xl font-bold text-zinc-900 dark:text-white tabular-nums">
						{myData ? myData.messages.toLocaleString() : 0}
					</div>
					<div className="text-xs text-zinc-400 dark:text-zinc-500 mt-1.5">
						Chat messages sent
					</div>
				</div>

				<div className="bg-white dark:bg-zinc-800 rounded-xl p-5 border border-zinc-200 dark:border-zinc-700">
					<div className="flex items-center justify-between mb-5">
						<span className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
							Play Sessions
						</span>
						<div className="bg-primary/10 p-2 rounded-lg">
							<IconPlayerPlay className="w-4 h-4 text-primary" />
						</div>
					</div>
					<div className="text-3xl font-bold text-zinc-900 dark:text-white tabular-nums">
						{myData ? myData.totalPlaySessions : 0}
					</div>
					<div className="text-xs text-zinc-400 dark:text-zinc-500 mt-1.5">
						Total play sessions
					</div>
				</div>
			</div>

			{myData && (
				<div className="mb-8">
					<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
						<div className="relative overflow-hidden bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl p-6 text-white shadow-lg">
							<div className="absolute -right-4 -bottom-4 w-24 h-24 bg-white/10 rounded-full" />
							<div className="absolute -right-1 -bottom-8 w-16 h-16 bg-white/10 rounded-full" />
							<div className="relative flex items-center justify-between mb-5">
								<span className="text-xs font-semibold text-blue-100 uppercase tracking-wider">
									Sessions Hosted
								</span>
								<div className="bg-white/20 p-2.5 rounded-lg">
									<IconUsers className="w-5 h-5 text-white" />
								</div>
							</div>
							<div className="relative text-4xl font-bold text-white tabular-nums mb-1">
								{myData.sessionsHosted}
							</div>
							<div className="relative text-sm text-blue-100">Sessions you led</div>
						</div>

						<div className="relative overflow-hidden bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-xl p-6 text-white shadow-lg">
							<div className="absolute -right-4 -bottom-4 w-24 h-24 bg-white/10 rounded-full" />
							<div className="absolute -right-1 -bottom-8 w-16 h-16 bg-white/10 rounded-full" />
							<div className="relative flex items-center justify-between mb-5">
								<span className="text-xs font-semibold text-emerald-100 uppercase tracking-wider">
									Sessions Attended
								</span>
								<div className="bg-white/20 p-2.5 rounded-lg">
									<IconChartBar className="w-5 h-5 text-white" />
								</div>
							</div>
							<div className="relative text-4xl font-bold text-white tabular-nums mb-1">
								{myData.sessionsAttended}
							</div>
							<div className="relative text-sm text-emerald-100">
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

function formatMinutes(minutes: number): string {
	if (minutes < 60) return `${minutes}m`;
	const h = Math.floor(minutes / 60);
	const m = minutes % 60;
	return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

function getRandomBg(userid: string, username?: string) {
	const key = `${userid ?? ""}:${username ?? ""}`;
	let hash = 5381;
	for (let i = 0; i < key.length; i++) {
		hash = ((hash << 5) - hash) ^ key.charCodeAt(i);
	}
	const index = (hash >>> 0) % BG_COLORS.length;
	return BG_COLORS[index];
}


Activity.layout = workspace;

export default Activity;

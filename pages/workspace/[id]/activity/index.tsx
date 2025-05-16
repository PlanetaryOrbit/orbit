import workspace from "@/layouts/workspace";
import { pageWithLayout } from "@/layoutTypes";
import { loginState, workspacestate } from "@/state";
import axios from "axios";
import { useRouter } from "next/router";
import { useEffect, useState, useMemo, Fragment } from "react";
import { useRecoilState } from "recoil";
import { Dialog, Transition } from "@headlessui/react";
import moment from "moment";
import {
	IconChevronRight,
	IconUsers,
	IconClock,
	IconChartBar,
	IconUserCircle,
	IconMessageCircle2,
	IconArrowLeft,
} from "@tabler/icons";
import Tooltip from "@/components/tooltip";
import randomText from "@/utils/randomText";
import toast, { Toaster } from "react-hot-toast";

const Activity: pageWithLayout = () => {
	const router = useRouter();
	const { id } = router.query;

	const [login] = useRecoilState(loginState);
	const [workspace] = useRecoilState(workspacestate);
	const text = useMemo(() => randomText(login.displayname), []);
	const [activeUsers, setActiveUsers] = useState([]);
	const [inactiveUsers, setInactiveUsers] = useState([]);
	const [topStaff, setTopStaff] = useState([]);
	const [messages, setMessages] = useState(0);
	const [idleTime, setIdleTime] = useState(0);
	const [isOpen, setIsOpen] = useState(false);

	async function resetActivity() {
		setIsOpen(false);
		toast.promise(
			axios.post(`/api/workspace/${id}/activity/reset`),
			{
				loading: "Resetting activity...",
				success: <b>Activity has been reset!</b>,
				error: <b>Activity was not reset due to an unknown error.</b>,
			}
		);
	}

	useEffect(() => {
		async function fetchAll() {
			const usersRes = await axios.get(`/api/workspace/${id}/activity/users`);
			const statsRes = await axios.get(`/api/workspace/${id}/activity/stats`);

			setActiveUsers(usersRes.data.message.activeUsers);
			setInactiveUsers(usersRes.data.message.inactiveUsers);
			setTopStaff(usersRes.data.message.topStaff);
			setMessages(statsRes.data.message.messages);
			setIdleTime(statsRes.data.message.idle);
		}

		if (id) {
			fetchAll();
			const interval = setInterval(fetchAll, 10000);
			return () => clearInterval(interval);
		}
	}, [id]);

	return (
		<div className="pagePadding">
			<div className="max-w-7xl mx-auto">
				<div className="flex items-center gap-3 mb-6">
					<div>
						<h1 className="text-2xl font-medium text-gray-900 dark:text-white">Activity</h1>
						<p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Track and monitor your staff engagement, minutes, and overall group activity</p>
					</div>
				</div>

				<div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
					{[
						{ icon: IconMessageCircle2, label: "Messages", value: messages },
						{ icon: IconClock, label: "Idle Time", value: `${Math.round(idleTime)}m` },
						{ icon: IconUsers, label: "Active Staff", value: activeUsers.length },
					].map(({ icon: Icon, label, value }) => (
						<div key={label} className="bg-white dark:bg-gray-800 rounded-xl p-5 shadow-sm">
							<div className="flex items-center gap-3 mb-2">
								<div className="bg-primary/10 p-2 rounded-lg">
									<Icon className="w-5 h-5 text-primary" />
								</div>
								<p className="text-sm font-medium text-gray-600 dark:text-gray-300">{label}</p>
							</div>
							<p className="text-3xl font-semibold text-gray-900 dark:text-white">{value}</p>
						</div>
					))}
				</div>

				<div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
					{[
						{
							title: "In-game Staff",
							subtitle: "Currently active members",
							users: activeUsers,
							emptyText: "No staff are currently in-game",
							icon: IconUsers,
							highlight: true,
						},
						{
							title: "Inactive Staff",
							subtitle: "Staff on inactivity notice",
							users: inactiveUsers,
							emptyText: "No staff are currently inactive",
							icon: IconUserCircle,
							highlight: false,
						},
					].map(({ title, subtitle, users, emptyText, icon: Icon, highlight }) => (
						<div key={title} className="bg-white dark:bg-gray-800 rounded-xl p-5 shadow-sm">
							<div className="flex items-center gap-3 mb-4">
								<div className="bg-primary/10 p-2 rounded-lg">
									<Icon className="w-5 h-5 text-primary" />
								</div>
								<div>
									<h2 className="text-base font-medium text-gray-900 dark:text-white">{title}</h2>
									<p className="text-sm text-gray-500 dark:text-gray-400">{subtitle}</p>
								</div>
							</div>
							<div className="flex flex-wrap gap-2">
								{users.map((user: any) => (
									<Tooltip
										key={user.userId}
										tooltipText={
											user.reason
												? `${user.username} | ${moment(user.from).format("DD MMM")} - ${moment(user.to).format("DD MMM")}`
												: `${user.username}`
										}
										orientation="top"
									>
										<div className="relative group">
											<img
												src={user.picture}
												alt={user.username}
												className={`w-10 h-10 rounded-full ring-2 ${
													highlight ? "ring-primary/10" : "opacity-60 ring-primary/10"
												} group-hover:ring-primary/30 transition-all`}
											/>
											{highlight && (
												<div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 rounded-full ring-2 ring-white" />
											)}
										</div>
									</Tooltip>
								))}
								{users.length === 0 && (
									<p className="text-sm text-gray-500 dark:text-gray-400 italic">{emptyText}</p>
								)}
							</div>
						</div>
					))}
				</div>

				<div className="bg-white dark:bg-gray-800 rounded-xl p-5 shadow-sm mb-6">
					<div className="flex items-center gap-3 mb-4">
						<div className="bg-primary/10 p-2 rounded-lg">
							<IconChartBar className="w-5 h-5 text-primary" />
						</div>
						<div>
							<h2 className="text-base font-medium text-gray-900 dark:text-white">Top Staff</h2>
							<p className="text-sm text-gray-500 dark:text-gray-400">Leading members by activity</p>
						</div>
					</div>
					<div className="flex flex-wrap gap-2">
						{topStaff.length > 0 ? (
							topStaff.slice(0, 5).map((user: any) => (
								<Tooltip
									key={user.userId}
									tooltipText={`${user.username} - ${Math.floor(user.ms / 1000 / 60)} minutes`}
									orientation="bottom"
								>
									<img
										src={user.picture}
										alt={user.username}
										className="w-10 h-10 rounded-full ring-2 ring-primary/10 hover:ring-primary/30 transition-all"
									/>
								</Tooltip>
							))
						) : (
							<p className="text-sm text-gray-500 dark:text-gray-400 italic">
								No staff have been active yet
							</p>
						)}
					</div>
				</div>

				<h2 className="text-base font-medium text-gray-900 dark:text-white mb-2">Quick Actions</h2>
				<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
					{workspace.yourPermission.includes("manage_activity") && (
						<ActionButton
							icon={IconUsers}
							title="View Notices"
							desc="Manage team notices"
							onClick={() => router.push(`/workspace/${id}/notices/manage`)}
						/>
					)}
					<ActionButton
						icon={IconUserCircle}
						title="My Profile"
						desc="View your profile"
						onClick={() => router.push(`/workspace/${id}/profile/${login.userId}`)}
					/>
					<ActionButton
						icon={IconClock}
						title="My Notices"
						desc="View your notices"
						onClick={() => router.push(`/workspace/${id}/notices`)}
					/>
					{workspace.yourPermission.includes("manage_activity") && (
						<ActionButton
							icon={IconChartBar}
							title="New Timeframe"
							desc="Reset activity period"
							onClick={() => setIsOpen(true)}
						/>
					)}
					{workspace.yourPermission.includes("admin") && (
						<ActionButton
							icon={IconChartBar}
							title="Manage Quotas"
							desc="Configure quotas"
							onClick={() => router.push(`/workspace/${id}/activity/quotas`)}
						/>
					)}
				</div>
			</div>

			<Transition appear show={isOpen} as={Fragment}>
				<Dialog as="div" className="relative z-10" onClose={() => setIsOpen(false)}>
					<Transition.Child as={Fragment} enter="ease-out duration-300" enterFrom="opacity-0" enterTo="opacity-100" leave="ease-in duration-200" leaveFrom="opacity-100" leaveTo="opacity-0">
						<div className="fixed inset-0 bg-black/30 backdrop-blur-sm" />
					</Transition.Child>

					<div className="fixed inset-0 overflow-y-auto">
						<div className="flex min-h-full items-center justify-center p-4 text-center">
							<Transition.Child as={Fragment} enter="ease-out duration-300" enterFrom="opacity-0 scale-95" enterTo="opacity-100 scale-100" leave="ease-in duration-200" leaveFrom="opacity-100 scale-100" leaveTo="opacity-0 scale-95">
								<Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-xl bg-white dark:bg-gray-800 p-6 text-left shadow-xl transition-all">
									<Dialog.Title className="text-lg font-medium text-gray-900 dark:text-white">
										Reset Activity Period
									</Dialog.Title>
									<p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
										Are you sure you want to create a new timeframe? This will reset all activity data.
									</p>
									<div className="mt-4 flex gap-3">
										<button onClick={() => setIsOpen(false)} className="flex-1 rounded-lg border border-gray-300 bg-white dark:bg-gray-700 px-4 py-2 text-sm font-medium text-gray-700 dark:text-white hover:bg-gray-50 dark:hover:bg-gray-600">
											Cancel
										</button>
										<button onClick={resetActivity} className="flex-1 rounded-lg bg-red-500 hover:bg-red-600 px-4 py-2 text-sm font-medium text-white">
											Reset
										</button>
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
		className="flex items-center gap-3 bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm hover:shadow-md transition-all text-left"
	>
		<div className="bg-primary/10 p-2 rounded-lg">
			<Icon className="w-5 h-5 text-primary" />
		</div>
		<div>
			<p className="text-sm font-medium text-gray-900 dark:text-white">{title}</p>
			<p className="text-xs text-gray-500 dark:text-gray-400">{desc}</p>
		</div>
	</button>
);

Activity.layout = workspace;

export default Activity;

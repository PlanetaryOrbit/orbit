import type { pageWithLayout } from "@/layoutTypes";
import { loginState } from "@/state";
import Button from "@/components/button";
import Workspace from "@/layouts/workspace";
import { IconChevronRight, IconCalendarEvent, IconClipboardList, IconUsers, IconPlus, IconTrash, IconArrowLeft } from "@tabler/icons";
import prisma, { Session, user, SessionType } from "@/utils/database";
import { useRecoilState } from "recoil";
import { GetServerSideProps } from "next";
import { useRouter } from "next/router";
import randomText from "@/utils/randomText";
import { useState, useMemo, useEffect } from "react";
import axios from "axios";
import { withPermissionCheckSsr } from "@/utils/permissionsManager";
import toast, { Toaster } from 'react-hot-toast';

export const getServerSideProps = withPermissionCheckSsr(async ({ query }) => {
	const sessions = await prisma.session.findMany({
		where: {
			startedAt: {
				lte: new Date()
			},
			ended: null,
			sessionType: {
				workspaceGroupId: parseInt(query.id as string)
			},
		},
		include: {
			owner: true,
			sessionType: true
		}
	});
	return {
		props: {
			sessions: (JSON.parse(JSON.stringify(sessions, (key, value) => (typeof value === 'bigint' ? value.toString() : value))) as typeof sessions)
		},
	}
})

type pageProps = {
	sessions: (Session & {
		owner: user,
		sessionType: SessionType
	})[]
}

const Home: pageWithLayout<pageProps> = (props) => {
	const [login, setLogin] = useRecoilState(loginState);
	const [sessions, setSessions] = useState(props.sessions);
	const text = useMemo(() => randomText(login.displayname), []);
	const [statues, setStatues] = useState(new Map<string, string>());

	const router = useRouter();

	const endSession = async (id: string) => {
		const axiosPromise = axios.delete(`/api/workspace/${router.query.id}/sessions/manage/${id}/end`, {});
		
		toast.promise(axiosPromise, {
			loading: 'Ending session...',
			success: () => {
				setSessions(sessions.filter((session) => session.id !== id));
				return 'Session ended successfully';
			},
			error: 'Failed to end session'
		});
	}

	useEffect(() => {
		const getAllStatues = async () => {
			const newStatues = new Map<string, string>();
			for (const session of sessions) {
				for (const e of session.sessionType.statues.sort((a, b) => {
					const object = JSON.parse(JSON.stringify(a));
					const object2 = JSON.parse(JSON.stringify(b));
					return object2.timeAfter - object.timeAfter;
				})) {
					const minutes = (new Date().getTime() - new Date(session.date).getTime()) / 1000 / 60;
					const slot = JSON.parse(JSON.stringify(e));
					if (slot.timeAfter < minutes) {
						newStatues.set(session.id, slot.name);
						break;
					}
				}
				if (!newStatues.has(session.id)) {
					newStatues.set(session.id, "Open");
				}
			}
			setStatues(newStatues);
		}
		
		getAllStatues();
		const interval = setInterval(getAllStatues, 10000);
		
		return () => clearInterval(interval);
	}, [sessions]);

	return (
		<div className="pagePadding">
			<Toaster position="bottom-center" />
			<div className="max-w-7xl mx-auto">
				<div className="flex items-center gap-3 mb-6">
					<button onClick={() => router.back()} className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-white rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
						<IconArrowLeft className="w-5 h-5" />
					</button>
					<div>
						<h1 className="text-2xl font-medium text-gray-900 dark:text-white">Remote Admin</h1>
						<p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Manage your game in real-time</p>
					</div>
				</div>

				<div className="mb-8">
					<div className="flex items-center gap-3 mb-4">
						<div className="bg-primary/10 p-2 rounded-lg">
							<IconCalendarEvent className="w-5 h-5 text-primary" />
						</div>
						<div>
							<h2 className="text-lg font-medium text-gray-900 dark:text-white">Ongoing Sessions</h2>
							<p className="text-sm text-gray-500 dark:text-gray-400">View and manage currently active sessions</p>
						</div>
					</div>

					{sessions.length > 0 ? (
						<div className="grid gap-4 grid-cols-1 md:grid-cols-2">
							{sessions.map(session => (
								<div key={session.id} className="bg-white dark:bg-gray-800 rounded-xl shadow-sm overflow-hidden">
									<div className="p-6">
										<div className="flex items-start justify-between">
											<div>
												<h3 className="text-lg font-medium text-gray-900 dark:text-white">{session.sessionType.name}</h3>
												<div className="flex items-center gap-2 mt-2">
													<img 
														src={(session.owner.picture || '/default-avatar.png') as string} 
														className="w-8 h-8 rounded-full bg-primary border-2 border-white dark:border-gray-700" 
														alt={session.owner.username || 'User'}
													/>
													<div>
														<p className="text-sm text-gray-900 dark:text-white">{session.owner.username}</p>
														<p className="text-xs text-gray-500 dark:text-gray-400">{statues.get(session.id)}</p>
													</div>
												</div>
											</div>
											<button
												onClick={() => endSession(session.id)}
												className="p-2 text-gray-400 hover:text-red-500 dark:hover:text-red-400 transition-colors"
											>
												<IconTrash className="w-5 h-5" />
											</button>
										</div>
									</div>
								</div>
							))}
						</div>
					) : (
						<div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm overflow-hidden">
							<div className="p-8 text-center">
								<div className="mx-auto w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-4">
									<IconCalendarEvent className="w-6 h-6 text-primary" />
								</div>
								<h3 className="text-sm font-medium text-gray-900 dark:text-white mb-1">No Active Sessions</h3>
								<p className="text-sm text-gray-500 dark:text-gray-400">There are no sessions currently in progress</p>
							</div>
						</div>
					)}
				</div>

				<div className="mb-8">
					<div className="flex items-center gap-3 mb-4">
						<div className="bg-primary/10 p-2 rounded-lg">
							<IconClipboardList className="w-5 h-5 text-primary" />
						</div>
						<div>
							<h2 className="text-lg font-medium text-gray-900 dark:text-white">Management</h2>
							<p className="text-sm text-gray-500 dark:text-gray-400">Schedule and manage your sessions</p>
						</div>
					</div>

					<div className="grid gap-4 grid-cols-1 md:grid-cols-2">
						<button 
							onClick={() => router.push(`/workspace/${router.query.id}/sessions/schedule`)}
							className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-left group"
						>
							<div className="flex items-center gap-3">
								<div className="bg-primary/10 p-2 rounded-lg">
									<IconCalendarEvent className="w-5 h-5 text-primary" />
								</div>
								<div>
									<h3 className="text-base font-medium text-gray-900 dark:text-white group-hover:text-primary transition-colors">View Schedule</h3>
									<p className="text-sm text-gray-500 dark:text-gray-400">View this workspace's session schedule</p>
								</div>
							</div>
						</button>

						<button 
							onClick={() => router.push(`/workspace/${router.query.id}/sessions/schedules`)}
							className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-left group"
						>
							<div className="flex items-center gap-3">
								<div className="bg-primary/10 p-2 rounded-lg">
									<IconUsers className="w-5 h-5 text-primary" />
								</div>
								<div>
									<h3 className="text-base font-medium text-gray-900 dark:text-white group-hover:text-primary transition-colors">View & Edit Schedules</h3>
									<p className="text-sm text-gray-500 dark:text-gray-400">Edit the session schedules</p>
								</div>
							</div>
						</button>
					</div>
				</div>
			</div>
		</div>

	);
};

Home.layout = Workspace;

export default Home;
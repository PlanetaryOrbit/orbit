import Activity from "@/components/profile/activity";
import Book from "@/components/profile/book";
import Notices from "@/components/profile/notices";
import { InformationPanel } from "@/components/profile/info";
import workspace from "@/layouts/workspace";
import { pageWithLayout } from "@/layoutTypes";
import { withPermissionCheckSsr } from "@/utils/permissionsManager";
import { withSessionSsr } from "@/lib/withSession";
import { loginState } from "@/state";
import { Tab } from "@headlessui/react";
import { getDisplayName, getUsername, getThumbnail } from "@/utils/userinfoEngine";
import { ActivitySession, Quota } from "@prisma/client";
import prisma from "@/utils/database";
import moment from "moment";
import { InferGetServerSidePropsType } from "next";
import { useRecoilState } from "recoil";
import { IconUserCircle, IconHistory, IconBell, IconBook, IconClipboard } from "@tabler/icons";
import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import axios from "axios";

export const getServerSideProps = withPermissionCheckSsr(
	async ({ query, req }) => {
		const userTakingAction = await prisma.user.findFirst({
			where: {
				userid: BigInt(query.uid as string)
			},
			include: {
				roles: {
					where: {
						workspaceGroupId: parseInt(query.id as string)
					},
					include: {
						quotaRoles: {
							include: {
								quota: true
							}
						}
					}
				}
			}
		});

		if (!userTakingAction) return { notFound: true };

		if (
			!parseInt(query?.id as string) &&
			!userTakingAction?.roles[0]?.isOwnerRole &&
			!userTakingAction?.roles[0]?.permissions?.includes('manage_activity')
		) return { notFound: true };

		const isAdmin =
		userTakingAction?.roles?.some(role =>
			role.permissions?.includes("manage_activity")
		) ?? false;

		const quotas = userTakingAction.roles
  			.flatMap((role) => role.quotaRoles)
  			.map((qr) => qr.quota);

		const notices = await prisma.inactivityNotice.findMany({
			where: {
				userId: BigInt(query?.uid as string),
				workspaceGroupId: parseInt(query?.id as string),
			},
			orderBy: [{ startTime: "desc" }]
		});

		const sessions = await prisma.activitySession.findMany({
			where: {
				userId: BigInt(query?.uid as string),
				active: false
			},
			include: {
				user: {
					select: {
						picture: true
					}
				}
			},
			orderBy: {
				endTime: "desc"
			}
		});

		let timeSpent = 0;
		if (sessions.length) {
			timeSpent = sessions.reduce((sum, session) => {
				return sum + ((session.endTime?.getTime() ?? 0) - session.startTime.getTime());
			}, 0);
			timeSpent = Math.round(timeSpent / 60000);
		}

		const startOfWeek = moment().startOf("week").toDate();
		const endOfWeek = moment().endOf("week").toDate();

		const weeklySessions = await prisma.activitySession.findMany({
			where: {
				active: false,
				userId: BigInt(query?.uid as string),
				startTime: {
					lte: endOfWeek,
					gte: startOfWeek
				}
			},
			orderBy: {
				startTime: "asc"
			}
		});

		const days: { day: number; ms: number[] }[] = Array.from({ length: 7 }, (_, i) => ({
			day: i,
			ms: []
		}));

		weeklySessions.forEach((session) => {
			const day = session.startTime.getDay();
			const duration = Math.round(((session.endTime?.getTime() ?? 0) - session.startTime.getTime()) / 60000);
			days.find(d => d.day === day)?.ms.push(duration);
		});

		const data: number[] = days.map(d => d.ms.reduce((sum, val) => sum + val, 0));

		const ubook = await prisma.userBook.findMany({
			where: {
				userId: BigInt(query?.uid as string)
			},
			include: {
				admin: {
					select: {
						userid: true,
						username: true,
					}
				}
			},
			orderBy: {
				createdAt: "desc"
			}
		});

		const sessionsAttended = await prisma.sessionUser.findMany({
			where: {
				userid: BigInt(query?.uid as string),
				session: {
					ended: {
						not: null
					}
				}
			}
		});

		const sessisonsHosted = await prisma.session.findMany({
			where: {
				ownerId: BigInt(query?.uid as string),
				ended: {
					not: null
				}
			}
		});

		const user = await prisma.user.findUnique({
			where: { userid: BigInt(query.uid as string) },
			select: {
				userid: true,
				username: true,
				registered: true,
				birthdayDay: true,
				birthdayMonth: true,
			},
		});

		if (!user) {
			return { notFound: true };
		}

		return {
			props: {
				notices: JSON.parse(JSON.stringify(notices, (_k, v) => (typeof v === 'bigint' ? v.toString() : v))),
				timeSpent,
				timesPlayed: sessions.length,
				data,
				sessions: JSON.parse(JSON.stringify(sessions, (_k, v) => (typeof v === 'bigint' ? v.toString() : v))),
				info: {
					username: await getUsername(Number(query?.uid as string)),
					displayName: await getDisplayName(Number(query?.uid as string)),
					avatar: await getThumbnail(Number(query?.uid as string))
				},
				isUser: req.session.userid === Number(query?.uid as string),
				isAdmin,
				sessisonsHosted: sessisonsHosted.length,
				sessionsAttended: sessionsAttended.length,
				quotas,
				userBook: JSON.parse(JSON.stringify(ubook, (_k, v) => (typeof v === 'bigint' ? v.toString() : v))),
				user: {
					...JSON.parse(JSON.stringify(user, (_k, v) => (typeof v === 'bigint' ? v.toString() : v))),
					userid: user.userid.toString(),
				},
			}
		};
	}
)

type pageProps = {
	notices: any;
	timeSpent: number;
	timesPlayed: number;
	data: number[];
	sessions: (ActivitySession & {
		user: {
			picture: string | null;
		};
	})[];
	info: {
		username: string;
		displayName: string;
		avatar: string;
	}
	userBook: any;
	quotas: Quota[];
	sessionsHosted: number;
	sessionsAttended: number;
	isUser: boolean;
	isAdmin: boolean;
	user: {
		userid: string;
		username: string;
		displayname: string;
		registered: boolean;
		birthdayDay: number;
		birthdayMonth: number;
	}
}
const Profile: pageWithLayout<pageProps> = ({ notices, timeSpent, timesPlayed, data, sessions, userBook: initialUserBook, isUser, info, sessionsHosted, sessionsAttended, quotas, user, isAdmin }) => {
	const [login, setLogin] = useRecoilState(loginState);
	const [userBook, setUserBook] = useState(initialUserBook);
	const router = useRouter();


	const refetchUserBook = async () => {
		try {
			const response = await fetch(`/api/workspace/${router.query.id}/userbook/${router.query.uid}`);
			const data = await response.json();
			setUserBook(data.userBook);
		} catch (error) {
			console.error("Error refetching userbook:", error);
		}
	};

	const BG_COLORS = [
		"bg-red-200",
		"bg-green-200",
		"bg-blue-200",
		"bg-yellow-200",
		"bg-pink-200",
		"bg-indigo-200",
		"bg-teal-200",
		"bg-orange-200",
	];

	function getRandomBg(userid: string | number) {
		const str = String(userid);
		let hash = 0;
		for (let i = 0; i < str.length; i++) {
			hash = str.charCodeAt(i) + ((hash << 5) - hash);
		}
		return BG_COLORS[Math.abs(hash) % BG_COLORS.length];
	}

	return <div className="pagePadding">
		<div className="max-w-7xl mx-auto">
			<div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm mb-6">
				<div className="flex items-center gap-4">
					<div className="relative">
						<div className={`rounded-xl h-20 w-20 flex items-center justify-center ${getRandomBg(user.userid)}`}>
							<img 
								src={info.avatar} 
								className="rounded-xl h-20 w-20 object-cover border-2 border-white"
								alt={`${info.displayName}'s avatar`} 
								style={{ background: "transparent" }}
							/>
						</div>
						<div className="absolute -bottom-1 -right-1 w-6 h-6 bg-primary rounded-lg flex items-center justify-center">
							<IconUserCircle className="w-4 h-4 text-white" />
						</div>
					</div>
					<div>
						<h1 className="text-2xl font-medium text-gray-900 dark:text-white">{info.displayName}</h1>
						<p className="text-sm text-gray-500 dark:text-gray-400">@{info.username}</p>
					</div>
				</div>
			</div>

			<div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm overflow-hidden">
				<Tab.Group>
					<Tab.List className="flex p-1 gap-1 bg-gray-50 dark:bg-gray-700 border-b dark:border-gray-600">
						<Tab className={({ selected }) =>
							`flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-lg transition-colors ${
								selected 
									? "bg-white dark:bg-gray-800 text-primary shadow-sm" 
									: "text-gray-600 dark:text-gray-300 hover:bg-white/50 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-white"
							}`
						}>
							<IconClipboard className="w-4 h-4" />
							Information
						</Tab>
						<Tab className={({ selected }) =>
							`flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-lg transition-colors ${
								selected 
									? "bg-white dark:bg-gray-800 text-primary shadow-sm" 
									: "text-gray-600 dark:text-gray-300 hover:bg-white/50 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-white"
							}`
						}>
							<IconHistory className="w-4 h-4" />
							Activity
						</Tab>
						<Tab className={({ selected }) =>
							`flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-lg transition-colors ${
								selected 
									? "bg-white dark:bg-gray-800 text-primary shadow-sm" 
									: "text-gray-600 dark:text-gray-300 hover:bg-white/50 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-white"
							}`
						}>
							<IconBook className="w-4 h-4" />
							Userbook
						</Tab>
						<Tab className={({ selected }) =>
							`flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-lg transition-colors ${
								selected 
									? "bg-white dark:bg-gray-800 text-primary shadow-sm" 
									: "text-gray-600 dark:text-gray-300 hover:bg-white/50 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-white"
							}`
						}>
							<IconBell className="w-4 h-4" />
							Notices
						</Tab>
					</Tab.List>
					<Tab.Panels className="p-6 bg-white dark:bg-gray-800 rounded-b-xl">
						<Tab.Panel>
							<InformationPanel
							user={{
								userid: String(user.userid),
								username: user.username,
								displayname: info.displayName,
								registered: user.registered,
								birthdayDay: user.birthdayDay,
								birthdayMonth: user.birthdayMonth,
							}}
							isUser={isUser}
							isAdmin={isAdmin}
							/>
						</Tab.Panel>
						<Tab.Panel>
							<Activity
								timeSpent={timeSpent}
								timesPlayed={timesPlayed}
								data={data}
								quotas={quotas}
								sessionsHosted={sessionsHosted}
								sessionsAttended={sessionsAttended}
								avatar={info.avatar}
								sessions={sessions}
								notices={notices}
							/>
						</Tab.Panel>
						<Tab.Panel>
							<Book userBook={userBook} onRefetch={refetchUserBook} />
						</Tab.Panel>
						<Tab.Panel>
							<Notices notices={notices} />
						</Tab.Panel>
					</Tab.Panels>
				</Tab.Group>
			</div>
		</div>
	</div>;
}

Profile.layout = workspace

export default Profile
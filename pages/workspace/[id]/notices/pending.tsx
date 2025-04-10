import workspace from "@/layouts/workspace";
import { pageWithLayout } from "@/layoutTypes";
import { loginState } from "@/state";
import axios from "axios";
import { useRouter } from "next/router";
import { useState, Fragment, useMemo } from "react";
import randomText from "@/utils/randomText";
import { useRecoilState } from "recoil";
import toast, { Toaster } from 'react-hot-toast';
import Button from "@/components/button";
import { InferGetServerSidePropsType } from "next";
import { withSessionSsr } from "@/lib/withSession";
import moment from "moment";
import { Dialog, Transition } from "@headlessui/react";
import { withPermissionCheckSsr } from "@/utils/permissionsManager";
import { FormProvider, SubmitHandler, useForm } from "react-hook-form";
import Input from "@/components/input";
import prisma, { inactivityNotice, user } from "@/utils/database";
import { IconCalendarTime, IconCheck, IconX, IconAlertTriangle, IconArrowLeft } from "@tabler/icons";

type Form = {
	startTime: string;
	endTime: string;
	reason: string;
}

export const getServerSideProps = withPermissionCheckSsr(
	async ({ req, res, params }) => {
		const notices = await prisma.inactivityNotice.findMany({
			where: {
				workspaceGroupId: parseInt(params?.id as string),
				reviewed: false
			},
			orderBy: [
				{
					startTime: "desc"
				}
			],
			include: {
				user: true
			}
		});

		return {
			props: {
				notices: (JSON.parse(JSON.stringify(notices, (key, value) => (typeof value === 'bigint' ? value.toString() : value))) as typeof notices)
			}
		}
	}, 'manage_activity'
)

type pageProps = InferGetServerSidePropsType<typeof getServerSideProps>
const Notices: pageWithLayout<pageProps> = (props) => {
	const router = useRouter();
	const { id } = router.query;
	const [notices, setNotices] = useState<(inactivityNotice & {
		user: user;
	})[]>(props.notices as (inactivityNotice & {
		user: user;
	})[]);
	const [login, setLogin] = useRecoilState(loginState);
	const text = useMemo(() => randomText(login.displayname), []);

	const [isOpen, setIsOpen] = useState(false);

	const updateNotice = async (notice: inactivityNotice & { user: user }, status: string) => {
		try {
			const { data } = await toast.promise(
				axios.post(`/api/workspace/${id}/activity/notices/update`, {
					id: notice.id,
					status
				}),
				{
					loading: "Updating notice...",
					success: "Notice updated!",
					error: "Failed to update notice"
				}
			);
	
			if (data.success) {
				// Remove the notice from the list
				setNotices(prev => prev.filter(n => n.id !== notice.id));
			}
		} catch (error) {
			console.error("Update error:", error);
		}
	}

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

				<div className="flex items-center justify-between mb-6">
					<div className="flex items-center gap-3">
						<div className="bg-primary/10 p-2 rounded-lg">
							<IconCalendarTime className="w-5 h-5 text-primary" />
						</div>
						<div>
							<h2 className="text-lg font-medium text-gray-900 dark:text-white">Pending Notices</h2>
							<p className="text-sm text-gray-500 dark:text-gray-400">Review and manage inactivity notices</p>
						</div>
					</div>
					<div className="text-sm text-gray-500">
						{notices.length} pending {notices.length === 1 ? 'notice' : 'notices'}
					</div>
				</div>

				{notices.length < 1 ? (
					<div className="bg-white rounded-xl shadow-sm p-8 text-center">
						<img 
							className="mx-auto h-48 mb-4 opacity-75" 
							alt="No pending notices" 
							src='/conifer-charging-the-battery-with-a-windmill.png' 
						/>
						<h3 className="text-lg font-medium text-gray-900 mb-1">No Pending Notices</h3>
						<p className="text-sm text-gray-500">All inactivity notices have been reviewed</p>
					</div>
				) : (
					<div className="grid gap-4 grid-cols-1 md:grid-cols-2 xl:grid-cols-3">
						{notices.map((notice: any) => (
							<div 
								key={notice.id}
								className="bg-white rounded-xl p-5 shadow-sm hover:shadow-md transition-all"
							>
								<div className="flex items-center gap-3 mb-3">
									<img 
										src={notice.user?.picture} 
										alt={notice.user?.username}
										className="w-10 h-10 rounded-full ring-2 ring-primary/10" 
									/>
									<div>
										<h3 className="text-sm font-medium text-gray-900">{notice.user?.username}</h3>
										<p className="text-xs text-gray-500">Requested inactivity period</p>
									</div>
								</div>

								<div className="bg-gray-50 rounded-lg p-3 mb-3">
									<div className="flex items-center gap-2 text-sm text-gray-600 mb-1">
										<IconCalendarTime className="w-4 h-4" />
										<span>
											{moment(new Date(notice.startTime)).format("MMM Do")} - {moment(new Date(notice.endTime)).format("MMM Do YYYY")}
										</span>
									</div>
									<p className="text-sm text-gray-600">{notice.reason}</p>
								</div>

								<div className="flex gap-2">
									<button
										onClick={() => updateNotice(notice, 'approve')}
										className="flex items-center justify-center gap-1 flex-1 px-3 py-2 bg-primary/10 hover:bg-primary/20 text-primary rounded-lg text-sm font-medium transition-colors"
									>
										<IconCheck className="w-4 h-4" />
										Approve
									</button>
									<button
										onClick={() => updateNotice(notice, 'deny')}
										className="flex items-center justify-center gap-1 flex-1 px-3 py-2 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg text-sm font-medium transition-colors"
									>
										<IconX className="w-4 h-4" />
										Deny
									</button>
								</div>
							</div>
						))}
					</div>
				)}
			</div>
		</div>
	</>;
}

Notices.layout = workspace

export default Notices

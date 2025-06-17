import axios from "axios";
import React, { useState } from "react";
import type toast from "react-hot-toast";
import { useRecoilState } from "recoil";
import { workspacestate } from "@/state";
import Button from "@/components/button";
import type { Session, user } from "@/utils/database";
import { useRouter } from "next/router";
import { IconChevronRight, IconSpeakerphone } from '@tabler/icons'
import { getThumbnail } from "@/utils/userinfoEngine";

const Sessions: React.FC = () => {
	const [activeSessions, setActiveSessions] = useState<(Session & {
		owner: user
	})[]>([]);
	const router = useRouter();
	React.useEffect(() => {
		axios.get(`/api/workspace/${router.query.id}/home/activeSessions`).then(res => {
			if (res.status === 200) {
				setActiveSessions(res.data.sessions)
				console.log(res.data.sessions)

			}
		})
	}, []);

	const goToSessions = () => {
		router.push(`/workspace/${router.query.id}/sessions`)
	}

	return (
		<div className="flex flex-col gap-4">
			{activeSessions.length === 0 ? (
				<div className="flex flex-col items-center justify-center py-8 text-center">
					<div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
						<IconSpeakerphone className="w-8 h-8 text-primary" />
					</div>
					<p className="text-lg font-medium text-gray-900 dark:text-white mb-1">No active sessions</p>
					<p className="text-sm text-gray-500 dark:text-gray-400 mb-4">There are no ongoing sessions right now</p>
					<button
						onClick={goToSessions}
						className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
					>
						View Sessions
						<IconChevronRight className="w-4 h-4" />
					</button>
				</div>
			) : (
				<div className="flex flex-col gap-4">
					{activeSessions.map(session => (
						console.log(session),
						<div 
							key={session.id} 
							className="bg-gradient-to-br from-primary/90 to-primary rounded-lg shadow-sm hover:shadow-md transition-shadow overflow-hidden"
						>
							<div className="p-4">
								<div className="flex items-start gap-3">
									<img 
										src={session.owner.picture ?? ''} 
										alt={`${session.owner.username}'s avatar`}
										className="rounded-lg h-10 w-10 bg-white/10 object-cover" 
									/>
									<div className="flex-1 min-w-0">
										<p className="text-lg font-medium text-white">
											Session
										</p>
										<div className="mt-1 flex items-center gap-2">
											<p className="text-sm text-white/90">
												Hosted by {session.owner.username}
											</p>
										</div>
									</div>
								</div>
							</div>
						</div>
					))}
					<button
						onClick={goToSessions}
						className="inline-flex items-center justify-center gap-2 text-sm text-primary hover:text-primary/80 transition-colors"
					>
						View all sessions
						<IconChevronRight className="w-4 h-4" />
					</button>
				</div>
			)}
		</div>
	)
};

export default Sessions;

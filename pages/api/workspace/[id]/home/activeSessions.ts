// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from 'next'
import { fetchworkspace, getConfig, setConfig } from '@/utils/configEngine'
import prisma, { SessionType, Session } from '@/utils/database';
import { withSessionRoute } from '@/lib/withSession'
import { withPermissionCheck } from '@/utils/permissionsManager'

import { getUsername, getThumbnail, getDisplayName } from '@/utils/userinfoEngine'
import * as noblox from 'noblox.js'
type Data = {
	success: boolean
	error?: string
	sessions?: (Session & { isLive?: boolean })[]
	nextSession?: Session & { isLive?: boolean }
}

export default withPermissionCheck(handler);

export async function handler(
	req: NextApiRequest,
	res: NextApiResponse<Data>
) {
	if (req.method !== 'GET') return res.status(405).json({ success: false, error: 'Method not allowed' });
	
	const now = new Date();
	const todayStart = new Date(now);
	todayStart.setHours(0, 0, 0, 0);
	const todayEnd = new Date(now);
	todayEnd.setHours(23, 59, 59, 999);
	
	const allSessions = await prisma.session.findMany({
		where: {
			sessionType: {
				workspaceGroupId: parseInt(req.query.id as string)
			},
			date: {
				gte: todayStart,
				lte: todayEnd
			}
		},
		include: {
			owner: {
				select: {
					username: true,
					picture: true,
					userid: true,
				}
			},
			sessionType: {
				select: {
					name: true
				}
			}
		},
		orderBy: {
			date: 'asc'
		}
	});
	
	const activeSessions = allSessions.filter(session => {
		const startTime = new Date(session.date);
		const endTime = new Date(startTime.getTime() + session.duration * 60000); // duration in minutes to milliseconds
		return now >= startTime && now <= endTime;
	}).map(session => ({ ...session, isLive: true }));
	
	let nextSession = null;
	if (activeSessions.length === 0) {
		nextSession = allSessions.find(session => {
			const startTime = new Date(session.date);
			const endTime = new Date(startTime.getTime() + session.duration * 60000);
			return startTime > now || (now >= startTime && now <= endTime);
		});
		if (nextSession) {
			nextSession = { ...nextSession, isLive: false };
		}
	}
	
	res.status(200).json({ 
		success: true, 
		sessions: JSON.parse(JSON.stringify(activeSessions, (key, value) => (typeof value === 'bigint' ? value.toString() : value))),
		nextSession: nextSession ? JSON.parse(JSON.stringify(nextSession, (key, value) => (typeof value === 'bigint' ? value.toString() : value))) : undefined
	})
}

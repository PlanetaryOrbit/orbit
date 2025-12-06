// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from 'next'
import prisma from '@/utils/database';
import { withSessionRoute } from '@/lib/withSession'
import { getUsername, getThumbnail, getDisplayName } from '@/utils/userinfoEngine'
import * as noblox from 'noblox.js'

type User = {
	userId: number
	username: string
	canMakeWorkspace: boolean
	displayname: string
	thumbnail: string
	registered: boolean
	birthdayDay?: number | null
	birthdayMonth?: number | null
}

type Data = {
	success: boolean
	error?: string
	user?: User
	workspaces?: { 
		groupId: number
		groupThumbnail: string
		groupName: string
	}[]
}

// Simple in-memory cache to prevent excessive database queries
const userCache = new Map<string, { data: any; timestamp: number }>();
const CACHE_DURATION = 30000; // 30 seconds

setInterval(() => {
	const now = Date.now();
	for (const [key, value] of userCache.entries()) {
		if (now - value.timestamp > CACHE_DURATION) {
			userCache.delete(key);
		}
	}
}, 60000); // Clean every minute

export default withSessionRoute(handler);

export async function handler(
	req: NextApiRequest,
	res: NextApiResponse<Data>
) {
	if (req.method !== 'GET') return res.status(405).json({ success: false, error: 'Method not allowed' })
	if (!await prisma.workspace.count()) return res.status(400).json({ success: false, error: 'Workspace not setup' })
	if (!req.session.userid) return res.status(401).json({ success: false, error: 'Not logged in' });
	
	const userId = req.session.userid;
	const cacheKey = `user_${userId}`;
	const now = Date.now();
	const cached = userCache.get(cacheKey);
	if (cached && (now - cached.timestamp) < CACHE_DURATION) {
		return res.status(200).json(cached.data);
	}

	const [dbuser, username, displayname] = await Promise.all([
		prisma.user.findUnique({
			where: { userid: userId },
			include: { roles: true }
		}),
		getUsername(userId),
		getDisplayName(userId)
	]);

	const user: User = {
		userId: userId,
		username,
		displayname,
		canMakeWorkspace: dbuser?.isOwner || false,
		thumbnail: getThumbnail(userId),
		registered: dbuser?.registered || false,
		birthdayDay: dbuser?.birthdayDay ?? null,
		birthdayMonth: dbuser?.birthdayMonth ?? null,
	}
	
	let roles: any[] = [];
	if (dbuser?.roles?.length) {
		roles = await Promise.all(
			dbuser.roles.map(async (role) => {
				const workspace = await prisma.workspace.findUnique({
					where: { groupId: role.workspaceGroupId },
					select: { groupName: true, groupLogo: true, lastSynced: true }
				});
				
				return {
					groupId: role.workspaceGroupId,
					groupThumbnail: workspace?.groupLogo,
					groupName: workspace?.groupName,
				};
			})
		);
	}
	
	const response = { success: true, user, workspaces: roles };
	userCache.set(cacheKey, { data: response, timestamp: now });
	
	res.status(200).json(response);
	setImmediate(async () => {
		try {
			await prisma.user.update({
				where: {
					userid: userId
				},
				data: {
					picture: getThumbnail(userId),
					username: await getUsername(userId),
					registered: true
				}
			});
			userCache.delete(cacheKey);
		} catch (error) {
			console.error('Error updating user info:', error);
		}
	});
}

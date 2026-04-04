// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from 'next'
import prisma from '@/utils/database';
import { withPermissionCheck } from '@/utils/permissionsManager'
import { withSessionRoute } from '@/lib/withSession'
import { getUsername, getThumbnail, getDisplayName } from '@/utils/userinfoEngine'
import { getUniverseInfo } from 'noblox.js';
import axios from 'axios';

type Data = {
	success: boolean;
	message?: object;
	universe?: object;
	error?: string;
}

async function handler(
	req: NextApiRequest,
	res: NextApiResponse<Data>
) {
	if (req.method !== 'GET') return res.status(405).json({ success: false, error: 'Method not allowed' });
	
	if (!req.query.sid) return res.status(400).json({ success: false, error: "ID missing" });

	const { authorization } = req.headers;
	let isAuthenticated = false;

	if (req.session?.userid) {
		isAuthenticated = true;
	} 
	else if (authorization) {
		const config = await prisma.config.findFirst({
			where: {
				value: {
					path: ["key"],
					equals: authorization,
				},
			},
		});
		
		if (config) {
			isAuthenticated = true;
		}
	}

	if (!isAuthenticated) {
		return res.status(401).json({ success: false, error: 'Not authenticated' });
	}

	const session = await prisma.activitySession.findUnique({
		where: {
			id: (req.query.sid as string)
		}
	});
	
	if (!session) return res.status(404).json({ success: false, error: "Session not found" });

	if(!session.universeId){
		return res.status(200).json({
			success: true,
			message: (JSON.parse(JSON.stringify(session, (key, value) => (typeof value === 'bigint' ? value.toString() : value))) as typeof session),
		});
	}

	const universeInfo: any[] = await getUniverseInfo(Number(session.universeId)) as any;

	const { data, status } = await axios.get(`https://thumbnails.roblox.com/v1/games/multiget/thumbnails?universeIds=${session.universeId}&size=768x432&format=Png&isCircular=false`);
	if(status !== 200) return res.status(500).json({ success: false, error: "Unexpected error" });

	return res.status(200).json({
		success: true,
		message: (JSON.parse(JSON.stringify(session, (key, value) => (typeof value === 'bigint' ? value.toString() : value))) as typeof session),
		universe: {
			name: universeInfo[0].name,
			thumbnail: data.data[0].thumbnails[0].imageUrl
		}
	});
}

// Export with session wrapper only (permission check happens inside)
export default withSessionRoute(handler);
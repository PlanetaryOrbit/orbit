import type { NextApiRequest, NextApiResponse } from 'next'
import prisma, { wallPost } from '@/utils/database';
import { withPermissionCheck } from '@/utils/permissionsManager'
type Data = {
	success: boolean
	error?: string
	posts?: wallPost[]
}

export default withPermissionCheck(handler, 'view_wall');

export async function handler(
	req: NextApiRequest,
	res: NextApiResponse<Data>
) {
	if (req.method !== 'GET') return res.status(405).json({ success: false, error: 'Method not allowed' });
	const sessions = await prisma.wallPost.findMany({
		where: {
			workspaceGroupId: parseInt(req.query.id as string)
		},
		include: {
			author: {
				select: {
					username: true,
					picture: true
				}
			}
		},
		orderBy: {
			createdAt: 'desc'
		}
	});
	
	res.status(200).json({ success: true, posts: JSON.parse(JSON.stringify(sessions, (key, value) => (typeof value === 'bigint' ? value.toString() : value))) })
}

import { NextApiRequest, NextApiResponse } from 'next';
import prisma from '@/utils/database';
import { withPermissionCheck } from '@/utils/permissionsManager';
export default withPermissionCheck(async (req: NextApiRequest, res: NextApiResponse) => {
	if (req.method !== 'GET') {
		return res.status(405).json({ error: 'Method not allowed' });
	}
	const { id } = req.query;
	try {
		const workspaceUsers = await prisma.user.findMany({
			where: {
				roles: {
					some: {
						workspaceGroupId: parseInt(id as string)
					}
				}
			},
			select: {
				userid: true,
				username: true,
				picture: true,
				registered: true
			}
		});
		const users = workspaceUsers.map(user => ({
			userid: user.userid.toString(),
			username: user.username,
			picture: user.picture,
			registered: user.registered ?? false
		}));
		res.status(200).json(users);
	} catch (error) {
		console.error('Error fetching workspace users:', error);
		res.status(500).json({ error: 'Failed to fetch users' });
	}
});
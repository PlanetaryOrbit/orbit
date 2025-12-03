// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from 'next'
import prisma from '@/utils/database';
import { withPermissionCheck } from '@/utils/permissionsManager'
import { getThumbnail } from '@/utils/userinfoEngine';
import moment from 'moment';
type Data = {
	success: boolean
	error?: string,
	users?: any
}

export default withPermissionCheck(handler, 'view_members');

export async function handler(
	req: NextApiRequest,
	res: NextApiResponse<Data>
) {
	if (req.method !== 'GET') return res.status(405).json({ success: false, error: 'Method not allowed' })
	if (!req.session.userid) return res.status(401).json({ success: false, error: 'Not logged in' });

	try {
		const users = await prisma.user.findMany({
			where: {
				username: {
					contains: String(req.query.username),
					mode: 'insensitive'
				}
			}
		});

		const infoUsers = await Promise.all(users.map(async (user: any) => {
			return {
				username: user.username,
				thumbnail: getThumbnail(user.userid)
			}
		}))

		return res.status(200).json({ success: true, users: infoUsers });
	} catch (error) {
		console.error(error);
		return res.status(500).json({ success: false, error: "Something went wrong" });
	}
}

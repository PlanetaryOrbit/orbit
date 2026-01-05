// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from 'next'
import prisma from '@/utils/database';
import { withSessionRoute } from '@/lib/withSession'

type Data = {
	success: boolean
	error?: string
	ally?: any
}

const withAllyPermissionCheck = (handler: any) => {
	return withSessionRoute(async (req: NextApiRequest, res: NextApiResponse) => {
		const uid = req.session.userid;
		if (!uid) return res.status(401).json({ success: false, error: 'Unauthorized' });
		if (!req.query.id) return res.status(400).json({ success: false, error: 'Missing required fields' });
		if (!req.query.aid) return res.status(400).json({ success: false, error: 'Missing ally ID' });
		
		const workspaceId = parseInt(req.query.id as string);
		const allyId = req.query.aid as string;

		const user = await prisma.user.findFirst({
			where: {
				userid: BigInt(uid)
			},
			include: {
				roles: {
					where: {
						workspaceGroupId: workspaceId
					}
				},
				workspaceMemberships: {
					where: {
						workspaceGroupId: workspaceId
					}
				}
			}
		});
		
		if (!user) return res.status(401).json({ success: false, error: 'Unauthorized' });
		const membership = user.workspaceMemberships[0];
		const isAdmin = membership?.isAdmin || false;
		const userrole = user.roles[0];
		if (!userrole) return res.status(401).json({ success: false, error: 'Unauthorized' });
		
		// Check if user has management permissions
		if (isAdmin) return handler(req, res);
		if (userrole.permissions?.includes('add_alliance_visits')) return handler(req, res);
		
		// Check if user is a representative of this specific ally
		const ally = await prisma.ally.findFirst({
			where: {
				id: allyId,
				workspaceGroupId: workspaceId,
				reps: {
					some: {
						userid: BigInt(uid)
					}
				}
			}
		});
		
		if (ally) return handler(req, res);
		
		return res.status(401).json({ success: false, error: 'Unauthorized' });
	});
};

export default withAllyPermissionCheck(handler);

export async function handler(
	req: NextApiRequest,
	res: NextApiResponse<Data>
) {
	if (req.method !== 'POST') return res.status(405).json({ success: false, error: 'Method not allowed' })
	if (!req.session.userid) return res.status(401).json({ success: false, error: 'Not logged in' });
	if (!req.query.aid) return res.status(400).json({ success: false, error: 'Missing ally id' });
	if (typeof req.query.aid !== 'string') return res.status(400).json({ success: false, error: 'Invalid ally id' })
	const { name, time, participants } = req.body
	if(!name || !time) return res.status(400).json({ success: false, error: 'Missing content' })


	try {
		const visit = await prisma.allyVisit.create({
			data: {
				hostId: req.session.userid,
				allyId: req.query.aid,
				name: name,
				time: new Date(time),
				participants: participants ? participants.map((p: number) => BigInt(p)) : []
			}
		})
		

		return res.status(200).json({ success: true });
	} catch (error) {
		console.error(error);
		return res.status(500).json({ success: false, error: "Something went wrong" });
	}
}

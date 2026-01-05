// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from 'next'
import { fetchworkspace, getConfig, setConfig } from '@/utils/configEngine'
import prisma, { allyVisit } from '@/utils/database';
import { withSessionRoute } from '@/lib/withSession'
import { withPermissionCheck } from '@/utils/permissionsManager'
import { getUsername, getThumbnail, getDisplayName } from '@/utils/userinfoEngine'
import * as noblox from 'noblox.js'
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
		if (req.method === 'DELETE' && userrole.permissions?.includes('delete_alliance_visits')) return handler(req, res);
		if (req.method === 'PATCH' && userrole.permissions?.includes('edit_alliance_visits')) return handler(req, res);
		
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
	if (!req.session.userid) return res.status(401).json({ success: false, error: 'Not logged in' });
	if (!req.query.vid) return res.status(400).json({ success: false, error: 'Missing ally id' });
	if (typeof req.query.aid !== 'string') return res.status(400).json({ success: false, error: 'Invalid ally id' })
	if(req.method == "DELETE") {
		try {
			// @ts-ignore
			const visit = await prisma.allyVisit.delete({
				where: {
					// @ts-ignore
					id: req.query.vid
				}
			})
			
	
			return res.status(200).json({ success: true });
		} catch (error) {
			console.error(error);
			return res.status(500).json({ success: false, error: "Something went wrong" });
		}
	} else if (req.method == "PATCH") {
		try {
			if(!req.body.name || !req.body.time) return res.status(400).json({ success: false, error: 'Missing data' })

			const updateData: any = {
				name: req.body.name,
				time: new Date(req.body.time)
			};

			if (req.body.participants !== undefined) {
				updateData.participants = req.body.participants.map((p: number) => BigInt(p));
			}

			// @ts-ignore
			const visit = await prisma.allyVisit.update({
				where: {
					// @ts-ignore
					id: req.query.vid
				},
				data: updateData
			})
			
	
			return res.status(200).json({ success: true });
		} catch (error) {
			console.error(error);
			return res.status(500).json({ success: false, error: "Something went wrong" });
		}
	} else {
		return res.status(405).json({ success: false, error: 'Method not allowed' })
	}
}

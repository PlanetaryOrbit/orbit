// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from 'next'
import { fetchworkspace, getConfig, setConfig } from '@/utils/configEngine'
import prisma, { inactivityNotice } from '@/utils/database';
import { withSessionRoute } from '@/lib/withSession'
import { withPermissionCheck } from '@/utils/permissionsManager'
import { getUsername, getThumbnail, getDisplayName } from '@/utils/userinfoEngine'
import * as noblox from 'noblox.js'
type Data = {
	success: boolean
	error?: string
	ally?: any
}

export default withPermissionCheck(handler, 'assign_alliance_representatives');

export async function handler(
	req: NextApiRequest,
	res: NextApiResponse<Data>
) {
	if (req.method !== 'PATCH') return res.status(405).json({ success: false, error: 'Method not allowed' })
	if (!req.session.userid) return res.status(401).json({ success: false, error: 'Not logged in' });
	if (!req.query.aid) return res.status(400).json({ success: false, error: 'Missing ally id' });
	if (typeof req.query.aid !== 'string') return res.status(400).json({ success: false, error: 'Invalid ally id' })
	const { reps } = req.body
	if (reps.length < 1) return res.status(400).json({ success: false, error: 'You need at least 1 rep' })
	const aid = req.query.aid
	if(!reps) return res.status(400).json({ success: false, error: 'Missing content' })


	try {


		await prisma.ally.update({
			where: {
				id: String(req.query.aid)
			}, 
			data: {
				reps: {
					set: reps.map(( user: Number ) => ({ userid: BigInt(user as number) }))
				}
			}
		})
		

		return res.status(200).json({ success: true });
	} catch (error) {
		console.error(error);
		return res.status(500).json({ success: false, error: "Something went wrong" });
	}
}

// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from 'next'
import prisma from '@/utils/database';
import { withPermissionCheck } from '@/utils/permissionsManager'
import moment from 'moment';
import * as noblox from 'noblox.js'
type Data = {
	success: boolean
	error?: string
}

export default withPermissionCheck(handler, 'create_alliances');

export async function handler(
	req: NextApiRequest,
	res: NextApiResponse<Data>
) {
	if (req.method !== 'POST') return res.status(405).json({ success: false, error: 'Method not allowed' })
	if (!req.session.userid) return res.status(401).json({ success: false, error: 'Not logged in' });
	if (!req.body.groupId || !req.body.reps) return res.status(400).json({ success: false, error: "Missing data" });

	try {
		const date = new Date();
		const groupId = req.body.groupId
		const notes = req.body.notes || "This note is empty"
		const reps = req.body.reps

		const groupInfo = await noblox.getGroup(groupId)
		if(!groupInfo) return res.status(400).json({ success: false, error: 'Invalid group ID' })
		const groupIcon = await noblox.getLogo(groupId)

		if(reps.length < 1) return res.status(400).json({ success: false, error: 'At least 1 rep required' })

		await prisma.ally.create({
			data: {
				notes: [notes],
				workspaceGroupId: parseInt(req.query.id as string),
				groupId: groupId,
				name: groupInfo.name,
				icon: groupIcon,
				reps: {
					connect: reps.map(( user: Number ) => ({ userid: BigInt(user as number) }))
				}
			}
		});

		return res.status(200).json({ success: true });
	} catch (error) {
		console.error(error);
		return res.status(500).json({ success: false, error: "Something went wrong" });
	}
}

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
	notice?: inactivityNotice
}

export default withPermissionCheck(handler, "create_notices");

export async function handler(
	req: NextApiRequest,
	res: NextApiResponse<Data>
) {
	if (req.method !== 'POST') return res.status(405).json({ success: false, error: 'Method not allowed' })
	if (!req.session.userid) return res.status(401).json({ success: false, error: 'Not logged in' });
	if (!req.body.startTime || !req.body.endTime || !req.body.reason) return res.status(400).json({ success: false, error: "Missing data" });
	if (typeof req.body.startTime !== "number" || typeof req.body.endTime !== "number") return res.status(400).json({ success: false, error: "Invalid type(s)" });

	try {
		const session = await prisma.inactivityNotice.create({
			data: {
				userId: BigInt(req.session.userid),
				startTime: new Date(req.body.startTime),
				endTime: new Date(req.body.endTime),
				reason: req.body.reason,
				workspaceGroupId: parseInt(req.query.id as string)
			}
		});

		return res.status(200).json({ success: true, notice: JSON.parse(JSON.stringify(session, (key, value) => (typeof value === 'bigint' ? value.toString() : value))) });
	} catch (error) {
		console.error("Notice creation error:", error);
		return res.status(500).json({ success: false, error: error instanceof Error ? error.message : "Something went wrong" });
	}
}

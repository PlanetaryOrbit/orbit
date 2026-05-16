// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from 'next'
import { fetchworkspace, getConfig, setConfig } from '@/utils/configEngine'
import prisma, { inactivityNotice } from '@/utils/database';
// import { withAuth } from '@/lib/withSession'
import { withPermissionCheck } from '@/utils/permissionsManager'
import { getUsername, getThumbnail, getDisplayName } from '@/utils/userinfoEngine'
import * as noblox from 'noblox.js'
import { AuthenticatedRequest } from '@/lib/withAuth';
type Data = {
	success: boolean
	error?: string
	quota?: any
}

export default withPermissionCheck(handler, 'delete_alliances');

export async function handler(
	req: AuthenticatedRequest,
	res: NextApiResponse<Data>
) {
	if (req.method !== 'DELETE') return res.status(405).json({ success: false, error: 'Method not allowed' })
	if (!req.auth.userId) return res.status(401).json({ success: false, error: 'Not logged in' });
	if (!req.query.aid) return res.status(400).json({ success: false, error: 'Missing ally id' });
	if (typeof req.query.aid !== 'string') return res.status(400).json({ success: false, error: 'Invalid ally id' })


	try {
		await prisma.ally.delete({
			where: {
				id: String(req.query.aid)
			}
		});
		

		return res.status(200).json({ success: true });
	} catch (error) {
		console.error(error);
		return res.status(500).json({ success: false, error: "Something went wrong" });
	}
}

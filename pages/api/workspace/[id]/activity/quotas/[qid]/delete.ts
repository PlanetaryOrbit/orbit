// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from 'next'
import { fetchworkspace, getConfig, setConfig } from '@/utils/configEngine'
import prisma, { inactivityNotice } from '@/utils/database';
import { withSessionRoute } from '@/lib/withSession'
import { withPermissionCheck } from '@/utils/permissionsManager'
import { getUsername, getThumbnail, getDisplayName } from '@/utils/userinfoEngine'
import * as noblox from 'noblox.js'
import { logAudit } from '@/utils/logs';
type Data = {
	success: boolean
	error?: string
	quota?: any
}

export default withPermissionCheck(handler, 'manage_activity');

export async function handler(
	req: NextApiRequest,
	res: NextApiResponse<Data>
) {
	if (req.method !== 'DELETE') return res.status(405).json({ success: false, error: 'Method not allowed' });
	if (!req.session.userid) return res.status(401).json({ success: false, error: 'Not logged in' });
	if (!req.query.qid || typeof req.query.qid !== 'string') return res.status(400).json({ success: false, error: 'Missing or invalid quota id' });

	try {
		const quota = await prisma.quota.findUnique({ where: { id: req.query.qid as string }, include: { quotaRoles: { include: { role: true } } } });
		await prisma.quotaRole.deleteMany({
			where: {
				quotaId: req.query.qid
			}
		});

		await prisma.quotaDepartment.deleteMany({
			where: {
				quotaId: req.query.qid
			}
		});

		await prisma.quota.delete({
			where: {
				id: req.query.qid
			}
		});

		try {
			await logAudit(parseInt(req.query.id as string), (req as any).session?.userid || null, 'activity.quota.delete', `quota:${quota?.name || req.query.qid}`, { id: req.query.qid, name: quota?.name, type: quota?.type, value: quota?.value });
		} catch (e) {}

		return res.status(200).json({ success: true });
	} catch (error) {
		console.error('Error deleting quota:', error);
		return res.status(500).json({ success: false, error: "Something went wrong" });
	}
}

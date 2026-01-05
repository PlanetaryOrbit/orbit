// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from 'next'
import { fetchworkspace, getConfig, setConfig } from '@/utils/configEngine'
import prisma from '@/utils/database';
import { withPermissionCheck } from '@/utils/permissionsManager'
import { logAudit } from '@/utils/logs'
import { getUsername, getThumbnail, getDisplayName } from '@/utils/userinfoEngine'
import * as noblox from 'noblox.js'
type Data = {
	success: boolean
	error?: string
}

export default withPermissionCheck(handler, 'delete_docs');

export async function handler(
	req: NextApiRequest,
	res: NextApiResponse<Data>
) {
	if (req.method !== 'POST') return res.status(405).json({ success: false, error: 'Method not allowed' });
	if (!req.query.docid) return res.status(400).json({ success: false, error: 'Document ID not provided' });
	const workspaceId = parseInt(req.query.id as string);
	const doc = await prisma.document.findUnique({ where: { id: req.query.docid as string } });
	if (!doc || doc.workspaceGroupId !== workspaceId) return res.status(404).json({ success: false, error: 'Document not found in this workspace' });
	await prisma.document.delete({ where: { id: req.query.docid as string } });

	try {
		const details: any = { id: req.query.docid as string, name: doc.name };
		if (doc.content && typeof doc.content === 'object' && (doc.content as any).external) details.url = (doc.content as any).url;
		await logAudit(workspaceId, Number(req.session.userid), 'document.delete', `document:${doc.name}`, details);
	} catch (e) {}

	res.status(200).json({ success: true })
}

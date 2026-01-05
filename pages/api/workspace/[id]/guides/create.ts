// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from 'next'
import { fetchworkspace, getConfig, setConfig } from '@/utils/configEngine'
import prisma, { SessionType, document } from '@/utils/database';
import { logAudit } from '@/utils/logs';
import { sanitizeJSON } from '@/utils/sanitise';
import { withSessionRoute } from '@/lib/withSession'
import { withPermissionCheck } from '@/utils/permissionsManager'

import { getUsername, getThumbnail, getDisplayName } from '@/utils/userinfoEngine'
import * as noblox from 'noblox.js'
type Data = {
	success: boolean
	error?: string
	session?: SessionType
	document?: document
}

export default withPermissionCheck(handler, 'create_docs');

export async function handler(
	req: NextApiRequest,
	res: NextApiResponse<Data>
) {
	if (req.method !== 'POST') return res.status(405).json({ success: false, error: 'Method not allowed' });
	const { name, content, roles, departments } = req.body;
	if (!name || (!roles && !departments)) return res.status(400).json({ success: false, error: 'Missing required fields' });
	if (content && typeof content === 'object' && (content as any).external) {
		const url = (content as any).url;
		if (!url || typeof url !== 'string') return res.status(400).json({ success: false, error: 'External URL required' });
		if (!url.startsWith('https://')) return res.status(400).json({ success: false, error: 'External URL must use https://' });
	}
	const { id } = req.query;
	if (!id) return res.status(400).json({ success: false, error: 'Missing required fields' });
	
	let saveContent = content;
	if (content && typeof content === 'object' && !(content as any).external) {
		saveContent = sanitizeJSON(content);
 	}

	const document = await prisma.document.create({
		data: {
			workspaceGroupId: parseInt(id as string),
			name,
			ownerId: BigInt(req.session.userid),
			content: saveContent,
			roles: {
				connect: roles ? roles.map((role: string) => ({ id: role })) : []
			},
			departments: {
				connect: departments ? departments.map((department: string) => ({ id: department })) : []
			}
		}
	});
	try {
		await logAudit(parseInt(id as string), Number(req.session.userid), 'document.create', `document:${document.id}`, { id: document.id, name, roles, departments });
	} catch (e) {
		// ignore
	}

	res.status(200).json({ success: true, document: JSON.parse(JSON.stringify(document, (key, value) => (typeof value === 'bigint' ? value.toString() : value))) });
}

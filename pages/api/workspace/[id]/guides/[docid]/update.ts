import type { NextApiRequest, NextApiResponse } from 'next'
import { withPermissionCheck } from '@/utils/permissionsManager'
import prisma from '@/utils/database';

type Data = {
	success: boolean
	error?: string
	document?: any
}

export default withPermissionCheck(handler, 'manage_docs');

export async function handler(
	req: NextApiRequest,
	res: NextApiResponse<Data>
) {
	if (req.method !== 'POST') return res.status(405).json({ success: false, error: 'Method not allowed' });
	if (!req.query.docid) return res.status(400).json({ success: false, error: 'Document ID not provided' });
	
	const { name, content, roles } = req.body;
	if (!name || !content || !roles) return res.status(400).json({ success: false, error: 'Missing required fields' });

	// First, disconnect all existing roles
	await prisma.document.update({
		where: {
			id: req.query.docid as string
		},
		data: {
			roles: {
				set: []
			}
		}
	});

	// Then update the document with new data and connect new roles
	const document = await prisma.document.update({
		where: {
			id: req.query.docid as string
		},
		data: {
			name,
			content,
			roles: {
				connect: roles.map((role: string) => ({ id: role }))
			}
		}
	});

	res.status(200).json({ 
		success: true, 
		document: JSON.parse(JSON.stringify(document, (key, value) => (typeof value === 'bigint' ? value.toString() : value)))
	});
}

// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type {NextApiResponse } from 'next'
import prisma, { SessionType, document } from '@/utils/database';
import { logAudit } from '@/utils/logs';
import { sanitizeJSON } from '@/utils/sanitise';
import { withPermissionCheck } from '@/utils/permissionsManager'
import { AuthenticatedRequest } from '@/lib/withAuth';
type Data = {
	success: boolean
	error?: string
	session?: SessionType
	document?: document
}

export default withPermissionCheck(handler, 'create_docs');

export async function handler(
	req: AuthenticatedRequest,
	res: NextApiResponse<Data>
) {
	if (req.method !== 'POST') return res.status(405).json({ success: false, error: 'Method not allowed' });
	const { name, content, roles, departments, folderId } = req.body;
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

	if (folderId) {
		const folder = await prisma.documentFolder.findFirst({
			where: { id: folderId, workspaceGroupId: parseInt(id as string) },
		});
		if (!folder) return res.status(400).json({ success: false, error: 'Folder not found' });
	}

	const document = await prisma.document.create({
		data: {
			workspaceGroupId: parseInt(id as string),
			name,
			ownerId: BigInt(req.auth.userId),
			content: saveContent,
			folderId: folderId || null,
			roles: {
				connect: roles ? roles.map((role: string) => ({ id: role })) : []
			},
			departments: {
				connect: departments ? departments.map((department: string) => ({ id: department })) : []
			}
		}
	});
	try {
		await logAudit(parseInt(id as string), Number(req.auth.userId), 'document.create', `document:${document.id}`, { id: document.id, name, roles, departments });
	} catch (e) {
		// ignore
	}

	res.status(200).json({ success: true, document: JSON.parse(JSON.stringify(document, (key, value) => (typeof value === 'bigint' ? value.toString() : value))) });
}

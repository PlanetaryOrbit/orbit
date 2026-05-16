import type { NextApiRequest, NextApiResponse } from 'next';
// import { withAuth } from '@/lib/withSession';
import prisma from '@/utils/database';
import formidable from 'formidable';
import fs from 'fs';
import { AuthenticatedRequest, withAuth } from '@/lib/withAuth';

export const config = {
	api: {
		bodyParser: false,
	},
};

export default withAuth(handler);

const ALLOWED_MIME_TYPES: Record<string, string> = {
	'image/jpeg': 'image/jpeg',
	'image/png': 'image/png',
};

export async function handler(req: AuthenticatedRequest, res: NextApiResponse) {
	if (!req.auth.userId) {
		return res.status(401).json({ error: 'Not authenticated' });
	}

	const user = await prisma.user.findUnique({
		where: { userid: BigInt(req.auth.userId) },
		select: { isOwner: true },
	});

	if (!user?.isOwner) {
		return res.status(403).json({ error: 'Access denied. Owner privileges required.' });
	}

	if (req.method === 'DELETE') {
		try {
			await prisma.instanceConfig.deleteMany({ where: { key: 'loginBackground' } });
			return res.json({ success: true });
		} catch (error) {
			console.error('Failed to remove background:', error);
			return res.status(500).json({ error: 'Failed to remove background' });
		}
	}

	if (req.method !== 'POST') {
		return res.status(405).json({ error: 'Method not allowed' });
	}

	const form = formidable({
		maxFileSize: 5 * 1024 * 1024,
		allowEmptyFiles: false,
		filter: ({ mimetype }) => !!(mimetype && ALLOWED_MIME_TYPES[mimetype]),
	});

	try {
		const [, files] = await form.parse(req);
		const file = Array.isArray(files.background) ? files.background[0] : files.background;

		if (!file) {
			return res.status(400).json({ error: 'No file uploaded' });
		}

		const mime = file.mimetype ?? '';
		if (!ALLOWED_MIME_TYPES[mime]) {
			return res.status(400).json({ error: 'Invalid file type. Only images are allowed.' });
		}

		const buffer = fs.readFileSync(file.filepath);
		fs.unlinkSync(file.filepath);

		const dataUrl = `data:${mime};base64,${buffer.toString('base64')}`;

		await prisma.instanceConfig.upsert({
			where: { key: 'loginBackground' },
			update: { value: dataUrl, updatedAt: new Date() },
			create: { key: 'loginBackground', value: dataUrl, updatedAt: new Date() },
		});

		return res.json({ success: true, url: dataUrl });
	} catch (error) {
		console.error('Failed to upload background:', error);
		return res.status(500).json({ error: 'Failed to upload file' });
	}
}

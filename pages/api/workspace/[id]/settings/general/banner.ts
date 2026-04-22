import type { NextApiRequest, NextApiResponse } from 'next';
import { withPermissionCheck } from '@/utils/permissionsManager';
import { getConfig, setConfig, refresh } from '@/utils/configEngine';
import formidable from 'formidable';
import fs from 'fs';
import prisma from '@/utils/database';

export const config = {
	api: {
		bodyParser: false,
	},
};

export default async function route(req: NextApiRequest, res: NextApiResponse) {
	if (req.method === 'GET') return getBanner(req, res);
	return withPermissionCheck(handler, 'workspace_customisation')(req, res);
}

async function getBanner(req: NextApiRequest, res: NextApiResponse) {
	const workspaceId = parseInt(req.query.id as string);
	if (isNaN(workspaceId)) return res.status(400).json({ error: 'Invalid workspace ID' });
	try {
		const banner = await getConfig('banner', workspaceId);
		return res.json({ banner: typeof banner === 'string' ? banner : null });
	} catch {
		return res.json({ banner: null });
	}
}

const ALLOWED_MIME_TYPES: Record<string, string> = {
	'image/jpeg': 'image/jpeg',
	'image/png': 'image/png',
};

export async function handler(req: NextApiRequest, res: NextApiResponse) {
	const workspaceId = parseInt(req.query.id as string);
	if (isNaN(workspaceId)) return res.status(400).json({ error: 'Invalid workspace ID' });

	if (req.method === 'DELETE') {
		try {
			await prisma.config.deleteMany({
				where: { workspaceGroupId: workspaceId, key: 'banner' },
			});
			await refresh('banner', workspaceId);
			return res.json({ success: true });
		} catch (error) {
			console.error('Failed to remove banner:', error);
			return res.status(500).json({ error: 'Failed to remove banner' });
		}
	}

	if (req.method !== 'POST') {
		return res.status(405).json({ error: 'Method not allowed' });
	}

	const form = formidable({
		maxFileSize: 8 * 1024 * 1024,
		allowEmptyFiles: false,
		filter: ({ mimetype }) => !!(mimetype && ALLOWED_MIME_TYPES[mimetype]),
	});

	try {
		const [, files] = await form.parse(req);
		const file = Array.isArray(files.banner) ? files.banner[0] : files.banner;

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

		await setConfig('banner', dataUrl, workspaceId);

		return res.json({ success: true, url: dataUrl });
	} catch (error) {
		console.error('Failed to upload banner:', error);
		return res.status(500).json({ error: 'Failed to upload banner' });
	}
}

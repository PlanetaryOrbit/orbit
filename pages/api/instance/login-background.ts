import type { NextApiRequest, NextApiResponse } from 'next';
import prisma from '@/utils/database';
import { getConfig } from '@/utils/configEngine';
import { getRGBFromTailwindColor } from '@/utils/themeColor';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
	if (req.method !== 'GET') {
		return res.status(405).json({ error: 'Method not allowed' });
	}

	try {
		const [bgConfig, redirectConfig] = await Promise.all([
			prisma.instanceConfig.findUnique({ where: { key: 'loginBackground' } }),
			prisma.instanceConfig.findUnique({ where: { key: 'redirectWorkspace' } }),
		]);

		const backgroundUrl = typeof bgConfig?.value === 'string' ? bgConfig.value : null;

		let themeRgb: string | null = null;
		const redirectWid = typeof redirectConfig?.value === 'string' ? parseInt(redirectConfig.value, 10) : null;
		if (redirectWid && !isNaN(redirectWid)) {
			const themeColor = await getConfig('theme', redirectWid);
			if (themeColor) themeRgb = getRGBFromTailwindColor(themeColor);
		}

		return res.json({ backgroundUrl, themeRgb });
	} catch {
		return res.json({ backgroundUrl: null, themeRgb: null });
	}
}

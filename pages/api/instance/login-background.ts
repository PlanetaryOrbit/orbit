import { getConfig } from '@/utils/configEngine';
import prisma from '@/utils/database';
import { getRGBFromTailwindColor } from '@/utils/themeColor';
import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const [bgConfig, redirectConfig, tintEnabledConfig, tinyOpacityConfig] = await Promise.all([
      prisma.instanceConfig.findUnique({ where: { key: 'loginBackground' } }),
      prisma.instanceConfig.findUnique({ where: { key: 'redirectWorkspace' } }),
      prisma.instanceConfig.findUnique({ where: { key: 'loginBackgroundTintEnabled' } }),
      prisma.instanceConfig.findUnique({ where: { key: 'loginBackgroundTintOpacity' } }),
    ]);

    const backgroundUrl = typeof bgConfig?.value === 'string' ? bgConfig.value : null;

    let themeRgb: string | null = null;
    const redirectWid =
      typeof redirectConfig?.value === 'string' ? parseInt(redirectConfig.value, 10) : null;
    if (redirectWid && !isNaN(redirectWid)) {
      const themeColor = await getConfig('theme', redirectWid);
      if (themeColor) themeRgb = getRGBFromTailwindColor(themeColor);
    }
    const tintEnabled =
      typeof tintEnabledConfig?.value === 'boolean' ? tintEnabledConfig.value : true;
    const tintOpacity =
      typeof tinyOpacityConfig?.value === 'number'
        ? Math.min(100, Math.max(0, tinyOpacityConfig.value))
        : 60;

    return res.json({ backgroundUrl, themeRgb, tintEnabled, tintOpacity });
  } catch {
    return res.json({ backgroundUrl: null, themeRgb: null, tintEnabled: true, tintOpacity: 60 });
  }
}

// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from 'next'
import { getConfig, setConfig } from '@/utils/configEngine'
import { withPermissionCheck } from '@/utils/permissionsManager'

type Data = {
  success: boolean
  error?: string
  value?: any
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<Data>
) {
  if (req.method === 'GET') {
    const config = await getConfig('notices', parseInt(req.query.id as string));
    if (!config) {
      return res.status(404).json({ success: false, error: 'Not found' });
    }
    return res.status(200).json({ success: true, value: config });
  }

  return withPermissionCheck(async (req: NextApiRequest, res: NextApiResponse<Data>) => {
    if (req.method === 'PATCH') {
      await setConfig('notices', {
        enabled: req.body.enabled
      }, parseInt(req.query.id as string));
      try {
        const { logAudit } = await import('@/utils/logs');
        await logAudit(parseInt(req.query.id as string), (req as any).session?.userid || null, 'settings.update', 'notices', { enabled: req.body.enabled });
      } catch (e) {}
      return res.status(200).json({ success: true });
    }

    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }, 'manage_features')(req, res);
}

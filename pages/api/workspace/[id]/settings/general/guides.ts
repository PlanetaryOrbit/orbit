// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from 'next'
import { getConfig, setConfig } from '@/utils/configEngine'
import { withPermissionCheck } from '@/utils/permissionsManager'
import { withSessionRoute } from '@/lib/withSession'

type Data = {
  success: boolean
  error?: string
  value?: any
}

export default withSessionRoute(handler);

async function handler(
  req: NextApiRequest,
  res: NextApiResponse<Data>
) {
  const userId = (req as any).session?.userid;
  if (!userId) {
    return res.status(401).json({ success: false, error: 'Unauthorized' });
  }

  if (req.method === 'GET') {
    const config = await getConfig('guides', parseInt(req.query.id as string));
    if (!config) {
      return res.status(404).json({ success: false, error: 'Not found' });
    }
    return res.status(200).json({ success: true, value: config });
  }

  if (req.method === 'PATCH') {
    return withPermissionCheck(async (req: NextApiRequest, res: NextApiResponse<Data>) => {
      await setConfig('guides', {
        enabled: req.body.enabled
      }, parseInt(req.query.id as string));
      try {
        const { logAudit } = await import('@/utils/logs');
        await logAudit(parseInt(req.query.id as string), (req as any).session?.userid || null, 'settings.update', 'guides', { enabled: req.body.enabled });
      } catch (e) {}
      return res.status(200).json({ success: true });
    }, 'manage_features')(req, res);
  }

  return res.status(405).json({ success: false, error: 'Method not allowed' });
}

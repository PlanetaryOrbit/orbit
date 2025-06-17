// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from 'next'
import { getConfig, setConfig } from '@/utils/configEngine'
import { withPermissionCheck } from '@/utils/permissionsManager'

type Data = {
  success: boolean
  error?: string
  value?: any
}

export default withPermissionCheck(handler, 'admin');

export async function handler(
  req: NextApiRequest,
  res: NextApiResponse<Data>
) {
  if (req.method === 'GET') {
    const config = await getConfig('sessions', parseInt(req.query.id as string));
    if (!config) {
      return res.status(404).json({ success: false, error: 'Not found' });
    }
    return res.status(200).json({ success: true, value: config });
  }

  if (req.method === 'PATCH') {
    await setConfig('sessions', {
      enabled: req.body.enabled
    }, parseInt(req.query.id as string));
    return res.status(200).json({ success: true });
  }

  return res.status(405).json({ success: false, error: 'Method not allowed' });
}

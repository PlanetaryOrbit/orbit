// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from 'next'
import { getConfig, setConfig } from '@/utils/configEngine'
import { withPermissionCheck } from '@/utils/permissionsManager'
import { logAudit } from '@/utils/logs'

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
	const config = await getConfig('leaderboard', parseInt(req.query.id as string));
	if (!config) {
	  return res.status(404).json({ success: false, error: 'Not found' });
	}
	return res.status(200).json({ success: true, value: config });
  }

  return withPermissionCheck(async (req: NextApiRequest, res: NextApiResponse<Data>) => {
		if (req.method === 'PATCH') {
			const workspaceId = parseInt(req.query.id as string);
			const before = await getConfig('leaderboard', workspaceId);
			const after = { enabled: req.body.enabled, style: req.body.style || 'list' };
			await setConfig('leaderboard', after, workspaceId);
			try { await logAudit(workspaceId, (req as any).session?.userid || null, 'settings.general.leaderboard.update', 'leaderboard', { before, after }); } catch (e) {}
			return res.status(200).json({ success: true });
		}

	return res.status(405).json({ success: false, error: 'Method not allowed' });
  }, 'admin')(req, res);
}

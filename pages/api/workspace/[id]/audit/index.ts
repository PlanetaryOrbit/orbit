import type { NextApiRequest, NextApiResponse } from 'next'
import { withPermissionCheck } from '@/utils/permissionsManager'
import { queryAudit } from '@/utils/logs'
import prisma from '@/utils/database'

type Data = {
  success: boolean
  error?: string
  rows?: any[]
  total?: number
}

export default withPermissionCheck(handler, 'view_audit_logs');

export async function handler(req: NextApiRequest, res: NextApiResponse<Data>) {
  if (req.method !== 'GET') return res.status(405).json({ success: false, error: 'Method not allowed' });
  const workspaceId = parseInt(req.query.id as string);
  if (!workspaceId) return res.status(400).json({ success: false, error: 'Missing workspace id' });

  const { userId, action, search, page = '0', limit = '50' } = req.query as any;
  const skip = Math.max(0, parseInt(page) * parseInt(limit));
  const take = Math.min(200, parseInt(limit) || 50);

  try {
    const result = await queryAudit(workspaceId, { userId: userId ? Number(userId) : undefined, action: action || undefined, search: search || undefined, skip, take });
    const rows = result.rows || [];
    const userIds = Array.from(new Set(rows.map((r: any) => r.userId).filter(Boolean)));
    let userMap: Record<string, string> = {};
    if (userIds.length > 0) {
      try {
        const users = await prisma.user.findMany({ where: { userid: { in: userIds.map((v: any) => BigInt(v)) } }, select: { userid: true, username: true } });
        for (const u of users) {
          userMap[String(u.userid)] = u.username || String(u.userid);
        }
      } catch (e) {
        console.error('[Audit] Failed to lookup usernames', e);
      }
    }

    const enrichedRows = rows.map((r: any) => {
      let userName: string | null = null;
      if (r.userId) userName = userMap[String(r.userId)] || String(r.userId);
      if (!userName && r.details && typeof r.details === 'object' && (r.details.actorUsername || r.details.actorName)) {
        userName = r.details.actorUsername || r.details.actorName || null;
      }
      return { ...r, userName };
    });

    return res.status(200).json({ success: true, rows: enrichedRows, total: result.total });
  } catch (e) {
    console.error('[Audit] Error querying audits', e);
    return res.status(500).json({ success: false, error: 'Internal error' });
  }
}

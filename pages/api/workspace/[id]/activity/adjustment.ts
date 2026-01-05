import { withPermissionCheck } from '@/utils/permissionsManager';
import type { NextApiRequest, NextApiResponse } from 'next';
import prisma from '@/utils/database';
import { logAudit } from '@/utils/logs';

async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ success: false, error: 'Method not allowed' });
  const { id } = req.query;
  const { userId, minutes, reason, action } = req.body as { userId?: number; minutes?: number; reason?: string; action?: 'award' | 'remove' };

  if (!id || !userId || typeof minutes !== 'number') {
    return res.status(400).json({ success: false, error: 'Missing required fields' });
  }
  if (minutes <= 0) return res.status(400).json({ success: false, error: 'Minutes must be > 0' });
  if (minutes > 1000) return res.status(400).json({ success: false, error: 'Minutes cannot exceed 1000 per adjustment' });
  if (action && !['award','remove'].includes(action)) return res.status(400).json({ success: false, error: 'Invalid action' });

  const workspaceGroupId = parseInt(id as string);
  const actorId = req.session.userid;
  if (!actorId) return res.status(401).json({ success: false, error: 'Unauthorized' });

  const signedMinutes = action === 'remove' ? -Math.trunc(minutes) : Math.trunc(minutes);

  const adjustment = await prisma.activityAdjustment.create({
    data: {
      userId: BigInt(userId),
      actorId: BigInt(actorId),
      workspaceGroupId,
      minutes: signedMinutes,
      reason: reason?.trim() || null,
    },
    include: {
      actor: {
        select: { username: true }
      }
    }
  });
  try {
    await logAudit(workspaceGroupId, actorId ? Number(actorId) : null, 'activity.adjustment', `user:${userId}`, { minutes: signedMinutes, reason: reason || null, actorId, userId });
  } catch (e) {}

  const safe = JSON.parse(JSON.stringify(adjustment, (_k, v) => typeof v === 'bigint' ? v.toString() : v));
  return res.status(200).json({ success: true, adjustment: safe });
}

export default withPermissionCheck(handler, 'activity_adjustments');

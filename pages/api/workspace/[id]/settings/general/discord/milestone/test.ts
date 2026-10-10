import { NextApiResponse } from 'next';

import { AuthenticatedRequest, withAuth } from '@/lib/withAuth';
import { fetchworkspace, getConfig } from '@/utils/configEngine';
import prisma from '@/utils/database';
import {
  formatMilestoneMessage,
  getMilestoneMessageTemplate,
} from '@/utils/discord/milestoneMessage';

async function handler(req: AuthenticatedRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  const workspaceId = parseInt(req.query.id as string);
  const userId = req.auth.userId;

  if (!userId || isNaN(workspaceId)) {
    return res.status(400).json({ success: false, error: 'Invalid request' });
  }

  const user = await prisma.user.findFirst({
    where: { userid: userId },
    include: {
      roles: {
        where: { workspaceGroupId: workspaceId },
      },
      workspaceMemberships: {
        where: { workspaceGroupId: workspaceId },
      },
    },
  });

  const membership = user?.workspaceMemberships?.[0];
  const isAdmin = membership?.isAdmin || false;
  const userRole = user?.roles?.[0];
  const hasAdminPermission = userRole?.permissions?.includes('admin') || isAdmin;

  if (!hasAdminPermission) {
    return res.status(403).json({ success: false, error: 'Forbidden' });
  }

  try {
    const webhookConfig = await getConfig('discord_milestone', workspaceId);

    if (!webhookConfig?.url)
      return res
        .status(400)
        .json({ success: false, error: 'Milestone webhook URL is not configured' });

    const workspace = await fetchworkspace(workspaceId);

    if (!workspace) return res.status(404).json({ success: false, error: 'Workspace not found' });

    const message = getMilestoneMessageTemplate(webhookConfig.message);

    const webhookBody = {
      content:
        formatMilestoneMessage(message, {
          groupName: workspace.groupName || 'Your group',
          crossedMilestone: 57,
          currentMemberCount: 57,
          membersRemaining: 43,
          nextMilestone: 100,
        }) + '\n -# This is a test activated by a Workspace Adminstrator.',
    };

    const response = await fetch(webhookConfig.url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(webhookBody),
    });

    if (!response.ok) {
      const errorText = await response.text();

      console.error('Discord webhook error:', errorText);

      return res.status(400).json({
        success: false,
        error: `Discord webhook returned status ${response.status}`,
      });
    }

    return res.status(200).json({ success: true });
  } catch (error) {
    console.error('Error testing milestone webhook:', error);

    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error',
    });
  }
}

export default withAuth(handler);

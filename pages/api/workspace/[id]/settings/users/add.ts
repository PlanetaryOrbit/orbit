import prisma from '@/utils/database';
import { logAudit } from '@/utils/logs';
import { invalidateWorkspacePermissions, withPermissionCheck } from '@/utils/permissionsManager';
import { getUsername, getThumbnail, getDisplayName } from '@/utils/userinfoEngine';
import type { NextApiRequest, NextApiResponse } from 'next';

type Data = {
  success: boolean;
  error?: string;
  user?: any;
};

async function lookupRobloxUserId(username: string): Promise<number | null> {
  const response = await fetch('https://users.roblox.com/v1/usernames/users', {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      usernames: [username.trim()],
      excludeBannedUsers: false,
    }),
  });

  const text = await response.text();

  if (!response.ok) {
    console.error('[Roblox] Username lookup failed:', {
      username,
      status: response.status,
      statusText: response.statusText,
      body: text,
    });

    throw new Error(`Roblox username lookup failed with HTTP ${response.status}`);
  }

  let data: {
    data?: Array<{
      requestedUsername: string;
      hasVerifiedBadge: boolean;
      id: number;
      name: string;
      displayName: string;
    }>;
  };

  try {
    data = JSON.parse(text);
  } catch {
    console.error('[Roblox] Invalid JSON response:', text);
    throw new Error('Roblox returned invalid JSON');
  }

  return data.data?.[0]?.id ?? null;
}

export default withPermissionCheck(handler, 'admin');

export async function handler(req: NextApiRequest, res: NextApiResponse<Data>) {
  if (req.method !== 'POST') {
    return res.status(405).json({
      success: false,
      error: 'Method not allowed',
    });
  }

  const username = req.body?.username?.trim();

  if (!username) {
    return res.status(400).json({
      success: false,
      error: 'Username is required',
    });
  }

  let userid: number | null;

  try {
    userid = await lookupRobloxUserId(username);
  } catch (error) {
    console.error('[Roblox] Failed to resolve username:', {
      username,
      error,
    });

    return res.status(502).json({
      success: false,
      error: "We couldn't contact Roblox to verify this username. Please try again in a moment.",
    });
  }

  if (!userid) {
    return res.status(400).json({
      success: false,
      error: 'Invalid Roblox username',
    });
  }

  const targetUserId = userid;
  const workspaceGroupId = parseInt(req.query.id as string);

  const role = await prisma.role.findFirst({
    where: {
      workspaceGroupId,
    },
  });

  // Key the duplicate check on the final membership row, not on a role connection
  // from group sync. This keeps partially completed adds retryable.
  const existingMember = await prisma.workspaceMember.findUnique({
    where: {
      workspaceGroupId_userId: {
        workspaceGroupId,
        userId: targetUserId,
      },
    },
  });

  if (existingMember) {
    return res.status(400).json({
      success: false,
      error: 'User already exists',
    });
  }

  if (!role) {
    return res.status(404).json({
      success: false,
      error: 'Role not found',
    });
  }

  const usernameFromRoblox = await getUsername(targetUserId);

  const user = await prisma.$transaction(async (tx) => {
    const updatedUser = await tx.user.upsert({
      where: {
        userid: targetUserId,
      },
      update: {
        username: usernameFromRoblox,
        roles: {
          connect: {
            id: role.id,
          },
        },
      },
      create: {
        userid: targetUserId,
        username: usernameFromRoblox,
        roles: {
          connect: {
            id: role.id,
          },
        },
      },
    });

    await tx.roleMember.upsert({
      where: {
        roleId_userId: {
          roleId: role.id,
          userId: targetUserId,
        },
      },
      update: {
        manuallyAdded: true,
      },
      create: {
        roleId: role.id,
        userId: targetUserId,
        manuallyAdded: true,
      },
    });

    await tx.workspaceMember.upsert({
      where: {
        workspaceGroupId_userId: {
          workspaceGroupId,
          userId: targetUserId,
        },
      },
      update: {},
      create: {
        workspaceGroupId,
        userId: targetUserId,
        joinDate: new Date(),
        isAdmin: false,
      },
    });

    return updatedUser;
  });

  invalidateWorkspacePermissions(workspaceGroupId);

  const newuser = {
    roles: [role],
    userid: Number(user.userid),
    username: usernameFromRoblox,
    displayName: await getDisplayName(userid),
    thumbnail: getThumbnail(userid),
  };

  try {
    await logAudit(
      workspaceGroupId,
      (req as any).auth?.userId || null,
      'settings.users.add',
      `user:${Number(user.userid)}`,
      {
        userId: Number(user.userid),
        username: usernameFromRoblox,
        role: role.id,
      },
    );
  } catch {}

  return res.status(200).json({
    success: true,
    user: newuser,
  });
}

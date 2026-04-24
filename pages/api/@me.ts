// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from 'next'
import prisma from '@/utils/database';
import { withSessionRoute } from '@/lib/withSession'
import { getUsername, getThumbnail, getDisplayName } from '@/utils/userinfoEngine'
import * as noblox from 'noblox.js'

type User = {
  userId: number
  username: string
  canMakeWorkspace: boolean
  displayname: string
  thumbnail: string
  registered: boolean
  isFirstLogin: boolean,
  birthdayDay?: number | null
  birthdayMonth?: number | null
  discordUser?: {
    discordUserId: string
    username: string
    avatar: string | null
  } | null,
  googleUser?: {
    username: string,
    avatar: string | null,
    email: string | null  // add | null
  } | null
}

type Data = {
  success: boolean
  error?: string
  user?: User
  workspaces?: {
    groupId: number
    groupThumbnail: string
    groupName: string
  }[]
}

// Simple in-memory cache to prevent excessive database queries
const userCache = new Map<string, { data: any; timestamp: number }>();
const CACHE_DURATION = 30000; // 30 seconds

setInterval(() => {
  const now = Date.now();
  for (const [key, value] of userCache.entries()) {
    if (now - value.timestamp > CACHE_DURATION) {
      userCache.delete(key);
    }
  }
}, 60000); // Clean every minute

export default withSessionRoute(handler);

export async function handler(
  req: NextApiRequest,
  res: NextApiResponse<Data>
) {
  if (req.method !== 'GET') return res.status(405).json({ success: false, error: 'Method not allowed' })
  if (!await prisma.workspace.count()) return res.status(400).json({ success: false, error: 'Workspace not setup' })
  if (!req.session.userid) return res.status(401).json({ success: false, error: 'Not logged in' });

  const userId = req.session.userid;
  const cacheKey = `user_${userId}`;
  const now = Date.now();
  const cached = userCache.get(cacheKey);
  if (cached && (now - cached.timestamp) < CACHE_DURATION) {
    return res.status(200).json(cached.data);
  }

  const [dbuser, username, displayname] = await Promise.all([
    prisma.user.findUnique({
      where: { userid: userId },
      include: { roles: true, discordUser: true, googleUser: true }
    }),
    getUsername(userId),
    getDisplayName(userId)
  ]);

  const user: User = {
    userId: userId,
    username,
    displayname,
    canMakeWorkspace: dbuser?.isOwner || false,
    thumbnail: getThumbnail(userId),
    registered: dbuser?.registered || false,
    birthdayDay: dbuser?.birthdayDay ?? null,
    birthdayMonth: dbuser?.birthdayMonth ?? null,
    isFirstLogin: dbuser?.isFirstLogin ?? true,
    discordUser: dbuser?.discordUser ? {
      discordUserId: dbuser.discordUser.discordUserId.toString(),
      username: dbuser.discordUser.username,
      avatar: dbuser.discordUser.avatar,
    } : null,
    googleUser: dbuser?.googleUser ? {
      avatar: dbuser.googleUser.avatar ?? null,
      email: dbuser.googleUser.email ?? null,
      username: dbuser.googleUser.username
    } : null
  }

  let roles: any[] = [];
  if (dbuser?.roles?.length) {
    const uniqueGroupIds = [...new Set(dbuser.roles.map(r => r.workspaceGroupId))];

    const workspaces = await prisma.workspace.findMany({
      where: { groupId: { in: uniqueGroupIds } },
      select: { groupId: true, groupName: true, groupLogo: true, customName: true }
    });

    roles = workspaces.map(workspace => ({
      groupId: workspace.groupId,
      groupThumbnail: workspace.groupLogo,
      groupName: workspace.groupName,
      customName: workspace.customName
    }));
  }

  const response = { success: true, user, workspaces: roles };
  userCache.set(cacheKey, { data: response, timestamp: now });

  res.status(200).json(response);
  setImmediate(async () => {
    try {
      await prisma.user.update({
        where: {
          userid: userId
        },
        data: {
          picture: getThumbnail(userId),
          username: await getUsername(userId),
          registered: true
        }
      });
      userCache.delete(cacheKey);
    } catch (error) {
      console.error('Error updating user info:', error);
    }
  });
}

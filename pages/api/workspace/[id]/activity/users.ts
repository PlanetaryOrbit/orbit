// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from "next";
import prisma from "@/utils/database";
import { withPermissionCheck } from "@/utils/permissionsManager";
import { withSessionRoute } from "@/lib/withSession";
import {
  getUsername,
  getThumbnail,
  getDisplayName,
} from "@/utils/userinfoEngine";
import { getConfig } from "@/utils/configEngine";

const activityUsersCache = new Map<string, { data: any; timestamp: number }>();
const ACTIVITY_CACHE_DURATION = 30000;

type Data = {
  success: boolean;
  message?: object;
  error?: string;
};
type CombinedObj = {
  userId: number;
  ms: number[];
};
type TopStaff = {
  userId: number;
  username: string;
  ms: number;
  picture: string;
};

export default withPermissionCheck(handler, "view_entire_groups_activity");

export async function handler(req: NextApiRequest, res: NextApiResponse<Data>) {
  if (req.method !== "GET")
    return res
      .status(405)
      .json({ success: false, error: "Method not allowed" });
  if (!req.session.userid)
    return res.status(401).json({ success: false, error: "Not logged in" });

  const workspaceId = parseInt(req.query.id as string);
  const cacheKey = `activity_users_${workspaceId}`;
  const now = Date.now();
  const cached = activityUsersCache.get(cacheKey);
  if (cached && now - cached.timestamp < ACTIVITY_CACHE_DURATION) {
    return res.status(200).json({ success: true, message: cached.data });
  }

  const lastReset = await prisma.activityReset.findFirst({
    where: {
      workspaceGroupId: workspaceId,
    },
    orderBy: {
      resetAt: "desc",
    },
  });

  const startDate = lastReset?.resetAt || new Date("2025-01-01");
  const currentDate = new Date();

  const activityConfig = await getConfig("activity", workspaceId);
  const leaderboardRank = activityConfig?.leaderboardRole;
  const idleTimeEnabled = activityConfig?.idleTimeEnabled ?? true;

  const sessions = await prisma.activitySession.findMany({
    where: {
      workspaceGroupId: workspaceId,
      startTime: {
        gte: startDate,
        lte: currentDate,
      },
    },
  });

  const activeSession = await prisma.activitySession.findMany({
    where: {
      active: true,
      workspaceGroupId: workspaceId,
    },
    select: {
      userId: true,
    },
  });
  const inactiveSession = await prisma.inactivityNotice.findMany({
    where: {
      endTime: {
        gt: new Date(),
      },
      startTime: {
        lt: new Date(),
      },
      workspaceGroupId: parseInt(req.query.id as string),
      approved: true,
      reviewed: true,
    },
    select: {
      userId: true,
      reason: true,
      startTime: true,
      endTime: true,
    },
  });

  let userQuery: any = {
    where: {
      workspaceMemberships: {
        some: {
          workspaceGroupId: workspaceId,
        },
      },
    },
    select: {
      userid: true,
      username: true,
      picture: true,
    },
  };

  if (leaderboardRank) {
    userQuery = {
      where: {
        workspaceMemberships: {
          some: {
            workspaceGroupId: workspaceId,
          },
        },
      },
      select: {
        userid: true,
        username: true,
        picture: true,
        ranks: {
          where: {
            workspaceGroupId: parseInt(req.query.id as string),
          },
          select: {
            rankId: true,
          },
        },
      },
    };
  }

  const users = await prisma.user.findMany(userQuery);

  var activeUsers: {
    userId: number;
    username: string;
    picture: string;
  }[] = [];
  var inactiveUsers: {
    userId: number;
    username: string;
    reason: string;
    from: Date;
    to: Date;
    picture: string;
  }[] = [];

  for (const user of activeSession) {
    const u = users.find((u) => u.userid === user.userId);
    activeUsers.push({
      userId: Number(user.userId),
      username: u?.username || "Unknown",
      picture: u?.picture || "",
    });
  }
  for (const session of inactiveSession) {
    const u = users.find((u) => u.userid === session.userId);
    inactiveUsers.push({
      userId: Number(session.userId),
      reason: session.reason,
      from: session.startTime,
      to: session.endTime!,
      username: u?.username || "Unknown",
      picture: u?.picture || "",
    });
  }

  activeUsers = activeUsers.filter((v, i, a) => a.indexOf(v) == i);
  inactiveUsers = inactiveUsers.filter((v, i, a) => a.indexOf(v) == i);

  inactiveUsers = inactiveUsers.filter((x) => {
    if (activeUsers.find((y) => x == y)) return false;
    return true;
  });

  const combinedMinutes: CombinedObj[] = [];
  sessions.forEach((session) => {
    if (!session.endTime) return;
    const found = combinedMinutes.find(
      (x) => x.userId == Number(session.userId)
    );
    const sessionDuration =
      session.endTime.getTime() - session.startTime.getTime();
    const idleTimeMs =
      idleTimeEnabled && session.idleTime
        ? Number(session.idleTime) * 60000
        : 0;
    const effectiveTime = sessionDuration - idleTimeMs;

    if (found) {
      found.ms.push(effectiveTime);
    } else {
      combinedMinutes.push({
        userId: Number(session.userId),
        ms: [effectiveTime],
      });
    }
  });

  const adjustments = await prisma.activityAdjustment.findMany({
    where: {
      workspaceGroupId: workspaceId,
      createdAt: {
        gte: startDate,
        lte: currentDate,
      },
    },
  });

  adjustments.forEach((adjustment: any) => {
    const found = combinedMinutes.find(
      (x) => x.userId == Number(adjustment.userId)
    );
    const adjustmentMs = adjustment.minutes * 60000;
    if (found) {
      found.ms.push(adjustmentMs);
    } else {
      combinedMinutes.push({
        userId: Number(adjustment.userId),
        ms: [adjustmentMs],
      });
    }
  });

  const topStaff: TopStaff[] = [];
  const processedUserIds = new Set<number>();
  for (const min of combinedMinutes) {
    const minSum = min.ms.reduce((partial, a) => partial + a, 0);
    const found = users.find((x) => x.userid === BigInt(min.userId));
    if (leaderboardRank && found) {
      const userRank = (found as any).ranks?.[0]?.rankId;
      if (!userRank || Number(userRank) < leaderboardRank) {
        continue;
      }
    }

    if (found) {
      topStaff.push({
        userId: min.userId,
        username: found?.username || "Unknown",
        ms: minSum,
        picture: found?.picture || "Unknown",
      });
      processedUserIds.add(min.userId);
    }
  }
  for (const user of users) {
    const userId = Number(user.userid);
    if (processedUserIds.has(userId)) continue;

    if (leaderboardRank) {
      const userRank = (user as any).ranks?.[0]?.rankId;
      if (!userRank || Number(userRank) < leaderboardRank) {
        continue;
      }
    }

    topStaff.push({
      userId: userId,
      username: user.username || "Unknown",
      ms: 0,
      picture: user.picture || "Unknown",
    });
  }

  const bestStaff = topStaff.sort((a, b) => {
    if (b.ms !== a.ms) {
      return b.ms - a.ms;
    }
    return a.username.localeCompare(b.username);
  });

  const responseData = { activeUsers, inactiveUsers, topStaff: bestStaff };
  activityUsersCache.set(cacheKey, { data: responseData, timestamp: now });

  return res.status(200).json({ success: true, message: responseData });
}
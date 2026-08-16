import type { NextApiRequest, NextApiResponse } from "next";
import prisma from "@/utils/database";
import { withPermissionCheck } from "@/utils/permissionsManager";
import { logAudit } from "@/utils/logs";
import {
  getUsername,
  getThumbnail,
  getDisplayName,
} from "@/utils/userinfoEngine";

type Data = {
  success: boolean;
  error?: string;
  user?: any;
};

async function lookupRobloxUserId(username: string): Promise<number | null> {
  const response = await fetch("https://users.roblox.com/v1/usernames/users", {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      usernames: [username.trim()],
      excludeBannedUsers: false,
    }),
  });

  const text = await response.text();

  if (!response.ok) {
    console.error("[Roblox] Username lookup failed:", {
      username,
      status: response.status,
      statusText: response.statusText,
      body: text,
    });

    throw new Error(
      `Roblox username lookup failed with HTTP ${response.status}`,
    );
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
    console.error("[Roblox] Invalid JSON response:", text);
    throw new Error("Roblox returned invalid JSON");
  }

  return data.data?.[0]?.id ?? null;
}

export default withPermissionCheck(handler, "admin");

export async function handler(req: NextApiRequest, res: NextApiResponse<Data>) {
  if (req.method !== "POST") {
    return res.status(405).json({
      success: false,
      error: "Method not allowed",
    });
  }

  const username = req.body?.username?.trim();

  if (!username) {
    return res.status(400).json({
      success: false,
      error: "Username is required",
    });
  }

  let userid: number | null;

  try {
    userid = await lookupRobloxUserId(username);
  } catch (error) {
    console.error("[Roblox] Failed to resolve username:", {
      username,
      error,
    });

    return res.status(502).json({
      success: false,
      error:
        "We couldn't contact Roblox to verify this username. Please try again in a moment.",
    });
  }

  if (!userid) {
    return res.status(400).json({
      success: false,
      error: "Invalid Roblox username",
    });
  }

  const workspaceGroupId = parseInt(req.query.id as string);

  const role = await prisma.role.findFirst({
    where: {
      workspaceGroupId,
    },
  });

  const u = await prisma.user.findFirst({
    where: {
      userid,
      roles: {
        some: {
          workspaceGroupId,
        },
      },
    },
  });

  if (u) {
    return res.status(400).json({
      success: false,
      error: "User already exists",
    });
  }

  if (!role) {
    return res.status(404).json({
      success: false,
      error: "Role not found",
    });
  }

  const usernameFromRoblox = await getUsername(userid);

  const user = await prisma.user.upsert({
    where: {
      userid,
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
      userid,
      username: usernameFromRoblox,
      roles: {
        connect: {
          id: role.id,
        },
      },
    },
  });

  await prisma.roleMember.upsert({
    where: {
      roleId_userId: {
        roleId: role.id,
        userId: userid,
      },
    },
    update: {
      manuallyAdded: true,
    },
    create: {
      roleId: role.id,
      userId: userid,
      manuallyAdded: true,
    },
  });

  await prisma.workspaceMember.upsert({
    where: {
      workspaceGroupId_userId: {
        workspaceGroupId,
        userId: userid,
      },
    },
    update: {},
    create: {
      workspaceGroupId,
      userId: userid,
      joinDate: new Date(),
      isAdmin: false,
    },
  });

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
      "settings.users.add",
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

import type { NextApiRequest, NextApiResponse } from "next";
import { getUsername, getDisplayName } from "@/utils/userinfoEngine";
import { fetchAvatar } from "@/utils/avatar";
import { User } from "@/types/index.d";
import prisma from "@/utils/database";
import * as noblox from "noblox.js";
import bcryptjs from "bcryptjs";
import { setRegistry } from "@/utils/registryManager";
import { getRobloxUserId, isGroupAllied } from "@/utils/roblox";
import { createSession } from "@/utils/session";

type Data = {
  success: boolean;
  error?: string;
  user?: User & { isOwner: boolean };
  debug?: any;
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<Data>,
) {
  if (req.method !== "POST") {
    return res.status(405).json({
      success: false,
      error: "Method not allowed",
    });
  }

  if (!req.body || typeof req.body !== "object") {
    return res.status(400).json({
      success: false,
      error: "Invalid request body - must be JSON",
    });
  }

  const { groupid, username, password, color, opencloudKey } = req.body;

  if (!groupid || !username || !password || !color) {
    return res.status(400).json({
      success: false,
      error: "Missing required fields",
    });
  }

  const groupIdNumber = typeof groupid === "string" ? Number(groupid) : groupid;

  if (!Number.isInteger(groupIdNumber)) {
    return res.status(400).json({
      success: false,
      error: "Invalid groupid",
    });
  }

  try {
    const userid = await getRobloxUserId(username).catch((err) => {
      console.error("Failed getting Roblox user ID:", err);
      return null;
    });

    if (!userid) {
      return res.status(404).json({
        success: false,
        error: "Username not found",
      });
    }

    const existingWorkspace = await prisma.workspace.findUnique({
      where: {
        groupId: groupIdNumber,
      },
    });

    if (existingWorkspace) {
      return res.status(403).json({
        success: false,
        error: "Workspace already exists",
      });
    }

    const [logo, group, verified] = await Promise.all([
      noblox.getLogo(groupIdNumber, "420x420").catch(() => ""),

      noblox.getGroup(groupIdNumber).catch(() => null),

      isGroupAllied(groupIdNumber).catch(() => false),
    ]);

    const groupName = group?.name ?? `Group ${groupIdNumber}`;

    const groupLogo = logo ?? "";

    const hashedPassword = await bcryptjs.hash(password, 10);

    await prisma.$transaction(async (tx) => {
      await tx.workspace.create({
        data: {
          groupId: groupIdNumber,
          groupName,
          groupLogo,
          lastSynced: new Date(),
          isVerified: verified,
          lastSyncedSuccessful:
            typeof opencloudKey === "string" && opencloudKey.trim().length > 0,
        },
      });

      await tx.config.createMany({
        data: [
          {
            key: "customization",
            workspaceGroupId: groupIdNumber,
            value: { color },
          },
          {
            key: "theme",
            workspaceGroupId: groupIdNumber,
            value: color,
          },
          {
            key: "guides",
            workspaceGroupId: groupIdNumber,
            value: { enabled: true },
          },
          {
            key: "sessions",
            workspaceGroupId: groupIdNumber,
            value: { enabled: true },
          },
          {
            key: "allies",
            workspaceGroupId: groupIdNumber,
            value: { enabled: true },
          },
          {
            key: "leaderboard",
            workspaceGroupId: groupIdNumber,
            value: { enabled: true },
          },
          {
            key: "notices",
            workspaceGroupId: groupIdNumber,
            value: { enabled: true },
          },
          {
            key: "resignations",
            workspaceGroupId: groupIdNumber,
            value: { enabled: false },
          },
          {
            key: "policies",
            workspaceGroupId: groupIdNumber,
            value: { enabled: false },
          },
          {
            key: "home",
            workspaceGroupId: groupIdNumber,
            value: { widgets: [] },
          },
        ],
      });

      const user = await tx.user.create({
        data: {
          userid: BigInt(userid),
          info: {
            create: {
              passwordhash: hashedPassword,
            },
          },
          isOwner: true,
        },
      });

      const defaultRole = await tx.role.create({
        data: {
          name: "Default",
          workspaceGroupId: groupIdNumber,
          permissions: [],
          groupRoles: [],
        },
      });

      await tx.user.update({
        where: {
          userid: BigInt(userid),
        },
        data: {
          roles: {
            connect: {
              id: defaultRole.id,
            },
          },
        },
      });

      await tx.workspaceMember.create({
        data: {
          workspaceGroupId: groupIdNumber,
          userId: BigInt(userid),
          joinDate: new Date(),
          isAdmin: true,
        },
      });

      if (typeof opencloudKey === "string" && opencloudKey.trim().length > 0) {
        await tx.config.create({
          data: {
            key: "roblox_opencloud",
            workspaceGroupId: groupIdNumber,
            value: {
              enabled: true,
              key: opencloudKey.trim(),
            },
          },
        });
      }
    });
    const session = await createSession(
      BigInt(userid),
      (req.headers["x-forwarded-for"] as string) ?? req.socket.remoteAddress,
      req.headers["user-agent"],
    );

    res.setHeader("Set-Cookie", [
      `session_token=${session.token}; Path=/; HttpOnly; SameSite=lax; Max-Age=${
        60 * 60 * 24 * 30
      }`,
      `app_setup=true; Path=/; HttpOnly; SameSite=lax`,
    ]);

    await setRegistry(req.headers.host as string);

    const userInfo: User & { isOwner: boolean } = {
      userId: userid,
      username: await getUsername(userid),
      displayname: await getDisplayName(userid),
      thumbnail: await fetchAvatar(userid, {
        type: "headshot",
        size: "180x180",
      }),
      isOwner: true,
    };

    return res.status(200).json({
      success: true,
      user: userInfo,
    });
  } catch (error) {
    console.error("Error in setup workspace:", error);

    return res.status(500).json({
      success: false,
      error: "Internal server error",
      debug: process.env.NODE_ENV === "development" ? error : undefined,
    });
  }
}

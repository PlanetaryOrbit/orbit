import type { NextApiRequest, NextApiResponse } from "next";
import { getUsername, getThumbnail, getDisplayName } from "@/utils/userinfoEngine";
import { User } from "@/types/index.d";
import prisma from "@/utils/database";
import * as noblox from "noblox.js";
import bcryptjs from "bcryptjs";
import { setRegistry } from "@/utils/registryManager";
import { getRobloxUserId } from "@/utils/roblox";
import { createSession } from "@/utils/session";

type Data = {
  success: boolean;
  error?: string;
  user?: User & { isOwner: boolean };
  debug?: any;
};

async function safeHashPassword(password: string): Promise<string> {
  try {
    return await bcryptjs.hash(password, 10);
  } catch (error) {
    console.error("Error hashing password:", error);
    throw new Error("Failed to hash password");
  }
}

export default async function handler(req: NextApiRequest, res: NextApiResponse<Data>) {
  if (req.method !== "POST")
    return res.status(405).json({ success: false, error: "Method not allowed" });

  if (!req.body || typeof req.body !== "object") {
    return res.status(400).json({ success: false, error: "Invalid request body - must be JSON" });
  }

  const { groupid, username, password, color, opencloudKey } = req.body;
  if (!groupid || !username || !password || !color) {
    return res.status(400).json({ success: false, error: "Missing required fields" });
  }

  const groupIdNumber = typeof groupid === "string" ? parseInt(groupid) : groupid;
  if (isNaN(groupIdNumber)) {
    return res.status(400).json({ success: false, error: "Invalid groupid" });
  }

  try {
    let userid = (await getRobloxUserId(username).catch((e) => {
      console.error("Error getting Roblox user ID:", e);
      return null;
    })) as number | undefined;

    if (!userid) {
      return res.status(404).json({ success: false, error: "Username not found" });
    }

    const existingWorkspace = await prisma.workspace.findFirst({ where: { groupId: Number(groupid) }}).catch((e) => {
      console.error("Error checking existing workspace:", e);
      return null;
    });

    console.log(existingWorkspace)

    if (existingWorkspace) {
      return res.status(403).json({ success: false, error: "Workspace already exists" });
    }

    const hashedPassword = await safeHashPassword(password);

    let groupName = `Group ${groupIdNumber}`;
    let groupLogo = '';

    try {
      const [logo, group] = await Promise.all([
        noblox.getLogo(groupIdNumber, '420x420').catch(() => ''),
        noblox.getGroup(groupIdNumber).catch(() => null)
      ]);
      if (group) groupName = group.name;
      if (logo) groupLogo = logo;
    } catch (err) {
      console.error('Failed to fetch group info during workspace setup:', err);
    }

    await prisma.workspace.create({
      data: { groupId: groupIdNumber, groupName, groupLogo, lastSynced: new Date() },
    }).catch((e) => { throw new Error("Failed to create workspace") });

    await prisma.$transaction([
      prisma.config.create({ data: { key: "customization", workspaceGroupId: groupIdNumber, value: { color } } }),
      prisma.config.create({ data: { key: "theme", workspaceGroupId: groupIdNumber, value: color } }),
      prisma.config.create({ data: { key: "guides", workspaceGroupId: groupIdNumber, value: { enabled: true } } }),
      prisma.config.create({ data: { key: "sessions", workspaceGroupId: groupIdNumber, value: { enabled: true } } }),
      prisma.config.create({ data: { key: "allies", workspaceGroupId: groupIdNumber, value: { enabled: true } } }),
      prisma.config.create({ data: { key: "leaderboard", workspaceGroupId: groupIdNumber, value: { enabled: true } } }),
      prisma.config.create({ data: { key: "notices", workspaceGroupId: groupIdNumber, value: { enabled: true } } }),
      prisma.config.create({ data: { key: "resignations", workspaceGroupId: groupIdNumber, value: { enabled: false } } }),
      prisma.config.create({ data: { key: "policies", workspaceGroupId: groupIdNumber, value: { enabled: false } } }),
      prisma.config.create({ data: { key: "home", workspaceGroupId: groupIdNumber, value: { widgets: [] } } }),
    ]);

    await prisma.user.create({
      data: {
        userid: BigInt(userid),
        info: { create: { passwordhash: hashedPassword } },
        isOwner: true,
      },
    }).catch((e) => { throw new Error("Failed to create user") });

    const defaultRole = await prisma.role.create({
      data: { name: "Default", workspaceGroupId: groupIdNumber, permissions: [], groupRoles: [] },
    }).catch((e) => { throw new Error("Failed to create default role") });

    await prisma.user.update({
      where: { userid: BigInt(userid) },
      data: { roles: { connect: { id: defaultRole.id } } },
    }).catch((e) => { throw new Error("Failed to assign role to user") });

    await prisma.workspaceMember.create({
      data: { workspaceGroupId: groupIdNumber, userId: BigInt(userid), joinDate: new Date(), isAdmin: true },
    }).catch((e) => { throw new Error("Failed to create workspace member") });

    if (opencloudKey && typeof opencloudKey === "string" && opencloudKey.trim().length > 0) {
      await prisma.config.create({
        data: { key: "roblox_opencloud", workspaceGroupId: groupIdNumber, value: { enabled: true, key: opencloudKey.trim() } },
      }).catch((e) => console.error("Error saving Open Cloud key:", e));
    }

    const session = await createSession(
      BigInt(userid),
      req.headers['x-forwarded-for'] as string ?? req.socket.remoteAddress,
      req.headers['user-agent']
    )

    res.setHeader('Set-Cookie', `session_token=${session.token}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${60 * 60 * 24 * 7}`)

    res.setHeader('Set-Cookie', [
      `session_token=${session.token}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${60 * 60 * 24 * 30}`,
      `app_setup=true; Path=/; HttpOnly; SameSite=Strict`,
    ])

    await setRegistry(req.headers.host as string);

    const userInfo: User & { isOwner: boolean } = {
      userId: userid,
      username: await getUsername(userid),
      displayname: await getDisplayName(userid),
      thumbnail: getThumbnail(userid),
      isOwner: true,
    };

    return res.status(200).json({ success: true, user: userInfo });
  } catch (error) {
    console.error("Error in setup workspace:", error);
    return res.status(500).json({
      success: false,
      error: "Internal server error",
      debug: process.env.NODE_ENV === "development" ? error : undefined,
    });
  }
}
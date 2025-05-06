// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from "next";
import {
  getUsername,
  getThumbnail,
  getDisplayName,
} from "@/utils/userinfoEngine";
import { User } from "@/types/index.d";
import prisma from "@/utils/database";
import * as noblox from "noblox.js";
import { withSessionRoute } from "@/lib/withSession";
import * as bcrypt from "bcrypt";
import { setRegistry } from "@/utils/registryManager";
import {
  getRobloxUsername,
  getRobloxThumbnail,
  getRobloxDisplayName,
  getRobloxUserId,
} from "@/utils/roblox";

type Data = {
  success: boolean;
  error?: string;
  user?: User & { isOwner: boolean };
};

type requestData = {
  groupid: number;
  username: string;
  password: string;
  color: string;
};

export default withSessionRoute(handler);

export async function handler(req: NextApiRequest, res: NextApiResponse<Data>) {
  if (req.method !== "POST")
    return res
      .status(405)
      .json({ success: false, error: "Method not allowed" });

  // Log raw body for debugging
  console.log("Raw request body:", req.body);
  console.log("Request headers:", req.headers);

  // Ensure body is parsed
  if (!req.body || typeof req.body !== "object") {
    console.error("Invalid request body:", req.body);
    return res.status(400).json({
      success: false,
      error: "Invalid request body - must be JSON",
    });
  }

  // Validate required fields
  const { groupid, username, password, color } = req.body;
  if (!groupid || !username || !password || !color) {
    console.error("Missing required fields:", {
      groupid,
      username,
      password,
      color,
    });
    return res.status(400).json({
      success: false,
      error: "Missing required fields",
    });
  }

  // Convert groupid to number if it's a string
  const groupIdNumber =
    typeof groupid === "string" ? parseInt(groupid) : groupid;
  if (isNaN(groupIdNumber)) {
    console.error("Invalid groupid:", groupid);
    return res.status(400).json({
      success: false,
      error: "Invalid groupid",
    });
  }

  try {
    let userid = (await getRobloxUserId(username, req.headers.origin).catch(
      (e) => {
        console.error("Error getting Roblox user ID:", e);
        return null;
      }
    )) as number | undefined;

    console.log("Got userid:", userid);

    if (!userid) {
      console.error("Username not found:", username);
      return res
        .status(404)
        .json({ success: false, error: "Username not found" });
    }

    const workspaceCount = await prisma.workspace.count({});
    if (workspaceCount > 0) {
      console.error("Workspace already exists");
      return res
        .status(403)
        .json({ success: false, error: "Workspace already exists" });
    }

    // Create workspace with validated groupIdNumber
    await prisma.workspace.create({
      data: {
        groupId: groupIdNumber,
      },
    });

    // Initialize all required configs with validated groupIdNumber
    await Promise.all([
      prisma.config.create({
        data: {
          key: "customization",
          workspaceGroupId: groupIdNumber,
          value: {
            color: color,
          },
        },
      }),
      prisma.config.create({
        data: {
          key: "theme",
          workspaceGroupId: groupIdNumber,
          value: color,
        },
      }),
      prisma.config.create({
        data: {
          key: "guides",
          workspaceGroupId: groupIdNumber,
          value: {
            enabled: true,
          },
        },
      }),
      prisma.config.create({
        data: {
          key: "sessions",
          workspaceGroupId: groupIdNumber,
          value: {
            enabled: true,
          },
        },
      }),
      prisma.config.create({
        data: {
          key: "home",
          workspaceGroupId: groupIdNumber,
          value: {
            widgets: [],
          },
        },
      }),
    ]);

    const role = await prisma.role.create({
      data: {
        workspaceGroupId: groupIdNumber,
        name: "Admin",
        isOwnerRole: true,
        permissions: [
          "admin",
          "view_staff_config",
          "manage_sessions",
          "manage_activity",
          "post_on_wall",
          "view_wall",
          "view_members",
          "manage_members",
          "manage_docs",
          "view_entire_groups_activity",
		  "remote_admin"
        ],
      },
    });

    await prisma.user.create({
      data: {
        userid: userid,
        info: {
          create: {
            passwordhash: await bcrypt.hash(password, 10),
          },
        },
        isOwner: true,
        roles: {
          connect: {
            id: role.id,
          },
        },
      },
    });

    req.session.userid = userid;
    await req.session?.save();

    const user: User & { isOwner: boolean } = {
      userId: req.session.userid,
      username: await getUsername(req.session.userid),
      displayname: await getDisplayName(req.session.userid),
      thumbnail: await getThumbnail(req.session.userid),
      isOwner: true,
    };

    await setRegistry(req.headers.host as string);

    res.status(200).json({ success: true, user });
  } catch (e) {
    console.error("Error in setup workspace:", e);
    res.status(500).json({ success: false, error: "Internal server error" });
  }
}

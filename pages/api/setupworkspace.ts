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
import bcryptjs from "bcryptjs";
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
  debug?: any;
};

type requestData = {
  groupid: number;
  username: string;
  password: string;
  color: string;
};

// Safe password hashing function
async function safeHashPassword(password: string): Promise<string> {
  try {
    return await bcryptjs.hash(password, 10);
  } catch (error) {
    console.error("Error hashing password:", error);
    throw new Error("Failed to hash password");
  }
}

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
    // Get Roblox user ID first
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

    // Check if workspace exists first
    const existingWorkspace = await prisma.workspace.findFirst().catch((e) => {
      console.error("Error checking existing workspace:", e);
      return null;
    });

    if (existingWorkspace) {
      console.error("Workspace already exists");
      return res
        .status(403)
        .json({ success: false, error: "Workspace already exists" });
    }

    // Hash password before any database operations
    const hashedPassword = await safeHashPassword(password);
    console.log("Password hashed successfully");

    // Create workspace with validated groupIdNumber
    const workspace = await prisma.workspace
      .create({
        data: {
          groupId: groupIdNumber,
        },
      })
      .catch((e) => {
        console.error("Error creating workspace:", e);
        throw new Error("Failed to create workspace");
      });

    console.log("Created workspace:", workspace);

    // Create all configs in a single transaction
    try {
      await prisma.$transaction([
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
            key: "allies",
            workspaceGroupId: groupIdNumber,
            value: {
              enabled: true,
            },
          },
        }),
        prisma.config.create({
          data: {
            key: "leaderboard",
            workspaceGroupId: groupIdNumber,
            value: {
              enabled: true,
            },
          },
        }),
        prisma.config.create({
          data: {
            key: "notices",
            workspaceGroupId: groupIdNumber,
            value: {
              enabled: true,
            },
          },
        }),
        prisma.config.create({
          data: {
            key: "policies",
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
      console.log("Created all configs successfully");
    } catch (e) {
      console.error("Error creating configs:", e);
      throw new Error("Failed to create configs");
    }

    // Create role in a separate transaction
    const role = await prisma.role
      .create({
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
            "manage_wall",
            "manage_views",
            "view_wall",
            "view_members",
            "sessions_assign",
            "sessions_claim",
            "sessions_host",
            "manage_members",
            "manage_quotas",
            "manage_docs",
            "manage_policies",
            "view_entire_groups_activity",
            "manage_alliances",
            "represent_alliance",
          ],
        },
      })
      .catch((e) => {
        console.error("Error creating role:", e);
        throw new Error("Failed to create role");
      });

    console.log("Created role:", role);

    // Create user in a separate transaction
    const user = await prisma.user
      .create({
        data: {
          userid: userid,
          info: {
            create: {
              passwordhash: hashedPassword,
            },
          },
          isOwner: true,
          roles: {
            connect: {
              id: role.id,
            },
          },
        },
      })
      .catch((e) => {
        console.error("Error creating user:", e);
        throw new Error("Failed to create user");
      });

    console.log("Created user:", user);

    // Set session after all database operations are complete
    req.session.userid = userid;
    await req.session?.save();

    // Get user info after session is set
    const userInfo: User & { isOwner: boolean } = {
      userId: req.session.userid,
      username: await getUsername(req.session.userid),
      displayname: await getDisplayName(req.session.userid),
      thumbnail: getThumbnail(req.session.userid),
      isOwner: true,
    };

    // Set registry last
    await setRegistry(req.headers.host as string);

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

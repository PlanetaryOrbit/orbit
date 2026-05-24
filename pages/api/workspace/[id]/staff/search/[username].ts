import type { NextApiRequest, NextApiResponse } from "next";
import prisma from "@/utils/database";
import { withPermissionCheck } from "@/utils/permissionsManager";
import moment from "moment";
import axios from "axios";
import { AuthenticatedRequest } from "@/lib/withAuth";

type Data = {
  success: boolean;
  error?: string;
  users?: any;
};

export default withPermissionCheck(handler, ["view_members", "create_quotas"]);

export async function handler(req: AuthenticatedRequest, res: NextApiResponse<Data>) {
  if (req.method !== "GET")
    return res
      .status(405)
      .json({ success: false, error: "Method not allowed" });
  if (!req.auth.userId)
    return res.status(401).json({ success: false, error: "Not logged in" });

  try {
    const searchQuery = String(req.query.username).trim();

    if (searchQuery.length === 0) {
      return res.status(200).json({
        success: true,
        users: [],
      });
    }

    const uid = parseInt(req.query.id as string, 10);

    const users = await prisma.user.findMany({
      where: {
        username: {
          contains: searchQuery,
          mode: "insensitive",
        },
        roles: {
          some: {
            workspaceGroupId: uid,
          },
        },
      },
      take: 10,
      select: {
        userid: true,
        username: true,
        picture: true,
      },
    });

    const infoUsers = users.map((user: any) => {
      const uid = user.userid.toString();
      return {
        userid: uid,
        username: user.username,
        picture:
          user.picture || `/api/user/${uid}/avatar/${uid}`,
      };
    });

    return res.status(200).json({ success: true, users: infoUsers });
  } catch (error: any) {
    console.error(error);
    return res
      .status(500)
      .json({ success: false, error: "Something went wrong" });
  }
}

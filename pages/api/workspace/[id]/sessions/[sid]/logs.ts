import type { NextApiRequest, NextApiResponse } from "next";
import prisma from "@/utils/database";
import { AuthenticatedRequest, withAuth } from "@/lib/withAuth";

type Data = {
  success: boolean;
  error?: string;
  logs?: any[];
  log?: any;
};

export default withAuth(handler);

export async function handler(req: AuthenticatedRequest, res: NextApiResponse<Data>) {
  const { id, sid } = req.query;
  if (!id || !sid)
    return res
      .status(400)
      .json({ success: false, error: "Missing required fields" });

  const session = await prisma.session.findFirst({
    where: {
      id: sid as string,
      sessionType: {
        workspaceGroupId: parseInt(id as string),
      },
    },
  });

  if (!session) {
    return res.status(404).json({ success: false, error: "Session not found" });
  }

  if (req.method === "GET") {
    try {
      const logs = await prisma.sessionLog.findMany({
        where: {
          sessionId: sid as string,
        },
        include: {
          actor: {
            select: {
              userid: true,
              username: true,
              picture: true,
            },
          },
          target: {
            select: {
              userid: true,
              username: true,
              picture: true,
            },
          },
        },
        orderBy: {
          createdAt: "desc",
        },
      });

      return res.status(200).json({
        success: true,
        logs: JSON.parse(
          JSON.stringify(logs, (key, value) =>
            typeof value === "bigint" ? value.toString() : value
          )
        ),
      });
    } catch (error) {
      console.error("Failed to fetch logs:", error);
      return res
        .status(500)
        .json({ success: false, error: "Failed to fetch logs" });
    }
  }

  if (req.method === "POST") {
    const { action, targetId, metadata } = req.body;
    if (!action) {
      return res
        .status(400)
        .json({ success: false, error: "Action is required" });
    }

    try {
      const log = await prisma.sessionLog.create({
        data: {
          sessionId: sid as string,
          actorId: BigInt(req.auth.userId),
          targetId: targetId ? BigInt(targetId) : null,
          action,
          metadata: metadata || {},
        },
        include: {
          actor: {
            select: {
              userid: true,
              username: true,
              picture: true,
            },
          },
          target: {
            select: {
              userid: true,
              username: true,
              picture: true,
            },
          },
        },
      });

      return res.status(200).json({
        success: true,
        log: JSON.parse(
          JSON.stringify(log, (key, value) =>
            typeof value === "bigint" ? value.toString() : value
          )
        ),
      });
    } catch (error) {
      console.error("Failed to create log:", error);
      return res
        .status(500)
        .json({ success: false, error: "Failed to create log" });
    }
  }

  return res.status(405).json({ success: false, error: "Method not allowed" });
}

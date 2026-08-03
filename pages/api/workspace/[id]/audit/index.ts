import type { NextApiRequest, NextApiResponse } from "next";
import { withPermissionCheck } from "@/utils/permissionsManager";
import { queryAudit } from "@/utils/logs";
import prisma from "@/utils/database";
import cache from "@/utils/cache";

type Data = {
  success: boolean;
  error?: string;
  rows?: any[];
  pagination?: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
};

export default withPermissionCheck(handler, "view_audit_logs");

export async function handler(
  req: NextApiRequest,
  res: NextApiResponse<Data>
) {
  if (req.method !== "GET") {
    return res.status(405).json({
      success: false,
      error: "Method not allowed",
    });
  }

  const workspaceId = Number(req.query.id);

  if (!workspaceId) {
    return res.status(400).json({
      success: false,
      error: "Missing workspace id",
    });
  }

  const page = Math.max(Number(req.query.page ?? 1), 1);
  const limit = Math.min(Math.max(Number(req.query.limit ?? 50), 1), 100);

  const userId = req.query.userId
    ? Number(req.query.userId)
    : undefined;

  const action =
    typeof req.query.action === "string"
      ? req.query.action
      : undefined;

  const search =
    typeof req.query.search === "string"
      ? req.query.search
      : undefined;

  const skip = (page - 1) * limit;
  // our cacheKey should be just workspaceId


  try {
    const result = await queryAudit(workspaceId, {
      userId,
      action,
      search,
      skip,
      take: limit,
    });


    const rows = result.rows ?? [];

    const userIds = [
      ...new Set(
        rows
          .map((r) => r.userId)
          .filter(Boolean)
          .map(Number)
      ),
    ];


    const users =
      userIds.length > 0
        ? await prisma.user.findMany({
            where: {
              userid: {
                in: userIds.map(BigInt),
              },
            },
            select: {
              userid: true,
              username: true,
            },
          })
        : [];


    const userMap = new Map(
      users.map((u) => [
        String(u.userid),
        u.username ?? String(u.userid),
      ])
    );


    const enrichedRows = rows.map((r) => ({
      ...r,
      userName:
        (r.userId && userMap.get(String(r.userId))) ||
        r.details?.actorUsername ||
        r.details?.actorName ||
        r.userId ||
        "System",
    }));


    const response = {
      success: true,
      rows: enrichedRows,
      pagination: {
        page,
        limit,
        total: result.total ?? 0,
        pages: Math.ceil((result.total ?? 0) / limit),
      },
    };


    await cacheSet(
      cacheKey,
      response,
      30 // seconds
    );


    return res.status(200).json(response);

  } catch (e) {
    console.error("[Audit] Error querying audits", e);

    return res.status(500).json({
      success: false,
      error: "Internal error",
    });
  }
}

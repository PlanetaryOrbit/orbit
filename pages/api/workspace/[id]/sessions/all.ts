import { NextApiRequest, NextApiResponse } from "next";
import prisma from "@/utils/database";
import { withPermissionCheck } from "@/utils/permissionsManager";
import { getConfig } from "@/utils/configEngine";

export default withPermissionCheck(
  async (req: NextApiRequest, res: NextApiResponse) => {
    if (req.method !== "GET") {
      return res.status(405).json({ error: "Method not allowed" });
    }

    const { id, page, limit } = req.query;
    const userId = (req as any).session?.userid;

    const pageNum = parseInt(page as string) || 1;
    const limitNum = Math.min(parseInt(limit as string) || 50, 100);
    const skip = (pageNum - 1) * limitNum;

    try {
      const totalCount = await prisma.session.count({
        where: {
          sessionType: {
            workspaceGroupId: parseInt(id as string),
          },
        },
      });

      const sessions = await prisma.session.findMany({
        where: {
          sessionType: {
            workspaceGroupId: parseInt(id as string),
          },
        },
        include: {
          owner: true,
          sessionType: {
            include: {
              schedule: true,
            },
          },
          users: {
            include: {
              user: true,
            },
          },
        },
        orderBy: {
          date: "asc",
        },
        skip: skip,
        take: limitNum,
      });

      let userRole = null;
      let isAdmin = false;
      if (userId) {
        const user = await prisma.user.findFirst({
          where: { userid: BigInt(userId) },
          include: {
            roles: {
              where: { workspaceGroupId: parseInt(id as string) },
            },
            workspaceMemberships: {
              where: { workspaceGroupId: parseInt(id as string) },
            },
          },
        });
        userRole = user?.roles?.[0];
        const membership = user?.workspaceMemberships?.[0];
        isAdmin = membership?.isAdmin || false;
      }

      const visibilityFilters = await getConfig(
        "session_filters",
        parseInt(id as string)
      );

      let filteredSessions = sessions;
      if (
        visibilityFilters &&
        userRole &&
        !isAdmin &&
        !userRole.permissions?.includes("admin")
      ) {
        const roleId = userRole.id;
        const allowedTypes = visibilityFilters[roleId];

        if (allowedTypes && Array.isArray(allowedTypes)) {
          filteredSessions = sessions.filter((session) =>
            allowedTypes.includes(session.type)
          );
        }
      }

      const serializedSessions = JSON.parse(
        JSON.stringify(filteredSessions, (key, value) =>
          typeof value === "bigint" ? value.toString() : value
        )
      );
      const totalPages = Math.ceil(totalCount / limitNum);
      const hasNextPage = pageNum < totalPages;
      const hasPreviousPage = pageNum > 1;

      res.status(200).json({
        data: serializedSessions,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total: totalCount,
          totalPages: totalPages,
          hasNextPage: hasNextPage,
          hasPreviousPage: hasPreviousPage,
        },
      });
    } catch (error) {
      console.error("Error fetching all sessions:", error);
      res.status(500).json({ error: "Failed to fetch sessions" });
    }
  }
);
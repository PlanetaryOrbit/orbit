import { NextApiRequest, NextApiResponse } from "next";
import prisma from "@/utils/database";
import { withPermissionCheck } from "@/utils/permissionsManager";
import { getConfig } from "@/utils/configEngine";

export default withPermissionCheck(
  async (req: NextApiRequest, res: NextApiResponse) => {
    if (req.method !== "GET") {
      return res.status(405).json({ error: "Method not allowed" });
    }

    const { id, date } = req.query;
    const userId = (req as any).session?.userid;

    try {
      const whereClause: any = {
        sessionType: {
          workspaceGroupId: parseInt(id as string),
        },
      };

      if (date) {
        const targetDate = new Date(date as string);
        const startOfDay = new Date(targetDate);
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date(targetDate);
        endOfDay.setHours(23, 59, 59, 999);
        const oneHourAgo = new Date();
        oneHourAgo.setHours(oneHourAgo.getHours() - 1);
        
        whereClause.date = {
          gte: oneHourAgo < startOfDay ? startOfDay : oneHourAgo,
          lte: endOfDay,
        };
      }

      const sessions = await prisma.session.findMany({
        where: whereClause,
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

      res.status(200).json(serializedSessions);
    } catch (error) {
      console.error("Error fetching upcoming sessions:", error);
      res.status(500).json({ error: "Failed to fetch sessions" });
    }
  }
);

import { NextApiRequest, NextApiResponse } from "next";
import prisma from "@/utils/database";
import { withPermissionCheck } from "@/utils/permissionsManager";
import { getConfig } from "@/utils/configEngine";

export default withPermissionCheck(
  async (req: NextApiRequest, res: NextApiResponse) => {
    if (req.method !== "GET") {
      return res.status(405).json({ error: "Method not allowed" });
    }

    const { id, date, timezoneOffset, startDate, endDate } = req.query;
    const userId = (req as any).session?.userid;

    try {
      const whereClause: any = {
        sessionType: {
          workspaceGroupId: parseInt(id as string),
        },
      };

      if (startDate && endDate) {
        whereClause.date = {
          gte: new Date(startDate as string),
          lte: new Date(endDate as string),
        };
      } else if (date) {
        const [year, month, day] = (date as string).split('-').map(Number);
        const offset = timezoneOffset ? -parseInt(timezoneOffset as string) : 0;
        const startOfDay = new Date(year, month - 1, day, 0, 0, 0, 0);
        const startUTC = new Date(startOfDay.getTime() - offset * 60000);
        const endOfDay = new Date(year, month - 1, day, 23, 59, 59, 999);
        const endUTC = new Date(endOfDay.getTime() - offset * 60000);

        whereClause.date = {
          gte: startUTC,
          lte: endUTC,
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

      let filteredSessions = sessions;
      if (userRole && !isAdmin) {
        const sessionTypes = ["shift", "training", "event", "other"];
        const visibleTypes = sessionTypes.filter(type => 
          userRole.permissions.includes(`sessions_${type}_see`)
        );
        
        if (visibleTypes.length > 0) {
          filteredSessions = sessions.filter((session) =>
            visibleTypes.includes(session.type || "other")
          );
        } else {
          filteredSessions = [];
        }
      }

      const serializedSessions = JSON.parse(
        JSON.stringify(filteredSessions, (key, value) =>
          typeof value === "bigint" ? value.toString() : value
        )
      );

      res.status(200).json(serializedSessions);
    } catch (error) {
      console.error("Error fetching all sessions:", error);
      res.status(500).json({ error: "Failed to fetch sessions" });
    }
  }
);
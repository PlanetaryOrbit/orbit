import { NextApiRequest, NextApiResponse } from "next";
import prisma from "@/utils/database";
import { withSessionRoute } from "@/lib/withSession";

export default withSessionRoute(
  async (req: NextApiRequest, res: NextApiResponse) => {
    if (req.method !== "POST") {
      return res.status(405).json({ error: "Method not allowed" });
    }

    const { id, sid } = req.query;
    const { date, slotId, slotIndex, userId, timezoneOffset } = req.body;

    if (
      !date ||
      !slotId ||
      slotIndex === undefined ||
      !userId ||
      timezoneOffset === undefined
    ) {
      return res.status(400).json({ error: "Missing required parameters" });
    }

    try {
      const schedule = await prisma.schedule.findUnique({
        where: { id: sid as string },
        include: {
          sessionType: true,
        },
      });

      if (!schedule) {
        return res.status(404).json({ error: "Schedule not found" });
      }

      const sessionType = schedule.sessionType.name.toLowerCase();
      const userId = (req as any).session?.userid;
      if (!userId) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const user = await prisma.user.findFirst({
        where: { userid: BigInt(userId) },
        include: {
          roles: { where: { workspaceGroupId: parseInt(id as string) } },
          workspaceMemberships: { where: { workspaceGroupId: parseInt(id as string) } },
        },
      });

      const membership = user?.workspaceMemberships?.[0];
      const isAdmin = membership?.isAdmin || false;
      const userRole = user?.roles?.[0];

      if (!isAdmin && userRole) {
        const hasPermission = userRole.permissions.includes(`sessions_${sessionType}_assign`);
        if (!hasPermission) {
          return res.status(403).json({ error: "You don't have permission to assign users to this session type" });
        }
      }

      const sessionDate = new Date(parseInt(date));
      sessionDate.setMinutes(sessionDate.getMinutes() - timezoneOffset);
      sessionDate.setUTCHours(schedule.Hour);
      sessionDate.setUTCMinutes(schedule.Minute);
      sessionDate.setUTCSeconds(0);
      sessionDate.setUTCMilliseconds(0);

      let session = await prisma.session.findFirst({
        where: {
          scheduleId: schedule.id,
          date: sessionDate,
        },
        include: {
          users: {
            include: {
              user: true,
            },
          },
          owner: true,
        },
      });

      if (!session) {
        session = await prisma.session.create({
          data: {
            date: sessionDate,
            sessionTypeId: schedule.sessionTypeId,
            scheduleId: schedule.id,
          },
          include: {
            users: {
              include: {
                user: true,
              },
            },
            owner: true,
          },
        });
      }

      const existingAssignment = await prisma.sessionUser.findFirst({
        where: {
          sessionid: session.id,
          roleID: slotId,
          slot: slotIndex,
        },
      });

      if (existingAssignment) {
        return res.status(400).json({ error: "Slot already assigned" });
      }

      const workspaceUser = await prisma.workspaceMember.findFirst({
        where: {
          workspaceGroupId: parseInt(
            schedule.sessionType.workspaceGroupId.toString()
          ),
          userId: BigInt(userId),
        },
        include: {
          user: true,
        },
      });

      if (!workspaceUser) {
        return res.status(400).json({ error: "User not found in workspace" });
      }

      await prisma.sessionUser.create({
        data: {
          userid: BigInt(userId),
          sessionid: session.id,
          roleID: slotId,
          slot: slotIndex,
        },
      });

      const updatedSession = await prisma.session.findUnique({
        where: { id: session.id },
        include: {
          users: {
            include: {
              user: true,
            },
          },
          owner: true,
        },
      });

      res.status(200).json({ session: updatedSession });
    } catch (error) {
      console.error("Error assigning slot:", error);
      res.status(500).json({ error: "Failed to assign slot" });
    }
  }
);

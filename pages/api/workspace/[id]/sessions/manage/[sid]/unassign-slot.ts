import { NextApiRequest, NextApiResponse } from "next";
import prisma from "@/utils/database";
import { withSessionRoute } from "@/lib/withSession";

export default withSessionRoute(
  async (req: NextApiRequest, res: NextApiResponse) => {
    if (req.method !== "DELETE") {
      return res.status(405).json({ error: "Method not allowed" });
    }

    const { id, sid } = req.query;
    const { date, slotId, slotIndex, timezoneOffset } = req.body;

    if (
      !date ||
      !slotId ||
      slotIndex === undefined ||
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
          return res.status(403).json({ error: "You don't have permission to unassign users from this session type" });
        }
      }

      const sessionDate = new Date(parseInt(date));
      sessionDate.setMinutes(sessionDate.getMinutes() - timezoneOffset);
      sessionDate.setUTCHours(schedule.Hour);
      sessionDate.setUTCMinutes(schedule.Minute);
      sessionDate.setUTCSeconds(0);
      sessionDate.setUTCMilliseconds(0);

      const session = await prisma.session.findFirst({
        where: {
          scheduleId: schedule.id,
          date: sessionDate,
        },
      });

      if (!session) {
        return res.status(404).json({ error: "Session not found" });
      }

      await prisma.sessionUser.deleteMany({
        where: {
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
      console.error("Error unassigning slot:", error);
      res.status(500).json({ error: "Failed to unassign slot" });
    }
  }
);

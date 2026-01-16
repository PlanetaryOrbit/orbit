import { NextApiRequest, NextApiResponse } from "next";
import prisma from "@/utils/database";
import { withPermissionCheck } from "@/utils/permissionsManager";

const sessionEditLimits: {
  [key: string]: { count: number; resetTime: number };
} = {};

function checkSessionEditRateLimit(
  req: NextApiRequest,
  res: NextApiResponse
): boolean {
  const workspaceId = req.query?.id || "unknown";
  const sessionId = req.query?.sid || "unknown";
  const userId = (req as any).session?.userid || "anonymous";
  const key = `workspace:${workspaceId}:session:${sessionId}:user:${userId}`;
  const now = Date.now();
  const windowMs = 60 * 1000;
  const maxRequests = 10;

  let entry = sessionEditLimits[key];
  if (!entry || now >= entry.resetTime) {
    entry = { count: 0, resetTime: now + windowMs };
    sessionEditLimits[key] = entry;
  }

  entry.count++;
  if (entry.count > maxRequests) {
    res.status(429).json({
      success: false,
      error:
        "Too many edit attempts. Please wait a moment before making more changes.",
    });
    return false;
  }
  return true;
}

export default withPermissionCheck(
  async (req: NextApiRequest, res: NextApiResponse) => {
    if (req.method === "PUT") {
      if (!checkSessionEditRateLimit(req, res)) return;
    }
    const { id, sid } = req.query;

    if (req.method === "PUT") {
      const {
        date,
        time,
        name,
        description,
        duration,
        updateAll,
        ownerId,
        userAssignments,
        timezoneOffset,
        statues,
      } = req.body;
      if (!date) {
        return res.status(400).json({ error: "Session date is required" });
      }

      try {
        let sessionDate: Date;
        if (time) {
          const parsedDate = new Date(date + "T" + time + ":00Z");
          const offsetMinutes = timezoneOffset || 0;
          sessionDate = new Date(parsedDate.getTime() + offsetMinutes * 60000);
        } else {
          sessionDate = new Date(date);
        }

        const currentSession = await prisma.session.findUnique({
          where: { id: sid as string },
          include: { sessionType: true },
        });

        if (!currentSession) {
          return res.status(404).json({ error: "Session not found" });
        }

        const sessionUpdateData: any = {
          date: sessionDate,
        };

        if (name !== undefined) {
          sessionUpdateData.name = name;
        }
        if (ownerId !== undefined) {
          sessionUpdateData.ownerId = ownerId ? BigInt(ownerId) : null;
        }
        if (duration !== undefined) {
          sessionUpdateData.duration = duration;
        } else if (!(currentSession as any).duration) {
          sessionUpdateData.duration = 30;
        }

        const updatedSession = await prisma.session.update({
          where: {
            id: sid as string,
          },
          data: sessionUpdateData,
          include: {
            sessionType: true,
            owner: true,
            users: {
              include: {
                user: true,
              },
            },
          },
        });

        // Update session type description if provided
        if (description !== undefined) {
          await prisma.sessionType.update({
            where: { id: currentSession.sessionTypeId },
            data: { description: description || null },
          });
        }

        // Update session type statues if provided
        if (statues !== undefined) {
          await prisma.sessionType.update({
            where: { id: currentSession.sessionTypeId },
            data: { statues: statues },
          });
        }

        if (userAssignments !== undefined) {
          await prisma.sessionUser.deleteMany({
            where: {
              sessionid: sid as string,
            },
          });

          if (userAssignments && Array.isArray(userAssignments)) {
            await Promise.all(
              userAssignments.map((assignment) =>
                prisma.sessionUser.create({
                  data: {
                    userid: BigInt(assignment.userId),
                    sessionid: sid as string,
                    roleID: assignment.roleID,
                    slot: assignment.slot,
                  },
                })
              )
            );
          }
        }

        const finalSession = await prisma.session.findUnique({
          where: { id: sid as string },
          include: {
            sessionType: true,
            owner: true,
            users: {
              include: {
                user: true,
              },
            },
          },
        });

        const serializedSession = JSON.parse(
          JSON.stringify(finalSession, (key, value) =>
            typeof value === "bigint" ? value.toString() : value
          )
        );

        res.status(200).json(serializedSession);
      } catch (error) {
        console.error("Error updating session:", error);
        res.status(500).json({ error: "Failed to update session" });
      }
    } else if (req.method === "DELETE") {
      try {
        await prisma.sessionUser.deleteMany({
          where: {
            sessionid: sid as string,
          },
        });

        await prisma.session.delete({
          where: {
            id: sid as string,
          },
        });

        res.status(200).json({ message: "Session deleted successfully" });
      } catch (error) {
        console.error("Error deleting session:", error);
        res.status(500).json({ error: "Failed to delete session" });
      }
    } else {
      res.status(405).json({ error: "Method not allowed" });
    }
  },
  [
    "sessions_shift_manage",
    "sessions_training_manage",
    "sessions_event_manage",
    "sessions_other_manage"
  ]
);

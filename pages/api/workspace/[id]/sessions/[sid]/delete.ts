import type { NextApiRequest, NextApiResponse } from "next";
import prisma from "@/utils/database";
import { withPermissionCheck } from "@/utils/permissionsManager";

type Data = {
  success: boolean;
  error?: string;
};

export default withPermissionCheck(handler, [
  "sessions_shift_manage",
  "sessions_training_manage",
  "sessions_event_manage",
  "sessions_other_manage"
]);

export async function handler(req: NextApiRequest, res: NextApiResponse<Data>) {
  if (req.method !== "DELETE")
    return res
      .status(405)
      .json({ success: false, error: "Method not allowed" });

  const sessionId = req.query.sid as string;
  const { deleteAll } = req.body;

  if (!sessionId) {
    return res
      .status(400)
      .json({ success: false, error: "Session ID is required" });
  }

  try {
    const session = await prisma.session.findUnique({
      where: { id: sessionId },
      include: {
        sessionType: true,
      },
    });

    if (!session) {
      return res
        .status(404)
        .json({ success: false, error: "Session not found" });
    }

    if (deleteAll && session.scheduleId) {
      await prisma.session.deleteMany({
        where: {
          scheduleId: session.scheduleId,
          date: {
            gte: session.date,
          },
        },
      });
      console.log(
        `[Sessions] Deleted current and future sessions for schedule ${session.scheduleId} from ${session.date}`
      );
      try {
        const { logAudit } = await import('@/utils/logs');
        await logAudit(Number(req.query.id), Number((req as any).session?.userid), 'session.delete.range', `sessionSchedule:${session.scheduleId}`, { from: session.date.toISOString(), scheduleId: session.scheduleId });
      } catch (e) {}
    } else {
      await prisma.session.delete({
        where: { id: sessionId },
      });
      console.log(`[Sessions] Deleted individual session ${sessionId}`);
      try {
        const { logAudit } = await import('@/utils/logs');
        await logAudit(Number(req.query.id), Number((req as any).session?.userid), 'session.delete', `session:${sessionId}`, { id: sessionId });
      } catch (e) {}
    }

    res.status(200).json({ success: true });
  } catch (error) {
    console.error("Error deleting session:", error);
    res.status(500).json({ success: false, error: "Failed to delete session" });
  }
}

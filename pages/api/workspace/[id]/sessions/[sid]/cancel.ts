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
  "sessions_other_manage",
  "sessions_shift_cancel",
  "sessions_training_cancel",
  "sessions_event_cancel",
  "sessions_other_cancel",
]);

export async function handler(req: NextApiRequest, res: NextApiResponse<Data>) {
  if (req.method !== "PATCH" && req.method !== "DELETE")
    return res
      .status(405)
      .json({ success: false, error: "Method not allowed" });

  const sessionId = req.query.sid as string;

  if (!sessionId)
    return res
      .status(400)
      .json({ success: false, error: "Session ID is required" });

  if (req.method === "PATCH") {
    const { reason } = req.body;

    if (!reason || !reason.trim())
      return res
        .status(400)
        .json({ success: false, error: "A cancellation reason is required" });

    try {
      const session = await prisma.session.findUnique({
        where: { id: sessionId },
      });

      if (!session)
        return res
          .status(404)
          .json({ success: false, error: "Session not found" });

      if (session.cancelled)
        return res
          .status(409)
          .json({ success: false, error: "Session is already cancelled" });

      await prisma.session.update({
        where: { id: sessionId },
        data: {
          cancelled: true,
          cancellationReason: reason.trim(),
        },
      });

      try {
        const { logAudit } = await import("@/utils/logs");
        await logAudit(
          Number(req.query.id),
          Number((req as any).auth?.userId),
          "session.cancel",
          `session:${sessionId}`,
          { reason: reason.trim() },
        );
      } catch (e) {}

      return res.status(200).json({ success: true });
    } catch (error) {
      console.error("Error cancelling session:", error);
      return res
        .status(500)
        .json({ success: false, error: "Failed to cancel session" });
    }
  } else if (req.method === "DELETE") {
    try {
      const session = await prisma.session.findUnique({
        where: { id: sessionId },
      });

      if (!session)
        return res
          .status(404)
          .json({ success: false, error: "Session not found" });

      await prisma.session.update({
        where: { id: sessionId },
        data: {
          cancelled: false,
          cancellationReason: null,
        },
      });

      try {
        const { logAudit } = await import("@/utils/logs");
        await logAudit(
          Number(req.query.id),
          Number((req as any).auth?.userId),
          "session.uncancel",
          `session:${sessionId}`,
        );
      } catch (e) {}

      return res.status(200).json({ success: true });
    } catch (error) {
      console.error("Error uncancelling session:", error);
      return res
        .status(500)
        .json({ success: false, error: "Failed to uncancel session" });
    }
  }
}

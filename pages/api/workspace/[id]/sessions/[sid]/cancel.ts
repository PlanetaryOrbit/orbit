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
]);

export async function handler(req: NextApiRequest, res: NextApiResponse<Data>) {
  if (req.method !== "PATCH")
    return res.status(405).json({ success: false, error: "Method not allowed" });

  const sessionId = req.query.sid as string;
  const { reason } = req.body;

  if (!sessionId)
    return res.status(400).json({ success: false, error: "Session ID is required" });

  if (!reason || !reason.trim())
    return res.status(400).json({ success: false, error: "A cancellation reason is required" });

  try {
    const session = await prisma.session.findUnique({ where: { id: sessionId } });

    if (!session)
      return res.status(404).json({ success: false, error: "Session not found" });

    if (session.cancelled)
      return res.status(409).json({ success: false, error: "Session is already cancelled" });

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
        Number((req as any).session?.userid),
        "session.cancel",
        `session:${sessionId}`,
        { reason: reason.trim() }
      );
    } catch (e) {}

    return res.status(200).json({ success: true });
  } catch (error) {
    console.error("Error cancelling session:", error);
    return res.status(500).json({ success: false, error: "Failed to cancel session" });
  }
}

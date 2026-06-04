import type { NextApiResponse } from "next";
import prisma from "@/utils/database";
import { AuthenticatedRequest, withAuth } from "@/lib/withAuth";

type Data = {
  success: boolean;
  error?: string;
};

export default withAuth(handler);

async function handler(req: AuthenticatedRequest, res: NextApiResponse<Data>) {
  if (req.method !== "POST") {
    return res.status(405).json({ success: false, error: "Method not allowed" });
  }

  const { sessionId, workspaceId } = req.body;

  if (!sessionId || typeof sessionId !== "string") {
    return res.status(400).json({ success: false, error: "Missing or invalid sessionId" });
  }

  if (!workspaceId || isNaN(workspaceId)) {
    return res.status(400).json({ success: false, error: "Missing or invalid workspaceId" });
  }

  try {
    const session = await prisma.activitySession.findUnique({
      where: { id: sessionId, workspaceGroupId: Number(workspaceId) },
    });

    if (!session) {
      return res.status(404).json({ success: false, error: "Session not found" });
    }

    if (session.userId != req.session.userid) {
      return res.status(403).json({ success: false, error: "You can only end your own sessions" });
    }

    if (!session.active) {
      return res.status(400).json({ success: false, error: "Session is already ended" });
    }

    await prisma.activitySession.update({
      where: { id: sessionId, workspaceGroupId: Number(workspaceId) },
      data: {
        active: false,
        endTime: new Date(),
      },
    });

    console.log(`[FORCE END] Session ${sessionId} force-ended by user ${req.session.userid} in workspace ${workspaceId}`);
    return res.status(200).json({ success: true });
  } catch (err) {
    console.error("[FORCE END] Unexpected error:", err);
    return res.status(500).json({ success: false, error: "Internal server error" });
  }
}
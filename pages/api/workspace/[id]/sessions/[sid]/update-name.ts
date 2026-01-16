import { NextApiRequest, NextApiResponse } from "next";
import prisma from "@/utils/database";
import { withPermissionCheck } from "@/utils/permissionsManager";

type Data = {
  success: boolean;
  error?: string;
  session?: any;
};

async function handler(req: NextApiRequest, res: NextApiResponse<Data>) {
  if (req.method !== "PUT") {
    return res
      .status(405)
      .json({ success: false, error: "Method not allowed" });
  }

  const { sid: sessionId } = req.query;
  const { name } = req.body;

  if (!sessionId) {
    return res
      .status(400)
      .json({ success: false, error: "Session ID is required" });
  }

  if (!name || typeof name !== "string" || !name.trim()) {
    return res
      .status(400)
      .json({ success: false, error: "Session name is required" });
  }

  try {
    const session = await prisma.session.findFirst({
      where: {
        id: sessionId as string,
      },
    });

    if (!session) {
      return res
        .status(404)
        .json({ success: false, error: "Session not found" });
    }

    const updatedSession = await prisma.session.update({
      where: {
        id: sessionId as string,
      },
      data: {
        name: name.trim(),
      },
    });

    res.status(200).json({
      success: true,
      session: updatedSession,
    });
  } catch (error) {
    console.error("Error updating session name:", error);
    res.status(500).json({ success: false, error: "Internal server error" });
  }
}

export default withPermissionCheck(handler, [
  "sessions_shift_manage",
  "sessions_training_manage",
  "sessions_event_manage",
  "sessions_other_manage"
]);

// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from "next";
import prisma, { SessionType } from "@/utils/database";
import { withPermissionCheck } from "@/utils/permissionsManager";

type Data = {
  success: boolean;
  error?: string;
  session?: SessionType;
};

export default withPermissionCheck(handler, [
  "sessions_shift_manage",
  "sessions_training_manage",
  "sessions_event_manage",
  "sessions_other_manage"
]);

export async function handler(req: NextApiRequest, res: NextApiResponse<Data>) {
  if (req.method !== "POST")
    return res
      .status(405)
      .json({ success: false, error: "Method not allowed" });
  const { name, permissions, statues, slots } = req.body;
  if (!name || !permissions || !statues || !slots)
    return res
      .status(400)
      .json({ success: false, error: "Missing required fields" });

  const findSession = await prisma.sessionType.findUnique({
    where: {
      id: req.query.sid as string,
    },
    include: {
      hostingRoles: true,
    },
  });
  if (!findSession)
    return res.status(404).json({ success: false, error: "Session not found" });

  const session = await prisma.sessionType.update({
    where: {
      id: req.query.sid as string,
    },
    data: {
      workspaceGroupId: parseInt(req.query.id as string),
      name,
      gameId: req.body.gameId ? BigInt(req.body.gameId as string) : null,
      statues: statues || [],
      slots: slots || [],
      hostingRoles: {
        disconnect: [
          ...findSession.hostingRoles.map((role) => ({ id: role.id })),
        ],
        connect: [...permissions.map((role: string) => ({ id: role }))],
      },
    },
  });

  res.status(200).json({ success: true });
}

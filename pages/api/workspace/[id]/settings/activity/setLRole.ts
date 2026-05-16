// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from "next";
import { getConfig, setConfig } from "@/utils/configEngine";
import prisma from "@/utils/database";
import { withPermissionCheck } from "@/utils/permissionsManager";
import { logAudit } from '@/utils/logs';

type Data = {
  success: boolean;
  error?: string;
};

export default withPermissionCheck(handler, "admin");

export async function handler(req: NextApiRequest, res: NextApiResponse<Data>) {
  if (req.method !== "POST")
    return res
      .status(405)
      .json({ success: false, error: "Method not allowed" });

  const workspace = await prisma.workspace.findFirst({
    where: {
      groupId: parseInt(req.query.id as string),
    },
  });
  if (!workspace)
    return res
      .status(404)
      .json({ success: false, error: "Workspace not found" });

  const { role } = req.body;

  if (role !== null && role !== undefined && typeof role !== "number") {
    return res
      .status(400)
      .json({ success: false, error: "Leaderboard role must be a number" });
  }

  const currentConfig =
    (await getConfig("activity", parseInt(req.query.id as string))) || {};
  const updatedConfig = {
    ...currentConfig,
    lRole: role,
  };

  await setConfig("activity", updatedConfig, parseInt(req.query.id as string));

  try { await logAudit(parseInt(req.query.id as string), (req as any).auth?.userId || null, 'settings.activity.lRole.update', 'activity.lRole', { before: currentConfig, after: updatedConfig }); } catch (e) {}

  res.status(200).json({ success: true });
}

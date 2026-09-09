import type { NextApiRequest, NextApiResponse } from "next";
import { withPermissionCheck } from "@/utils/permissionsManager";
import { getRankGun } from "@/utils/rankgun";
import prisma from "@/utils/database";

export default withPermissionCheck(handler, "rank_users");

async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") {
    return res
      .status(405)
      .json({ success: false, error: "Method not allowed" });
  }

  const { id } = req.query;
  if (!id) {
    return res
      .status(400)
      .json({ success: false, error: "Missing workspace ID" });
  }

  try {
    const workspaceGroupId = parseInt(id as string);
    const rankGun = await getRankGun(workspaceGroupId);
    const external = await prisma.workspaceExternalServices.findFirst({
      where: { workspaceGroupId },
    });
    const openCloudEnabled =
      external?.rankingProvider === "opencloudranking" &&
      typeof external.rankingToken === "string" &&
      external.rankingToken.length > 0;
    const rankingEnabled = !!rankGun || openCloudEnabled;
    return res.status(200).json({
      success: true,
      rankGunEnabled: !!rankGun,
      openCloudEnabled,
      rankingEnabled,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: "Failed to check External configuration",
    });
  }
}

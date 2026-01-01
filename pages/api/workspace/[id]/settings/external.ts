import type { NextApiRequest, NextApiResponse } from "next";
import prisma from "@/utils/database";
import { withPermissionCheck } from "@/utils/permissionsManager";

export default withPermissionCheck(handler, "admin");

async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { id: workspaceId } = req.query;

  if (!workspaceId || typeof workspaceId !== "string") {
    return res.status(400).json({ message: "Invalid workspace ID" });
  }

  if (req.method === "GET") {
    try {
      const settings = await prisma.workspaceExternalServices.findFirst({
        where: {
          workspaceGroupId: parseInt(workspaceId),
        },
      });

      return res.status(200).json({
        rankingProvider: settings?.rankingProvider || "",
        rankingToken: settings?.rankingToken || "",
        rankingWorkspaceId: settings?.rankingWorkspaceId || "",
      });
    } catch (error) {
      console.error("Error fetching external services settings:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  }

  if (req.method === "POST") {
    const { rankingProvider, rankingToken, rankingWorkspaceId } = req.body;

    if (typeof rankingProvider !== "string") {
      return res.status(400).json({ message: "Invalid ranking provider" });
    }
    if (rankingProvider === "rankgun") {
      if (!rankingToken || !rankingWorkspaceId) {
        return res
          .status(400)
          .json({ message: "RankGun requires both API key and workspace ID" });
      }
    }

    try {
      await prisma.workspaceExternalServices.upsert({
        where: {
          workspaceGroupId: parseInt(workspaceId),
        },
        update: {
          rankingProvider: rankingProvider || null,
          rankingToken: rankingToken || null,
          rankingWorkspaceId: rankingWorkspaceId || null,
          updatedAt: new Date(),
        },
        create: {
          workspaceGroupId: parseInt(workspaceId),
          rankingProvider: rankingProvider || null,
          rankingToken: rankingToken || null,
          rankingWorkspaceId: rankingWorkspaceId || null,
        },
      });

      return res.status(200).json({ message: "Settings saved successfully" });
    } catch (error) {
      console.error("Error saving external services settings:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  }

  return res.status(405).json({ message: "Method not allowed" });
}

import type { NextApiRequest, NextApiResponse } from "next";
import prisma from "@/utils/database";
import { withPermissionCheck } from "@/utils/permissionsManager";

export default withPermissionCheck(handler, "admin");

function parseRankMax(v: unknown): number | null {
  if (v === null || v === undefined || v === "") return null;
  const n = typeof v === "number" ? v : parseInt(String(v), 10);
  if (!Number.isFinite(n) || n < 1) return null;
  return Math.min(255, Math.floor(n));
}

async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { id: workspaceId } = req.query;

  if (!workspaceId || typeof workspaceId !== "string") {
    return res.status(400).json({ message: "Invalid workspace ID" });
  }

  const wid = parseInt(workspaceId, 10);

  if (req.method === "GET") {
    try {
      const settings = await prisma.workspaceExternalServices.findFirst({
        where: {
          workspaceGroupId: wid,
        },
      });

      return res.status(200).json({
        rankingProvider: settings?.rankingProvider || "",
        rankingWorkspaceId: settings?.rankingWorkspaceId || "",
        hasRankingToken: !!(settings?.rankingToken && settings.rankingToken.length > 0),
        rankingMaxRank:
          typeof settings?.rankingMaxRank === "number" ? settings.rankingMaxRank : null,
      });
    } catch (error) {
      console.error("Error fetching external services settings:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  }

  if (req.method === "POST") {
    const body = req.body as {
      rankingProvider?: string;
      rankingToken?: string;
      rankingWorkspaceId?: string;
      rankingMaxRank?: number | string | null;
      clearRankingToken?: boolean;
    };

    if (typeof body.rankingProvider !== "string") {
      return res.status(400).json({ message: "Invalid ranking provider" });
    }

    const rankingProvider = body.rankingProvider;
    const rankingMaxRank = parseRankMax(body.rankingMaxRank);
    const clearRankingToken = body.clearRankingToken === true;
    const tokenTrim =
      typeof body.rankingToken === "string" ? body.rankingToken.trim() : "";
    const wsTrim =
      typeof body.rankingWorkspaceId === "string"
        ? body.rankingWorkspaceId.trim()
        : "";

    const existing = await prisma.workspaceExternalServices.findFirst({
      where: { workspaceGroupId: wid },
    });

    if (rankingProvider === "rankgun") {
      const effectiveToken = tokenTrim || existing?.rankingToken || "";
      const effectiveWs = wsTrim || existing?.rankingWorkspaceId || "";
      if (!effectiveToken || !effectiveWs) {
        return res
          .status(400)
          .json({ message: "RankGun requires both API key and workspace ID" });
      }
    }

    if (rankingProvider === "opencloudranking") {
      const effectiveToken = tokenTrim || existing?.rankingToken || "";
      if (!effectiveToken) {
        return res.status(400).json({
          message:
            "Integrated Ranking requires its own API key (separate from Roblox API settings).",
        });
      }
    }

    try {
      const updatePayload: {
        rankingProvider: string | null;
        rankingWorkspaceId: string | null;
        rankingMaxRank: number | null;
        updatedAt: Date;
        rankingToken?: string | null;
      } = {
        rankingProvider: rankingProvider || null,
        rankingWorkspaceId: wsTrim || null,
        rankingMaxRank,
        updatedAt: new Date(),
      };

      if (!rankingProvider) {
        updatePayload.rankingToken = null;
        updatePayload.rankingWorkspaceId = null;
        updatePayload.rankingMaxRank = null;
      } else if (clearRankingToken) {
        updatePayload.rankingToken = null;
      } else if (tokenTrim !== "") {
        updatePayload.rankingToken = tokenTrim;
      }

      await prisma.workspaceExternalServices.upsert({
        where: {
          workspaceGroupId: wid,
        },
        update: updatePayload,
        create: {
          workspaceGroupId: wid,
          rankingProvider: rankingProvider || null,
          rankingToken: tokenTrim || null,
          rankingWorkspaceId: wsTrim || null,
          rankingMaxRank,
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

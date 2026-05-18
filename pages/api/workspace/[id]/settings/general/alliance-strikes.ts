import type { NextApiRequest, NextApiResponse } from "next";
import { getConfig, setConfig } from "@/utils/configEngine";
import { logAudit } from "@/utils/logs";
import prisma from "@/utils/database";
import {
  ALLIANCE_STRIKES_DEFAULT_MAX,
  normalizeAllianceMaxStrikes,
} from "@/utils/allianceStrikesConfig";
import { AuthenticatedRequest, withAuth } from "@/lib/withAuth";

export default withAuth(async function handler(
  req: AuthenticatedRequest,
  res: NextApiResponse,
) {
  const userId = req.auth?.userId;
  if (!userId) {
    res.status(401).json({ success: false, error: "Unauthorized" });
    return;
  }

  const workspaceId = parseInt(req.query.id as string, 10);
  if (!workspaceId) {
    res.status(400).json({ success: false, error: "Invalid workspace" });
    return;
  }

  const currentUser = await prisma.user.findFirst({
    where: { userid: BigInt(userId) },
    include: {
      roles: { where: { workspaceGroupId: workspaceId }, orderBy: { isOwnerRole: "desc" } },
      workspaceMemberships: { where: { workspaceGroupId: workspaceId } },
    },
  });

  const membership = currentUser?.workspaceMemberships?.[0];
  const primaryRole = currentUser?.roles?.[0];
  const perms = currentUser?.roles?.flatMap((r) => r.permissions ?? []) ?? [];
  const canEdit =
    membership?.isAdmin ||
    primaryRole?.isOwnerRole ||
    perms.includes("manage_features") ||
    perms.includes("workspace_customisation");

  if (!canEdit) {
    res.status(403).json({ success: false, error: "Insufficient permissions" });
    return;
  }

  if (req.method === "GET") {
    const cfg = await getConfig("alliance_strikes", workspaceId);
    const maxStrikes = normalizeAllianceMaxStrikes(cfg?.maxStrikes ?? ALLIANCE_STRIKES_DEFAULT_MAX);
    res.status(200).json({ success: true, maxStrikes });
    return;
  }

  if (req.method === "PATCH") {
    if (typeof req.body?.maxStrikes !== "number" && typeof req.body?.maxStrikes !== "string") {
      res.status(400).json({ success: false, error: "maxStrikes required" });
      return;
    }
    const maxStrikes = normalizeAllianceMaxStrikes(req.body.maxStrikes);
    const before = await getConfig("alliance_strikes", workspaceId);
    await setConfig("alliance_strikes", { maxStrikes }, workspaceId);
    try {
      await logAudit(
        workspaceId,
        userId,
        "settings.general.alliance_strikes.update",
        "alliance_strikes",
        { before, after: { maxStrikes } },
      );
    } catch {
      /* non-fatal */
    }
    res.status(200).json({ success: true, maxStrikes });
    return;
  }

  res.status(405).json({ success: false, error: "Method not allowed" });
});

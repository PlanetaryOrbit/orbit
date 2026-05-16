import type { NextApiRequest, NextApiResponse } from "next";
import { AuthenticatedRequest, withAuth } from "@/lib/withAuth";
import prisma from "@/utils/database";
import { getConfig } from "@/utils/configEngine";
import {
  ALLIANCE_STRIKES_DEFAULT_MAX,
  normalizeAllianceMaxStrikes,
} from "@/utils/allianceStrikesConfig";
import { getUsername } from "@/utils/userinfoEngine";

export default withAuth(async function handler(
  req: AuthenticatedRequest,
  res: NextApiResponse,
) {
  if (req.method !== "PATCH") {
    return res.status(405).json({ success: false, error: "Method not allowed" });
  }

  const workspaceGroupId = parseInt(req.query.id as string, 10);
  const allyId = req.query.aid as string;

  if (!workspaceGroupId || !allyId) {
    return res.status(400).json({ success: false, error: "Invalid parameters" });
  }

  const currentUserId = req.auth?.userId;
  if (!currentUserId) {
    return res.status(401).json({ success: false, error: "Not authenticated" });
  }

  const currentUser = await prisma.user.findFirst({
    where: { userid: BigInt(currentUserId) },
    include: {
      roles: {
        where: { workspaceGroupId },
        orderBy: { isOwnerRole: "desc" },
      },
      workspaceMemberships: { where: { workspaceGroupId } },
    },
  });

  const actorDisplayName =
    (currentUser?.username && currentUser.username.trim()) ||
    (await getUsername(BigInt(currentUserId)));
  const membership = currentUser?.workspaceMemberships?.[0];
  const primaryRole = currentUser?.roles?.[0];
  const perms = currentUser?.roles?.flatMap((r) => r.permissions ?? []) ?? [];
  const canManageDiscipline =
    membership?.isAdmin ||
    primaryRole?.isOwnerRole ||
    perms.includes("edit_alliance_details") ||
    perms.includes("delete_alliances");

  if (!canManageDiscipline) {
    return res.status(403).json({ success: false, error: "Insufficient permissions" });
  }

  const alliance = await prisma.ally.findFirst({
    where: { id: allyId, workspaceGroupId },
  });

  if (!alliance) {
    return res.status(404).json({ success: false, error: "Alliance not found" });
  }

  const body = req.body ?? {};

  try {
    const strikeCfg = await getConfig("alliance_strikes", workspaceGroupId);
    const strikeCap = normalizeAllianceMaxStrikes(
      strikeCfg?.maxStrikes ?? ALLIANCE_STRIKES_DEFAULT_MAX,
    );

    if (typeof body.strikes === "number") {
      const prevStrikes = alliance.strikes ?? 0;
      const n = Math.min(strikeCap, Math.max(0, Math.floor(body.strikes)));

      if (n > prevStrikes) {
        const strikeReason = String(body.strikeReason ?? "").trim();
        if (strikeReason.length < 3) {
          return res.status(400).json({
            success: false,
            error: "A reason is required when adding a strike (at least 3 characters).",
          });
        }
        const autoNote = `Automatic log due to strike given by ${actorDisplayName}. Reason: ${strikeReason}`;
        const existingNotes = Array.isArray(alliance.notes) ? [...alliance.notes] : [];
        await prisma.ally.update({
          where: { id: allyId },
          data: {
            strikes: n,
            notes: [...existingNotes, autoNote],
          },
        });
        return res.status(200).json({ success: true, strikes: n });
      }

      await prisma.ally.update({
        where: { id: allyId },
        data: { strikes: n },
      });
      return res.status(200).json({ success: true, strikes: n });
    }

    if (body.termination !== undefined) {
      if (body.termination === null) {
        await prisma.ally.update({
          where: { id: allyId },
          data: {
            terminationEffectiveDate: null,
            terminationReason: null,
          },
        });
        return res.status(200).json({ success: true, termination: null });
      }

      const effectiveRaw = body.termination?.effectiveDate as string | undefined;
      const reason = String(body.termination?.reason ?? "").trim();

      if (!effectiveRaw) {
        return res.status(400).json({
          success: false,
          error: "Termination requires an effective date",
        });
      }
      if (reason.length < 4) {
        return res.status(400).json({
          success: false,
          error: "Please enter a termination reason (at least 4 characters)",
        });
      }

      const effective = new Date(effectiveRaw);
      if (Number.isNaN(effective.getTime())) {
        return res.status(400).json({ success: false, error: "Invalid effective date" });
      }

      await prisma.ally.update({
        where: { id: allyId },
        data: {
          terminationEffectiveDate: effective,
          terminationReason: reason,
        },
      });

      return res.status(200).json({
        success: true,
        termination: {
          effectiveDate: effective.toISOString(),
          reason,
        },
      });
    }

    return res.status(400).json({
      success: false,
      error: "Provide strikes or termination payload",
    });
  } catch (error) {
    console.error("Alliance discipline update:", error);
    return res.status(500).json({ success: false, error: "Internal server error" });
  }
});

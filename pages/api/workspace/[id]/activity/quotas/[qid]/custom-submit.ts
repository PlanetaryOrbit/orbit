import type { NextApiRequest, NextApiResponse } from "next";
import prisma from "@/utils/database";
import { withPermissionCheck } from "@/utils/permissionsManager";
import { logAudit } from "@/utils/logs";
import {
  getQuotaForMemberOrThrow,
  memberHasQuotaAssignment,
} from "@/utils/quotaCustomEligibility";

type Data = {
  success: boolean;
  error?: string;
  completion?: any;
};

export default withPermissionCheck(handler);

async function handler(req: NextApiRequest, res: NextApiResponse<Data>) {
  if (req.method !== "POST") {
    return res.status(405).json({ success: false, error: "Method not allowed" });
  }

  const uid = req.session?.userid;
  if (!uid) {
    return res.status(401).json({ success: false, error: "Not logged in" });
  }

  const workspaceId = parseInt(req.query.id as string, 10);
  const qid = req.query.qid;
  if (!qid || typeof qid !== "string" || Number.isNaN(workspaceId)) {
    return res.status(400).json({ success: false, error: "Invalid request" });
  }

  const userId = BigInt(uid);
  const quotaResult = await getQuotaForMemberOrThrow(workspaceId, qid, { mustBeCustom: true });
  if ("error" in quotaResult) {
    return res.status(404).json({ success: false, error: quotaResult.error });
  }
  const { quota } = quotaResult;

  const assigned = await memberHasQuotaAssignment(workspaceId, userId, quota);
  if (!assigned) {
    return res.status(403).json({ success: false, error: "Not assigned to this quota" });
  }

  const existing = await prisma.quotaCustomCompletion.findUnique({
    where: { quotaId_userId: { quotaId: qid, userId } },
  });

  if (existing?.status === "pending") {
    return res.status(400).json({ success: false, error: "Already submitted for approval" });
  }
  if (existing?.status === "approved") {
    return res.status(400).json({ success: false, error: "This quota is already approved as complete" });
  }

  try {
    const completion = await prisma.quotaCustomCompletion.upsert({
      where: { quotaId_userId: { quotaId: qid, userId } },
      create: {
        quotaId: qid,
        userId,
        status: "pending",
      },
      update: {
        status: "pending",
        submittedAt: new Date(),
        reviewedAt: null,
        reviewedByUserId: null,
      },
    });

    try {
      await logAudit(
        workspaceId,
        uid,
        "activity.quota.custom_submit",
        `quota:${qid}`,
        { quotaId: qid, userId: String(userId) }
      );
    } catch {}

    return res.status(200).json({
      success: true,
      completion: JSON.parse(
        JSON.stringify(completion, (_k, v) => (typeof v === "bigint" ? v.toString() : v))
      ),
    });
  } catch (e) {
    console.error("custom-submit", e);
    return res.status(500).json({ success: false, error: "Something went wrong" });
  }
}

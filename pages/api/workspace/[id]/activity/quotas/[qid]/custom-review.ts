import type { NextApiRequest, NextApiResponse } from "next";
import prisma from "@/utils/database";
import { withPermissionCheck } from "@/utils/permissionsManager";
import { logAudit } from "@/utils/logs";
import { getQuotaForMemberOrThrow } from "@/utils/quotaCustomEligibility";

type Data = {
  success: boolean;
  error?: string;
  completion?: any;
};

export default withPermissionCheck(handler, "create_quotas");

async function handler(req: NextApiRequest, res: NextApiResponse<Data>) {
  if (req.method !== "PATCH" && req.method !== "POST") {
    return res.status(405).json({ success: false, error: "Method not allowed" });
  }

  const reviewerId = req.session?.userid;
  if (!reviewerId) {
    return res.status(401).json({ success: false, error: "Not logged in" });
  }

  const workspaceId = parseInt(req.query.id as string, 10);
  const qid = req.query.qid;
  if (!qid || typeof qid !== "string" || Number.isNaN(workspaceId)) {
    return res.status(400).json({ success: false, error: "Invalid request" });
  }

  const { memberUserId, decision } = req.body as {
    memberUserId?: string;
    decision?: string;
  };
  if (!memberUserId || (decision !== "approve" && decision !== "deny")) {
    return res.status(400).json({ success: false, error: "memberUserId and decision (approve|deny) required" });
  }

  let targetUserId: bigint;
  try {
    targetUserId = BigInt(memberUserId);
  } catch {
    return res.status(400).json({ success: false, error: "Invalid memberUserId" });
  }

  const quotaResult = await getQuotaForMemberOrThrow(workspaceId, qid, { mustBeCustom: true });
  if ("error" in quotaResult) {
    return res.status(404).json({ success: false, error: quotaResult.error });
  }

  const row = await prisma.quotaCustomCompletion.findUnique({
    where: { quotaId_userId: { quotaId: qid, userId: targetUserId } },
  });

  if (!row || row.status !== "pending") {
    return res.status(400).json({ success: false, error: "No pending completion for this member" });
  }

  const nextStatus = decision === "approve" ? "approved" : "denied";

  try {
    const completion = await prisma.quotaCustomCompletion.update({
      where: { id: row.id },
      data: {
        status: nextStatus,
        reviewedAt: new Date(),
        reviewedByUserId: BigInt(reviewerId),
      },
      include: {
        user: { select: { userid: true, username: true, picture: true } },
      },
    });

    try {
      await logAudit(
        workspaceId,
        reviewerId,
        decision === "approve" ? "activity.quota.custom_approve" : "activity.quota.custom_deny",
        `quota:${qid}`,
        { quotaId: qid, memberUserId, decision: nextStatus }
      );
    } catch {}

    return res.status(200).json({
      success: true,
      completion: JSON.parse(
        JSON.stringify(completion, (_k, v) => (typeof v === "bigint" ? v.toString() : v))
      ),
    });
  } catch (e) {
    console.error("custom-review", e);
    return res.status(500).json({ success: false, error: "Something went wrong" });
  }
}

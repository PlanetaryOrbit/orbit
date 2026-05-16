import type { NextApiRequest, NextApiResponse } from "next";
import prisma from "@/utils/database";
import { withPermissionCheck } from "@/utils/permissionsManager";
import { AuthenticatedRequest } from "@/lib/withAuth";

type Data = {
  success: boolean;
  error?: string;
  resignation?: unknown;
};

export default withPermissionCheck(handler, "submit_resignation");

export async function handler(req: AuthenticatedRequest, res: NextApiResponse<Data>) {
  if (req.method !== "POST") {
    return res.status(405).json({ success: false, error: "Method not allowed" });
  }
  if (!req.auth.userId) {
    return res.status(401).json({ success: false, error: "Not logged in" });
  }

  const { lastWorkingDay, reason } = req.body;
  if (
    typeof lastWorkingDay !== "number" ||
    typeof reason !== "string" ||
    !reason.trim()
  ) {
    return res.status(400).json({ success: false, error: "Missing data" });
  }

  const workspaceGroupId = parseInt(req.query.id as string, 10);
  const lastDay = new Date(lastWorkingDay);
  if (Number.isNaN(lastDay.getTime())) {
    return res.status(400).json({ success: false, error: "Invalid last working day" });
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const compare = new Date(lastDay);
  compare.setHours(0, 0, 0, 0);
  if (compare < today) {
    return res.status(400).json({
      success: false,
      error: "Last working day must be today or later",
    });
  }

  try {
    const pending = await prisma.staffResignation.count({
      where: {
        workspaceGroupId,
        userId: BigInt(req.auth.userId),
        reviewed: false,
      },
    });
    if (pending > 0) {
      return res.status(400).json({
        success: false,
        error: "You already have a resignation awaiting review",
      });
    }

    const resignation = await prisma.staffResignation.create({
      data: {
        userId: BigInt(req.auth.userId),
        workspaceGroupId,
        lastWorkingDay: lastDay,
        reason: reason.trim(),
      },
    });

    return res.status(200).json({
      success: true,
      resignation: JSON.parse(
        JSON.stringify(resignation, (key, value) =>
          typeof value === "bigint" ? value.toString() : value
        )
      ),
    });
  } catch (error) {
    console.error("Resignation create error:", error);
    return res.status(500).json({
      success: false,
      error:
        error instanceof Error ? error.message : "Something went wrong",
    });
  }
}

import type { NextApiRequest, NextApiResponse } from "next";
import prisma from "@/utils/database";
import { withPermissionCheck } from "@/utils/permissionsManager";

type Data = {
  success: boolean;
  error?: string;
  sessionTypes?: any[];
};

export default withPermissionCheck(handler, ["sessions_scheduled", "sessions_unscheduled"]);

export async function handler(req: NextApiRequest, res: NextApiResponse<Data>) {
  if (req.method !== "GET")
    return res
      .status(405)
      .json({ success: false, error: "Method not allowed" });

  try {
    const sessionTypes = await prisma.sessionType.findMany({
      where: {
        workspaceGroupId: parseInt(req.query.id as string),
        allowUnscheduled: true,
      },
      include: {
        schedule: true,
      },
    });

    res.status(200).json({
      success: true,
      sessionTypes: JSON.parse(
        JSON.stringify(sessionTypes, (key, value) =>
          typeof value === "bigint" ? value.toString() : value
        )
      ),
    });
  } catch (error) {
    console.error("Error fetching session types:", error);
    res
      .status(500)
      .json({ success: false, error: "Failed to fetch session types" });
  }
}

import type { NextApiRequest, NextApiResponse } from "next";
import { withSessionRoute } from "@/lib/withSession";
import { withPermissionCheck } from "@/utils/permissionsManager";
import { fetchworkspace } from "@/utils/configEngine";
import * as noblox from "noblox.js";

type Data = {
  success: boolean;
  ranks?: Array<{
    id: number;
    name: string;
    rank: number;
  }>;
  error?: string;
};

export default withSessionRoute(handler);

async function handler(req: NextApiRequest, res: NextApiResponse<Data>) {
  if (req.method !== "GET") {
    return res
      .status(405)
      .json({ success: false, error: "Method not allowed" });
  }
  const { id } = req.query;
  try {
    const workspace = await fetchworkspace(Number(id));
    if (!workspace) {
      return res
        .status(404)
        .json({ success: false, error: "Workspace not found" });
    }

    const roles = await noblox.getRoles(workspace.groupId);
    const sortedRoles = roles.sort((a, b) => a.rank - b.rank);
    const ranks = sortedRoles.map((role) => ({
      id: role.id,
      name: role.name,
      rank: role.rank,
    }));

    return res.status(200).json({
      success: true,
      ranks,
    });
  } catch (error: any) {
    console.error("Error fetching ranks:", error);
    return res.status(500).json({
      success: false,
      error: "Failed to fetch ranks",
    });
  }
}

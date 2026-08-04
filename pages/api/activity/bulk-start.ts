import type { NextApiRequest, NextApiResponse } from "next";
import { getConfig } from "@/utils/configEngine";
import cache from "@/utils/cache";

type ActivityConfig = {
  minTrackedRank?: number;
  privateServerEnabled?: boolean;
  studioEnabled?: boolean;
};

type Data = {
  success: boolean;
  error?: string;
  data?: ActivityConfig;
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<Data>,
) {
  if (req.method !== "GET") {
    return res.status(405).json({
      success: false,
      error: "Method not allowed",
    });
  }

  const { id } = req.query;

  if (!id || isNaN(Number(id))) {
    return res.status(400).json({
      success: false,
      error: "Invalid workspace id",
    });
  }

  const workspaceId = Number(id);
  const cacheKey = `activity:config:${workspaceId}`;

  try {
    let activityConfig = await cache.get<ActivityConfig>(cacheKey);

    if (activityConfig === null) {
      const config = await getConfig("activity", workspaceId);

      activityConfig = {
        minTrackedRank: config?.role,
        privateServerEnabled: config?.privateServerEnabled,
        studioEnabled: config?.studioEnabled,
      };

      await cache.set(cacheKey, activityConfig, 300);
    }

    return res.status(200).json({
      success: true,
      data: activityConfig,
    });
  } catch (err) {
    console.error("Unexpected error in /api/activity/config:", err);

    return res.status(500).json({
      success: false,
      error: "Internal server error",
    });
  }
}

import type { NextApiRequest, NextApiResponse } from "next";
import { withSessionRoute } from "@/lib/withSession";
import { withPermissionCheck } from "@/utils/permissionsManager";
import { getConfig, setConfig } from "@/utils/configEngine";

type Data = {
  success: boolean;
  schedule?: any;
  error?: string;
};

async function handler(req: NextApiRequest, res: NextApiResponse<Data>) {
  if (!req.session.userid) {
    return res.status(401).json({ success: false, error: "Not logged in" });
  }

  const workspaceGroupId = Number(req.query.id as string);

  if (req.method === "GET") {
    try {
      const schedule = await getConfig("activity_reset_schedule", workspaceGroupId);
      return res.status(200).json({ success: true, schedule });
    } catch (error) {
      console.error("Error fetching schedule:", error);
      return res.status(500).json({ success: false, error: "Failed to fetch schedule" });
    }
  } else if (req.method === "POST") {
    try {
      const { enabled, day, frequency } = req.body;

      if (enabled && (!day || !frequency)) {
        return res.status(400).json({ success: false, error: "Day and frequency are required when enabled" });
      }

      const validDays = ["monday", "sunday"];
      const validFrequencies = ["weekly", "biweekly", "monthly"];

      if (enabled && (!validDays.includes(day) || !validFrequencies.includes(frequency))) {
        return res.status(400).json({ success: false, error: "Invalid day or frequency" });
      }

      const schedule = {
        enabled: Boolean(enabled),
        day: enabled ? day : null,
        frequency: enabled ? frequency : null,
      };

      await setConfig("activity_reset_schedule", schedule, workspaceGroupId);

      return res.status(200).json({ success: true, schedule });
    } catch (error) {
      console.error("Error saving schedule:", error);
      return res.status(500).json({ success: false, error: "Failed to save schedule" });
    }
  }

  return res.status(405).json({ success: false, error: "Method not allowed" });
}

export default withPermissionCheck(handler, "admin");

import type { NextApiRequest, NextApiResponse } from "next";
import { closeActiveSessions } from "@/utils/closesessions";

type Data = {
  success: boolean;
  message?: string;
  error?: string;
};

let hasRunStartupTasks = false;

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<Data>
) {
  if (req.method !== "POST") {
    return res
      .status(405)
      .json({ success: false, error: "Method not allowed" });
  }

  const cronSecret = req.headers["x-cron-secret"];
  if (!process.env.CRON_SECRET || cronSecret !== process.env.CRON_SECRET) {
    return res.status(401).json({
      success: false,
      error: "Unauthorized",
    });
  }

  // Prevent running multiple times
  if (hasRunStartupTasks) {
    return res.status(200).json({
      success: true,
      message: "Startup tasks already completed",
    });
  }

  try {
    await closeActiveSessions();
    hasRunStartupTasks = true;

    return res.status(200).json({
      success: true,
      message: "Startup tasks completed successfully",
    });
  } catch (error: any) {
    console.error("[STARTUP] Error running startup tasks:", error);
    return res.status(500).json({
      success: false,
      error: "Failed to complete startup tasks",
    });
  }
}

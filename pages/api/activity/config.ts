import type { NextApiRequest, NextApiResponse } from "next";
import { getConfig } from "@/utils/configEngine";

(BigInt.prototype as any).toJSON = function () {
  return this.toString();
};

type Data = {
  success: boolean;
  error?: string;
  data?: any,
};

export default async function handler(req: NextApiRequest, res: NextApiResponse<Data>) {
  if (req.method != "GET") {
    return res
      .status(405)
      .json({ success: false, error: "Method not allowed" });
  }
  const { id } = req.query

  try {
    const activityconfig = await getConfig('activity', parseInt(id as string));
    res.status(200).send({
      success: true,
      data: {
        minTrackedRank: activityconfig?.role,
        privateServerEnabled: activityconfig?.privateServerEnabled,
        studioEnabled: activityconfig?.studioEnabled,
      }
    });
  } catch (err) {
    console.error("Unexpected error in /api/activity/config:", err);
    return res
      .status(500)
      .json({ success: false, error: "Internal server error" });
  }

  return res.status(200).json({ success: true });
}
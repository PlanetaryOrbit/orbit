import type { NextApiRequest, NextApiResponse } from "next";
import { withSessionRoute } from "@/lib/withSession";
import crypto from "crypto";

type Data = {
  success: boolean;
  intercom_user_hash?: string;
  error?: string;
  debug?: any;
};

async function handler(req: NextApiRequest, res: NextApiResponse<Data>) {
  if (req.method !== "GET")
    return res
      .status(405)
      .json({ success: false, error: "Method not allowed" });
  const session = req.session;
  if (!session?.userid)
    return res.status(401).json({ success: false, error: "Not logged in" });

  const userId = String(session.userid);

  const intercomApiSecret = process.env.INTERCOM_API_SECRET;
  if (!intercomApiSecret) {
    return res
      .status(500)
      .json({
        success: false,
        error: "INTERCOM_API_SECRET not configured on server",
      });
  }

  try {
    const hash = crypto
      .createHmac("sha256", intercomApiSecret)
      .update(userId)
      .digest("hex");
    return res.status(200).json({ success: true, intercom_user_hash: hash });
  } catch (e: any) {
    console.error("Error generating intercom hash:", e);
    return res
      .status(500)
      .json({ success: false, error: "Failed to generate hash" });
  }
}

export default withSessionRoute(handler);
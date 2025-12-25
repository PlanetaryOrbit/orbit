import type { NextApiRequest, NextApiResponse } from "next";
import { withSessionRoute } from "@/lib/withSession";
import jwt from "jsonwebtoken";

type Data = {
  success: boolean;
  intercom_user_jwt?: string;
  error?: string;
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
    const payload = { user_id: userId };
    const token = jwt.sign(payload, intercomApiSecret, { algorithm: "HS256" });
    return res.status(200).json({ success: true, intercom_user_jwt: token });
  } catch (e: any) {
    console.error("Error generating intercom JWT:", e);
    return res
      .status(500)
      .json({ success: false, error: "Failed to generate token" });
  }
}

export default withSessionRoute(handler);

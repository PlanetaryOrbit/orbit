import type { NextApiRequest, NextApiResponse } from "next";
import { withSessionRoute } from "@/lib/withSession";
import { generateCsrfToken } from "@/utils/csrf";

type Data = {
  success: boolean;
  token?: string;
  error?: string;
};

async function handler(req: NextApiRequest, res: NextApiResponse<Data>) {
  if (req.method !== "GET") {
    return res.status(405).json({ success: false, error: "Method not allowed" });
  }
  if (!req.session?.userid) {
    return res.status(401).json({ success: false, error: "Unauthorized" });
  }
  try {
    const token = generateCsrfToken(req.session.userid);
    return res.status(200).json({ success: true, token });
  } catch (error: any) {
    console.error("Error generating CSRF token:", error);
    return res.status(500).json({ 
      success: false, 
      error: "Failed to generate CSRF token" 
    });
  }
}

export default withSessionRoute(handler);

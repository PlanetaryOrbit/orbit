import type { NextApiRequest, NextApiResponse } from "next";
import { AuthenticatedRequest, withAuth } from "@/lib/withAuth";
import { generateCsrfToken } from "@/utils/csrf";

type Data = {
  success: boolean;
  token?: string;
  error?: string;
};

async function handler(req: AuthenticatedRequest, res: NextApiResponse<Data>) {
  if (req.method !== "GET") {
    return res.status(405).json({ success: false, error: "Method not allowed" });
  }
  if (!req.session?.userid) {
    return res.status(401).json({ success: false, error: "Unauthorized" });
  }
  try {
    const token = generateCsrfToken(Number(req.auth.userId));
    return res.status(200).json({ success: true, token });
  } catch (error: any) {
    console.error("Error generating CSRF token:", error);
    return res.status(500).json({ 
      success: false, 
      error: "Failed to generate CSRF token" 
    });
  }
}

export default withAuth(handler);

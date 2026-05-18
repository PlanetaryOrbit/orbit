import { NextApiResponse } from "next"

import {
  AuthenticatedRequest,
  withAuth,
} from "@/lib/withAuth"

import {
  listActiveSessions,
  deleteAllUserSessions,
} from "@/utils/session"

import crypto from "crypto"

function hashToken(token: string) {
  return crypto
    .createHash("sha256")
    .update(token)
    .digest("hex")
}

export async function handler(
  req: AuthenticatedRequest,
  res: NextApiResponse
) {

  try {
    if (req.method === "GET") {
      console.log("Fetching sessions for user:", req.auth.userId);

      const sessions = await listActiveSessions(req.auth.userId);

      console.log(`Found ${sessions.length} sessions`);

      const currentTokenHash = hashToken(req.auth.token);

      return res.status(200).json({
        sessions: sessions.map((s) => ({
          id: s.id,
          browser: s.browser,
          os: s.os,
          device: s.device,
          ipAddress: s.ipAddress,
          createdAt: s.createdAt,
          expiresAt: s.expiresAt,
          isCurrent: s.token === currentTokenHash,
        })),
      });
    }

    if (req.method === "DELETE") {
      await deleteAllUserSessions(req.auth.userId, req.auth.token);

      res.setHeader("Set-Cookie", [
        "session_token=",
        "Path=/",
        "HttpOnly",
        "SameSite=Strict",
        "Secure",
        "Max-Age=0",
      ].join("; "));

      return res.status(200).json({
        success: true,
      });
    }

    return res.status(405).json({
      success: false,
      error: "Method not allowed",
    });
  } catch (error) {
    console.error("API Error:", error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "Internal server error",
    });
  }
}

export default withAuth(handler)
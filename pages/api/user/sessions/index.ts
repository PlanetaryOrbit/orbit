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

export default withAuth(
  async function handler(
    req: AuthenticatedRequest,
    res: NextApiResponse
  ) {

    if (req.method === "GET") {
      const sessions = await listActiveSessions(
        req.auth.userId
      )

      const currentTokenHash = hashToken(
        req.auth.token
      )

      return res.status(200).json({
        sessions: sessions.map((s) => ({
          id: s.id,

          browser: s.browser,
          os: s.os,
          device: s.device,

          ipAddress: s.ipAddress,

          createdAt: s.createdAt,
          expiresAt: s.expiresAt,

          isCurrent:
            s.token === currentTokenHash,
        })),
      })
    }

    if (req.method === "DELETE") {
      await deleteAllUserSessions(
        req.auth.userId,
        req.auth.token
      )

      res.setHeader(
        "Set-Cookie",
        [
          "session_token=",
          "Path=/",
          "HttpOnly",
          "SameSite=Strict",
          "Secure",
          "Max-Age=0",
        ].join("; ")
      )

      return res.status(200).json({
        success: true,
      })
    }

    return res.status(405).json({
      success: false,
      error: "Method not allowed",
    })
  }
)
import { NextApiResponse } from "next"
import { AuthenticatedRequest, withAuth } from "@/lib/withAuth"
import { listActiveSessions, deleteAllUserSessions, deleteOtherSessions } from "@/utils/session"

export async function handler(
  req: AuthenticatedRequest,
  res: NextApiResponse
) {
  try {
    if (req.method === "GET") {
      const sessions = await listActiveSessions(req.auth.userId)

      return res.status(200).json({
        sessions: sessions.map((s) => ({
          id: s.id,
          browser: s.browser,
          os: s.os,
          device: s.device,
          ipAddress: s.ipAddress,
          createdAt: s.createdAt,
          expiresAt: s.expiresAt,
          isCurrent: s.id === req.auth.session?.id,
        })),
      })
    }

    if (req.method === "DELETE") {
      if (req.auth.session?.id) {
        await deleteOtherSessions(req.auth.userId, req.auth.session.id)
      } else {
        await deleteAllUserSessions(req.auth.userId);
        res.setHeader("Set-Cookie", [
        "session_token=",
        "Path=/",
        "HttpOnly",
        "SameSite=Strict",
        "Secure",
        "Max-Age=0",
      ].join("; "))
      }
      return res.status(200).json({ success: true })
    }

    return res.status(405).json({ success: false, error: "Method not allowed" })
  } catch (error) {
    console.error("API Error:", error)
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "Internal server error",
    })
  }
}

export default withAuth(handler)
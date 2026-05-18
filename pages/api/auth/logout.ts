import { withAuth, AuthenticatedRequest } from "@/lib/withAuth"
import { NextApiResponse } from "next"
import { deleteSession } from "@/utils/session"

export default withAuth(handler)

export async function handler(
  req: AuthenticatedRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    return res.status(405).json({
      success: false,
      error: "Method not allowed",
    })
  }

  try {
    await deleteSession(req.auth.token)
    res.setHeader(
      "Set-Cookie",
      [
        "session_token=;",
        "Path=/;",
        "HttpOnly;",
        "SameSite=Strict;",
        "Max-Age=0;",
        process.env.NODE_ENV === "production" ? "Secure;" : "",
      ].join(" ")
    )

    return res.status(200).json({
      success: true,
    })
  } catch (error) {
    console.error("Logout error:", error)

    return res.status(500).json({
      success: false,
      error: "Failed to logout",
    })
  }
}
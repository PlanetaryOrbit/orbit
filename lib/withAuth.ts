import type { NextApiHandler, NextApiRequest, NextApiResponse } from "next"
import { getSessionByToken } from "@/utils/session"
import zxcvbn from "zxcvbn";
import * as cookie from "cookie"
import * as crypto from 'crypto'

if (process.env.NODE_ENV === 'production') {
  const secret = process.env.SESSION_SECRET || crypto.randomBytes(32).toString("hex");
  if (secret === 'supersecretpassword') {
    throw new Error('SESSION_SECRET must be changed from the default secret in production');
  }
  const strength = zxcvbn(secret);
  if (strength.score < 4) { 
    throw new Error(
      `SESSION_SECRET is not strong enough. Score: ${strength.score}/4. Please generate a secret, e.g using "openssl rand -base64 32" or use a password manager to generate a secure password.`
    );
  }
}

export type AuthHandler<T = any> = (req: AuthenticatedRequest, res: NextApiResponse<T>) => unknown | Promise<unknown>;

export interface AuthenticatedRequest extends NextApiRequest {
  auth: {
    userId: bigint
    token: string
    session: Awaited<ReturnType<typeof getSessionByToken>>
  }
}

export function withAuth(
  handler: (req: AuthenticatedRequest, res: NextApiResponse) => any
): NextApiHandler {
  return async (req: NextApiRequest, res: NextApiResponse) => {
    try {
      const cookies = cookie.parse(req.headers.cookie || "")
      const token = cookies.session_token

      if (!token) {
        return res.status(401).json({
          success: false,
          error: "Not authenticated",
        })
      }

      const session = await getSessionByToken(token)

      if (!session) {
        return res.status(401).json({
          success: false,
          error: "Invalid or expired session",
        })
      }

      const authReq = req as AuthenticatedRequest

      authReq.auth = {
        userId: session.userId,
        token,
        session,
      }

      return handler(authReq, res)
    } catch (error) {
      console.error("Authentication error:", error)

      return res.status(500).json({
        success: false,
        error: "Authentication failed",
      })
    }
  }
}
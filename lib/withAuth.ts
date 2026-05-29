import type {
  NextApiHandler,
  NextApiRequest,
  NextApiResponse,
  GetServerSidePropsContext,
  GetServerSidePropsResult,
} from "next";

import { getSessionByToken } from "@/utils/session";
import zxcvbn from "zxcvbn";
import * as cookie from "cookie";
import * as crypto from "crypto";
import { getConfig } from "@/utils/configEngine";
import prisma from "@/utils/database";

if (process.env.NODE_ENV === "production") {
  const secret =
    process.env.SESSION_SECRET || crypto.randomBytes(32).toString("hex");

  if (secret === "supersecretpassword") {
    throw new Error(
      "SESSION_SECRET must be changed from the default secret in production",
    );
  }

  const strength = zxcvbn(secret);

  if (strength.score < 4) {
    throw new Error(
      `SESSION_SECRET is not strong enough. Score: ${strength.score}/4. Please generate a secret using "openssl rand -base64 32".`,
    );
  }
}

export type AuthHandler<T = any> = (
  req: AuthenticatedRequest,
  res: NextApiResponse<T>,
) => unknown | Promise<unknown>;

export interface AuthenticatedRequest extends NextApiRequest {
  auth: {
    userId: bigint;
    token: string;
    session: Awaited<ReturnType<typeof getSessionByToken>>;
  };
  session: {
    userid: bigint;
  };
}

export interface APIRequest extends NextApiRequest {
  workspaceId?: bigint;
}

export function withAuth(
  handler: (req: AuthenticatedRequest, res: NextApiResponse) => any,
): NextApiHandler {
  return async (req: NextApiRequest, res: NextApiResponse) => {
    try {
      const cookies = cookie.parse(req.headers.cookie || "");

      if (!cookies.session_token) {
        return res.status(401).json({
          success: false,
          error: "Not authenticated",
        });
      }

      const session = await getSessionByToken(cookies.session_token);

      if (!session) {
        res.setHeader(
          "Set-Cookie",
          [
            "session_token=",
            "Path=/",
            "HttpOnly",
            "SameSite=Strict",
            "Secure",
            "Max-Age=0",
          ].join("; "),
        );

        return res.status(401).json({
          success: false,
          error: "Invalid or expired session",
        });
      }

      const authReq = req as AuthenticatedRequest;

      authReq.auth = {
        userId: session.userId,
        token: cookies.session_token,
        session,
      };

      authReq.session = {
        userid: BigInt(session.userId),
      } as AuthenticatedRequest["session"];

      return handler(authReq, res);
    } catch (error) {
      console.error("Authentication error:", error);

      return res.status(500).json({
        success: false,
        error: "Authentication failed",
      });
    }
  };
}

export function withKey(
  handler: (req: NextApiRequest, res: NextApiResponse) => any,
): NextApiHandler {
  return async (req: NextApiRequest, res: NextApiResponse) => {
    const { id } = req.query;
    try {
      const auth = req.headers.authorization;

      if (!auth) {
        return res.status(401).json({
          success: false,
          error: "Missing or invalid Authorization header",
        });
      }

      const workspaceId = Array.isArray(id)
        ? parseInt(id[0])
        : id
          ? parseInt(id)
          : undefined;

      let authenticated = false;

      if (auth.startsWith("Bearer ")) {
        const apiKey = auth.replace("Bearer ", "");
        const key = await prisma.apiKey.findUnique({
          where: { key: apiKey },
        });

        if (key) {
          if (key.expiresAt && new Date() > key.expiresAt) {
            return res.status(401).json({ success: false, error: "API key expired" });
          }

          if (id && key.workspaceGroupId !== workspaceId) {
            return res.status(403).json({ success: false, error: "Access denied" });
          }

          await prisma.apiKey.update({
            where: { id: key.id },
            data: { lastUsed: new Date() },
          });

          authenticated = true;
        }
      }

      if (!authenticated) {
        const secretKey = await getConfig("board_key", workspaceId as number);
        if (secretKey?.key && secretKey.key === auth) {
          authenticated = true;
        }
      }

      if (!authenticated) {
        return res.status(401).json({ success: false, error: "Invalid API key" });
      }

      return handler(req, res);
    } catch (error) {
      console.error("Authentication error:", error);
      return res.status(500).json({ success: false, error: "Authentication failed" });
    }
  };
}

export function withAuthSsr<
  P extends {
    [key: string]: unknown;
  } = {
    [key: string]: unknown;
  },
>(
  handler: (
    context: GetServerSidePropsContext & {
      req: GetServerSidePropsContext["req"] & {
        auth: {
          userId: bigint;

          token: string;

          session: Awaited<ReturnType<typeof getSessionByToken>>;
        };
      };
    },
  ) => GetServerSidePropsResult<P> | Promise<GetServerSidePropsResult<P>>,
) {
  return async (context: GetServerSidePropsContext) => {
    try {
      const cookies = cookie.parse(context.req.headers.cookie || "");

      const token = cookies.session_token;

      if (!token) {
        return {
          redirect: {
            destination: "/login",
            permanent: false,
          },
        };
      }

      const session = await getSessionByToken(token);

      if (!session) {
        context.res.setHeader(
          "Set-Cookie",
          [
            "session_token=",
            "Path=/",
            "HttpOnly",
            "SameSite=Strict",
            "Secure",
            "Max-Age=0",
          ].join("; "),
        );

        return {
          redirect: {
            destination: "/login",
            permanent: false,
          },
        };
      }

      (context.req as any).auth = {
        userId: session.userId,
        token,
        session,
      };

      return handler(context as any);
    } catch (error) {
      console.error("SSR Authentication error:", error);

      return {
        redirect: {
          destination: "/login",
          permanent: false,
        },
      };
    }
  };
}

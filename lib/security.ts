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
import { error } from "console";
import { request } from "http";

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

export function verifyWorkspace(req: NextApiRequest): boolean {
  const { id: workspaceId } = req.query;
  if (!workspaceId) return true;

  const workspace = Array.isArray(workspaceId) ? workspaceId[0] : workspaceId;

  const isValidWorkspaceId = /^[A-Za-z0-9_-]+$/.test(workspace);
  if (!isValidWorkspaceId) return false;
  return true
}

export function withHandler(
  handler: (req: NextApiRequest, res: NextApiResponse) => any,
): NextApiHandler {
  return async (req: NextApiRequest, res: NextApiResponse) => {
    try {
      if (!verifyWorkspace(req)) return res.status(400).send({
        success: false,
        error: "Not valid workspace"
      });

      return handler(req, res);
    } catch (error) {
      console.error("Handler error:", error);

      return res.status(500).json({
        success: false,
        error: "Internal Server Error",
      });
    }
  };
}
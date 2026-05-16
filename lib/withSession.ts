import { getIronSession, SessionOptions } from "iron-session";
import * as crypto from "crypto";
import zxcvbn from 'zxcvbn';
import {
  GetServerSidePropsContext,
  GetServerSidePropsResult,
  NextApiHandler,
  NextApiRequest,
  NextApiResponse,
} from "next";

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

const code = process.env.SESSION_SECRET || crypto.randomBytes(32).toString("hex");

const sessionOptions: SessionOptions = {
  password: code,
  cookieName: "orbit_session",
  cookieOptions: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 7, // 1 week
    path: '/',
    domain: process.env.NODE_ENV === 'production' ? process.env.COOKIE_DOMAIN : undefined,
  },
  ttl: 60 * 60 * 24 * 7, // 1 week
};

export function withAuth(handler: NextApiHandler) {
  return async (req: NextApiRequest, res: NextApiResponse) => {
    // @ts-ignore
    req.session = await getIronSession(req, res, sessionOptions);
    return handler(req, res);
  };
}

// Theses types are compatible with InferGetStaticPropsType https://nextjs.org/docs/basic-features/data-fetching#typescript-use-getstaticprops
export function withSessionSsr<
  P extends { [key: string]: unknown } = { [key: string]: unknown },
>(
  handler: (
    context: GetServerSidePropsContext & { req: any }
  ) => GetServerSidePropsResult<P> | Promise<GetServerSidePropsResult<P>>,
) {
  return async (context: GetServerSidePropsContext) => {
    // @ts-ignore
    context.req.session = await getIronSession(context.req, context.res, sessionOptions);
    return handler(context as any);
  };
}
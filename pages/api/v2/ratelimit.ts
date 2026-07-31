/**
 * Orbit API
 *
 * Distributed token bucket rate limiter.
 *
 * Anonymous clients receive 100 tokens per minute.
 * Authenticated users receive 500 tokens per minute.
 *
 * @module pages/api/v2/ratelimiter
 * @since 2.1.10beta21
 * @author BuddyWinte
 */

import { get, set } from "@/utils/v2/cache";
import type { NextApiRequest } from "next";

type RateLimitOptions = {
  /**
   * How many tokens this request consumes.
   */
  cost?: number;

  /**
   * Maximum tokens available.
   */
  limit?: number;

  /**
   * Time window in seconds.
   */
  window?: number;
};

type RateLimitResult = {
  allowed: boolean;
  remaining: number;
  limit: number;
  reset: number;
};

const DEFAULT_ANONYMOUS_LIMIT = Number(process.env.DEFAULT_ANONYMOUS_LIMIT ?? 100);
const DEFAULT_AUTHENTICATED_LIMIT = Number(process.env.DEFAULT_AUTHENTICATED_LIMIT ?? 500);
const DEFAULT_WINDOW = Number(process.env.DEFAULT_WINDOW ?? 60);

function getClientIdentity(req: NextApiRequest): {
  id: string;
  authenticated: boolean;
} {
  const apiKey = req.headers["x-api-key"];

  if (typeof apiKey === "string") {
    return {
      id: `apikey:${apiKey}`,
      authenticated: true,
    };
  }

  const userId = req.headers["x-user-id"];

  if (typeof userId === "string") {
    return {
      id: `user:${userId}`,
      authenticated: true,
    };
  }

  const session = req.cookies.session;

  if (session) {
    return {
      id: `session:${session}`,
      authenticated: true,
    };
  }

  const anonymous = req.cookies.anonymous_id;

  if (anonymous) {
    return {
      id: `anon:${anonymous}`,
      authenticated: false,
    };
  }

  const forwarded = req.headers["x-forwarded-for"];

  const ip =
    typeof forwarded === "string"
      ? forwarded.split(",")[0]
      : req.socket.remoteAddress ?? "unknown";

  return {
    id: `ip:${ip}`,
    authenticated: false,
  };
}

export async function rateLimit(
  req: NextApiRequest,
  options: RateLimitOptions = {},
): Promise<RateLimitResult> {
  const identity = getClientIdentity(req);

  const limit =
    options.limit ??
    (identity.authenticated
      ? DEFAULT_AUTHENTICATED_LIMIT
      : DEFAULT_ANONYMOUS_LIMIT);

  const window = options.window ?? DEFAULT_WINDOW;
  const cost = options.cost ?? 1;

  const key = `ratelimit:${identity.id}`;

  const now = Date.now();

  let bucket =
    await get<{
      tokens: number;
      reset: number;
    }>(key);

  if (!bucket || now >= bucket.reset) {
    bucket = {
      tokens: limit,
      reset: now + window * 1000,
    };
  }

  const allowed = bucket.tokens >= cost;

  if (allowed) {
    bucket.tokens -= cost;
  }

  await set(
    key,
    bucket,
    Math.ceil((bucket.reset - now) / 1000),
  );

  return {
    allowed,
    remaining: Math.max(bucket.tokens, 0),
    limit,
    reset: bucket.reset,
  };
}

export async function enforceRateLimit(
  req: NextApiRequest,
  res: {
    status(code: number): {
      json(data: unknown): void;
    };
    setHeader(name: string, value: string | number): void;
  },
  options?: RateLimitOptions,
): Promise<boolean> {
  const result = await rateLimit(req, options);

  res.setHeader("X-RateLimit-Limit", result.limit);
  res.setHeader("X-RateLimit-Remaining", result.remaining);
  res.setHeader(
    "X-RateLimit-Reset",
    Math.floor(result.reset / 1000),
  );

  if (!result.allowed) {
    res.status(429).json({
      success: false,
      error: {
        code: "RATE_LIMITED",
        message: "Too many requests",
        details: {
          limit: result.limit,
          remaining: result.remaining,
          reset: result.reset,
        },
      },
    });

    return false;
  }

  return true;
}

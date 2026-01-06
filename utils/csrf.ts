import type { NextApiRequest, NextApiResponse } from "next";
import crypto from "crypto";

function getAllowedOrigins(): string[] {
  const origins: string[] = [];
  if (process.env.NEXTAUTH_URL) {
    origins.push(process.env.NEXTAUTH_URL);
  }

  if (process.env.ALLOWED_ORIGINS) {
    origins.push(
      ...process.env.ALLOWED_ORIGINS.split(",").map((o) => o.trim())
    );
  }

  return origins;
}

export function validateOrigin(req: NextApiRequest): boolean {
  const origin = req.headers.origin as string | undefined;
  const referer = req.headers.referer as string | undefined;
  const host = req.headers.host as string | undefined;
  if (process.env.NODE_ENV === "development") {
    if (host?.includes("localhost") || host?.includes("127.0.0.1")) {
      return true;
    }
  }

  const allowedOrigins = getAllowedOrigins();

  if (origin) {
    if (allowedOrigins.includes(origin)) {
      return true;
    }

    if (host) {
      const protocol = process.env.NODE_ENV === "production" ? "https" : "http";
      const expectedOrigin = `${protocol}://${host}`;
      if (origin === expectedOrigin) {
        return true;
      }
    }
  }

  if (referer) {
    try {
      const refererUrl = new URL(referer);
      const refererOrigin = `${refererUrl.protocol}//${refererUrl.host}`;
      if (allowedOrigins.includes(refererOrigin)) {
        return true;
      }
      if (host && refererUrl.host === host) {
        return true;
      }
    } catch (e) {
      // invalid
      return false;
    }
  }

  if (allowedOrigins.length > 0) {
    return false;
  }

  if (host) {
    if (origin) {
      try {
        const originUrl = new URL(origin);
        return originUrl.host === host;
      } catch (e) {
        return false;
      }
    }

    if (referer) {
      try {
        const refererUrl = new URL(referer);
        return refererUrl.host === host;
      } catch (e) {
        return false;
      }
    }
  }

  // No origin or referer
  return false;
}

export function validateCsrf(
  req: NextApiRequest,
  res: NextApiResponse
): boolean {
  const method = req.method?.toUpperCase();
  if (!method || ["GET", "HEAD", "OPTIONS"].includes(method)) {
    return true;
  }

  if (req.headers["x-planetary-cloud-service-key"]) {
    return true;
  }

  if (!validateOrigin(req)) {
    console.error("[CSRF] Origin/Referer validation failed", {
      method: req.method,
      url: req.url,
      origin: req.headers.origin,
      referer: req.headers.referer,
      host: req.headers.host,
    });
    return false;
  }

  return true;
}

export function generateCsrfToken(sessionId: string | number): string {
  const secret = process.env.SESSION_SECRET || process.env.SECRET_KEY;
  if (!secret) {
    throw new Error(
      "SESSION_SECRET or SECRET_KEY must be configured for CSRF token generation"
    );
  }

  const timestamp = Date.now();
  const data = `${sessionId}:${timestamp}`;

  const token = crypto.createHmac("sha256", secret).update(data).digest("hex");

  return `${token}:${timestamp}`;
}

/**
 * Validate a CSRF token
 * @param token - The CSRF token to validate
 * @param sessionId - The session identifier
 * @param maxAge - Maximum age of the token in milliseconds (default: 1 hour)
 * @returns true if the token is valid, false otherwise
 */
export function validateCsrfToken(
  token: string,
  sessionId: string | number,
  maxAge: number = 60 * 60 * 1000
): boolean {
  if (!token || typeof token !== "string") {
    return false;
  }

  const parts = token.split(":");
  if (parts.length !== 2) {
    return false;
  }

  const [tokenHash, timestampStr] = parts;
  const timestamp = parseInt(timestampStr, 10);

  if (isNaN(timestamp)) {
    return false;
  }

  const now = Date.now();
  if (now - timestamp > maxAge) {
    return false;
  }

  const secret = process.env.SESSION_SECRET || process.env.SECRET_KEY;
  if (!secret) {
    return false;
  }

  const data = `${sessionId}:${timestamp}`;
  const expectedToken = crypto
    .createHmac("sha256", secret)
    .update(data)
    .digest("hex");

  return crypto.timingSafeEqual(
    Buffer.from(tokenHash),
    Buffer.from(expectedToken)
  );
}

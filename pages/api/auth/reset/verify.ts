import * as noblox from "noblox.js";
import { NextApiRequest, NextApiResponse } from "next";
import prisma from "@/utils/database";

async function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  errorMessage: string,
): Promise<T> {
  const timeout = new Promise<never>((_, reject) =>
    setTimeout(() => reject(new Error(errorMessage)), timeoutMs),
  );
  return Promise.race([promise, timeout]);
}

async function authHandler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res
      .status(405)
      .json({ success: false, error: "Method not allowed" });
  }

  const rawId = req.body.userId;
  if (!rawId || typeof rawId !== "string") {
    return res
      .status(400)
      .json({ success: false, error: "Missing or invalid userId" });
  }

  let userIdBigInt: bigint;
  try {
    userIdBigInt = BigInt(rawId);
  } catch {
    return res
      .status(400)
      .json({ success: false, error: "Invalid userId format" });
  }

  try {
    const verification = await prisma.verificationState.findFirst({
      where: {
        isReset: true,
        userId: userIdBigInt,
      },
    });

    if (!verification || !verification.isReset) {
      return res
        .status(400)
        .json({ success: false, error: "Invalid verification session" });
    }

    const { userId, code } = verification;

    let blurb: string | null = null;
    try {
      blurb = await withTimeout(
        noblox.getBlurb(Number(userId)),
        15000,
        "Roblox API call timed out",
      );
    } catch (error: any) {
      console.error("Failed to fetch Roblox blurb:", error.message);
      if (
        error.message?.includes("401") ||
        error.message?.includes("Unauthorized")
      ) {
        return res
          .status(502)
          .json({ success: false, error: "Roblox authentication failed" });
      }
      if (
        error.message?.includes("429") ||
        error.message?.includes("Too Many Requests")
      ) {
        return res
          .status(503)
          .json({
            success: false,
            error: "Roblox API rate limit reached, please try again later",
          });
      }
      return res
        .status(502)
        .json({
          success: false,
          error: "Failed to verify Roblox profile, please try again",
        });
    }

    if (!blurb || !blurb.includes(code)) {
      return res
        .status(400)
        .json({ success: false, error: "Verification code does not match" });
    }

    return res.status(200).json({ success: true });
  } catch (error: any) {
    console.error("Unexpected error in authHandler:", error);
    return res
      .status(500)
      .json({ success: false, error: "Internal server error" });
  }
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  const TIMEOUT_MS = 25000;
  try {
    res.setHeader("Connection", "close");
    const timeoutPromise = new Promise<never>((_, reject) => {
      const timer = setTimeout(() => {
        clearTimeout(timer);
        reject(new Error("Request timed out"));
      }, TIMEOUT_MS);
    });
    await Promise.race([authHandler(req, res), timeoutPromise]);
  } catch (error: any) {
    if (error.message === "Request timed out") {
      if (!res.headersSent) {
        return res
          .status(503)
          .json({
            success: false,
            error: "Server is too busy, please try again later.",
          });
      }
    }
    if (!res.headersSent) {
      console.error("Unhandled error:", error);
      return res
        .status(500)
        .json({ success: false, error: "Internal server error" });
    }
  }
}

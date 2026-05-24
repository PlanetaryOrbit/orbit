import { withAuth } from "@/lib/withAuth";
import * as noblox from "noblox.js";
import { NextApiRequest, NextApiResponse } from "next";

async function authHandler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res
      .status(405)
      .json({ success: false, error: "Method not allowed" });
  }

  const verification = await prisma.verificationState.findFirst({
    where: {
      isReset: true,
      userId: BigInt(req.body.userId),
    },
  });
  if (!verification || !verification.isReset) {
    return res
      .status(400)
      .json({ success: false, error: "Invalid verification session" });
  }

  const { userId, code } = verification;

  const blurb = await noblox.getBlurb(Number(userId)).catch(() => null);

  console.log(code, blurb)

  if (!blurb || !blurb.includes(code)) {
    return res
      .status(400)
      .json({ success: false, error: "Verification code does not match" });
  }

  res.status(200).json({ success: true });
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  const TIMEOUT_MS = 20000;
  const timeoutPromise = new Promise<void>((_, reject) =>
    setTimeout(() => reject(new Error("Request timed out")), TIMEOUT_MS),
  );
  try {
    await Promise.race([authHandler(req, res), timeoutPromise]);
  } catch (error) {
    if ((error as Error).message === "Request timed out") {
      return res.status(503).json({
        success: false,
        error: "Server is too busy, please try again later.",
      });
    }
    console.log(error)
    return;
  }
}

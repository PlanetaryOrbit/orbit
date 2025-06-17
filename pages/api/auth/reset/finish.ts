import { withSessionRoute } from "@/lib/withSession";
import prisma from "@/utils/database";
import bcryptjs from "bcryptjs";
import * as noblox from "noblox.js";
import { NextApiRequest, NextApiResponse } from "next";

async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST")
    return res.status(405).json({ success: false, error: "Method not allowed" });

  const verification = req.session.verification;
  if (!verification || !verification.isReset)
    return res.status(400).json({ success: false, error: "Invalid verification session" });

  const { userid, verificationCode } = verification;

  const blurb = await noblox.getBlurb(Number(userid)).catch(() => null);
  if (!blurb || !blurb.includes(verificationCode)) {
    return res.status(400).json({ success: false, error: "Verification code not found in Roblox blurb" });
  }

  const password = req.body.password;
  if (!password) return res.status(400).json({ success: false, error: "Password is required" });

  const hash = await bcryptjs.hash(password, 10);
  await prisma.userInfo.update({
    where: { userid: BigInt(userid) },
    data: { passwordhash: hash },
  });

  delete req.session.verification;
  await req.session.save();

  res.status(200).json({ success: true });
}

export default withSessionRoute(async (req: NextApiRequest, res: NextApiResponse) => {
  const TIMEOUT_MS = 20000;
  const timeoutPromise = new Promise<void>((_, reject) =>
    setTimeout(() => reject(new Error("Request timed out")), TIMEOUT_MS)
  );
  try {
    await Promise.race([handler(req, res), timeoutPromise]);
  } catch (error) {
    if ((error as Error).message === "Request timed out") {
      return res.status(503).json({
        success: false,
        error: "Server is too busy, please try again later.",
      });
    }
    return res.status(500).json({ success: false, error: "Internal server error" });
  }
});

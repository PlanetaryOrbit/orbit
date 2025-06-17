import type { NextApiRequest, NextApiResponse } from "next";
import { withSessionRoute } from "@/lib/withSession";
import prisma from "@/utils/database";
import bcryptjs from "bcryptjs";
import * as noblox from "noblox.js";
import { getRobloxThumbnail } from "@/utils/roblox";

type Data = {
  success: boolean;
  error?: string;
  code?: number;
  debug?: any;
};

async function safeHashPassword(password: string): Promise<string> {
  try {
    return await bcryptjs.hash(password, 10);
  } catch (error) {
    console.error("Error hashing password:", error);
    throw new Error("Failed to hash password");
  }
}

export default withSessionRoute(async function handlerWithTimeout(req: NextApiRequest, res: NextApiResponse<Data>) {
  const TIMEOUT_MS = 20000;
  const mainHandler = handler(req, res);
  const timeoutPromise = new Promise<void>((_, reject) =>
    setTimeout(() => reject(new Error("Request timed out")), TIMEOUT_MS)
  );

  try {
    await Promise.race([mainHandler, timeoutPromise]);
  } catch (error) {
    if ((error as Error).message === "Request timed out") {
      return res.status(503).json({
        success: false,
        error: "Server is too busy, please try again later.",
        code: 503,
      });
    }

    return;
  }
});

export async function handler(req: NextApiRequest, res: NextApiResponse<Data>) {
  try {
    if (req.method !== "POST") {
      return res
        .status(405)
        .json({ success: false, error: "Method not allowed", code: 405 });
    }

    const verification = req.session.verification;
    if (!verification) {
      return res
        .status(400)
        .json({ success: false, error: "Missing verification", code: 400 });
    }

    const { userid, verificationCode } = verification;

    const blurb = await noblox.getBlurb(userid);
    if (!blurb) {
      return res
        .status(400)
        .json({ success: false, error: "Invalid user", code: 400 });
    }

    if (!blurb.includes(verificationCode)) {
      return res.status(400).json({
        success: false,
        error: "Invalid verification code",
        code: 400,
        debug: { blurb, code: verificationCode },
      });
    }

    const password = req.body.password;
    if (!password) {
      return res
        .status(400)
        .json({ success: false, error: "Password is required", code: 400 });
    }

    if (
      password.length < 7 ||
      !/[0-9!@#$%^&*]/.test(password)
    ) {
      return res.status(400).json({
        success: false,
        error: "Password must be at least 7 characters and contain a number or special character.",
        code: 400,
      });
    }

    req.session.userid = userid;
    await req.session.save();

    let thumbnail = await getRobloxThumbnail(userid);
    if (!thumbnail) thumbnail = undefined;

    const username = await noblox.getUsernameFromId(userid);

    try {
      const hashedPassword = await safeHashPassword(password);

      await prisma.user.upsert({
        where: {
          userid: BigInt(userid),
        },
        update: {
          username: username || undefined,
          picture: thumbnail,
          registered: true,
          info: {
            upsert: {
              create: {
                passwordhash: hashedPassword,
              },
              update: {
                passwordhash: hashedPassword,
              },
            },
          },
        },
        create: {
          userid: BigInt(userid),
          username: username || undefined,
          picture: thumbnail,
          registered: true,
          info: {
            create: {
              passwordhash: hashedPassword,
            },
          },
        },
      });

      return res.status(200).json({ success: true, code: 200 });
    } catch (prismaError) {
      console.error("Prisma error:", prismaError);

      try {
        const hashedPassword = await safeHashPassword(password);

        await prisma.user.upsert({
          where: {
            userid: BigInt(userid),
          },
          update: {
            username: username || undefined,
            picture: thumbnail,
          },
          create: {
            userid: BigInt(userid),
            username: username || undefined,
            picture: thumbnail,
          },
        });

        await prisma.userInfo.upsert({
          where: {
            userid: BigInt(userid),
          },
          update: {
            passwordhash: hashedPassword,
          },
          create: {
            userid: BigInt(userid),
            passwordhash: hashedPassword,
          },
        });

        return res.status(200).json({ success: true, code: 200 });
      } catch (error) {
        console.error("Fallback creation error:", error);
        throw error;
      }
    }
  } catch (error) {
    console.error("Verification error:", error);
    return res.status(500).json({
      success: false,
      error: "Internal server error",
      code: 500,
      debug: process.env.NODE_ENV === "development" ? error : undefined,
    });
  }
}

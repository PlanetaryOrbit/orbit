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
  const startTime = Date.now();
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
        .json({ success: false, error: "Session Expired. Please start the signup process again.", code: 400 });
    }

    const { userid, verificationCode } = verification;
    const { code: clientCode } = req.body;

    if (clientCode && clientCode !== verificationCode) {
      return res.status(400).json({
        success: false,
        error: "Verification code mismatch.",
        code: 400,
      });
    }

    let blurb: string;
    try {
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("Roblox API timeout")), 10000)
      );
      
      blurb = await Promise.race([
        noblox.getBlurb(userid),
        timeoutPromise
      ]);
    } catch (error) {
      console.error("Failed to fetch Roblox blurb:", error);
      
      if (error instanceof Error && error.message.includes("timeout")) {
        return res.status(400).json({
          success: false,
          error: "Roblox servers are responding slowly. Please wait a moment and try again.",
          code: 400,
        });
      }
      
      return res.status(400).json({
        success: false,
        error: "Unable to verify your Roblox profile. Please ensure your profile is public and try again.",
        code: 400,
      });
    }

    if (!blurb.trim()) {
      return res.status(400).json({
        success: false,
        error: "Your Roblox bio is empty. Please add the verification code to your bio and try again.",
        code: 400,
      });
    }
    const normalizedBlurb = blurb.trim().normalize('NFC');
    const normalizedCode = verificationCode.trim().normalize('NFC');

    if (!normalizedBlurb.includes(normalizedCode)) {
      return res.status(400).json({
        success: false,
        error: "Verification code not found in your Roblox bio. Please make sure you've pasted the exact code and try again.",
        code: 400,
        debug: process.env.NODE_ENV === "development" ? { 
          blurbLength: blurb.length, 
          codeLength: verificationCode.length,
          blurbPreview: blurb.substring(0, 50) + "...",
          searchingFor: verificationCode.substring(0, 10) + "..." 
        } : undefined,
      });
    }

    const password = req.body.password;
    if (!password) {
      return res
        .status(400)
        .json({ success: false, error: "Password is required", code: 400 });
    }

    if (password.length < 7) {
      return res.status(400).json({
        success: false,
        error: "Password must be at least 7 characters long.",
        code: 400,
      });
    }

    if (!/[0-9!@#$%^&*]/.test(password)) {
      return res.status(400).json({
        success: false,
        error: "Password must contain at least one number or special character (!@#$%^&*).",
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

      delete req.session.verification;
      await req.session.save();

      console.log(`[SIGNUP] User ${userid} successfully verified and registered in ${Date.now() - startTime}ms`);
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

        // Clear verification session to prevent reuse  
        delete req.session.verification;
        await req.session.save();

        console.log(`[SIGNUP_FINISH] User ${userid} successfully verified via fallback method in ${Date.now() - startTime}ms`);
        return res.status(200).json({ success: true, code: 200 });
      } catch (error) {
        console.error("Fallback creation error:", error);
        throw error;
      }
    }
  } catch (error) {
    console.error("Verification error:", error);
    
    // Check if it's a noblox.js related error
    if (error instanceof Error && error.message.includes("getBlurb")) {
      return res.status(400).json({
        success: false,
        error: "Unable to access your Roblox profile. Please ensure your profile is public and try again.",
        code: 400,
      });
    }
    
    // Check if it's a database connection error
    if (error instanceof Error && (error.message.includes("database") || error.message.includes("connection"))) {
      return res.status(503).json({
        success: false,
        error: "Database temporarily unavailable. Please try again in a few moments.",
        code: 503,
      });
    }
    
    return res.status(500).json({
      success: false,
      error: "An unexpected error occurred. Please try again or contact support if the issue persists.",
      code: 500,
      debug: process.env.NODE_ENV === "development" ? error : undefined,
    });
  }
}

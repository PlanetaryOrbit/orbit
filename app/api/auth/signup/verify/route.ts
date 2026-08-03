/**
 * Orbit API
 *
 * Completes a non-OAuth signup flow.
 *
 * Verifies Roblox bio ownership and creates the account.
 *
 * @module app/api/auth/signup/verify
 * @since 3.0.0
 * @author BuddyWinte
 */

import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import { syncRobloxData } from "@/lib/crons/sync";

function createSessionToken() {
  return crypto.randomBytes(48).toString("hex");
}

async function getRobloxUser(id: bigint) {
  const response = await fetch(
    `https://users.roblox.com/v1/users/${id}`,
  );
  if (!response.ok) {
    throw new Error("Roblox lookup failed");
  }
  return response.json();
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const { signupId } = body;

    if (typeof signupId !== "string") {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "INVALID_REQUEST",
            message: "Signup ID is required.",
          },
        },
        { status: 400 },
      );
    }

    const signup = await prisma.signupAttempt.findUnique({
      where: {
        id: signupId,
      },
    });

    if (!signup) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "SIGNUP_NOT_FOUND",
            message: "Signup attempt not found.",
          },
        },
        { status: 404 },
      );
    }

    if (signup.expiresAt < new Date()) {
      await prisma.signupAttempt.delete({
        where: {
          id: signup.id,
        },
      });

      return NextResponse.json(
        {
          success: false,
          error: {
            code: "SIGNUP_EXPIRED",
            message: "Signup attempt expired.",
          },
        },
        { status: 410 },
      );
    }

    const robloxUser = await getRobloxUser(signup.robloxId);

    if (
      typeof robloxUser.description !== "string" ||
      !robloxUser.description.includes(
        signup.verificationCode,
      )
    ) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "VERIFICATION_FAILED",
            message:
              "Verification code was not found in Roblox bio.",
          },
        },
        { status: 400 },
      );
    }

    const existingUser = await prisma.user.findUnique({
      where: {
        username: signup.username,
      },
    });

    if (existingUser) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "USERNAME_TAKEN",
            message: "Username is already registered.",
          },
        },
        { status: 409 },
      );
    }

    const sessionToken = createSessionToken();
    const isFirstUser = await prisma.user.count() === 0;

    const user = await prisma.user.create({
      data: {
        username: signup.username,

        credentials: {
          create: {
            passwordHash: signup.passwordHash,
          },
        },

        isOwner: isFirstUser,
        robloxId: robloxUser.id,

        sessions: {
          create: {
            tokenHash: crypto
              .createHash("sha256")
              .update(sessionToken)
              .digest("hex"),

            expiresAt: new Date(
              Date.now() + 30 * 24 * 60 * 60 * 1000,
            ),
          },
        },
      },
    });

    await prisma.signupAttempt.delete({
      where: {
        id: signup.id,
      },
    });

    const response = NextResponse.json({
      success: true,
      data: {
        id: user.id,
        username: user.username,
        isFirst: isFirstUser,
      },
    });

    response.cookies.set({
      name: "orbit_session",
      value: sessionToken,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 30,
    });

    void syncRobloxData(user.id, signup.robloxId)

    return response;
  } catch (err) {
    console.error("Signup verify error:", err);

    return NextResponse.json(
      {
        success: false,
        error: {
          code: "INTERNAL_SERVER_ERROR",
          message: "An error occurred while verifying signup.",
        },
      },
      { status: 500 },
    );
  }
}

/**
 * Orbit API
 *
 * Starts a non-OAuth signup flow.
 *
 * Generates a Roblox bio verification token.
 *
 * @module pages/api/v2
 * @since 3.0.0
 * @author BuddyWinte
 */
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { encrypt } from "@/utils/password";
import fetchAvatar from "@/utils/avatar";

const verificationCharacters = [
  "📋",
  "🎉",
  "🎂",
  "📆",
  "✔️",
  "📃",
  "👍",
  "➕",
  "📢",
  "🐒",
  "🐴",
  "🐑",
  "🐘",
  "🐼",
  "🐧",
  "🐦",
  "🐤",
  "🐥",
  "🐣",
  "🐔",
  "🐍",
  "🐢",
  "🐛",
  "🐝",
  "🐜",
  "📕",
  "📗",
  "📘",
  "📙",
  "📓",
  "📔",
  "📒",
  "📚",
  "📖",
  "🔖",
  "🎯",
  "🏈",
  "🏀",
  "⚽",
  "⚾",
  "🎾",
  "🎱",
  "🏉",
  "🎳",
  "⛳",
  "🚵",
  "🚴",
  "🏁",
  "🏇",
];

function generateVerificationCode() {
  return `🤖${Array.from(
    { length: 11 },
    () =>
      verificationCharacters[
        Math.floor(Math.random() * verificationCharacters.length)
      ],
  ).join("")}`;
}

async function getRobloxUser(username: string) {
  const response = await fetch("https://users.roblox.com/v1/usernames/users", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      usernames: [username],
      excludeBannedUsers: false,
    }),
  });
  if (!response.ok) {
    throw new Error("Roblox lookup failed");
  }
  const data = await response.json();
  return data.data?.[0] ?? null;
}

export type SignupStartResponse = {
  signupId: string;
  user: {
    id: string;
    username: string;
    displayName: string;
    avatar: string | null;
  };
  verification: {
    type: "roblox_bio";
    code: string;
    expiresAt: string;
  };
};

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { username, password } = body;

    if (typeof username !== "string" || typeof password !== "string") {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "INVALID_REQUEST",
            message: "Username and password are required.",
          },
        },
        { status: 400 },
      );
    }

    const cleanUsername = username.trim();

    if (
      cleanUsername.length < 3 ||
      cleanUsername.length > 20 ||
      !/^[a-zA-Z0-9_]+$/.test(cleanUsername)
    ) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "INVALID_USERNAME",
            message: "Invalid Roblox username.",
          },
        },
        { status: 400 },
      );
    }

    if (password.length < 8) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "WEAK_PASSWORD",
            message: "Password must be at least 8 characters.",
          },
        },
        { status: 400 },
      );
    }

    let robloxUser;

    try {
      robloxUser = await getRobloxUser(cleanUsername);
    } catch {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "ROBLOX_UNAVAILABLE",
            message: "Unable to contact Roblox services.",
          },
        },
        { status: 502 },
      );
    }

    if (!robloxUser) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "ROBLOX_USER_NOT_FOUND",
            message: "Roblox user not found.",
          },
        },
        { status: 404 },
      );
    }

    const robloxId = BigInt(robloxUser.id);

    await prisma.signupAttempt.deleteMany({
      where: {
        robloxId,
      },
    });
    const passwordHash = await encrypt(password);
    const verificationCode = generateVerificationCode();
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000);

    const signup = await prisma.signupAttempt.create({
      data: {
        username: cleanUsername,
        passwordHash,
        robloxId,
        verificationCode,
        expiresAt,
      },
    });

    const avatar = await fetchAvatar(robloxUser.id);

    return NextResponse.json({
      success: true,
      data: {
        signupId: signup.id,

        user: {
          id: robloxId.toString(),
          username: robloxUser.name,
          displayName: robloxUser.displayName,
          avatar: avatar,
        },

        verification: {
          type: "roblox_bio",
          code: verificationCode,
          expiresAt: expiresAt.toISOString(),
        },
      },
    });
  } catch (err) {
    console.error("Signup start error:", err);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "INTERNAL_SERVER_ERROR",
          message: "An error occurred while processing your request.",
        },
      },
      { status: 500 },
    );
  }
}

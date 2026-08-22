/**
 * Orbit API
 *
 * Returns the currently authenticated user's information.
 *
 * @author BuddyWinte
 */

import { NextResponse } from "next/server";
import { getMe } from "@/lib/me";

export type MeResponse = {
  success: true;
  data: {
    id: string;
    username: string;
    isOwner: boolean | false;
    roblox: {
      id: number;
      username: string;
      displayName: string;
      hasVerifiedBadge: boolean;
      isBanned: boolean;
      avatarUrl: string | null;
      syncedAt: string;
    } | null;
    createdAt: string;
    updatedAt: string;
  };
};

export async function GET() {
  try {
    const user = await getMe();

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "UNAUTHORIZED",
            message: "Authentication required.",
          },
        },
        {
          status: 401,
        },
      );
    }

    return NextResponse.json({
      success: true,
      data: user,
    } satisfies MeResponse);

  } catch (err) {
    console.error("@me error:", err);

    return NextResponse.json(
      {
        success: false,
        error: {
          code: "INTERNAL_SERVER_ERROR",
          message: "An error occurred while fetching user data.",
        },
      },
      {
        status: 500,
      },
    );
  }
}

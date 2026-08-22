/**
 * Orbit API
 *
 * Sets the instance settings
 *
 * Requires isOwner to be true
 *
 * @author BuddyWinte
 */
import { NextRequest, NextResponse } from "next/server";
import { authenticate } from "@/lib/auth";
import { getMe } from "@/lib/me";
import { updateSettings } from "@/lib/instance";
import { InstanceSettings } from "@prisma/client"

export async function POST(req: NextRequest) {
  try {
    const auth = await authenticate();

    if (!auth) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "UNAUTHORIZED",
            message: "Authentication required.",
          },
        },
        { status: 401 },
      );
    }

    const me = await getMe();

    if (!me?.isOwner) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "FORBIDDEN",
            message: "Only instance owners can update settings.",
          },
        },
        { status: 403 },
      );
    }

    const body = await req.json();

    const settings: Partial<InstanceSettings> = {
      name: typeof body.name === "string" ? body.name.trim() : undefined,

      logoUrl:
        typeof body.logoUrl === "string"
          ? body.logoUrl.trim() || null
          : undefined,

      primaryColor:
        typeof body.primaryColor === "string" ? body.primaryColor : undefined,

      allowPasswordAuth:
        typeof body.allowPasswordAuth === "boolean"
          ? body.allowPasswordAuth
          : undefined,

      enableRegistration:
        typeof body.enableRegistration === "boolean"
          ? body.enableRegistration
          : undefined,

      isSetup: true,
    };

    const updated = await updateSettings(settings);

    return NextResponse.json({
      success: true,
      data: updated,
    });
  } catch (err) {
    console.error("Instance settings update error:", err);

    return NextResponse.json(
      {
        success: false,
        error: {
          code: "INTERNAL_SERVER_ERROR",
          message: "An error occurred while updating instance settings.",
        },
      },
      {
        status: 500,
      },
    );
  }
}

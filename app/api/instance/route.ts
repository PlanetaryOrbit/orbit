/**
 * Orbit API
 *
 * Returns public instance settings.
 *
 * @author BuddyWinte
 */

import { NextResponse } from "next/server";
import { getSettings } from "@/lib/instance";

export type InstanceResponse = {
  success: true;
  data: {
    name: string;
    logoUrl: string | null;
    faviconUrl: string | null;
    primaryColor: string;
    darkBackground: string;
    lightBackground: string | null;
    allowPasswordAuth: boolean;
    enableRegistration: boolean;
    isSetup: boolean;
  };
};

export async function GET() {
  try {
    const settings = await getSettings();

    return NextResponse.json({
      success: true,
      data: {
        name: settings.name,
        logoUrl: settings.logoUrl,
        faviconUrl: settings.faviconUrl,
        primaryColor: settings.primaryColor,
        darkBackground: settings.darkBackground,
        lightBackground: settings.lightBackground,
        allowPasswordAuth: settings.allowPasswordAuth,
        enableRegistration: settings.enableRegistration,
        isSetup: settings.isSetup,
      },
    } satisfies InstanceResponse);
  } catch (err) {
    console.error("Instance settings error:", err);

    return NextResponse.json(
      {
        success: false,
        error: {
          code: "INTERNAL_SERVER_ERROR",
          message: "An error occurred while fetching instance settings.",
        },
      },
      {
        status: 500,
      },
    );
  }
}

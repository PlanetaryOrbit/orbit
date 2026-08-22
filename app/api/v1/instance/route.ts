import { NextResponse } from "next/server";
import {
  getSettings,
  updateSettings,
  serializeSettings,
  ClientInstanceSettings,
} from "@/lib/instance";

export type InstanceResponse = {
  success: true;
  data: ClientInstanceSettings;
};

export async function GET() {
  try {
    const settings = await getSettings();

    return NextResponse.json({
      success: true,
      data: serializeSettings(settings),
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
      { status: 500 },
    );
  }
}

export async function PATCH(req: Request) {
  try {
    const current = await getSettings();

    if (!current.isSetup) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "NOT_SETUP",
            message: "This instance has not been configured yet.",
          },
        },
        { status: 403 },
      );
    }

    const body = await req.json();
    const settings = await updateSettings(body);

    return NextResponse.json({
      success: true,
      data: serializeSettings(settings),
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
      { status: 500 },
    );
  }
}

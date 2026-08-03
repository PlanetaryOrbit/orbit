import { NextRequest, NextResponse } from "next/server";
import { getSettings } from "@/lib/instance";

export async function proxy(req: NextRequest) {
  const settings = await getSettings();
  const pathname = req.nextUrl.pathname;

  const allowedPaths = [
    "/api",
    "/signup",
    "/login",
    "/setup",
    "/public",
  ];

  const isAllowed = allowedPaths.some((path) =>
    pathname.startsWith(path)
  );

  if (!settings.isSetup && !isAllowed) {
    return NextResponse.redirect(
      new URL("/setup", req.url)
    );
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};

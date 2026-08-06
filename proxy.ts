import { NextRequest, NextResponse } from "next/server";
import cache from "@/utils/cache";

export async function proxy(req: NextRequest) {

  const pathname = req.nextUrl.pathname;

  const allowedPaths = [
    "/api",
    "/signup",
    "/login",
    "/setup",
    "/public",
    "/ws-test",
  ];

  const isAllowed = allowedPaths.some((path) => pathname.startsWith(path));

  if (!(await cache.get("isSetup")) && !isAllowed) {
    return NextResponse.redirect(new URL("/setup", req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|webp|gif|ico|avif|bmp|woff|woff2|ttf|otf)).*)",
  ],
};

import { NextRequest, NextResponse } from "next/server";
import cache from "@/utils/cache";

export async function proxy(req: NextRequest) {
  const setupValue = await cache.get("isSetup");
  const isSetup = setupValue === true || setupValue === "true";

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

  if (!isSetup && !isAllowed) {
    return NextResponse.redirect(new URL("/setup", req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};

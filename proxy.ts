import { NextResponse } from "next/server";
import { NextRequest } from "next/server";

const PUBLIC_ROUTES = ["/welcome", "/login", "/api"];

function isPublic(pathname: string) {
  return PUBLIC_ROUTES.some((route) => pathname.startsWith(route));
}

function internalUrl(path: string): string {
  const base = process.env.NEXTAUTH_URL || process.env.NEXT_PUBLIC_URL || "http://localhost:3000"
  return `${base.replace(/\/$/, "")}${path}`
}

let setupChecked = false
let isSetupComplete = true

async function checkSetup(): Promise<boolean> {
  if (setupChecked) return isSetupComplete
  try {
    const res = await fetch(internalUrl("/api/admin/first-setup/config"))
    if (res.ok) {
      const data = await res.json()
      isSetupComplete = data.workspaceCount > 0 || data.userCount > 0
      setupChecked = true
    }
  } catch {
  }
  return isSetupComplete
}

export default async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon.ico") ||
    pathname.includes(".")
  ) {
    return NextResponse.next();
  }

  if (pathname.startsWith("/api")) return NextResponse.next();

  const appSetupCookie = request.cookies.get("app_setup")?.value;
  const isSetup = appSetupCookie !== undefined
    ? appSetupCookie === "true"
    : await checkSetup()

  const stampCookie = appSetupCookie === undefined

  if (!isSetup && pathname !== "/welcome") {
    const res = NextResponse.redirect(new URL("/welcome", request.url))
    if (stampCookie) res.cookies.set("app_setup", "false", { path: "/", httpOnly: true, sameSite: "strict" })
    return res
  }

  if (isSetup && pathname === "/welcome") {
    const res = NextResponse.redirect(new URL("/", request.url))
    if (stampCookie) res.cookies.set("app_setup", "true", { path: "/", httpOnly: true, sameSite: "strict" })
    return res
  }

  if (isSetup && !isPublic(pathname)) {
    const token = request.cookies.get("session_token")?.value;
    if (!token) {
      return NextResponse.redirect(new URL("/login", request.url));
    }

    const res = await fetch(internalUrl("/api/auth/session/validate"), {
      headers: { Authorization: `Bearer ${token}` },
    })

    if (!res.ok) {
      return NextResponse.redirect(new URL("/login", request.url));
    }
  }

  const response = NextResponse.next();

  if (stampCookie) {
    response.cookies.set("app_setup", String(isSetup), { path: "/", httpOnly: true, sameSite: "strict" })
  }

  response.headers.set(
    "Content-Security-Policy",
    [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://widget.intercom.io https://js.intercomcdn.com https://cdn.posthog.com https://js.posthog.com https://cdn.intercom.com https://uploads.intercomcdn.com https://uranus.planetaryapp.cloud",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "font-src 'self' https://fonts.gstatic.com https://fonts.intercomcdn.com",
      "img-src 'self' data: https: blob:",
      "connect-src 'self' https: wss:",
      "frame-src 'self' https://widget.intercom.io",
      "frame-ancestors 'self'",
      "base-uri 'self'",
      "form-action 'self'",
    ].join("; ")
  );
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("X-Frame-Options", "SAMEORIGIN");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set("Strict-Transport-Security", "max-age=63072000; includeSubDomains; preload");

  return response;
}
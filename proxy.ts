import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const REQUIRED_ENV_VARS = [
  "DATABASE_URL",
  "SESSION_SECRET",
];

const PUBLIC_ROUTES = [
  "/welcome",
  "/login",
  "/forgot-password",
  "/env-error",
  "/400",
  "/500",
];

function isPublic(pathname: string) {
  return PUBLIC_ROUTES.some(
    (route) =>
      pathname === route ||
      pathname.startsWith(`${route}/`),
  );
}

function addHeaders(response: NextResponse) {
  response.headers.set(
    "Content-Security-Policy",
    [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' https://cdn.posthog.com https://js.posthog.com",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "font-src 'self' https://fonts.gstatic.com",
      "img-src 'self' data: https: blob:",
      "connect-src 'self' https: wss:",
      "frame-ancestors 'self'",
      "base-uri 'self'",
      "form-action 'self'",
    ].join("; "),
  );

  response.headers.set(
    "X-Content-Type-Options",
    "nosniff",
  );

  response.headers.set(
    "Referrer-Policy",
    "strict-origin-when-cross-origin",
  );

  response.headers.set(
    "Strict-Transport-Security",
    "max-age=63072000; includeSubDomains; preload",
  );

  return response;
}

export default function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const response = NextResponse.next();

  const missingEnv = REQUIRED_ENV_VARS.filter(
    (key) => !process.env[key],
  );

  if (
    missingEnv.length > 0 &&
    pathname !== "/env-error"
  ) {
    return NextResponse.redirect(
      new URL("/env-error", request.url),
    );
  }

  if (pathname.startsWith("/api")) {
    return addHeaders(response);
  }

  if (!isPublic(pathname)) {
    const token =
      request.cookies.get("session_token")?.value;

    if (!token) {
      return NextResponse.redirect(
        new URL("/login", request.url),
      );
    }
  }

  return addHeaders(response);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};

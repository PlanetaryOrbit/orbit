import { NextResponse } from "next/server";
import { NextRequest } from "next/server";

const REQUIRED_ENV_VARS = [
  "DATABASE_URL",
  "NEXTAUTH_URL",
  "SESSION_SECRET"
];

const PUBLIC_ROUTES = ["/welcome", "/login", "/api", "/env-error"];

function isPublic(pathname: string) {
  return PUBLIC_ROUTES.some((route) => pathname.startsWith(route));
}

function internalUrl(path: string): string {
  const base = process.env.NEXTAUTH_URL || "http://localhost:3000";
  return `${base.replace(/\/$/, "")}${path}`;
}

function getMissingEnvVars(): string[] {
  return REQUIRED_ENV_VARS.filter((v) => !process.env[v]);
}

let setupCache: {
  isSetup: boolean;
  timestamp: number;
} | null = null;
const CACHE_DURATION = 30000; // 30 seconds

async function checkSetup(): Promise<boolean> {
  if (setupCache && Date.now() - setupCache.timestamp < CACHE_DURATION) {
    return setupCache.isSetup;
  }

  try {
    const res = await fetch(internalUrl("/api/admin/first-setup/config"));

    if (res.ok) {
      const data = await res.json();
      const isSetup = data.workspaceCount > 0 || data.userCount > 0;

      setupCache = {
        isSetup,
        timestamp: Date.now(),
      };

      return isSetup;
    }
  } catch (error) {
    console.error("[Middleware] Failed to check setup:", error);
  }

  return false;
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

  const missingVars = getMissingEnvVars();
  if (missingVars.length > 0) {
    console.log("missing var!!!!!!")
    console.log(missingVars)
    if (pathname !== "/env-error") {
      return NextResponse.redirect(new URL("/env-error", request.url));
    }
    return NextResponse.next();
  }

  const isActuallySetup = await checkSetup();

  const appSetupCookie = request.cookies.get("app_setup")?.value;
  const cookieIsSetup = appSetupCookie === "true";

  const needsCookieUpdate = cookieIsSetup !== isActuallySetup;

  if (!isActuallySetup && pathname !== "/welcome") {
    const res = NextResponse.redirect(new URL("/welcome", request.url));
    res.cookies.set("app_setup", "false", {
      path: "/",
      httpOnly: true,
      sameSite: "strict",
    });
    return res;
  }

  if (isActuallySetup && pathname === "/welcome") {
    const res = NextResponse.redirect(new URL("/", request.url));
    res.cookies.set("app_setup", "true", {
      path: "/",
      httpOnly: true,
      sameSite: "strict",
    });
    return res;
  }

  if (isActuallySetup && !isPublic(pathname)) {
    const token = request.cookies.get("session_token")?.value;
    if (!token) {
      const res = NextResponse.redirect(new URL("/login", request.url));
      res.cookies.set("app_setup", "true", {
        path: "/",
        httpOnly: true,
        sameSite: "strict",
      });
      return res;
    }

    try {
      const res = await fetch(internalUrl("/api/auth/session/validate"), {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        const response = NextResponse.redirect(new URL("/login", request.url));
        response.cookies.set("app_setup", "true", {
          path: "/",
          httpOnly: true,
          sameSite: "strict",
        });
        return response;
      }
    } catch (error) {
      console.error("[Middleware] Session validation failed:", error);
      const response = NextResponse.redirect(new URL("/login", request.url));
      response.cookies.set("app_setup", "true", {
        path: "/",
        httpOnly: true,
        sameSite: "strict",
      });
      return response;
    }
  }

  const response = NextResponse.next();

  if (needsCookieUpdate) {
    response.cookies.set("app_setup", String(isActuallySetup), {
      path: "/",
      httpOnly: true,
      sameSite: "strict",
    });
  }

  response.headers.set(
    "Content-Security-Policy",
    [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://widget.intercom.io https://js.intercomcdn.com https://cdn.posthog.com https://js.posthog.com https://cdn.intercom.com https://uploads.intercombcdn.com https://uranus.planetaryapp.cloud",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "font-src 'self' https://fonts.gstatic.com https://fonts.intercomcdn.com",
      "img-src 'self' data: https: blob:",
      "connect-src 'self' https: wss:",
      "frame-src 'self' https://widget.intercom.io",
      "frame-ancestors 'self'",
      "base-uri 'self'",
      "form-action 'self'",
    ].join("; "),
  );
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("X-Frame-Options", "SAMEORIGIN");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set(
    "Strict-Transport-Security",
    "max-age=63072000; includeSubDomains; preload",
  );

  return response;
}

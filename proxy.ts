import { NextResponse } from "next/server";
import { NextRequest } from "next/server";

const REQUIRED_ENV_VARS = [
  "DATABASE_URL",
  "SESSION_SECRET"
];

const PUBLIC_ROUTES = ["/welcome", "/login", "/api", "/env-error", "/forgot-password", "/400", "/500"];

function isPublic(pathname: string) {
  return PUBLIC_ROUTES.some((route) => pathname.startsWith(route));
}

function internalUrl(request: NextRequest, path: string): string {
  if (process.env.PLANETARY_CLOUD_URL) {
    const base = "http://localhost:3000"; // idk seem to work on cloud instances
    return `${base}${path}`;
  }
  
  if (process.env.NEXTAUTH_URL) {
    const base = process.env.NEXTAUTH_URL.replace(/\/$/, "");
    return `${base}${path}`;
  }
  
  const host = request.headers.get("host") || "";
  if (host.includes("localhost") || host.includes("127.0.0.1")) {
    return `http://${host}${path}`;
  }
  
  const { protocol, host: reqHost } = request.nextUrl;
  return `${protocol}//${reqHost}${path}`;
}

function getMissingEnvVars(): string[] {
  return REQUIRED_ENV_VARS.filter((v) => !process.env[v]);
}

let setupCache: {
  isSetup: boolean;
  timestamp: number;
} | null = null;
const CACHE_DURATION = 30000; // 30 seconds

async function checkSetup(request: NextRequest): Promise<boolean> {
  if (setupCache && Date.now() - setupCache.timestamp < CACHE_DURATION) {
    return setupCache.isSetup;
  }

  try {
    const url = internalUrl(request, "/api/admin/first-setup/config");
    console.log(`[Middleware] Checking setup at: ${url}`);
    
    const res = await fetch(url, {
      cache: 'no-store',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (res.ok) {
      const data = await res.json();
      const isSetup = data.userCount > 0;

      setupCache = {
        isSetup,
        timestamp: Date.now(),
      };

      return isSetup;
    } else {
      console.log(`[Middleware] Setup check failed with status: ${res.status}`);
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

  const isActuallySetup = await checkSetup(request);
  const appSetupCookie = request.cookies.get("app_setup")?.value;
  const cookieIsSetup = appSetupCookie === "true";

  const needsCookieUpdate = cookieIsSetup !== isActuallySetup;

  if (!isActuallySetup && pathname !== "/welcome") {
    console.log(`[Middleware] Not setup, redirecting ${pathname} -> /welcome`);
    const res = NextResponse.redirect(new URL("/welcome", request.url));
    res.cookies.set("app_setup", "false", {
      path: "/",
      httpOnly: true,
      sameSite: "strict",
    });
    return res;
  }

  if (isActuallySetup && pathname === "/welcome") {
    console.log(`[Middleware] Setup complete, redirecting /welcome -> /`);
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
      console.log(`[Middleware] No session token, redirecting ${pathname} -> /login`);
      const res = NextResponse.redirect(new URL("/login", request.url));
      res.cookies.set("app_setup", "true", {
        path: "/",
        httpOnly: true,
        sameSite: "strict",
      });
      return res;
    }

    try {
      const url = internalUrl(request, "/api/auth/session/validate");
      
      const res = await fetch(url, {
        headers: { 
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
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
    console.log(`[Middleware] Updating app_setup cookie: ${cookieIsSetup} -> ${isActuallySetup}`);
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
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.posthog.com https://js.posthog.com https://uranus.planetaryapp.cloud",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "font-src 'self' https://fonts.gstatic.com",
      "img-src 'self' data: https: blob:",
      "connect-src 'self' https: wss:",
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
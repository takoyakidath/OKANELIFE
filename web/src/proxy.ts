import { NextResponse, type NextRequest } from "next/server";

import { SESSION_COOKIE_NAME } from "@/lib/env";
import { parseSession, decodeJwtExp, isExpiringSoon } from "@/lib/session";
import { trustedOrigin } from "@/lib/trusted-origin";

const PUBLIC_PATHS = ["/login", "/offline", "/api/auth", "/manifest.webmanifest", "/sw.js"];

function isPublicPath(pathname: string) {
  return PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

/**
 * Optimistic auth gate (see Next.js Authentication guide: "Optimistic
 * checks with Proxy"). Only reads the cookie — never calls the database or
 * the PHP backend directly from here. An expiring access token is handled
 * by redirecting through `/api/auth/refresh`, which *can* write cookies.
 */
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (isPublicPath(pathname)) return NextResponse.next();

  const raw = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  const session = parseSession(raw);

  const origin = trustedOrigin(request);

  if (!session) {
    const loginUrl = new URL("/login", origin);
    loginUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(loginUrl);
  }

  const exp = decodeJwtExp(session.accessToken) ?? 0;
  if (isExpiringSoon(exp)) {
    const refreshUrl = new URL("/api/auth/refresh", origin);
    refreshUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(refreshUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|icon|apple-icon).*)"],
};

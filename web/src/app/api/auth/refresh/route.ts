import { NextResponse, type NextRequest } from "next/server";

import { getValidSession, clearSessionCookie } from "@/lib/auth-server";
import { env } from "@/lib/env";
import { safeRedirectPath } from "@/lib/safe-redirect";

/**
 * Called by `proxy.ts` (redirect) when a page navigation finds an
 * expiring access token, and by the client fetch wrapper (fetch) when an
 * API call hits 401 mid-session. Route Handlers can write cookies, unlike
 * Server Components, which is why the refresh logic lives here.
 */
export async function GET(request: NextRequest) {
  const redirectTo = safeRedirectPath(request.nextUrl.searchParams.get("redirect"));
  const session = await getValidSession();
  if (!session) {
    await clearSessionCookie();
    return NextResponse.redirect(
      new URL(
        `/login?redirect=${encodeURIComponent(redirectTo)}`,
        env.appUrl()
      )
    );
  }
  return NextResponse.redirect(new URL(redirectTo, env.appUrl()));
}

export async function POST() {
  const session = await getValidSession();
  if (!session) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }
  return NextResponse.json({ ok: true });
}

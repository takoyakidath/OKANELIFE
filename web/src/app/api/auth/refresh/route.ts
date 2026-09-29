import { NextResponse, type NextRequest } from "next/server";

import { getValidSession, clearSessionCookie } from "@/lib/auth-server";
import { safeRedirectPath } from "@/lib/safe-redirect";
import { trustedOrigin } from "@/lib/trusted-origin";

/**
 * Called by `proxy.ts` (redirect) when a page navigation finds an
 * expiring access token, and by the client fetch wrapper (fetch) when an
 * API call hits 401 mid-session. Route Handlers can write cookies, unlike
 * Server Components, which is why the refresh logic lives here.
 */
export async function GET(request: NextRequest) {
  const redirectTo = safeRedirectPath(request.nextUrl.searchParams.get("redirect"));
  const origin = trustedOrigin(request);
  const session = await getValidSession();
  if (!session) {
    await clearSessionCookie();
    return NextResponse.redirect(
      new URL(`/login?redirect=${encodeURIComponent(redirectTo)}`, origin)
    );
  }
  return NextResponse.redirect(new URL(redirectTo, origin));
}

export async function POST() {
  const session = await getValidSession();
  if (!session) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }
  return NextResponse.json({ ok: true });
}

import { NextResponse } from "next/server";

import { getSession, clearSessionCookie } from "@/lib/auth-server";
import { backendFetch } from "@/lib/backend";
import { env } from "@/lib/env";

export async function POST() {
  const session = await getSession();
  if (session) {
    try {
      await backendFetch("/v1/auth/logout", {
        method: "POST",
        accessToken: session.accessToken,
        json: { refresh_token: session.refreshToken },
      });
    } catch {
      // Best-effort revoke; still clear the local cookie below.
    }
  }
  await clearSessionCookie();
  return NextResponse.redirect(new URL("/login", env.appUrl()));
}

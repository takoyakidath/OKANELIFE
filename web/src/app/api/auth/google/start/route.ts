import { NextResponse, type NextRequest } from "next/server";
import { randomBytes, createHash } from "node:crypto";
import { cookies } from "next/headers";

import { env } from "@/lib/env";
import { safeRedirectPath } from "@/lib/safe-redirect";

const OAUTH_STATE_COOKIE = "okl_oauth_state";

function base64url(input: Buffer) {
  return input
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

/**
 * Kicks off the Google OAuth Authorization Code + PKCE flow. Only this
 * Next.js server ever holds the Google Client Secret — the PHP backend
 * never talks to Google directly (see docs/DESIGN.md §3).
 */
export async function GET(request: NextRequest) {
  const state = base64url(randomBytes(24));
  const codeVerifier = base64url(randomBytes(48));
  const codeChallenge = base64url(
    createHash("sha256").update(codeVerifier).digest()
  );

  const redirectTo = safeRedirectPath(request.nextUrl.searchParams.get("redirect"));
  const mode = request.nextUrl.searchParams.get("mode") === "link" ? "link" : "login";

  const authUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  authUrl.searchParams.set("client_id", env.googleClientId());
  authUrl.searchParams.set(
    "redirect_uri",
    new URL("/api/auth/google/callback", env.appUrl()).toString()
  );
  authUrl.searchParams.set("response_type", "code");
  authUrl.searchParams.set("scope", "openid email profile");
  authUrl.searchParams.set("state", state);
  authUrl.searchParams.set("code_challenge", codeChallenge);
  authUrl.searchParams.set("code_challenge_method", "S256");
  authUrl.searchParams.set("prompt", "select_account");

  const store = await cookies();
  store.set(
    OAUTH_STATE_COOKIE,
    JSON.stringify({ state, codeVerifier, redirectTo, mode }),
    {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 10,
    }
  );

  return NextResponse.redirect(authUrl);
}

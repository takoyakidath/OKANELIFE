import { NextResponse, type NextRequest } from "next/server";
import { cookies } from "next/headers";

import { env } from "@/lib/env";
import { safeRedirectPath } from "@/lib/safe-redirect";
import { decodeJwtExp } from "@/lib/session";
import { setSessionCookie, getValidSession } from "@/lib/auth-server";
import { backendJson, BackendError } from "@/lib/backend";

const OAUTH_STATE_COOKIE = "okl_oauth_state";

export async function GET(request: NextRequest) {
  const appUrl = env.appUrl();
  const code = request.nextUrl.searchParams.get("code");
  const state = request.nextUrl.searchParams.get("state");
  const errorParam = request.nextUrl.searchParams.get("error");

  const store = await cookies();
  const rawState = store.get(OAUTH_STATE_COOKIE)?.value;
  store.delete(OAUTH_STATE_COOKIE);

  if (errorParam) {
    return NextResponse.redirect(
      new URL(`/login?error=google_denied`, appUrl)
    );
  }

  if (!code || !state || !rawState) {
    return NextResponse.redirect(new URL(`/login?error=oauth_state`, appUrl));
  }

  let parsedState: {
    state: string;
    codeVerifier: string;
    redirectTo: string;
    mode: "login" | "link";
  };
  try {
    parsedState = JSON.parse(rawState);
  } catch {
    return NextResponse.redirect(new URL(`/login?error=oauth_state`, appUrl));
  }

  if (parsedState.state !== state) {
    return NextResponse.redirect(new URL(`/login?error=oauth_state`, appUrl));
  }

  // Exchange the authorization code for tokens directly with Google.
  // This request happens server-to-server; the Client Secret never
  // reaches the browser or the PHP backend.
  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: env.googleClientId(),
      client_secret: env.googleClientSecret(),
      code,
      code_verifier: parsedState.codeVerifier,
      grant_type: "authorization_code",
      redirect_uri: new URL("/api/auth/google/callback", appUrl).toString(),
    }),
  });

  if (!tokenRes.ok) {
    return NextResponse.redirect(
      new URL(`/login?error=google_token_exchange`, appUrl)
    );
  }

  const tokenData = (await tokenRes.json()) as { id_token?: string };
  if (!tokenData.id_token) {
    return NextResponse.redirect(new URL(`/login?error=no_id_token`, appUrl));
  }

  if (parsedState.mode === "link") {
    const session = await getValidSession();
    if (!session) {
      return NextResponse.redirect(new URL(`/login`, appUrl));
    }
    try {
      await backendJson("/v1/auth/accounts/link", {
        method: "POST",
        accessToken: session.accessToken,
        json: { id_token: tokenData.id_token },
      });
      const successUrl = new URL(safeRedirectPath(parsedState.redirectTo), appUrl);
      successUrl.searchParams.set("linked", "1");
      return NextResponse.redirect(successUrl);
    } catch (error) {
      const message =
        error instanceof BackendError ? error.message : "link_failed";
      const errorUrl = new URL(safeRedirectPath(parsedState.redirectTo), appUrl);
      errorUrl.searchParams.set("link_error", message);
      return NextResponse.redirect(errorUrl);
    }
  }

  try {
    const result = await backendJson<{
      access_token: string;
      refresh_token: string;
      is_new_user: boolean;
      user: { uuid: string; name: string | null; email: string | null };
    }>("/v1/auth/google", {
      method: "POST",
      json: { id_token: tokenData.id_token },
    });

    await setSessionCookie({
      accessToken: result.access_token,
      accessTokenExp: decodeJwtExp(result.access_token) ?? 0,
      refreshToken: result.refresh_token,
      user: {
        id: result.user.uuid,
        name: result.user.name,
        email: result.user.email,
      },
    });

    const destination = result.is_new_user
      ? "/onboarding"
      : safeRedirectPath(parsedState.redirectTo);
    return NextResponse.redirect(new URL(destination, appUrl));
  } catch (error) {
    const message =
      error instanceof BackendError ? error.message : "sign_in_failed";
    return NextResponse.redirect(
      new URL(`/login?error=${encodeURIComponent(message)}`, appUrl)
    );
  }
}

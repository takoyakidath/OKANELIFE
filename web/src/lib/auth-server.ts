import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { SESSION_COOKIE_NAME } from "./env";
import {
  type Session,
  parseSession,
  serializeSession,
  decodeJwtExp,
  isExpiringSoon,
} from "./session";
import { backendJson, BackendError } from "./backend";

const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
};

/**
 * Read-only session peek for Server Components (which cannot set cookies).
 * Pages should assume `proxy.ts` already refreshed an expiring session
 * before the render started — see docs/DESIGN.md §2/§3.
 */
export const getSession = cache(async (): Promise<Session | null> => {
  const raw = (await cookies()).get(SESSION_COOKIE_NAME)?.value;
  return parseSession(raw);
});

export const requireSession = cache(async (): Promise<Session> => {
  const session = await getSession();
  if (!session) redirect("/login");
  return session;
});

/**
 * Used from Route Handlers / Server Actions, which *can* write cookies.
 * Refreshes the access token against the PHP backend if it is missing or
 * about to expire, persisting the rotated pair back into the cookie.
 */
export async function getValidSession(): Promise<Session | null> {
  const store = await cookies();
  const session = parseSession(store.get(SESSION_COOKIE_NAME)?.value);
  if (!session) return null;

  const exp = decodeJwtExp(session.accessToken) ?? 0;
  if (!isExpiringSoon(exp)) return session;

  try {
    const refreshed = await backendJson<{
      access_token: string;
      refresh_token: string;
      user: { uuid: string; name: string | null; email: string | null };
    }>("/v1/auth/refresh", {
      method: "POST",
      json: { refresh_token: session.refreshToken },
    });

    const next: Session = {
      accessToken: refreshed.access_token,
      accessTokenExp: decodeJwtExp(refreshed.access_token) ?? 0,
      refreshToken: refreshed.refresh_token,
      user: {
        id: refreshed.user.uuid,
        name: refreshed.user.name,
        email: refreshed.user.email,
      },
    };
    store.set(SESSION_COOKIE_NAME, serializeSession(next), COOKIE_OPTIONS);
    return next;
  } catch (error) {
    if (error instanceof BackendError && error.status === 401) {
      store.delete(SESSION_COOKIE_NAME);
      return null;
    }
    throw error;
  }
}

export async function setSessionCookie(session: Session) {
  const store = await cookies();
  store.set(SESSION_COOKIE_NAME, serializeSession(session), COOKIE_OPTIONS);
}

export async function clearSessionCookie() {
  const store = await cookies();
  store.delete(SESSION_COOKIE_NAME);
}

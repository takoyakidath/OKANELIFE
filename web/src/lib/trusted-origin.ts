import "server-only";
import type { NextRequest } from "next/server";

/**
 * Hosts this app is actually deployed on. Needed because Vercel serves
 * multiple domains (okanelife.vercel.app, okanelife.pkopko.jp, ...) from
 * the same Production deployment, so `request.nextUrl.origin` reflects
 * whatever Host the request came in on — including a Host an attacker
 * fully controls if they hit the deployment directly rather than through
 * a configured domain. That origin feeds security-relevant URLs (the
 * Google OAuth `redirect_uri`, post-login redirects), so it must be
 * checked against this allowlist before being trusted, never used as-is.
 *
 * Add a new custom domain here (or via ALLOWED_APP_HOSTS) before relying
 * on login working on it.
 */
const DEFAULT_ALLOWED_HOSTS = [
  "okanelife.vercel.app",
  "okanelife.pkopko.jp",
  "localhost:3000",
];

function allowedHosts(): string[] {
  const fromEnv = (process.env.ALLOWED_APP_HOSTS ?? "")
    .split(",")
    .map((h) => h.trim())
    .filter(Boolean);
  return [...DEFAULT_ALLOWED_HOSTS, ...fromEnv];
}

/**
 * Returns the request's own origin if (and only if) its Host header
 * matches a known deployment domain; otherwise falls back to the primary
 * domain. Use this instead of `request.nextUrl.origin` for redirect_uri
 * construction and other security-relevant absolute URLs.
 */
export function trustedOrigin(request: NextRequest): string {
  const host = request.nextUrl.host;
  if (allowedHosts().includes(host)) {
    return request.nextUrl.origin;
  }
  return `https://${DEFAULT_ALLOWED_HOSTS[0]}`;
}

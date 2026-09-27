/**
 * Only ever redirect to a same-origin, relative path. `redirect`/`redirectTo`
 * values flow in from query params an attacker can craft (e.g. a phishing
 * link to /login?redirect=https://evil.example), so every redirect target
 * derived from user input must pass through this before being used in a
 * NextResponse.redirect() or new URL(..., appUrl) call.
 */
export function safeRedirectPath(value: string | null | undefined): string {
  if (!value) return "/";
  // Reject absolute URLs ("https://...") and protocol-relative ones
  // ("//evil.com", which browsers treat as scheme-relative).
  if (!value.startsWith("/") || value.startsWith("//")) return "/";
  if (value.includes("://")) return "/";
  return value;
}

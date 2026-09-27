import "server-only";
import { z } from "zod";

/**
 * The Next.js BFF stores both tokens issued by the PHP backend in a single
 * httpOnly cookie. The browser never sees these values as JS-readable data.
 * The access token itself is a signed JWT verified independently by the PHP
 * backend on every request — Next.js only reads its `exp` claim to decide
 * whether to refresh, it never verifies the signature (that trust boundary
 * lives on the backend).
 */
export const SessionSchema = z.object({
  accessToken: z.string(),
  accessTokenExp: z.number(), // unix seconds
  refreshToken: z.string(),
  user: z.object({
    id: z.string(),
    name: z.string().nullable(),
    email: z.string().nullable(),
  }),
});
export type Session = z.infer<typeof SessionSchema>;

export function serializeSession(session: Session): string {
  return JSON.stringify(session);
}

export function parseSession(raw: string | undefined): Session | null {
  if (!raw) return null;
  try {
    const parsed = SessionSchema.safeParse(JSON.parse(raw));
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

/** Decode (not verify) a JWT's payload to read standard claims like `exp`. */
export function decodeJwtExp(token: string): number | null {
  try {
    const [, payloadB64] = token.split(".");
    if (!payloadB64) return null;
    const json = Buffer.from(
      payloadB64.replace(/-/g, "+").replace(/_/g, "/"),
      "base64"
    ).toString("utf-8");
    const payload = JSON.parse(json) as { exp?: number };
    return typeof payload.exp === "number" ? payload.exp : null;
  } catch {
    return null;
  }
}

export function isExpiringSoon(exp: number, skewSeconds = 60): boolean {
  return Date.now() / 1000 + skewSeconds >= exp;
}

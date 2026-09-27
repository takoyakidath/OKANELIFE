import "server-only";
import { env } from "./env";

export class BackendError extends Error {
  status: number;
  code?: string;
  constructor(status: number, message: string, code?: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

type BackendFetchOptions = Omit<RequestInit, "body"> & {
  accessToken?: string | null;
  json?: unknown;
  /** Raw body, used for proxying uploads (e.g. import ZIP) as-is. */
  rawBody?: BodyInit | null;
};

/**
 * Server-to-server call to the Lolipop PHP backend. Never called from the
 * browser directly (see docs/DESIGN.md §2 — BFF pattern). Errors are
 * normalized so route handlers don't leak raw backend error bodies to the
 * client.
 */
export async function backendFetch(
  path: string,
  options: BackendFetchOptions = {}
): Promise<Response> {
  const { accessToken, json, rawBody, headers, ...rest } = options;

  const finalHeaders = new Headers(headers);
  if (accessToken) {
    finalHeaders.set("Authorization", `Bearer ${accessToken}`);
  }

  let body: BodyInit | undefined;
  if (json !== undefined) {
    finalHeaders.set("Content-Type", "application/json");
    body = JSON.stringify(json);
  } else if (rawBody !== undefined) {
    body = rawBody ?? undefined;
  }

  const res = await fetch(`${env.backendApiBaseUrl()}${path}`, {
    ...rest,
    headers: finalHeaders,
    body,
    cache: "no-store",
  });

  return res;
}

export async function backendJson<T>(
  path: string,
  options: BackendFetchOptions = {}
): Promise<T> {
  const res = await backendFetch(path, options);
  if (!res.ok) {
    let message = `Backend request failed (${res.status})`;
    let code: string | undefined;
    try {
      const data = await res.json();
      if (typeof data?.message === "string") message = data.message;
      if (typeof data?.code === "string") code = data.code;
    } catch {
      // ignore non-JSON error bodies
    }
    throw new BackendError(res.status, message, code);
  }
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

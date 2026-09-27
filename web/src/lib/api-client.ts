"use client";

/**
 * Client Component data layer. Always same-origin (`/api/v1/...`), so the
 * browser just sends its httpOnly session cookie automatically — see
 * docs/DESIGN.md §2. If the BFF proxy responds 401 (session lost while the
 * tab was open), redirect to /login rather than showing a confusing error.
 */

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

async function request<T>(
  path: string,
  init?: RequestInit
): Promise<T> {
  const res = await fetch(`/api/v1${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", ...init?.headers },
  });

  if (res.status === 401) {
    // Full reload, not a client-side route change: the session cookie is
    // gone, so this needs to hit /login as a fresh navigation.
    // eslint-disable-next-line @next/next/no-location-assign-relative-destination
    window.location.href = `/login?redirect=${encodeURIComponent(
      window.location.pathname
    )}`;
    throw new ApiError(401, "unauthenticated");
  }

  if (!res.ok) {
    let message = `リクエストに失敗しました (${res.status})`;
    try {
      const data = await res.json();
      if (typeof data?.message === "string") message = data.message;
    } catch {
      // ignore
    }
    throw new ApiError(res.status, message);
  }

  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

export const apiClient = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: "POST", body: body ? JSON.stringify(body) : undefined }),
  patch: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: "PATCH", body: body ? JSON.stringify(body) : undefined }),
  delete: <T>(path: string) => request<T>(path, { method: "DELETE" }),
};

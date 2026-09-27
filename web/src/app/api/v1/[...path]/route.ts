import { NextResponse, type NextRequest } from "next/server";

import { getValidSession } from "@/lib/auth-server";
import { backendFetch } from "@/lib/backend";

/**
 * Generic BFF proxy: the browser only ever talks to this same-origin route.
 * It attaches the caller's access token and forwards to the PHP backend on
 * Lolipop server-to-server, so the backend never needs to accept CORS
 * requests from a browser origin at all (see docs/DESIGN.md §2).
 */
async function handle(request: NextRequest, path: string[]) {
  const session = await getValidSession();
  if (!session) {
    return NextResponse.json({ message: "unauthenticated" }, { status: 401 });
  }

  const search = request.nextUrl.search;
  const backendPath = `/v1/${path.join("/")}${search}`;

  const hasBody = !["GET", "HEAD", "DELETE"].includes(request.method);
  const upstream = await backendFetch(backendPath, {
    method: request.method,
    accessToken: session.accessToken,
    headers: {
      "Content-Type": request.headers.get("content-type") ?? "application/json",
    },
    rawBody: hasBody ? request.body : undefined,
    // @ts-expect-error -- required by undici when streaming a request body
    duplex: hasBody ? "half" : undefined,
  });

  const headers = new Headers(upstream.headers);
  headers.delete("content-encoding");
  headers.delete("content-length");

  return new NextResponse(upstream.body, {
    status: upstream.status,
    headers,
  });
}

export async function GET(
  request: NextRequest,
  ctx: RouteContext<"/api/v1/[...path]">
) {
  const { path } = await ctx.params;
  return handle(request, path);
}
export async function POST(
  request: NextRequest,
  ctx: RouteContext<"/api/v1/[...path]">
) {
  const { path } = await ctx.params;
  return handle(request, path);
}
export async function PATCH(
  request: NextRequest,
  ctx: RouteContext<"/api/v1/[...path]">
) {
  const { path } = await ctx.params;
  return handle(request, path);
}
export async function DELETE(
  request: NextRequest,
  ctx: RouteContext<"/api/v1/[...path]">
) {
  const { path } = await ctx.params;
  return handle(request, path);
}

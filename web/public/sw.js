/**
 * Hand-written, dependency-free service worker (see docs/DESIGN.md §7 —
 * intentionally not using a Workbox/Serwist build pipeline: at OKANELIFE's
 * scale, a small explicit cache is easier to reason about long-term than a
 * generated one, and it sidesteps Serwist's Turbopack support still being
 * experimental as of Next.js 16).
 *
 * Scope, deliberately narrow:
 *  - Precache the few static, public assets needed to show *something*
 *    offline (manifest, icons, the login screen, the offline fallback).
 *  - Cache-first for Next's hashed static build assets.
 *  - Network-first for page navigations, falling back to the offline page.
 *  - Everything else (API calls, mutations) goes straight to the network —
 *    no offline write queue. See product.txt §24's own instruction not to
 *    over-engineer this.
 */

const SHELL_CACHE = "okanelife-shell-v1";
const RUNTIME_CACHE = "okanelife-runtime-v1";
const CURRENT_CACHES = [SHELL_CACHE, RUNTIME_CACHE];

const PRECACHE_URLS = ["/offline", "/login", "/manifest.webmanifest", "/icon-192.png", "/icon-512.png"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(SHELL_CACHE)
      .then((cache) => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((key) => !CURRENT_CACHES.includes(key)).map((key) => caches.delete(key)))
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request).catch(() => caches.match("/offline").then((res) => res ?? Response.error()))
    );
    return;
  }

  if (url.pathname.startsWith("/_next/static/") || url.pathname.startsWith("/icon")) {
    event.respondWith(
      caches.match(request).then(
        (cached) =>
          cached ??
          fetch(request).then((res) => {
            if (res.ok) {
              const clone = res.clone();
              caches.open(RUNTIME_CACHE).then((cache) => cache.put(request, clone));
            }
            return res;
          })
      )
    );
  }
});

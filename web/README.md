# OKANELIFE — Web (Next.js)

The frontend and BFF (Backend for Frontend) layer. See [`../docs/DESIGN.md`](../docs/DESIGN.md)
for the architecture rationale — in short: the browser only ever talks to this
Next.js app; this app is the only thing that talks to the Lolipop PHP API and
to Google's OAuth endpoints.

## Local development

```bash
cp .env.local.example .env.local   # fill in BACKEND_API_BASE_URL / Google OAuth creds
npm install
npm run dev
```

**Known sandbox limitation:** in some restricted network environments (this
repo was built inside one), `next dev`'s Turbopack HMR client can fail to
open its WebSocket and silently break client-side hydration — pages render
but nothing is interactive (tabs won't switch, charts won't mount). If that
happens, verify against a production build instead:

```bash
npm run build && npm run start
```

This does not affect real deployments; it's specific to environments that
block WebSocket upgrades to a local dev port.

## Environment variables

See `.env.local.example`. `BACKEND_API_BASE_URL` must point at a running
instance of `../api` (see its own README for local setup with SQLite).
`GOOGLE_CLIENT_ID`/`GOOGLE_CLIENT_SECRET` are only used server-side, in the
OAuth Route Handlers under `src/app/api/auth/`.

## Scripts

- `npm run dev` — Turbopack dev server
- `npm run build` — production build (also builds the PWA-related static
  routes; the service worker itself is the static, hand-written
  `public/sw.js`, not generated)
- `npm run start` — serve the production build
- `npm run lint` — ESLint (flat config; `next lint` was removed in Next 16)

## Structure

- `src/app/(app)/*` — authenticated screens (bottom-nav shell): home,
  timeline, analysis, retrospective, past-data cleanup, settings
- `src/app/login`, `src/app/onboarding` — unauthenticated / first-run screens
- `src/app/api/auth/*` — Google OAuth (Authorization Code + PKCE) and session
  refresh/logout Route Handlers
- `src/app/api/v1/[...path]` — the generic BFF proxy: forwards to the PHP
  backend with the caller's access token attached, so the browser never
  needs a direct, CORS-enabled path to it
- `src/proxy.ts` — optimistic auth gate (redirects to `/login` or to
  `/api/auth/refresh` before an expiring session reaches a page)
- `src/lib/api-server.ts` — server-side data layer for Server Components
- `src/lib/api-client.ts` — same-origin fetch wrapper for Client Components
- `public/sw.js` — hand-written service worker (see its header comment and
  `docs/DESIGN.md` §7 for why this isn't Workbox/Serwist-generated)

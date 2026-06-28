# BoothPilot Web

A standalone [Next.js](https://nextjs.org/) recreation of the BoothPilot booth
visitor experience: **Attract → Greeting → Conversation → Badge**, plus a public
`/badge/[sessionId]` page for sharing the collectible badge.

It is a faithful web port of the native iOS booth (`ios/BoothPilot/`) and talks
to the **same Convex backend** as `dashboard/` and iOS — it reads and writes the
same sessions, demo state, and badges in real time. Live voice runs in the
browser via the Vapi Web SDK.

This app is fully self-contained in `web/`. It does not modify any other part of
the repo; the only cross-folder dependency is a read-only function-reference
layer (see [Architecture](#architecture)) that never typechecks or changes the
backend.

## Local development

```bash
cd web
cp .env.example .env.local   # then fill in the vars
npm install
npm run dev                  # http://localhost:3000
```

Then open [http://localhost:3000](http://localhost:3000).

The app degrades gracefully depending on which env vars are set:

- **Live data** requires `NEXT_PUBLIC_CONVEX_URL`. Without it, the app shows a
  "Connect Convex" setup card instead of the booth.
- **Live voice** (browser mic + STT/TTS) requires `NEXT_PUBLIC_VAPI_PUBLIC_KEY`.
  Without it, the app runs the **scripted demo** — the full Attract → Badge
  walkthrough plays on timers/taps with no microphone.

### Environment variables

All vars are `NEXT_PUBLIC_*` (browser-safe; no secrets). See
[`.env.example`](.env.example) for the documented template.

| Variable | Required | Default | Purpose |
| --- | --- | --- | --- |
| `NEXT_PUBLIC_CONVEX_URL` | Yes (for live data) | — | Shared Convex deployment URL (same backend as `dashboard/` and iOS). |
| `NEXT_PUBLIC_VAPI_PUBLIC_KEY` | No | — | Vapi Web SDK public key. Enables live mic/voice; if unset, the scripted demo runs. |
| `NEXT_PUBLIC_DEVICE_ID` | No | `web-1` | Logical device id reported to Convex for this booth instance. |
| `NEXT_PUBLIC_BADGE_BASE_URL` | No | `window.location.origin` | Base URL used to build the shareable badge QR link. |

## Build

```bash
npm run build
```

> **Note:** The build requires `NEXT_PUBLIC_CONVEX_URL` to be set (e.g. in
> `.env.local`), because the Convex client provider reads it at render time.

`npm run start` serves the production build locally after `npm run build`.

## Deploy (Vercel)

Deploy `web/` as its **own Vercel project**:

1. **Root Directory:** set the project Root Directory to `web`.
2. **Framework Preset:** Next.js (build/output defaults work as-is —
   `next.config.mjs` sets `outputFileTracingRoot` to the repo root so the build
   correctly traces files imported from outside `web/`).
3. **Environment variables:** add the `NEXT_PUBLIC_*` vars in the Vercel
   dashboard (at minimum `NEXT_PUBLIC_CONVEX_URL`, plus
   `NEXT_PUBLIC_VAPI_PUBLIC_KEY` for live voice). `NEXT_PUBLIC_DEVICE_ID` and
   `NEXT_PUBLIC_BADGE_BASE_URL` are optional.

## Architecture

- **Design system** — Tokens from `ios/BoothPilot/Theme.swift` (the editorial
  paper/ink/clay palette + the fixed 1374×1030 artboard) are ported to CSS
  variables in `app/globals.css`, with JS mirrors in `web/lib/theme.ts`. Fonts
  are Newsreader (serif) + JetBrains Mono, loaded via `next/font/google` in
  `app/layout.tsx`.
- **Director state machine** — `web/lib/director.tsx` is the React port of
  `ios/BoothPilot/Demo/DemoData.swift`. It runs the booth in two modes decided
  by whether a Vapi key is present: **live** (tap-to-begin → session →
  Vapi voice loop → badge) and **scripted** (timed walkthrough of the demo
  beats, with the same fire-and-forget backend writes so the dashboard still
  sees a coherent session).
- **Voice** — `web/lib/useVapiVoice.ts` drives live voice via
  [`@vapi-ai/web`](https://www.npmjs.com/package/@vapi-ai/web). It fetches a
  transient assistant config from the Convex `vapi:startConfig` action; that
  config points Vapi's `custom-llm` at Convex's `/vapi/chat/completions`
  endpoint, so all conversation logic and tool calls stay server-side. The
  browser only handles audio I/O and maps call/speech/transcript events to the
  on-screen spark, speaker, and caption.
- **Convex data** — `web/lib/useBooth.ts` wraps the shared backend in typed
  React hooks: reactive subscriptions (`sessions:get`, `demoState:bySession`,
  `messages:bySession`, `presence:latest`) plus session/voice/tool
  mutations and actions (`sessions:create`, `vapi:startConfig`,
  `finalize:finalize`, and the GPT-tool writes).
- **Self-contained API references** — `web/lib/convexApi.ts` exports `api` as
  Convex's `anyApi` (from `convex/server`) rather than importing the fully-typed
  generated `api`. This resolves `api.<module>.<fn>` references at runtime
  without transitively typechecking the backend, keeping the `web/` build fully
  self-contained. Web-side type safety comes from casting results to the shapes
  in `web/lib/types.ts`.

### Badge route

`web/app/badge/[sessionId]/` hosts the public, shareable badge in the booth's
bookplate aesthetic. The server component derives Open Graph / Twitter share
metadata from the session via Convex's HTTP query API and renders a dynamic
`opengraph-image`, then hands off to a reactive client component. The
in-experience badge QR points at this app's own `/badge/[sessionId]` URL.

# BoothPilot

BoothPilot is a live conference-booth concierge for a fictional SaaS, Acme Analytics. It captures visitor conversations, enriches the lead, drives an iPad demo, scores the opportunity, mints a shareable Booth Badge, and drafts a human-reviewed follow-up email.

Built for the sponsor stack: OpenAI, Convex, Cursor, fiber.ai, and ElevenLabs.

## Architecture

- `convex/` is the shared spine for sessions, transcript messages, demo state, fiber enrichment, lead scoring, badges, email review, hardware/presence endpoints, and the LLM job queue.
- `dashboard/` is the Next.js dashboard for lead cards, the thinking timeline, badge pages, and the email review queue.
- `llm-worker/` is a local pull-worker that runs on the booth/dashboard laptop signed into Codex. Convex cloud queues `llmJobs`; the worker claims a job, asks Codex for strict JSON, and writes the final score/badge/email draft back through Convex.

`finalize.finalize` never sends email. It sets the card to `finalizing`, queues a local Codex job, and schedules a deterministic safety fallback after about 25 seconds. If the worker is offline or Codex is slow, Convex still finishes the card with `reviewStatus:"pending"`.

Builder 1 and Builder 3 should keep using the locked public contract in `INTERFACES.md`.

## Live Demo Commands

Run these in separate terminals from the repo root:

```bash
npx convex dev
```

```bash
cd dashboard
npm install
npm run dev
```

```bash
cd llm-worker
npm install
npm start
```

The current dev deployment is:

```bash
CONVEX_URL=https://jovial-wildebeest-931.convex.cloud
```

The dashboard expects `dashboard/.env.local`:

```bash
NEXT_PUBLIC_CONVEX_URL=https://jovial-wildebeest-931.convex.cloud
```

Optional worker auth:

```bash
WORKER_TOKEN=<same value set in Convex env>
```

If `WORKER_TOKEN` is unset in Convex, the worker is allowed for simple local demo use.

## Useful Commands

```bash
npx convex dev --once
cd dashboard && npx tsc --noEmit
cd dashboard && npm run build
npx convex run seed:run
npx convex run sessions:list '{}'
npx convex run llmJobs:pending '{}'
```

Email remains human-in-the-loop: review a draft in `/review`, approve or edit it, then send. Real sends require `RESEND_API_KEY` and a verified `RESEND_FROM` sender/domain.

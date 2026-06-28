# BoothPilot LLM Worker

Optional local pull-worker for BoothPilot finalization jobs. Convex now runs finalization through OpenAI by default, so this process is no longer required for normal booth/demo operation.

Run it only if you want Codex-authored scoring, badges, and follow-up drafts as an alternative source. Non-fallback completions are last-writer-wins, so a running Codex worker can still complete the same job path that OpenAI uses. If neither OpenAI nor Codex produces a valid result, Convex's scheduled deterministic fallback still finishes the session.

## Run

Prerequisites:

- `CONVEX_URL` in the environment or repo root `.env.local`, for example `https://<deployment>.convex.cloud`.
- Optional `WORKER_TOKEN` in the environment or repo root `.env.local`; if Convex has `WORKER_TOKEN` set, the values must match.
- Codex SDK authentication available in your local environment.

```bash
cd llm-worker
npm install
npm start
```

Or from the repo root:

```bash
npm run worker
```

For the standard demo path, leave this worker stopped. The Convex `finalize` action will call OpenAI directly, write `source=openai` on success, and fall back deterministically if OpenAI is unavailable.

## What It Does

- Polls `api.llmJobs.claimNext` every ~1.5 seconds.
- Uses `@openai/codex-sdk` to run a read-only Codex turn with strict JSON output.
- Completes the job through `api.llmJobs.complete` when JSON validates.
- Calls `api.llmJobs.fail` on errors so Convex can retry briefly and the scheduled deterministic fallback can still finish the session.

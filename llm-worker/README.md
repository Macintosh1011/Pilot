# BoothPilot LLM Worker

Local pull-worker for BoothPilot finalization jobs. It must run on the booth/dashboard laptop that is signed into Codex, because Convex cloud functions cannot call the local Codex CLI.

## Run

```bash
cd llm-worker
npm install
npm start
```

The worker reads `CONVEX_URL` from the environment or the repo root `.env.local`. Optional `WORKER_TOKEN` must match the Convex env var of the same name when that var is set.

## What It Does

- Polls `api.llmJobs.claimNext` every ~1.5 seconds.
- Uses `@openai/codex-sdk` to run a read-only Codex turn with strict JSON output.
- Completes the job through `api.llmJobs.complete` when JSON validates.
- Calls `api.llmJobs.fail` on errors so Convex can retry briefly and the scheduled deterministic fallback can still finish the session.

Keep this process running during the live demo alongside Convex and the dashboard.

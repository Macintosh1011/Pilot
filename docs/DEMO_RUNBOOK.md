# BoothPilot Demo Runbook

This is the end-to-end guide for running the Vapi voice pipeline, Convex brain,
dashboard, iPad app, and no-iPad visitor simulator.

## Backend

The development deployment is already live:

- Convex client host: `https://jovial-wildebeest-931.convex.cloud`
- Convex HTTP host: `https://jovial-wildebeest-931.convex.site`
- Vapi custom LLM endpoint: `https://jovial-wildebeest-931.convex.site/vapi/chat/completions`

The Convex env has these keys set, with values intentionally omitted here:

- `OPENAI_API_KEY`
- `OPENAI_REASON_MODEL=gpt-5.4`
- `VAPI_SERVER_SECRET`
- `VAPI_PUBLIC_KEY`
- `VAPI_PRIVATE_KEY`
- `FIBER_API_KEY`
- `RESEND_API_KEY`

To verify env names without printing values:

```bash
npx convex env list
```

To confirm the backend still bundles after changes:

```bash
npx convex dev --once
```

For local development with file watching:

```bash
npx convex dev
```

The local Codex worker is optional. OpenAI handles finalize directly when
`OPENAI_API_KEY` is present.

## Dashboard

Run the operator dashboard:

```bash
cd dashboard
npm install
npm run dev
```

Open `http://localhost:3000`.

Watch these areas during a demo:

- CRM card: current visitor, needs, confidence, and review status.
- Timeline: identify, needs, demo, score, badge, and email events.
- Badge page: `http://localhost:3000/badge/<sessionId>`.
- Review queue: generated follow-up drafts awaiting human approval.

## Visitor Simulator

Use this when there is no iPad available. From the repo root, make sure
`.env.local` or your shell has:

```bash
CONVEX_URL=https://jovial-wildebeest-931.convex.cloud
```

Then run:

```bash
node scripts/simulate-visitor.mjs
```

The script creates a full fake visitor session, writes transcript turns, sets needs,
switches demo views from `churn` to `alerts`, highlights an alert threshold, captures
contact info, triggers finalize, polls for the badge, and prints the dashboard badge URL.
Keep the dashboard open to watch it light up.

Optional overrides:

```bash
DEMO_VISITOR_EMAIL=owner@example.com DASHBOARD_URL=http://localhost:3000 node scripts/simulate-visitor.mjs
```

## iOS Demo

On a Mac with Xcode:

```bash
cd ios
xcodegen generate
open BoothPilot.xcodeproj
```

In Xcode, let Swift Package Manager resolve both Vapi and ConvexMobile. Create:

```text
ios/BoothPilot/Config/Secrets.plist
```

Use `ios/BoothPilot/Config/Secrets.example.plist` as the template and set
`VAPI_PUBLIC_KEY` to the same public key stored in Convex env.

Pick an iPad simulator or device, Build & Run, and grant microphone permission.

Simulator limitations:

- The iOS simulator is useful for UI and voice wiring checks, but it cannot validate
  every real-booth hardware path.
- Camera QR and full physical booth behavior should be tested on a real iPad.

## Solo Presence Trigger

Use this to trigger an approach event without the Raspberry Pi:

```bash
curl -X POST https://jovial-wildebeest-931.convex.site/hw/presence \
  -H 'content-type: application/json' \
  -d '{"deviceId":"ipad-1","event":"approach"}'
```

## Live Conversation Flow

1. The iPad creates a Convex session and asks `vapi:startConfig` for a transient
   assistant config.
2. Vapi owns microphone audio, STT, and TTS.
3. Vapi POSTs user turns to Convex at `/vapi/chat/completions`.
4. Convex validates `VAPI_SERVER_SECRET`, calls OpenAI `gpt-5.4`, executes booth tools,
   persists messages, writes needs/demo state/contact data, and returns an OpenAI-style
   non-streaming chat completion.
5. Demo state updates re-render the iPad and dashboard in real time.
6. Finalize runs OpenAI structured output directly, writes confidence, badge, and email
   draft, then the review queue waits for human approval.

## Resend Email Caveat

`email:send` only sends after `email:approve` or `email:edit`. If `RESEND_FROM` is unset,
the backend defaults to:

```text
Acme Analytics <onboarding@resend.dev>
```

That Resend onboarding sender only delivers to the email address that owns the Resend
account. For real booth outreach, verify a sending domain and set `RESEND_FROM`; see
`docs/RESEND_SETUP.md`.

Manual send test, using a session that has an email draft and a recipient that Resend is
allowed to deliver to:

```bash
npx convex run email:approve '{"sessionId":"<id>"}'
npx convex run email:send '{"sessionId":"<id>"}'
```

## Smoke Tests

Run these from the repo root. They keep secrets in shell variables and never echo them.

### Vapi Endpoint

```bash
SECRET="$(npx convex env get VAPI_SERVER_SECRET)"
SESSION_ID="$(
  npx convex run sessions:create '{"deviceId":"ipad-1"}' 2>/dev/null |
  node -e 'let s="";process.stdin.on("data",d=>s+=d);process.stdin.on("end",()=>console.log(JSON.parse(s)))'
)"

BODY="$(
  SESSION_ID="$SESSION_ID" node -e 'console.log(JSON.stringify({
    model: "gpt-5.4",
    messages: [{
      role: "user",
      content: "Hi, I'\''m Dev from Globex, we keep losing customers and find out too late."
    }],
    metadata: { sessionId: process.env.SESSION_ID, deviceId: "ipad-1" }
  }))'
)"

curl -fsS -X POST "https://jovial-wildebeest-931.convex.site/vapi/chat/completions?secret=$SECRET" \
  -H 'content-type: application/json' \
  --data-binary "$BODY"

npx convex run demoState:bySession "{\"sessionId\":\"$SESSION_ID\"}"
npx convex run sessions:get "{\"sessionId\":\"$SESSION_ID\"}"
```

Expected result: the curl response has assistant content, and `sessions:get` shows scoped
needs such as problems/useCase/urgency or `demoState:bySession` shows a demo view.

### Finalize Without Worker

```bash
FINALIZE_ID="$(
  npx convex run sessions:create '{"deviceId":"sim-finalize-1"}' 2>/dev/null |
  node -e 'let s="";process.stdin.on("data",d=>s+=d);process.stdin.on("end",()=>console.log(JSON.parse(s)))'
)"

npx convex run messages:add "{\"sessionId\":\"$FINALIZE_ID\",\"role\":\"visitor\",\"text\":\"I am Maya, VP Product at Globex. Churn warnings arrive after renewal risk is already high.\"}"
npx convex run messages:add "{\"sessionId\":\"$FINALIZE_ID\",\"role\":\"assistant\",\"text\":\"Let me show how churn signals and alerts surface those accounts earlier.\"}"
npx convex run messages:add "{\"sessionId\":\"$FINALIZE_ID\",\"role\":\"visitor\",\"text\":\"That alerting workflow is what my CS and product leads need this quarter.\"}"
npx convex run sessions:setNeeds "{\"sessionId\":\"$FINALIZE_ID\",\"problems\":[\"late churn detection\",\"missing account alerts\"],\"useCase\":\"Proactive churn alerts for CS and product teams\",\"urgency\":\"high\",\"urgencyEvidence\":\"need this quarter\"}"
npx convex run demoState:setDemoState "{\"sessionId\":\"$FINALIZE_ID\",\"view\":\"churn\",\"params\":{\"account\":\"Globex\"}}"
npx convex run demoState:setDemoState "{\"sessionId\":\"$FINALIZE_ID\",\"view\":\"alerts\",\"params\":{\"trigger\":\"Expansion risk spike\"}}"
npx convex run sessions:captureContact "{\"sessionId\":\"$FINALIZE_ID\",\"email\":\"demo-recipient@example.com\",\"linkedinUrl\":\"https://www.linkedin.com/in/demo-visitor\"}"
npx convex run finalize:finalize "{\"sessionId\":\"$FINALIZE_ID\"}"

sleep 8
npx convex run sessions:get "{\"sessionId\":\"$FINALIZE_ID\"}"
npx convex run llmJobs:bySession "{\"sessionId\":\"$FINALIZE_ID\"}"
```

Expected result: `sessions:get` has `badge`, `emailDraft`, and `confidence`; the latest
`llmJobs:bySession` row is `status:"done"` with `source:"openai"`, normally well before
the 60-second deterministic fallback.

### Dashboard Data

```bash
npx convex run sessions:list '{}'
```

Expected result: finalized sessions appear with confidence and badge fields, so the
dashboard can render the CRM card, badge page, and review queue.

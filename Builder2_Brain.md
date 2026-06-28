# Builder 2 — The Brain (Agent, Data & Backend)

> Your home doc. Everything you need is here; the full spec is `BoothPilot_Engineering_Spec.md`.

---

## Shared project context (read once)

**BoothPilot** is an interactive AI booth. A visitor walks up; the booth talks to them, researches them live (fiber.ai), demos our product to *their* use case, gives them a shareable personalized **badge**, and hands the company a review-ready CRM card + a drafted follow-up.

**The 8-step loop:**
1. Visitor approaches → AI greets and starts talking.
2. Voice: **Whisper (STT) → GPT (conversation + tools) → ElevenLabs (TTS)**.
3. Ask name + company (or scan their **LinkedIn QR**) → research via **fiber.ai** → build a CRM card.
4. Scope their problems; write urgency + confidence onto the card.
5. **Live demo** of how the product solves their problem.
6. Capture contact (LinkedIn / QR / email).
7. **Booth Badge** — archetype + grounded compliment + flattering stat bars + discount, via QR.
8. GPT **drafts a follow-up email** → human-review queue (no auto-send).

**Event:** AI Growth Hackathon (Orange Slice × YC). 24h, kickoff Sat 5pm, **judging Sun 5pm**. Repo must be **public on GitHub**. Name the sponsors in pitch + README: **OpenAI, Convex, Cursor, fiber.ai, ElevenLabs**.

**Architecture — three roles, one nervous system:**
- **iPad = experience node (Builder 1).** UI, voice, QR, demo view, badge.
- **Pi 5 = headless sensing node (Builder 3).** Presence → greets.
- **Convex = the spine (you own it).** Everyone reads/writes Convex.

**THE key design rule:** the live demo is **shared state, not browser automation.** GPT's "show the churn board" tool just writes `demoState`; the iPad's demo view re-renders from it. You define the tools and the state shape.

**Hardware reality:** Pi 5, kbd/mouse, ultrasonic, webcam, mic, wires, iPad. No LED/printer/speaker — audio on iPad, "lead quality" shown on screen, badge is a QR. (Doesn't affect you much; you're software.)

**Team map:** B1 = front of house · B2 (you) = brain · B3 = physical + integration/reliability lead.

**Checkpoints:** ★**h4** end-to-end stub · ★**h12** full loop + badge. `main` stays demoable.

---

## Your role

You own **the intelligence and the company-facing surface.** You're the center the other two integrate against — so **lock the Convex schema + the tool/function signatures in hour one** (see Interfaces). After that everyone can move in parallel.

### What you own
- **Convex**: schema, all mutations/queries/actions, HTTP actions for the Pi.
- **GPT orchestration**: system prompt + tool/function definitions; the functions B1 calls.
- **fiber.ai integration**: company + people search, work email/phone reveal, LinkedIn snapshot.
- **Scoring**: confidence (0–100) + reasons, urgency + evidence.
- **Booth Badge generation**: archetype + grounded compliment + stat bars + discount + OG image.
- **Follow-up**: GPT email draft → **human-review queue** (approve/edit/discard; send via Resend *after* the fair).
- **Company dashboard**: live CRM cards, review queue, agent timeline.

### Definition of done
Identifying a visitor fires live fiber enrichment onto a scored CRM card; finalizing produces a badge + a reviewable follow-up draft; the dashboard shows it all live.

---

## Interfaces (your seams — define these first)

You **provide** functions B1 calls + HTTP actions B3 calls.

**Convex tables (lock these):** `sessions` (= the CRM card), `messages`, `demoState`, `events`, `hwCommands`, `presence`. (Full field list in spec §5.)

**Functions you expose to B1 (the GPT tool targets):**
| Function | Type | Does |
|---|---|---|
| `sessions.create`, `messages.add` | mutation | session + transcript |
| `lookupVisitor({name,company,linkedinUrl})` | action | fiber enrich → writes card |
| `setDemoState({view,params,highlight})` | mutation | drives the iPad demo view |
| `setNeeds({problems,useCase,urgency})` | mutation | writes card |
| `captureContact({email,phone,linkedinUrl})` | mutation | writes card |
| `finalize(sessionId)` | action | scoring → badge → email draft |

**HTTP actions you expose to B3 (the Pi):** `POST /hw/presence {deviceId, event, distanceCm, personSeen}` (B3 fuses ultrasonic + webcam → writes the `presence` table the iPad subscribes to). `GET /hw/poll`, `POST /hw/ack` are reserved but unused in this build (no Pi actuators).

**Mock while teammates build:** seed dummy `sessions`/`demoState` so B1 can build UI and B3 can post presence before your pipeline is done. Stub fiber with a canned payload until the key works.

---

## fiber.ai (the enrichment layer — sponsor)

Agent-native B2B data: search companies/people, reveal work email/phone, live LinkedIn snapshot. Via API **and MCP**.
- Run it **server-side in a Convex action** (key stays secret).
- Flow: company search → people match (or use the scanned LinkedIn URL) → reveal email/phone (only once engaged) → LinkedIn snapshot.
- Write results to `sessions.fiber` + set `fiberMatch` (does what they said match what fiber found? — kills "people lie on forms").
- **Cost discipline:** fiber has estimate-before-spend / per-call cost metadata. Cap calls per visitor; **cache by company domain**.
- Docs: `api.fiber.ai/docs` · `api.fiber.ai/llms.txt` · plugin `github.com/fiber-ai/fiber-ai-plugin`. **Stretch:** wire fiber's MCP as a live GPT tool the judges watch fire.

---

## Scoring + Badge specs
- **Confidence (0–100)** via structured output, weighting: ICP/fiber fit 30 · intent language 25 · engagement 20 · authority 15 · demo depth 10. Always return 2–4 plain-English reasons. **Never shown to the visitor.**
- **Urgency** from transcript cues + an evidence quote.
- **Badge** (structured output): `archetype` + `tagline` + a **grounded compliment that quotes a real detail from the transcript** + 2–3 flattering `stats` (a public mirror of the score) + `discountCode`. Tone: witty, niche, **never saccharine or backhanded**. Render a dynamic **OG image** (satori/`@vercel/og`-style) → Convex file storage.

---

## Task list
- [ ] Convex schema + **lock function/HTTP signatures (publish to team h1)**.
- [ ] System prompt + GPT tool definitions.
- [ ] `lookupVisitor` action → fiber (search/match/reveal/LinkedIn) + caching + cost caps.
- [ ] `setDemoState`, `setNeeds`, `captureContact` mutations.
- [ ] `finalize` action: confidence + urgency + badge + OG image + email draft.
- [ ] `events` logging at each step (powers the "agent thinking" timeline).
- [ ] Dashboard: CRM cards sorted by confidence; agent timeline.
- [ ] **Review queue**: approve/edit/discard; Resend send gated on approval.
- [ ] HTTP actions `/hw/poll`, `/hw/ack`, `/hw/presence`.
- [ ] Seed "golden" sessions for demo fallback.

## Your hour-by-hour
- **h0–2:** schema, **publish the seams**, fiber "hello" call.
- **h2–4:** GPT tool-calling; `lookupVisitor` writes a real card. → **★h4**.
- **h4–8:** confidence/urgency scoring; **badge gen + OG image**; email draft → queue.
- **h8–12:** review-queue UI; fiber caching/cost caps; dashboard polish. → **★h12**.
- **h12–17:** structured-output guards, golden seed data, latency.
- **h17→judging:** pre-seed, pre-warm, rehearse the dashboard reveal.

## Gotchas (yours)
- **Lock the interface signatures in hour one** — you're the integration center; churn here blocks everyone.
- fiber **cost** — estimate-before-spend, cap calls/visitor, cache by domain; don't reveal email/phone until the visitor's engaged.
- Validate structured outputs (schemas) so a malformed score/badge never crashes the pipeline; add a cached fallback.
- Secrets (OpenAI/fiber/Resend/ElevenLabs) live in **Convex env**, never client-side.
- **Do NOT auto-send email** — drafts sit in the review queue; sending is a human action after the fair.
- OG image gen can be slow — generate async, don't block the badge from showing.

## Demo-day role
You **run the dashboard on the second screen** — as the judge talks to the booth, narrate the CRM card filling in, the fiber data appearing, the confidence score + reasons, and the reviewable follow-up. You prove it's not "one GPT call."

## Sources (fiber.ai)
https://www.fiber.ai/ · https://www.ycombinator.com/companies/fiber-ai · https://api.fiber.ai/docs · https://github.com/fiber-ai/fiber-ai-plugin

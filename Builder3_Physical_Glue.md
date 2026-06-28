# Builder 3 — Booth, Demo Product & Reliability

> Your home doc. Everything you need is here; the full spec is `BoothPilot_Engineering_Spec.md`.

---

## Shared project context (read once)

**BoothPilot** is an interactive AI booth. A visitor walks up; the booth talks to them, researches them live (fiber.ai), demos our product to *their* use case, gives them a shareable personalized **badge**, and hands the company a review-ready CRM card + a drafted follow-up.

**The 8-step loop:** approach → voice (Whisper→GPT→ElevenLabs) → identify + research via **fiber.ai** → scope needs (urgency + confidence) → **live demo** → capture contact → shareable **Booth Badge** (QR) → GPT **drafts a follow-up** for human review after the fair.

**Event:** AI Growth Hackathon (Orange Slice × YC). 24h, judging Sun 5pm. Repo **public on GitHub**. Sponsors to name: **OpenAI, Convex, Cursor, fiber.ai, ElevenLabs**.

**Architecture — iPad-first, Convex spine (NO Raspberry Pi):**
- **iPad (Builder 1)** = the whole experience: UI, voice, **face/engagement via TrueDepth**, QR, demo view, badge.
- **Convex (Builder 2)** = the spine: CRM, scoring, fiber, badge data, dashboard.
- **The booth** = a **3D-printed enclosure (you)** housing the iPad — the physical artifact, no electronics.

**THE key design rule:** the live demo is **shared state, not browser automation** — the agent writes `demoState` in Convex and the demo product re-renders. **You build that demo product**, so this rule is yours to deliver.

**Checkpoints:** ★**h4** end-to-end stub (talk → demo product reacts) · ★**h12** full loop + booth + badge. `main` stays demoable.

---

## Your role

The Pi is gone — the iPad does everything it used to. Your job is the three things judges actually **see and touch**, plus making the demo bulletproof:

### What you own
1. **The 3D-printed booth enclosure** — CAD → print → assembly (houses the iPad Pro 12.9″ 5th gen). Spec: `BoothPilot_CAD_Prompt.md`. This is the physical artifact.
2. **The demo-target product** — "Acme Analytics", a clean web app the agent drives via `demoState` (the "it's demoing *my* use case" wow). Hosted inside Builder 1's WKWebView.
3. **The Booth Badge page** — the collectible card that renders `sessions.badge` (archetype + compliment + stat bars + discount + QR), with the OG share image.
4. **Integration owner + demo-reliability lead** — the hotspot, golden seed sessions, the offline/degraded fallback, the runbook, the pre-demo checklist, and the backup video. *You own demo day not breaking.*

### Definition of done
The iPad sits in a finished printed booth; the agent visibly drives the demo product on the visitor's use case; the badge renders beautifully; and the whole demo runs reliably on our hotspot with a tested fallback.

---

## Interfaces (your seams)

| You build | Mechanism |
|---|---|
| Demo product | a web app (cream/ink/clay, on-brand) that **subscribes to `demoState`** (Convex) and re-renders: views `home/churn/alerts/pricing/query-result`. B2's GPT tools write `demoState`; B1 hosts your app in the WebView. |
| Badge page | `/badge/[sessionId]` renders `sessions.badge` (B2 generates the data) + share + OG image. |
| Reliability | own the hotspot; with B2 seed 2–3 **golden sessions**; build a **cached/degraded fallback** so a network blip never stalls the demo. |

**Mock while B2 builds the agent:** hand-write a `demoState` doc in the Convex dashboard so you can build + style the demo product before the agent exists. Same for `sessions.badge` to build the badge page.

---

## The demo product (your hero deliverable)
Keep it **on-brand** (warm paper, ink, clay — see `BoothPilot_iPad_Design_Prompt.md`) and **reactive**: every change to `demoState` re-renders in <100ms with a calm transition. Views to ship:
- `home` (overview), `churn` (at-risk-accounts board on sample fintech data, configurable window), `alerts` (toggle), `pricing`/`integrations` (for buyer/engineer personas), `query-result` (a parameterized canned answer).
- Local sample data only — the **only** control surface is `demoState`. That's what makes the live demo bulletproof (no Playwright, nothing to break).

---

## Task list
- [ ] **Start the enclosure print at h0** (longest part first); model in CAD (see CAD prompt) or iterate on a base design.
- [ ] Scaffold the demo product reactive to a hand-seeded `demoState`; build the core views.
- [ ] Build the Booth Badge page rendering `sessions.badge` + OG image.
- [ ] **Own the hotspot**; get iPad + dashboard laptop on it.
- [ ] With B2: seed 2–3 golden sessions; build the cached/degraded fallback.
- [ ] Mount the iPad in the printed booth; finish + photograph it for the README.
- [ ] Write the runbook + pre-demo checklist; record a backup video.

## Your hour-by-hour
- **h0–2:** start the enclosure print; demo product scaffold reactive to a hand-seeded `demoState`.
- **h2–4:** demo product core views (home/churn/alerts); hotspot up. → **★h4 stub demo**.
- **h4–8:** finish demo product; build the **Booth Badge page**; enclosure assembly.
- **h8–12:** mount iPad in the booth; golden seed sessions; offline/degraded fallback. → **★h12**.
- **h12–17:** reliability pass, runbook, spares.
- **h17→judging:** finish the booth, backup video, set up + pre-warm, dry-run the runbook.

## Gotchas (yours)
- **Start the print at h0** — the iPad frame is ~281mm wide, so it splits into parts and prints for hours. Foamcore is the fallback; the demo never blocks on the enclosure.
- **Keep the demo product on-brand and calm** — judges see this on the big half of the screen; janky transitions read as unfinished.
- **`demoState` is the contract with B2** — agree the `view`/`params` names in hour one so the agent's tools line up with your views.
- **You're the reliability lead** — own the hotspot, the golden sessions, and the backup video. Under pressure you're the one who calmly switches to a golden session.

## Pre-demo checklist (you run this 5 min before)
- [ ] iPad in Guided Access, on our hotspot, seated in the booth
- [ ] Demo product + badge page render correctly
- [ ] A TrueDepth walk-up fires the greet (B1)
- [ ] Dashboard/review queue live; golden sessions loaded
- [ ] Cloud APIs + fiber pre-warmed; backup video queued
- [ ] Repo public; talk track names all sponsors

## Demo-day role
You're **mission control**: own the booth setup, the hotspot, and the fallback. The demo product the judge watches is yours; if anything wobbles, you calmly switch to a golden session or the backup video.

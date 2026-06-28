# LeadLens Viral Booth — Judge + Optimize Report

**Hackathon:** AI Growth Hackathon by Orange Slice (YC, San Francisco) · 24 hours · Kickoff Sat Jun 27 5pm → Judging Sun Jun 28 5pm · $15,000 in prizes · overall winner may interview for YC Fall 2026 batch.
**Judges:** growth engineers/founders who have closed millions in deals and run large virality campaigns.
**Constraint honored in this report:** the physical hardware booth stays as the core. Everything below optimizes *within* that constraint.

---

## TL;DR

Two agent teams ran on LeadLens: one judged it against how real growth/GTM hackathons are won, the other rebuilt it toward a 10.

- **As written, LeadLens scores ~5.5/10.** It's the *most memorable* thing in the room (glowing kiosk, printed receipt) but the *least strategically convincing* to a growth panel: it improves conversion of foot traffic you already have, the "viral" claim is asserted not engineered, and "AI lead scoring + follow-up" is a crowded, commoditized space.
- **The path to 10 is one move:** stop being the *bottom* of the funnel (capture) and become the *top* (manufacture new reach). Keep the hardware as the irreplaceable trigger of an engineered referral loop, make the AI a visible multi-step agent (not one GPT call), and repeat one number on stage: **~3.3x reach per person who walks up.**

---

## Part 1 — The Verdict (Scorecard)

| Dimension | Score | The blunt read |
|---|---|---|
| **OVERALL** | **5.5 / 10** | Impressive booth; unproven growth engine. |
| Problem / Market | 6.5 | Real, expensive, relatable — but a *known, crowded* pain re-skinned with GPT. |
| Growth & Revenue Impact | 5.0 | Improves lead *quality*, not lead *volume*. No acquisition channel, no flywheel. Sales-ops efficiency, not growth. |
| Track Fit | 5.5 | Claims High on 3 tracks, convincingly wins none. Breadth reads as hedging. |
| Technical Feasibility (24h) | 4.5 | Software is a comfortable build; hardware is a time-sink trap. The feasible part is the least impressive part. |
| Demo Wow / Memorability | 7.5 | The real asset. A receipt-printing kiosk is best-in-show theater. |
| Distribution / Virality / Loop | 3.5 | Weakest pillar — and it's literally in the name. A receipt is not a loop. No share incentive, no K-factor. |
| Novelty vs Existing Tools | 4.0 | Badge-scan + AI score + auto follow-up is table stakes. Strip the enclosure and it's a CRUD form + one GPT call. |
| Risk (what breaks on stage) | 4.0 | Multiple single points of failure: printer, LED, Pi, venue WiFi, OpenAI latency. |

### Why this happens — what actually wins these hackathons

Research into real winners (YC/OpenAI/Convex/growth hackathons) shows a consistent pattern:

- **Winners are autonomous agents that do a whole job, shown live.** Codapt AI won **$65K** at YC's first 24-hour agents hackathon (an agent that ships full-stack apps from natural language). Overeasy won **$64K** at the Cognition Hackathon (auto-finds security vulns) — same builder won first at both YC and OpenAI hackathons.
- **Demo-first beats slides.** Multi-time YC/OpenAI winner Riley Shu's formula: idea = *useful + unexpected*; **engineer one "wow" moment**; avoid slides; small team. Judges should grasp what it does in <30 seconds.
- **Growth judges reward engineered distribution** — referral loops, virality, compounding acquisition (the Hotmail/Dropbox lineage). A physical kiosk demonstrates the *opposite*: bounded by one event, one location, foot traffic you don't own.
- **Hardware is a structural disadvantage in a *growth* context** — fragile demos, can't be cloned from the open-source repo, judged by software-minded growth leads. (Hardware hackathons exist as their own category precisely because hardware is judged differently.)
- **The booth/badge space is crowded and commoditized:** Blinq, Cvent iCapture, Popl, Momencio, Zuddl, Octave, Clay, Apollo all already do capture + enrich + score + draft. "AI lead scoring at events" is a feature, not a moat.

### The two killer critiques you must defeat

1. *"It's just a form + one GPT call."* — If the hardware flakes and you fall back to the web app, this is exactly what's left.
2. *"This is capture efficiency, not growth."* — You optimize traffic you already have; you generate no new acquisition. In a *growth* hackathon, that ceiling is the whole problem.

---

## Part 2 — The Path to 10/10 (keeping the hardware)

**The single most important change:** move the booth from the *bottom* of the funnel (capture) to the *top* (manufacture reach), prove it with a live counter that climbs on screen, and repeat one number — **~3.3x reach per walkup** — until the judges can't un-hear it.

### 2.1 Reposition: from "lead-capture gadget" to "autonomous growth engine"

**New one-liner:**
> *LeadLens is a physical AI growth agent. Someone walks up, and 90 seconds later the booth hasn't just scored them — it's enriched them from public data, written and **sent** the follow-up, and turned them into a distribution node that pulls in 2–3 people who never walked the floor. It's not lead capture. It's the cheapest paid-acquisition channel a booth has ever had, and the CAC is a sticker.*

**Sharp ICP (don't say "anyone with a booth"):** seed/Series-A B2B and dev-tool/SaaS teams who spend $20–40k on a conference booth, have no SDR army, and for whom *the event is the channel*. They feel every dollar of CAC and have no existing referral motion.

**The defensible wedge incumbents don't have:** the booth converts the visitor into a *referrer* in the same 90-second interaction, and the agent autonomously works the referrals it generates — a physical top-of-funnel feeding an engineered loop. That combination is a *channel*, not a *tool*.

**Track to dominate: Algorithm Hacking / Virality** — it's the track the panel says you're failing, it has a single clean win-metric (K-factor / reach-per-walkup), and you'd become its literal physical demo. Stay credible on **Revenue on Autopilot** (autonomous send/sequence) and **Sales Cyborgs** (agentic qualification) as secondary claims.

### 2.2 Engineer a REAL viral loop (the biggest gap)

The mechanic: a **"Bring-a-Peer Unlock"** printed on the thermal receipt.

1. Visitor finishes → booth scores them, LED goes green, and the receipt prints a **unique short URL + QR** (e.g. `lens.gg/AX7`).
2. The receipt's offer is *self-interested and concrete*, not "share us": **"Your personalized [pain-specific teardown / mini-audit] is ready. Unlock it by adding the 2 people on your team who own this problem — we'll generate their version too."** The asset is something the AI actually generated for them, so sharing it makes the *sharer* look good. Share incentive = status + a useful artifact, not a discount.
3. When they add peers (name + work email), the agent **immediately enriches and scores those peers** and sends them their *own* personalized result link — *"Sarah at the booth thought you should see this."* Each referred page ends with the same unlock offer → recursion.
4. **Why it compounds:** referred people don't have to be at the event. The loop escapes the show floor. 200 walkups → referrals into 400–600 people who were never there.

**The K-factor math (say it out loud — rigor disarms the "viral is asserted" critique):**
- conversion-to-referrer `c` ≈ 0.3–0.4 · referrals per referrer `i` ≈ 2 → **K = c × i ≈ 0.7**.
- K < 1 is *not* infinite virality (and you should admit that) — but K=0.7 → **1/(1−K) ≈ 3.3x amplification**: a booth that touched 200 people now touches ~660, **all auto-qualified and auto-emailed before any human acts.**
- The CAC reframe a deal-closing judge underlines: incremental cost per net-new referred lead ≈ a sticker + a few cents of tokens, bolted onto spend the company was *already* making.

**Show it LIVE:** a big **"Reach Multiplier" counter** on the dashboard — `Walkups: 1 → Referred: 3 → Total reach: 4 | K = 0.7`. When peers are added during the demo, referred lead cards **animate in, get auto-qualified, emails marked sent**, and the number climbs. That on-screen moment *is* the proof it's a loop, not a form. This is how the name "Viral" finally earns itself.

### 2.3 Make the AI demonstrably deep (kill "form + one GPT call")

Render the qualification as a **visible multi-step agent pipeline** — a checklist that ticks off on the big screen:

1. **Enrich from public signal** — from email domain + company, derive company size/stage/industry/ICP-fit (homepage `<title>`/meta scrape, logo.dev, GitHub-org check). *"We don't trust what they typed. We verify it."*
2. **Cross-check self-report vs. reality** — flag discrepancies: *"Claimed 'Director', domain suggests a 5-person company → likely founder. Re-weighting."* This single behavior destroys the "people lie on forms" critique.
3. **Multi-factor score with a transparent rubric** — ICP fit × urgency language × authority × pain specificity, each shown with its contribution; LED color maps to the composite.
4. **Intent/urgency from free text** — "budget approved" / "evaluating now" vs. tire-kicker language, surfaced as an evidence chip.
5. **Auto-sequence, not draft** — actually **send** the first touch (Resend) and **schedule** a branched follow-up; show "Email sent ✓" + "Follow-up scheduled Tue."
6. **Execute next action via tool-calling** — the model picks a tool (`book_meeting`, `add_to_sequence`, `notify_sales`) and the action runs it.
7. **The referral agent runs the same pipeline recursively** on each referred peer — *that's* the depth flex: it qualifies people no one entered manually.

Framing: *"One GPT call scores a form. This runs a seven-step verification-and-action pipeline on every person — including people who were never at the booth."*

### 2.4 The winning demo (2–3 min, one wow in the first 60s)

**Pre-seed/de-risk:** 3–4 lead records already in Convex; a teammate is the deterministic "referred peer" with phone ready; enrichment cache pre-warmed for demo domains; one backup receipt pre-printed; a 20s screen recording of the loop firing as hard fallback; OpenAI calls on tight timeouts with cached fallback responses.

- **Opening hook (before touching anything):** *"Every booth at this hackathon captures the people who walk up. Watch this one **manufacture the ones who didn't.**"*
- **0:00–0:20 — The walkup.** Judge scans QR, types name/email/role + one-line pain. *"Self-reported. People lie on these. So we don't trust it."*
- **0:20–0:50 — Wow #1 (agentic depth, live).** The 7-step pipeline ticks off on screen: enriched → discrepancy flagged → scored 87 → LED green → **"Email sent ✓."** Receipt prints. *It caught the lie and already sent the follow-up before you finished talking.*
- **0:50–1:40 — Wow #2 (the loop fires).** *"Here's the part that makes it growth, not capture."* The walkup adds 2 peers → teammate's referral lands → **two new cards animate in, auto-qualify, emails sent** → Reach Multiplier rolls **1 → 3, K=0.7.** *"Nobody at this booth scanned for those two people. The booth went and got them."*
- **1:40–2:20 — Compounding + math.** *"200 walkups becomes ~660 reached, all auto-qualified, all followed up, with zero SDRs. Same booth, same $20k, 3.3x the pipeline."*
- **Closing line:** *"Other booths hand you a spreadsheet on Monday. This one hands you a **channel.** It's open-source, it runs on a $40 Pi, and it just turned one handshake into a referral chain in front of you."*

### 2.5 Pitch framing — preempt the critiques head-on

- On *"just a form + GPT call"*: *"If it were one GPT call, we couldn't catch that he lied about his title — we verify against public data, run seven steps, and **act**. Most of the people this booth qualifies tonight never filled out the form."*
- On *"capture, not growth"*: *"Capture tools improve traffic you already have. We **create** traffic — a referral loop with a measured K of 0.7. That's an acquisition channel with a physical top-of-funnel, and the CAC is a sticker."* (Stating K<1 yourself signals rigor.)
- On *hardware*: *"Software referral loops are ignorable. A glowing, receipt-printing object at an event is an attention magnet that is itself the share trigger — the loop has a body. A web app can't copy that at a conference."*
- **Repeat one metric all pitch: reach created per walkup = ~3.3x.**

---

## Part 3 — The 24-Hour Build Plan (hardware kept, de-risked)

### 3.1 Architecture

The kiosk is a *thin trigger*. **Convex is the spine** (DB + realtime + server-side agent orchestration). **OpenAI is the brain.** **Next.js is every screen.** Hardware never talks to OpenAI — it only reads/writes Convex.

Flow: Visitor scans kiosk QR → Next.js `/scan/[boothSessionId]` form → Convex mutation `leads.create` → schedules Convex **action** `agent.qualify` (actions can do network I/O; mutations/queries can't — that's the whole reason to use Convex) → pipeline writes step-by-step state back → reactive Convex **queries** fan out to the visitor page, the big-screen dashboard, and the hardware simultaneously → kiosk sets LED + prints receipt → a public Lead Card page (`/card/[leadId]` + OG image) carries `referrerLeadId` for the viral loop.

**Sponsor placement (say it to judges):** Convex = tables/mutations/queries/actions/scheduler/file-storage (the backbone); OpenAI = all reasoning via structured outputs + tool-calling; Cursor = dev environment (name it in README); Resend = actual email send (cleaner than Gmail OAuth in 24h).

### 3.2 Hardware de-risk

- **Use a Raspberry Pi (Pi 4 or Zero 2 W), not ESP32.** The thermal printer decides it: USB printer + `python-escpos` "just works" on Pi; ESP32 means serial TTL + hand-rolled ESC/POS. Pi also runs Chromium in kiosk mode, so the "kiosk screen" is literally a Next.js page — zero custom display code.
- **Ship the minimum that wows:** Pi + Chromium screen (QR/branding) + one bright RGB status LED (WS2812B NeoPixel) + USB thermal printer. That trio *is* the 60-second moment.
- **Cut/defer:** physical button (the QR scan is the trigger), LED matrix (one LED is the wow), and **start the 3D print at hour 0** — if it's not done, cardboard + vinyl wrap reads fine on camera. Never block software on the print.
- **Bridge:** a tiny Python loop on the Pi polls a Convex **HTTP action** every ~1s (`/hardware/nextJob` → set LED + print → `/ack`). Boring HTTP is debuggable with `curl`; 1s latency is invisible. Keep realtime where it shines (the JS dashboard + visitor page). Make `/ack` idempotent so a poller restart can't double-print.
- **The fallback that does NOT look like "just a web form":** if hardware dies, the judge scans the same QR on *their own phone* and gets the full animated pipeline + score + Lead Card, and the follow-up email **actually lands in their inbox within seconds.** Frame the hardware as theater around a bulletproof software core — so a printer jam can't sink you, and you say so confidently.

### 3.3 Agentic pipeline (depth without blowing the budget)

One Convex action `agent.qualify` writes an `events` row after each step so the dashboard renders the agent "thinking" (a live timeline with timings — the single most judge-impressing artifact). Steps: parse/normalize (no LLM) → enrich (parallel `Promise.all`, each with a 1.5s timeout, best-effort) → classify persona (structured output) → score with structured reasoning (`reasons[]` rendered on screen) → draft + **send** via Resend → recommend/execute next action via tool-calling + Convex scheduler for the day-2 follow-up.

**Latency budget (target <~6s perceived):** run enrichment concurrently; serialize only true dependencies; use a fast mini model for classify/score and reserve the larger model for the email; **stream** the email body to the result page; **optimistic UI** paints the 6-step skeleton on submit; **pre-warm** OpenAI + Convex at booth setup; **cache** enrichment by domain and keep 2–3 "golden" pre-processed leads to replay if the network dies.

### 3.4 Timeline (Sat 5pm → Sun 4pm, 1h buffer before judging)

**Team split:** FE (frontend/dashboard/card) · BE/AI (Convex + pipeline) · HW (Pi/printer/LED) · DEMO (polish/talk track/reliability, floats).
**Golden rule — build the spine first.** By **hour 4** you must have `scan → Convex → (stub) score → result page` working end to end. Everything after enriches a working demo.

- **h0–2 (5–7pm):** Next.js + Convex wired, `/scan` form, schema, stub `agent.qualify`. Repo public on GitHub. Keys (OpenAI, Resend, Convex). **Start the 3D print.** Flash Pi, Chromium kiosk + WiFi, print a test slip.
- **h2–4 (7–9pm):** Real OpenAI classify+score; result page live from Convex; LED 3 colors; printer prints a hardcoded receipt. **CHECKPOINT h4: end-to-end stub demo works.** Always demoable from here.
- **h4–7 (9pm–12am):** Dashboard live timeline + tier colors + animations; enrichment + email draft; Pi poller actuates from real leads. Pre-seed 3 golden leads; test on phone hotspot.
- **h7–10 (12–3am):** Viral Lead Card + OG image; Resend actually sends; referral attribution. Mount components. **CHECKPOINT h10: full pipeline + send + hardware actuates** (production-ready; everything after is droppable polish).
- **h10–13 (3–6am):** Referral loop UI + dashboard attribution; tool-calling next-action + auto-sequence; 20-scan burn-in test.
- **h13–16 (6–9am):** Stage polish (big fonts, motion, counters); latency tuning + pre-warm; reliability pass + spare paper/SD card; README (sponsors named) + talk track.
- **h16–19 (9am–12pm):** Visual polish; edge cases (bad email, enrichment miss, rate-limit backoff); **rehearse the 60s demo 3x.**
- **h19–21 (12–2pm):** Bug bash; pre-demo checklist dry-run; **record a backup video.**
- **h21–23 (2–4pm):** **Code freeze.** Rehearse, charge devices, final receipt test.
- **4–5pm:** Buffer — set up at booth, pre-warm everything.

### 3.5 Demo reliability checklist (run 5 min before judging)

1. Pi booted, Chromium on kiosk URL, QR visible, WiFi = **our hotspot** (venue WiFi is the #1 demo killer — bring your own).
2. Python poller running; one test receipt printed (paper path + cut OK).
3. LED cycles all 3 tier colors.
4. Dashboard on big screen, live counter ticking.
5. OpenAI + Convex pre-warmed (one throwaway run completed).
6. 3 golden leads loaded; replay button works.
7. Resend test email landed in a real inbox <5s.
8. Demo phone charged, on hotspot, QR opens form.
9. Spares: paper roll, backup SD card, backup phone, **recorded backup video queued.**
10. Talk track names Convex + OpenAI + Cursor; GitHub repo public.

---

## The three things that win this specific room

1. **Sell agentic depth *visually*** — the 6–7-step live timeline with timings directly answers the "shallow AI" critique.
2. **Reframe hardware as theater around a bulletproof software core** — the phone fallback *is* the product, so nothing physical can sink you.
3. **The viral loop creates reach beyond the booth** — referral attribution on the dashboard ("3 leads came from forwarded cards") is the growth-engine story this panel is primed to reward, and it's cheap to build (a query + a `referrerLeadId`).

---

### Sources (research agent, with URLs for citation)

- Riley Shu, multi-time YC/OpenAI hackathon winner — winning formula: https://maven.com/p/41380d/how-i-won-first-places-in-the-yc-and-open-ai-hackathons
- Codapt AI, $65K YC 24-hr agents hackathon winner: https://luma.com/pz27h0xy · https://www.linkedin.com/posts/rubendominguezibar_two-founders-walked-into-ycs-first-24-hour-activity-7368696748254334997-L2P7
- Revnu (YC) — agents running every growth channel: https://www.ycombinator.com/companies/revnu
- Convex hackathon winners: https://stack.convex.dev/hackathon-winners-fall-2024 · https://stack.convex.dev/hacakthon-winners-winter-2024
- Growth-loop canon (Hotmail/Dropbox): https://stripe.com/resources/more/growth-hacking-strategies
- Judging criteria / demo-first: https://www.hackerearth.com/blog/10-tips-win-hackathon · https://info.devpost.com/blog/hackathon-judging-tips · https://taikai.network/en/blog/hackathon-judging · https://dorahacks.io/blog/guides/hackathon-judging-plan
- Pitch structure: https://taikai.network/en/blog/how-to-create-a-hackathon-pitch · https://angelhack.com/blog/10-tips-to-help-you-rock-your-next-hackathon-demo/
- Competitive landscape (booth/event lead tools): https://blinq.me/solutions/event-lead-capture · https://www.cvent.com/en/event-marketing-management/cvent-icapture · https://popl.co/blogs/all/7-ai-lead-capture-tools-dominate-event-roi-2025 · https://www.momencio.com/how-ai-is-changing-lead-capture-at-trade-shows/ · https://www.octavehq.com/post/best-ai-tools-for-conference-and-event-follow-up-in-2026

*Note: source URLs were produced by the research agent and are provided for you to verify; spot-check any you plan to quote in your pitch.*

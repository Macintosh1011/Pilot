# BoothPilot — Full Engineering Spec & Build Plan (Scoped MVP)

**Project:** BoothPilot — an interactive AI booth that talks to each visitor, researches them live, demos the product to their use case, and hands the company a review-ready CRM card + follow-up.
**Event:** AI Growth Hackathon (Orange Slice × Y Combinator), 24h, judging Sun 5pm. Open-sourced on GitHub per rules.
**Team:** 3 builders. **Goal:** a working physical prototype (iPad + Raspberry Pi) + bulletproof software core + a 2–3 min winning demo.
**Sponsors used:** OpenAI · Convex · Cursor · **fiber.ai** (data/enrichment) · ElevenLabs.

---

## 1. The scoped workflow (source of truth)

1. **Approach** → AI greets and starts a conversation.
2. **Voice loop:** Whisper (speech→text) → GPT (conversation + tool-calling) → ElevenLabs (text→speech).
3. **Identify:** ask name + company (or scan the visitor's **LinkedIn QR**). → **research both live via fiber.ai** → create an internal **CRM contact card** with firmographics, work email/phone, and LinkedIn snapshot.
4. **Scope needs:** ask their problems; keep the conversation going; blend what they say with fiber data → write **urgency** + **confidence score** onto the card.
5. **Live demo:** show, on screen, how the product solves *their* stated problem (driven via shared `demoState`, see §3).
6. **Capture:** confirm contact info (LinkedIn / QR / email).
7. **Takeaway:** generate a personalized, shareable **Booth Badge** — an archetype + a grounded compliment + flattering stat bars + a discount — delivered via a **QR** (printed on thermal as a mini-badge ticket, and/or shown on the iPad to scan).
8. **Follow-up:** GPT **drafts an email**, queued for **human review after the fair** (no auto-send).

**Definition of done (whole project):**
- [ ] Real two-way voice conversation (Whisper→GPT→ElevenLabs).
- [ ] Live fiber.ai enrichment populates a CRM card with LinkedIn + contact.
- [ ] Urgency + confidence score with reasons on the card.
- [ ] Agent demos the visitor's use case live on screen.
- [ ] Personalized shareable Booth Badge (archetype + compliment + discount) via QR, with a good Open Graph share image.
- [ ] Drafted follow-up sitting in a human-review queue on the dashboard.
- [ ] Physical station: iPad front + Pi-driven LED reaction + proactive greet.
- [ ] Phone/iPad-only fallback works if the Pi/peripherals fail.

---

## 2. Architecture — three roles, one nervous system

The display surface and the electronics are decoupled and coordinate through Convex. This is what lets the iPad deliver a polished UI **without sacrificing the hardware**.

- **iPad (Xcode / SwiftUI)** = the experience node: conversation UI, voice pipeline, camera (LinkedIn QR scan), the live demo view, and the Booth Badge. Replaces the cheap HDMI panel — better UI, same physical wow.
- **Raspberry Pi** = headless peripheral hub: the things an iPad physically can't do — RGB LED halo, thermal printer (if used), PIR presence.
- **Convex** = the spine both subscribe to. The iPad and the Pi never talk directly (optional local-LAN fallback in §10).

```
   VISITOR (iPad, SwiftUI)                CONVEX (spine)                 COMPANY (web)
  ┌──────────────────────┐   reactive    ┌──────────────┐   reactive   ┌────────────────┐
  │ Conversation UI       │◄────────────►│ sessions     │◄───────────►│ Review queue +  │
  │ Whisper→GPT→11Labs    │   queries     │ messages     │   queries    │ dashboard       │
  │ Camera: LinkedIn QR    │              │ demoState    │              │ (cards, score,  │
  │ Demo view (WKWebView   │──tool calls─►│ hwCommands   │              │  email drafts)  │
  │  reactive to demoState)│              │ presence     │              └────────────────┘
  │ Booth Badge + QR       │              │ badge(file)  │
  └──────────┬─────────────┘              │ (HTTP acts)  │   ┌──────────────┐
             │ ephemeral keys             └──────┬───────┘   │ Agent (Convex │
             ▼                                   │           │  actions):    │
  ┌──────────────────────┐                       │ poll      │  GPT + fiber  │
  │ OpenAI Whisper + GPT  │                       ▼           │  + scoring +  │
  │ ElevenLabs TTS        │                ┌──────────────┐   │  badge + email│
  │ fiber.ai (via Convex) │                │ Pi bridge:    │   └──────────────┘
  └──────────────────────┘                 │ LED / printer │
   (thermal QR mini-badge,                  │ / PIR presence│
    or just show QR on iPad)                └──────────────┘
```

**The key design rule (unchanged):** the live demo is **shared-state, not browser automation.** GPT's "show the churn board" tool writes `demoState`; the demo view (a WKWebView or native view) re-renders in <100ms. Deterministic, fast, demo-safe — and the clean seam between Builder A and Builder B.

---

## 3. Tech stack

| Layer | Choice | Notes |
|---|---|---|
| Booth UI | **iPad app, SwiftUI (Xcode)** | Hybrid: native shell (voice, camera, chrome) + **WKWebView** for the demo product & recap (reactive via Convex). Lock with **Guided Access**, disable auto-lock, keep charging. |
| Voice — STT | **OpenAI Whisper** (streaming) | push partials; VAD for turn-taking |
| Voice — LLM | **GPT** (tool-calling, structured outputs) | conversation + drives `demoState` + calls fiber |
| Voice — TTS | **ElevenLabs** (streaming) | stream audio as tokens arrive; barge-in support |
| Enrichment/research | **fiber.ai** API / MCP | company + people search, reveal work email/phone, live LinkedIn snapshot; per-call cost metadata (estimate-before-spend) |
| Backend / realtime | **Convex** | tables, queries, mutations, actions, httpAction, file storage (badge OG images), scheduler |
| Email | GPT draft → **review queue** → Resend (send only after human approval, post-fair) | no auto-send |
| Hardware compute | **Raspberry Pi 4 (4GB)** + Pi OS 64-bit | headless peripheral hub + Python bridge |
| Bridge libs | `python-escpos`, `rpi_ws281x`/`adafruit-circuitpython-neopixel`, `gpiozero` | printer / LED / PIR |
| Dev | **Cursor** (+ fiber.ai coding plugin) | sponsor; fiber ships an agent plugin + `llms.txt` |

> Latency target for voice: **< 1.5s to first audio.** Stream Whisper partials, stream GPT tokens into ElevenLabs streaming TTS, use VAD for turn-taking, handle barge-in. If turn-taking still feels laggy in testing, OpenAI Realtime API is the drop-in fallback.

---

## 4. fiber.ai integration (the research/enrichment layer)

**Where it runs:** a Convex action `enrich(sessionId)` (server-side, key stays secret), callable two ways:
- **As a GPT tool** mid-conversation: when the visitor gives a name/company or scans LinkedIn, GPT calls `lookup_visitor` → Convex → fiber. (Agent-native story judges like.)
- **As a pipeline step** right after identification, to pre-fill the card before the demo.

**Calls (high level, per fiber docs):**
1. **Company search** by name/domain → firmographics (size, industry, funding, location).
2. **People search / match** name + company (or LinkedIn URL from the scanned QR) → person profile.
3. **Reveal** work email + phone (respect fiber's estimate-before-spend; only reveal once the visitor is engaged).
4. **LinkedIn snapshot** → title, recent activity → feeds persona + best-angle.

**Outputs written to the CRM card:** verified role/company, email/phone, LinkedIn URL, firmographic context, and a cross-check flag (does what they said match what fiber found?). This is what makes the booth feel like it *knows* them — and it's the antidote to "people lie on forms."

**Docs:** `api.fiber.ai/docs` · `api.fiber.ai/llms.txt` · MCP quickstart `docs.fiber.ai` · plugin `github.com/fiber-ai/fiber-ai-plugin`. Keep usage to a few calls per visitor and watch cost metadata; cache by company/domain.

---

## 5. Data model (Convex)

```ts
sessions: defineTable({              // = the CRM contact card
  deviceId: v.string(),
  status: v.string(),                // active | enriching | demoing | done
  // identity
  visitorName: v.optional(v.string()),
  company: v.optional(v.string()),
  role: v.optional(v.string()),
  linkedinUrl: v.optional(v.string()),
  email: v.optional(v.string()),     // from fiber reveal or asked
  phone: v.optional(v.string()),
  // fiber enrichment
  fiber: v.optional(v.any()),        // firmographics + person payload
  fiberMatch: v.optional(v.string()),// "verified" | "mismatch" | "none"
  // needs + scoring
  problems: v.optional(v.array(v.string())),
  useCase: v.optional(v.string()),
  urgency: v.optional(v.string()),   // low | medium | high (+ evidence)
  confidence: v.optional(v.number()),// 0..100
  confidenceReasons: v.optional(v.array(v.string())),
  bestAngle: v.optional(v.string()),
  demoShown: v.optional(v.array(v.string())), // views demoed
  // shareable Booth Badge (public, flattering)
  badge: v.optional(v.object({
    archetype: v.string(),           // e.g. "The Churn Slayer"
    tagline: v.string(),
    compliment: v.string(),          // grounded in the transcript
    stats: v.array(v.object({ label: v.string(), value: v.number() })), // public mirror of score
    discountCode: v.string(),
    ogImageId: v.optional(v.id("_storage")),
  })),
  // follow-up (human-in-the-loop)
  emailDraft: v.optional(v.object({ subject: v.string(), body: v.string() })),
  reviewStatus: v.optional(v.string()), // pending | approved | edited | sent | discarded
  createdAt: v.number(),
}).index("by_device", ["deviceId"]).index("by_created", ["createdAt"]),

messages: defineTable({ sessionId: v.id("sessions"), role: v.string(), text: v.string(), ts: v.number() })
  .index("by_session", ["sessionId"]),

demoState: defineTable({ sessionId: v.id("sessions"), view: v.string(), params: v.any(),
  highlight: v.optional(v.string()), updatedAt: v.number() }).index("by_session", ["sessionId"]),

events: defineTable({ sessionId: v.id("sessions"), step: v.string(), label: v.string(),
  detail: v.optional(v.string()), ms: v.optional(v.number()), ts: v.number() }).index("by_session", ["sessionId"]),

hwCommands: defineTable({ deviceId: v.string(), kind: v.string(), payload: v.any(),
  acked: v.boolean(), createdAt: v.number() }).index("by_device_unacked", ["deviceId","acked"]),

presence: defineTable({ deviceId: v.string(), event: v.string(), ts: v.number() })
  .index("by_device", ["deviceId"]),
```

---

## 6. Component specs

### 6.1 iPad booth app (SwiftUI)  *(owner: A)*
- **Voice pipeline:** capture mic (AVAudioSession with voice-processing for echo cancellation) → stream to Whisper → send transcript to GPT (via Convex action or direct with ephemeral key) → stream GPT text to ElevenLabs streaming TTS → play. VAD for turn detection; allow barge-in (stop TTS when the visitor speaks).
- **Camera:** **LinkedIn QR scan** (Vision `VNDetectBarcodesRequest`) → `linkedinUrl` (feeds fiber enrichment). No person-photo needed in the badge flow.
- **Badge handoff:** display the Booth Badge QR on screen and/or signal the Pi to print the mini-badge ticket.
- **Demo view:** WKWebView pointed at the web demo product, reactive to `demoState` via Convex (Swift client or HTTP). Native transitions/chrome around it for polish.
- **Presence reaction:** subscribe to `presence`; on `approach`, start the greeting.
- **Kiosk hygiene:** Guided Access single-app lock, `isIdleTimerDisabled = true`, stays on charger.

### 6.2 GPT conversation + tools  *(owner: B defines, A wires)*
System prompt: warm booth concierge for the demo product; goals = identify → research → scope needs → demo → capture → draft follow-up; never hard-sell, never tell the buyer what to choose.
Tools (GPT calls; executed in Convex actions or on-device):
- `lookup_visitor({name, company, linkedinUrl})` → fiber enrichment → writes card.
- `set_needs({problems, useCase, urgency})` → writes card.
- `show_view({view, params})` / `highlight({elementId})` → writes `demoState`.
- `capture_contact({email, phone, linkedinUrl})` → writes card.
- `finalize_session()` → triggers scoring + email draft + print command.

### 6.3 Demo-target product  *(owner: A)*
Small real-looking SaaS (e.g., "Acme Analytics") with views reactive to `demoState`: `home`, `churn`, `alerts`, `pricing`, `integrations`, `query-result`. Local sample data; the only control surface is `demoState`. (Swap to demoing your own project or a sponsor's later — only this layer changes.)

### 6.4 Scoring + follow-up pipeline  *(owner: B)*
Convex action on `finalize_session`, each step logs an `events` row (visible "agent thinking" on the dashboard):
1. **Confidence score** (0–100) + reasons via structured output, weighting: ICP/fiber fit 30 · intent language 25 · engagement/dwell 20 · authority 15 · demo depth 10.
2. **Urgency** from transcript cues (+ evidence quote).
3. **Booth Badge** (structured output): assign an `archetype` + `tagline`, write a **grounded compliment** that quotes a real detail from the transcript, derive 2–3 flattering `stats` (a public mirror of the internal score), and a `discountCode`. Tone: witty, niche, never saccharine or backhanded. Render a dynamic **OG image** (`@vercel/og`-style) → Convex file storage (`ogImageId`).
4. **Email draft** referencing the exact demo they saw and their stated problem → `emailDraft`, `reviewStatus="pending"`.
5. **Badge handoff** → `hwCommands` to print the QR mini-badge (thermal) and/or signal the iPad to show the QR.

### 6.4b Badge page  *(owner: A or B)*
`/badge/[sessionId]` — a public, collectible-style card page: archetype, tagline, the grounded compliment, animated stat bars, discount code, and a **Share** action (LinkedIn/X) plus a soft "see what the booth says about your teammates" CTA → creates a `referral`-style attributed visit. The dynamic OG image makes shares render beautifully. **Stretch:** "Add to Apple Wallet" pass.

### 6.5 Company dashboard / review queue  *(owner: B)*
- CRM cards sorted by confidence: identity, fiber data, problems, urgency, score+reasons, demo shown, badge.
- **Review queue:** each drafted email shown with Approve / Edit / Discard; on Approve, Resend sends (designed to be run after the fair).
- Agent timeline (events) + optional product-gap panel.

---

## 7. Hardware spec  *(owner: C)*

### 7.1 BOM

| # | Part | Suggested | Notes |
|---|---|---|---|
| 1 | Booth display | **iPad** (team's) | front face; runs the SwiftUI app |
| 2 | iPad mount | VESA/clamp insert sized to the model | inside the enclosure, on charger |
| 3 | Compute | Raspberry Pi 4 (4GB) + 32GB A2 SD | headless peripheral hub |
| 4 | Status LED | WS2812B ring (16–24px) + 74AHCT125 level shifter | "lead-quality halo" around the iPad |
| 5 | Presence | HC-SR501 PIR | proactive greet on approach (or use iPad camera) |
| 6 | **Badge printer (optional)** | USB ESC/POS thermal — **prints from Pi** via `python-escpos` | prints the **Booth Badge mini-ticket**: archetype name + QR + discount (mono is perfect for QR+text). Optional — can instead just show the QR on the iPad |
| 7 | Power | Pi 5V/3A; separate 5V for LED/printer; iPad charger; powered USB hub | don't brown-out the Pi |
| 8 | Misc | 470Ω (LED data), 1000µF cap, jumpers, standoffs, grommets | NeoPixel wiring hygiene |

> **Audio note:** the iPad's mics + voice-processing AEC are usually good enough on a floor, so the USB speakerphone from the old plan is **dropped**. Add a small external USB/Lightning mic only if the hall is brutal.

### 7.2 Wiring (Pi 4, BCM)

| Signal | Pin | Notes |
|---|---|---|
| WS2812B data | GPIO18 → 74AHCT125 → DIN | 470Ω inline; 1000µF across LED 5V/GND |
| LED power | external 5V, **common GND with Pi** | never from Pi 5V if >8px |
| PIR OUT | GPIO17 | `gpiozero.MotionSensor(17)` |
| Thermal printer (optional) | USB | `escpos.printer.Usb(idVendor, idProduct)` — QR mini-badge |

> **Power rule:** Pi on its own supply; LED/printer on a second 5V; all grounds tied. Prevents most flaky-hardware demos.

### 7.3 CAD / enclosure

**Form:** tabletop podium that **cradles the iPad** as the front face, tilted ~15°, weighted base.
**Features (parametric, Fusion 360 / Onshape):**
- iPad bezel/slot sized to the exact model, with cutouts for **front camera** (LinkedIn QR scan), speaker, and **charge cable**; retains the iPad securely but removable.
- **LED diffuser halo** (frosted channel) ringing the iPad or glowing the base.
- PIR port aimed at the approach zone.
- Printer slot + paper exit/tear edge (if the thermal badge printer is used).
- Rear access panel for Pi + hub + cabling; ventilation slots; cable grommet + strain relief.
**Manufacture:** split into bed-sized PLA parts (bezel, shell, base, rear panel); 0.2mm, 15–20% infill. **Start the longest print at hour 0.** Fallback: laser-cut acrylic / foamcore + vinyl + 3D-printed accents. The demo never blocks on the enclosure.
**Deliverables:** STEP+STL in `/hardware/cad`, wiring diagram in `/hardware/wiring`, assembly photo in README.

### 7.4 Firmware / bridge (Pi)  *(owner: C)*
`/firmware/bridge.py` (+ `boothpilot-bridge.service`):
- Poll `GET {CONVEX_HTTP}/hw/poll?deviceId=…` ~800ms → execute unacked `hwCommands` (`led` set color/anim; `print` thermal QR mini-badge if printer used) → `POST /hw/ack`.
- PIR → debounced `POST /hw/presence {event:"approach"}`.
- Idempotent acks. (Pi does **not** render any UI — the iPad is the screen.)

---

## 8. Interface contracts (lock in hour 1)

| Contract | Producer | Consumer | Shape |
|---|---|---|---|
| `demoState` | GPT tools via B; valid views defined w/ A | iPad demo view (A) | `{view, params, highlight}` |
| GPT tool schema | B | A (executes/renders) | §6.2 |
| `sessions`/`messages` | iPad (A) creates/transcribes; B enriches/scores | dashboard (B) | §5 |
| fiber enrichment | B (`enrich` action) | card (B), iPad display (A) | writes `sessions.fiber` |
| LinkedIn QR | iPad (A) scans | `enrich` (B) | `sessions.linkedinUrl` |
| Booth Badge | B generates (`sessions.badge` + OG image) | badge page (A/B), iPad QR, Pi print | `sessions.badge` |
| `hwCommands` + `/hw/poll`,`/ack` | B enqueues | Pi (C) | `{kind,payload}` |
| `presence` + `/hw/presence` | Pi (C) | iPad (A) | `{event:"approach"}` |
| email review | B (draft) | dashboard reviewer (B) | `emailDraft`,`reviewStatus` |

**Mocking:** each consumer seeds dummy Convex docs until the producer exists (A hand-writes `demoState` to build the demo view; C inserts an `hwCommands` row to test the LED; B stubs fiber with a canned payload). Shared Convex dev deployment makes this trivial.

---

## 9. Team split — 3 builders

### Builder A — iPad Experience & Voice  *(Swift/iOS)*
**Owns:** SwiftUI booth app · Whisper→GPT→ElevenLabs voice loop (streaming, VAD, barge-in, AEC) · camera (LinkedIn QR scan) · demo-product WKWebView reactive to `demoState` · presence-driven greet · Booth Badge page + share + QR display · Guided Access kiosk.
**DoD:** a visitor talks to the iPad, gets researched, watches their use case demoed live, and walks away with a shareable Booth Badge (QR/printed).

### Builder B — Agent, Data & Backend
**Owns:** Convex schema + functions · GPT tool-calling orchestration · **fiber.ai integration** (search/enrich/reveal/LinkedIn) · confidence + urgency scoring · CRM card · **Booth Badge generation** (archetype + grounded compliment + stats + discount + OG image) · email drafting + **human-review queue** · dashboard · HTTP actions for hardware.
**DoD:** identification triggers live fiber enrichment onto a scored CRM card; a follow-up draft lands in the review queue; dashboard shows it all live.

### Builder C — Hardware & Integration
**Owns:** Pi peripheral hub (LED, optional thermal QR-badge printer, PIR) + `bridge.py` · electronics/wiring/power · **iPad enclosure + LED halo + CAD/3D-print (or fallback build)** · integration owner + **demo-reliability lead** (own hotspot, pre-seed, runbook, backup video).
**DoD:** the physical station boots into the iPad app, LED reacts to confidence, PIR triggers the greet, the takeaway card prints, and the whole demo runs reliably with a tested fallback.

> **Load-balancing:** hardware has dead-time (prints/glue). When blocked, C is the integration glue (wires `/hw/*` with B, tests kiosk with A, runs reliability). Keep a thin slice each (recap page, seed script) that C can grab.

---

## 10. 24-hour timeline (owners + checkpoints)

| Window | A (iPad/Voice) | B (Agent/Data) | C (Hardware/Integration) |
|---|---|---|---|
| **h0–2** | Xcode app skeleton, Convex client, mic capture → Whisper echo | Schema + **contracts locked (§8)**, fiber "hello" call, dashboard skeleton | Flash Pi, **start longest 3D print**, LED blinks from hand-inserted `hwCommands` |
| **h2–4** | Whisper→GPT→ElevenLabs full loop (text in/out audible) | GPT tool-calling + `lookup_visitor`→fiber writes a card; `/hw/*` HTTP actions | PIR→`/hw/presence`; bridge poll+ack loop |
| **★ h4** | **End-to-end stub: talk → card enriched → demo view reacts. main demoable.** |
| **h4–8** | LinkedIn QR scan; demo view driven by `demoState`; greet on presence | Confidence/urgency scoring; Booth Badge gen + OG image; email draft → review queue | LED color ← confidence; thermal QR mini-badge prints |
| **h8–12** | Polish conversation UI, barge-in, transitions | Review-queue UI (approve/edit); fiber cost caps + caching | Mount iPad in enclosure (or fallback); cabling; 20-cycle burn-in |
| **★ h12** | **Full loop + physical card + reviewable email. Freeze risky items.** |
| **h12–16** | Latency tuning (<1.5s), kiosk lock | Structured-output guards, fiber fallbacks | Reliability pass, own-hotspot test, spares |
| **h16–20** | Rehearse demo | Seed golden sessions + cached fallbacks | Assembly, **backup video**, checklist |
| **h20–judging** | **Code freeze.** Rehearse 3×, charge iPad+Pi, dry-run runbook, set up + pre-warm. |

**Pre-demo checklist:** iPad in Guided Access on our hotspot · Pi bridge running, test card printed · LED cycles colors · dashboard/review queue live · Whisper/GPT/ElevenLabs + fiber pre-warmed (one throwaway run) · golden sessions loaded · backup video queued · repo public · talk track names Convex/OpenAI/Cursor/**fiber.ai**/ElevenLabs.

---

## 11. Risk register & fallbacks

| Risk | Mitigation |
|---|---|
| Voice latency / awkward turns | stream STT+TTS, VAD, barge-in; <1.5s target; Realtime API as fallback |
| Venue WiFi | own hotspot; iPad + Pi on it; golden-session replay needs no external calls; optional Pi local-LAN HTTP so iPad triggers LED/printer internet-free |
| fiber rate/cost/miss | cache by domain, cap calls/visitor, estimate-before-spend, canned fallback payload |
| Demo automation flaky | solved by `demoState` shared-state (no browser automation) |
| Badge feels generic/cringe | compliment must quote a real transcript detail; curate the archetype list; keep tone witty not saccharine |
| Pi/peripherals die | iPad runs the whole experience minus LED/printer; recorded backup video |
| 3D print overruns | start h0; foamcore/laser-cut fallback |
| Privacy (data) | no person-photo captured; enrich only public B2B data via fiber; store only what's needed |

---

## 12. Cut list vs. stretch

**Cut first (in order):** thermal printer (just show the QR on the iPad) → enclosure polish (foamcore) → product-gap panel → extra demo views.
**Never cut:** voice conversation · fiber-enriched CRM card · confidence/urgency score · live use-case demo · drafted follow-up in the review queue · iPad-only fallback.
**Stretch:** fiber MCP wired as a live GPT tool the judges watch fire · confidence updating live mid-conversation · "Add to Apple Wallet" badge pass · CRM/Slack export · a second unit for a "two booths, one dashboard" moment.

---

*Lock the §8 contracts in hour one. Build in parallel; integrate at h4 and h12. The iPad gives you the polished UI; the Pi keeps the physical wow; Convex ties them together; fiber.ai makes the booth feel like it already knows the visitor.*

## Sources (fiber.ai)
- https://www.fiber.ai/ · https://www.ycombinator.com/companies/fiber-ai · https://api.fiber.ai/docs · https://api.fiber.ai/llms.txt · https://github.com/fiber-ai/fiber-ai-plugin

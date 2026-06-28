# Builder 1 — Front of House (iPad Experience & Voice)

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

**Event:** AI Growth Hackathon (Orange Slice × YC). 24h, kickoff Sat 5pm, **judging Sun 5pm**. Repo must be **public on GitHub** for the duration. Name the sponsors in the pitch + README: **OpenAI, Convex, Cursor, fiber.ai, ElevenLabs**.

**Architecture — three roles, one nervous system:**
- **iPad = the experience node (you).** UI, voice in/out, QR camera, the live demo view, the badge.
- **Pi 5 = headless sensing node (Builder 3).** Webcam presence detection → greets.
- **Convex = the spine.** Everyone reads/writes Convex; the iPad and Pi never talk directly.

**THE key design rule:** the live demo is **shared state, not browser automation.** GPT's "show the churn board" tool just writes a Convex doc (`demoState`); your demo view re-renders from it in <100ms. Deterministic, fast, demo-safe.

**Hardware reality (what we actually have):** Pi 5, keyboard/mouse, webcam, mic, wires, **iPad**. No LED ring, no printer, no speaker, no monitor. → Audio lives on the **iPad** (its mic + speaker). LED-style "lead quality" is shown **on screen**, not a physical LED. Badge is a **QR on screen** (printer optional).

**Team map:** B1 (you) = front of house · B2 = brain (Convex/AI/fiber/badge/dashboard) · B3 = physical + integration/reliability lead.

**Checkpoints:** ★**h4** end-to-end stub works · ★**h12** full loop + presence + badge. `main` stays demoable.

---

## Your role

You own **everything the visitor sees and hears.** The polished surface that wins the demo.

### What you own
- The **iPad app**: a thin native shell (Swift) wrapping a **WKWebView** that hosts the real UI as web. Keep native to the minimum: Guided Access kiosk lock, keep-awake, mic/camera permissions.
- The **voice loop**: Whisper (STT) → GPT (LLM, tool-calling) → ElevenLabs (TTS), streaming, with VAD turn-taking and barge-in.
- The **LinkedIn QR scan** (camera) → writes `linkedinUrl`.
- The **live demo view** ("Acme Analytics") — reactive to `demoState`.
- The **badge page** (`/badge/[sessionId]`) — renders `sessions.badge` + share action.

### Definition of done
A visitor talks to the iPad, watches their use case demoed live on screen, and walks away with a shareable Booth Badge (QR). Works start-to-finish from the iPad alone (so a Pi failure can't sink the demo).

### Why web-in-a-WebView (important)
WKWebView supports `getUserMedia` (iOS 14.3+), so the **entire voice loop and UI can be web** — built fast in TypeScript, rendered in the WebView. Native is only the shell + a fallback if WebView audio gets flaky. This keeps your surface small and lets the team help in a stack everyone knows.

---

## Interfaces (your seams with the team)

You **call Builder 2's Convex functions** when GPT emits a tool call, and you **subscribe to Convex queries** for live state.

| You do | Mechanism |
|---|---|
| Create a session, write transcript | mutations `sessions.create`, `messages.add` (B2 provides) |
| GPT tool `lookup_visitor` | call action `lookupVisitor({name,company,linkedinUrl})` → B2 runs fiber |
| GPT tool `show_view` / `highlight` | call mutation `setDemoState({view,params,highlight})` |
| GPT tool `set_needs` / `capture_contact` | call mutations B2 provides |
| GPT tool `finalize_session` | call action `finalize(sessionId)` → B2 scores + badge + email draft |
| Render the demo | **subscribe** to `demoState` query → re-render |
| Greet on approach | **subscribe** to `presence` query (B3 posts it) |
| Render badge | read `sessions.badge` (set by B2) |

**Mock while B2 builds:** hand-write a `demoState` doc in the Convex dashboard so you can build the demo view before the agent exists.

---

## Task list
- [ ] Xcode project: native shell + fullscreen WKWebView; Info.plist `NSMicrophoneUsageDescription`, `NSCameraUsageDescription`; `allowsInlineMediaPlayback`, `mediaTypesRequiringUserActionForPlayback = []`.
- [ ] Guided Access (single-app lock) + `UIApplication.shared.isIdleTimerDisabled = true`.
- [ ] Web app skeleton (Next.js or static) + Convex client wired.
- [ ] Mic capture → Whisper (streaming/chunked) → transcript to GPT.
- [ ] GPT streaming → ElevenLabs **streaming** TTS (WebSocket) → playback.
- [ ] VAD for turn-taking; **barge-in** (stop TTS the moment the visitor speaks).
- [ ] Wire GPT tool-calls → B2's Convex functions (table above).
- [ ] Camera **LinkedIn QR scan** → `linkedinUrl`.
- [ ] Demo view "Acme Analytics" (home/churn/alerts/pricing/query-result) reactive to `demoState`.
- [ ] Badge page + Share (LinkedIn/X) + "see your teammates'" CTA.
- [ ] Greet flow triggered by `presence`.
- [ ] Stage polish: big readable type, transitions, "lead-quality" color on screen.

## Your hour-by-hour
- **h0–2:** Xcode shell + WebView, Convex client, mic → Whisper echo.
- **h2–4:** full voice loop audible (Whisper→GPT→ElevenLabs). → **★h4 stub demo**.
- **h4–8:** QR scan; demo view driven by `demoState`; greet handling.
- **h8–12:** badge page + share; conversation polish; barge-in. → **★h12**.
- **h12–17:** latency tuning (<1.5s), Guided Access kiosk, visual polish.
- **h17→judging:** rehearse 3×, charge iPad, pre-warm APIs.

## Gotchas (yours)
- **Latency target <1.5s to first audio.** Stream Whisper partials, stream GPT tokens straight into ElevenLabs streaming TTS, don't wait for full responses.
- **Barge-in** is what makes it feel real — cut TTS when speech is detected.
- Use the **iPad's mic + speaker** (built-in echo cancellation). The brought USB mic is a backup only.
- WKWebView audio can be finicky — if it fights you, move just the audio capture/playback to native (AVAudioEngine) and keep UI in the WebView.
- If turn-taking still feels clunky after tuning, the **OpenAI Realtime API** is the drop-in fallback for the voice loop.

## Demo-day role
You **drive the iPad** during the 2–3 min demo: hand it to a judge, let them talk to it, show the live demo reacting, then the badge. You're the on-stage operator.

# Builder 3 — Physical + Glue (Hardware, Sensing & Integration Lead)

> Your home doc. Everything you need is here; the full spec is `BoothPilot_Engineering_Spec.md`.

---

## Shared project context (read once)

**BoothPilot** is an interactive AI booth. A visitor walks up; the booth talks to them, researches them live (fiber.ai), demos our product to *their* use case, gives them a shareable personalized **badge**, and hands the company a review-ready CRM card + a drafted follow-up.

**The 8-step loop:**
1. Visitor approaches → AI greets and starts talking.
2. Voice: **Whisper (STT) → GPT (conversation + tools) → ElevenLabs (TTS)**.
3. Ask name + company (or scan their **LinkedIn QR**) → research via **fiber.ai** → build a CRM card.
4. Scope problems; write urgency + confidence onto the card.
5. **Live demo** of how the product solves their problem.
6. Capture contact.
7. **Booth Badge** — archetype + grounded compliment + stat bars + discount, via QR.
8. GPT **drafts a follow-up email** → human-review queue (no auto-send).

**Event:** AI Growth Hackathon (Orange Slice × YC). 24h, kickoff Sat 5pm, **judging Sun 5pm**. Repo **public on GitHub**. Sponsors to name: **OpenAI, Convex, Cursor, fiber.ai, ElevenLabs**.

**Architecture — three roles, one nervous system:**
- **iPad = experience node (Builder 1).** UI, voice, QR, demo view, badge.
- **Pi 5 = headless sensing node (you).** Presence → greets. No screen on the Pi.
- **Convex = the spine (Builder 2 owns it).** Everyone reads/writes Convex; the iPad and Pi never talk directly.

**THE key design rule:** the demo is **shared state, not browser automation** (`demoState` in Convex). Good to know; not your area.

**Team map:** B1 = front of house · B2 = brain · B3 (you) = physical + **integration/reliability lead**.

**Checkpoints:** ★**h4** end-to-end stub (incl. greet-on-approach) · ★**h12** full loop. `main` stays demoable.

---

## Hardware reality — what we actually brought

Pi 5 · keyboard/mouse · **ultrasonic sensor** · **webcam** · mic · wires · (iPad from Builder 1).
**Not brought:** LED ring, thermal printer, speaker, monitor.

What that means:
- **Audio lives on the iPad** (its mic + speaker). The Pi has **no audio jack** (Pi 5 removed it) and we have no speaker.
- **"Lead-quality color" is shown on the iPad screen**, not a physical LED. (Also: **Pi 5 broke the old NeoPixel libraries** via the new RP1 chip — don't count on `rpi_ws281x` even if we grab a strip.)
- **Badge is a QR on screen** — no printer needed.
- **The Pi's whole job = presence sensing + posting it to Convex.** Small but it's the "physical booth" wow (it senses you and greets you). Because hardware is light, **you're also the integration + reliability lead** (the most important role on demo day).

---

## Your role

You own **the physical node and making the whole thing not break.**

### What you own
- **Pi 5 setup** (headless, on our hotspot, SSH/kbd-mouse for setup).
- **Presence sensing** → ultrasonic (preferred, if we have resistors) **or** webcam person-detection (zero-wiring fallback).
- **`bridge.py`** — posts `presence` events to Convex; polls `hwCommands` (for any future actuator).
- **Physical build** — a stand/enclosure for the iPad + Pi from whatever we have (cardboard/foamcore is fine).
- **Integration owner + demo-reliability lead** — own the hotspot, seed data with B2, the runbook, the pre-demo checklist, and the backup video.

### Definition of done
The booth senses someone approaching and greets them, and the full demo runs reliably on our own hotspot with a tested fallback (and a recorded backup video).

---

## Interfaces (your seams)

| You do | Mechanism |
|---|---|
| Post "someone approached" | `POST {CONVEX_HTTP}/hw/presence {deviceId, event:"approach"}` (B2 provides the endpoint) |
| (Future) drive an actuator | poll `GET /hw/poll` → execute → `POST /hw/ack` |
| Consumer of your presence | Builder 1's iPad subscribes to the `presence` query and greets |

**Mock while B2 builds the endpoint:** hit a temporary endpoint or write directly to the `presence` table from a script to prove the iPad greets.

---

## Presence sensing — two paths

**Path A — Ultrasonic (HC-SR04), the "it sensed me" wow:**
- TRIG → a Pi GPIO out; ECHO → **through a voltage divider** to a Pi GPIO in.
- ⚠️ **ECHO is 5V; Pi GPIO is 3.3V. Wire a divider (≈1kΩ + 2kΩ) or you can fry the pin.** Need 2 resistors — check the kit. No resistors → use Path B.
- Code: `gpiozero.DistanceSensor(echo=…, trigger=…)`; trigger "approach" when distance < ~1m, **debounced ~3s**.

**Path B — Webcam presence (zero wiring risk):**
- OpenCV person/face detection (or MediaPipe) on the Pi webcam → "approach" when a person is in frame.
- No frames stored, no identity — presence only.

Recommend: try Path A for the cool factor; if resistors are missing or it's flaky by h3, switch to Path B. Don't burn more than ~2h here.

---

## Task list
- [ ] Image Pi 5, put it on **our hotspot** (not venue WiFi), enable SSH.
- [ ] Wire ultrasonic **with divider** (or set up webcam presence).
- [ ] `bridge.py`: read sensor → debounce → `POST /hw/presence`. Run as a `systemd` service that waits for network.
- [ ] Confirm Builder 1's iPad greets on approach (end-to-end).
- [ ] Build the physical stand for iPad + Pi + sensor (cable management, sensor aimed at the approach zone).
- [ ] **Own the hotspot**: get iPad + Pi + dashboard laptop all on it.
- [ ] With B2: seed 2–3 **golden sessions** for fallback.
- [ ] Write the **demo runbook** + the pre-demo checklist.
- [ ] Record a **backup video** of a flawless run.

## Your hour-by-hour
- **h0–2:** Pi imaged + on hotspot; ultrasonic reading distance (or webcam presence); `presence`→Convex.
- **h2–4:** bridge posts presence; iPad greets. → **★h4 stub demo (with greet)**.
- **h4–8:** build the stand/enclosure; help Builder 1 with audio reliability.
- **h8–12:** integration pass; own-hotspot end-to-end test; **start the backup video**. → **★h12**.
- **h12–17:** reliability hardening, spares, finalize runbook + checklist.
- **h17→judging:** set up booth, pre-warm, dry-run the runbook, charge iPad + Pi.

## Gotchas (yours)
- **HC-SR04 ECHO 5V → divider before the Pi GPIO.** This is the one that quietly kills a pin.
- **Venue WiFi is the #1 demo killer — run everything on our own hotspot.** Pre-join the SSID on the Pi so it auto-reconnects on boot.
- **Debounce presence** (~3s) so one person doesn't fire 20 greetings.
- Make `/hw` calls **idempotent** (command ids) so a bridge restart doesn't double-fire.
- Pi 5: no audio jack, NeoPixel libs unreliable — don't plan around either.
- Keep your hardware scope small on purpose; your highest-value job is **integration + reliability**, not gadgets.

## Pre-demo checklist (you run this 5 min before)
- [ ] iPad in Guided Access, on our hotspot
- [ ] Pi bridge running; walk-up fires a greet
- [ ] Dashboard live on the second screen
- [ ] OpenAI / ElevenLabs / fiber pre-warmed (one throwaway run)
- [ ] Golden sessions loaded
- [ ] Backup video queued
- [ ] Repo public; talk track names all sponsors

## Demo-day role
You're **mission control**: own the setup, the hotspot, and the fallback. If anything wobbles, you're the one who calmly switches to the golden session or the backup video. You also do the physical "watch — it greets me when I walk up" beat.

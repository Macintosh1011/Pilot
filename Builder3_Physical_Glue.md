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
- **Pi 5 = on-device engagement engine (you).** Local face/engagement model → greet + keep the visitor engaged. No screen on the Pi.
- **Convex = the spine (Builder 2 owns it).** Everyone reads/writes Convex; the iPad and Pi never talk directly.

**THE key design rule:** the demo is **shared state, not browser automation** (`demoState` in Convex). Good to know; not your area.

**Team map:** B1 = front of house · B2 = brain · B3 (you) = physical + **integration/reliability lead**.

**Checkpoints:** ★**h4** end-to-end stub (incl. greet-on-approach) · ★**h12** full loop. `main` stays demoable.

---

## Hardware reality — what we actually brought

Pi 5 · keyboard/mouse · **webcam** · mic · wires · (iPad from Builder 1). *(We also have an ultrasonic sensor on hand but are NOT using it — the webcam + local model handle face detection & engagement.)*
**Not brought:** LED ring, thermal printer, speaker, monitor.

What that means:
- **Audio lives on the iPad** (its mic + speaker). The Pi has **no audio jack** (Pi 5 removed it) and we have no speaker.
- **"Lead-quality color" is shown on the iPad screen**, not a physical LED. (Also: **Pi 5 broke the old NeoPixel libraries** via the new RP1 chip — don't count on `rpi_ws281x` even if we grab a strip.)
- **Badge is a QR on screen** — no printer needed.
- **The Pi's job = run a local face/engagement model on-device and stream engagement signals to Convex.** This is a real **edge-AI node** — the booth's "eyes." It senses presence AND how engaged the visitor is, so the AI can greet them, re-hook them when they drift, and wrap up when they leave. You're **also the integration + reliability lead** (the most important role on demo day).

---

## Your role

You own **the physical node and making the whole thing not break.**

### What you own
- **Pi 5 setup** (headless, on our hotspot, SSH/kbd-mouse for setup).
- **The local engagement model** → a face/engagement model running **on the Pi** (MediaPipe Face Landmarker: face detection + head pose/gaze + expression). Emits presence + attention + engagement state.
- **`bridge.py`** — runs the model on the webcam feed → posts `engagement` signals to Convex.
- **Physical build** — a stand/enclosure for the iPad + Pi + webcam from whatever we have (cardboard/foamcore is fine).
- **Integration owner + demo-reliability lead** — own the hotspot, seed data with B2, the runbook, the pre-demo checklist, and the backup video.

### Definition of done
The Pi detects a person and their attention/engagement **on-device** and streams it live; the iPad greets on approach, re-hooks a wavering visitor, and wraps up when they leave — and the full demo runs reliably on our hotspot with a tested fallback (and a recorded backup video).

---

## Interfaces (your seams)

| You do | Mechanism |
|---|---|
| Stream engagement | `POST {CONVEX_HTTP}/hw/engagement {deviceId, event, attention, state, expression, faceCount, dwellMs}` — `event` = approach \| update \| leave (B2 provides the endpoint) |
| Consumers | Builder 1's iPad subscribes to the `engagement` query (greet/re-hook/wrap); Builder 2 folds it into the confidence score + a dashboard readout |

**Mock while B2 builds the endpoint:** write rows directly into the `engagement` table from a script to prove the iPad greets and re-hooks.

---

## The local engagement model (the Pi's brain)

Run a **local vision model on the Pi** over the webcam feed — no GPIO, no wiring, no cloud. Everything is on-device; no frames are stored or sent, only the derived signals.

**Model:** **MediaPipe Face Landmarker** is the sweet spot on a Pi 5 — one model gives you:
- **face detection** → presence + `faceCount` (solo vs group),
- **head pose / gaze** → `attention` (are they looking at the booth/screen?),
- **expression blendshapes** → `expression` (interested / confused / neutral).
Fallbacks: OpenCV DNN face detector + a simple gaze heuristic. Optional accelerator: the **Raspberry Pi AI Kit (Hailo-8L)** if you can get one.

**Derive an engagement `state`:** combine attention + expression + dwell into `engaged | wavering | disengaged`.

**Logic (in `bridge.py`):**
- `approach` when a face appears (debounced ~3s; tune the zone/face-size so aisle passersby don't trigger it).
- periodic `update`s (~1–2s) with `attention` / `state` / `expression` / `faceCount` / `dwellMs`.
- `leave` when the face is gone ~5s.
- **Build the model first, signals second:** get face-presence → `approach`/`leave` working at h0–2 (that alone powers the greet); layer in gaze/expression/state after. Keep it real-time (~10+ fps); downscale frames if needed.

---

## Task list
- [ ] Image Pi 5, put it on **our hotspot** (not venue WiFi), enable SSH.
- [ ] Plug in the USB webcam; get the **local model (MediaPipe Face Landmarker)** running on the Pi at ~10+ fps.
- [ ] `bridge.py`: model → derive `approach`/`update`/`leave` + attention/state/expression → debounce → `POST /hw/engagement`. Run as a `systemd` service that waits for network.
- [ ] Confirm Builder 1's iPad greets on approach AND re-hooks when `state` drops (end-to-end).
- [ ] Build the physical stand for iPad + Pi + webcam (cable management, webcam aimed at the approach zone).
- [ ] **Own the hotspot**: get iPad + Pi + dashboard laptop all on it.
- [ ] With B2: seed 2–3 **golden sessions** for fallback.
- [ ] Write the **demo runbook** + the pre-demo checklist.
- [ ] Record a **backup video** of a flawless run.

## Your hour-by-hour
- **h0–2:** Pi imaged + on hotspot; local model running, face presence → `approach`/`leave` → `engagement`→Convex.
- **h2–4:** iPad greets on approach. → **★h4 stub demo (with greet)**.
- **h4–8:** layer in attention/gaze + expression + `state`; tune the zone; build the stand; help B1 with audio reliability.
- **h8–12:** integration pass; own-hotspot end-to-end test; **start the backup video**. → **★h12**.
- **h12–17:** reliability hardening, spares, finalize runbook + checklist.
- **h17→judging:** set up booth, pre-warm, dry-run the runbook, charge iPad + Pi.

## Gotchas (yours)
- **Tune the model's detection zone** (face size/position) so aisle passersby don't trigger false greetings; watch out for harsh conference lighting/backlight.
- **Keep it real-time** — downscale frames, cap the model to what runs ~10+ fps on the Pi 5; don't over-reach on expression accuracy.
- **Venue WiFi is the #1 demo killer — run everything on our own hotspot.** Pre-join the SSID on the Pi so it auto-reconnects on boot. (The model runs on-device, so it works even if the network drops.)
- **Debounce `approach`** (~3s) and rate-limit `update`s (~1–2s) so you don't flood Convex or fire 20 greetings.
- **Privacy:** on-device only — no frames stored or sent, just the derived signals. Say this in the pitch; it's a strength.
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

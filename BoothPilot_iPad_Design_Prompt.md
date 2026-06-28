# BoothPilot — iPad App UI Design Prompt

> Paste into v0 / Lovable / Cursor / Figma AI (or hand to a designer). Tune the "Acme Analytics" demo panel to whatever product the booth will demo.

---

**Design the UI for BoothPilot**, a physical AI booth concierge running full-screen on an **iPad in landscape** at a startup conference. A visitor walks up and has a natural **voice conversation** with an AI that researches them, demos a product to their exact use case, and hands them a personalized, shareable badge. Make it high-fidelity, premium, and kiosk-grade.

## Platform & constraints
- iPad, **landscape**, full-screen kiosk — no browser chrome, no status bar.
- Viewed by a **standing person ~0.5–1m away** → large type, high contrast, big touch targets (≥60pt).
- **Voice-first**: the screen *supports* a spoken conversation; it is NOT a chat app and has no keyboard flows.
- One continuous experience with distinct **states** (below), not a multi-page website.

## Brand & visual language
- **Mood:** premium, calm, intelligent, friendly — Linear / Arc / Raycast polish meets a warm concierge. B2B, but delightful.
- **Palette:** deep navy base (`#0B1B2B`, `#12283D`), off-white text (`#F5F8FA`), one vivid accent **teal** (`#1AA17E`) with a brighter glow (`#37E0B0`). Soft gradients and subtle depth, not flat. Dark theme.
- **Intent glow:** an ambient color field that subtly shifts with engagement (an internal lead-quality signal made *ambient* — never a number shown to the visitor).
- **Type:** clean geometric/grotesque sans (Inter / General Sans) for UI; a refined display weight for the badge/archetype. Big, confident headlines.
- **Shape & space:** rounded cards (20–28px radius), generous whitespace, soft shadows/glows.
- **Motion:** smooth, organic, alive — never jittery.

## The voice presence ("orb")
A central animated **orb/aura** is the AI's "face" — no literal avatar. Teal glow on navy.
- **Idle:** slow ambient breathing.
- **Listening:** gently reactive to the visitor's voice (subtle ripple/waveform).
- **Speaking:** livelier pulse synced to speech.
- **Thinking/working:** a shimmer while it researches/builds.

## Screens / states (design all five)

1. **Attract / Idle** (no one present): a beautiful ambient screen — orb breathing, big inviting line ("Step up — let's talk about what you're building"), BoothPilot wordmark. Must look alive from across the aisle.
2. **Greeting** (person just detected): warm welcome, the orb wakes, transitions into the conversation. Brief.
3. **Conversation + Live Demo** (the hero state): a split layout —
   - **Left ~⅓:** the voice orb + an optional **large live caption** of the last line or two (so judges can read along) + a minimal step indicator (**Meet → Understand → Show → Badge**).
   - **Right ~⅔:** the **live product demo panel** ("Acme Analytics") the AI drives — a clean SaaS dashboard mock (a churn / at-risk-accounts view, a chart, an alerts toggle) that **visibly changes** as the conversation progresses, with smooth transitions. This is where the "it's demoing *my* use case" wow lives.
4. **LinkedIn QR scan overlay:** a friendly prompt + a camera viewfinder with a scan frame ("Scan your LinkedIn QR to personalize this"). Clean, reassuring.
5. **Badge reveal** (the finale): a gorgeous, **collectible trading-card-style** badge, centered, with a satisfying reveal animation. Contains:
   - an **archetype** title (e.g., "The Churn Slayer") in display type,
   - a short **witty compliment** line,
   - 2–3 **stat bars** (e.g., Growth IQ 94 · Vision 91) animating upward, playful and game-like,
   - a **discount code** chip,
   - a **QR code** ("take your badge / share it") + a **Share** button.
   - Holographic / iridescent accents, premium feel — this is the screenshot people post.

## Details
- Subtle BoothPilot wordmark throughout; an unobtrusive "Powered by OpenAI · Convex · fiber.ai · ElevenLabs" strip.
- High contrast, large legible type, smooth (not seizure-inducing) motion.
- **No forms, no dense text** — let visuals and voice carry the experience.

## Deliverable
High-fidelity mockups (or a coded prototype) for all five states, plus the orb's idle/listening/speaking variants and the badge card. Make the **Conversation + Live Demo split** the hero shot. Frame everything as a **landscape iPad** kiosk.

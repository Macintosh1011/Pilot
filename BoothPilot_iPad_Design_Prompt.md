# BoothPilot — iPad App UI Design Prompt (Anthropic editorial style)

> Paste into v0 / Lovable / Cursor / Figma AI (or hand to a designer). Visual direction: Anthropic's brand — warm paper, clay accent, Anthropic Serif, hand-drawn spark, and **animated "typed" text**. Tune the "Acme Analytics" demo panel to whatever product the booth will demo.

---

**Design the UI for BoothPilot**, a physical AI booth concierge running full-screen on an **iPad in landscape** at a startup conference. A visitor walks up and has a natural **voice conversation** with an AI that researches them, demos a product to their exact use case, and hands them a personalized, shareable badge. The whole thing should feel like a calm, premium, **editorial** experience — think the Anthropic "Meet Claude" homepage brought to life and made conversational.

## Platform & constraints
- iPad, **landscape**, full-screen kiosk — no browser chrome, no status bar.
- Viewed by a **standing person ~0.5–1m away** → large type, high contrast, big touch targets (≥60pt).
- **Voice-first**: the screen *supports* a spoken conversation; it is NOT a chat app and has no keyboard flows.
- One continuous experience with distinct **states** (below), not a multi-page website.

## Visual language — Anthropic editorial
- **Mood:** warm, literary, human, unhurried. Lots of whitespace. Feels hand-crafted, not "techy." Premium but friendly.
- **Background:** warm paper/ivory `#FAF9F5` (panels slightly deeper `#F0EEE6`). A very subtle **paper grain** texture.
- **Ink (text):** near-black warm `#141413`; secondary/muted `#6B6B63`.
- **Accent — Clay/terracotta:** `#CC785C` primary, softer tan `#D4A27F`, deeper rust `#B05730` for depth. Use sparingly, like ink-on-paper highlights — for the spark, the cursor, key words, the badge.
- **No dark theme, no neon, no glassmorphism.** Flat, printed, confident.

## Type
- **Anthropic Serif** for everything that matters — big display headlines AND body copy (like the reference, where even the paragraph is serif). Fallbacks: `Tiempos`, `Georgia`, transitional serif.
- A small, restrained **grotesque/mono** only for micro-labels, nav, and the wordmark (letter-spaced, uppercase, small) — e.g. the BoothPilot wordmark styled like `BOOTHP\LOT` in the same spirit as `ANTHROP\C`.
- Headlines are large, tight, elegant. Body is generous and readable.

## Signature interaction — ANIMATED "TYPED" TEXT (the whole point)
Text **types itself out**, character by character, like it's being written live — this is the defining motion of the app.
- ~30–50ms per character with slight natural randomization; occasional brief "thinking" pause mid-sentence.
- A **blinking cursor** (a clay-colored vertical bar or block) trails the text and rests at the end.
- When the AI **speaks** (TTS), its captions **type in sync** with the voice.
- Headlines on the attract/greeting states type out, then settle.
- Key words can finish in **clay** for emphasis. Lines wrap gracefully; no layout jump.
- Keep it smooth and legible — typing is elegant, never frantic.

## The AI presence — the hand-drawn "spark"
Instead of a glowing orb, the AI is represented by Anthropic's **hand-drawn starburst / spark** (single-weight line drawing, slightly imperfect, like the reference illustration), in ink or clay on paper.
- **Idle:** slow, gentle rotation / soft breathing.
- **Listening:** the rays subtly flex/ripple to the visitor's voice.
- **Speaking:** a livelier shimmer/pulse, synced to the typed captions.
- **Thinking/working:** the spark "draws itself" stroke by stroke.

## Illustration & texture
- Hand-drawn, single-weight line art; **cut-paper** geometric shapes in clay (echo the reference's cut-out head). Organic, slightly imperfect edges. Subtle grain overlay. Minimal, editorial, warm.

## Screens / states (design all five)
1. **Attract / Idle** (no one present): a serene paper page. The spark gently turning; a large serif line **types out** ("Tell me what you're building." → blinking cursor), the `BOOTHP\LOT` wordmark, a subtle clay cut-paper shape. Looks like a beautiful printed poster that's quietly alive.
2. **Greeting** (person just detected): the headline retypes into a warm welcome; the spark wakes; smooth transition into the conversation.
3. **Conversation + Live Demo** (the hero state): editorial split layout —
   - **Left ~⅖:** the hand-drawn spark + the AI's **typed caption** (large serif, last line or two, cursor blinking) + a quiet step indicator set in small caps (**MEET · UNDERSTAND · SHOW · BADGE**), the current step in clay.
   - **Right ~⅗:** the **live product demo panel** ("Acme Analytics") the AI drives — a clean, paper-toned SaaS mock (a churn / at-risk-accounts view, a simple chart, an alerts toggle) that **visibly changes** as the conversation progresses, with calm transitions. Keep it on-brand (cream, ink, clay), not a generic dark dashboard.
4. **LinkedIn QR scan overlay:** a friendly typed prompt ("Scan your LinkedIn QR — I'll personalize this.") over a tasteful viewfinder with a clay scan frame. Reassuring, minimal.
5. **Badge reveal** (the finale): a gorgeous **editorial collectible card** — like a letterpress bookplate, not a holographic gamer card. Cream stock, ink + clay, the hand-drawn spark. Contents **type/reveal** in sequence:
   - an **archetype** title in big Anthropic Serif (e.g., "The Churn Slayer"),
   - a short **witty compliment** line (types out),
   - 2–3 **stat bars** drawn in a hand-inked style animating up (e.g., Growth IQ 94 · Vision 91),
   - a **discount code** set in mono,
   - a **QR code** + a **Share** button (ink-filled pill).
   - Tasteful, screenshot-worthy, unmistakably Anthropic-flavored.

## Buttons & components
- Primary CTA: **ink-filled pill** (`#141413`, cream text). Secondary: **outlined pill** (ink border, transparent). Rounded, generous padding — like the reference's "Try Claude" / "Get API Access".
- Nav/labels: small uppercase letter-spaced grotesque.

## Details
- Subtle `BOOTHP\LOT` wordmark; an unobtrusive small-caps "POWERED BY OPENAI · CONVEX · FIBER.AI · ELEVENLABS" line.
- High contrast (ink on paper), large legible serif, smooth motion.
- **No forms, no dense text** — let the typing, the spark, and the voice carry it.

## Deliverable
High-fidelity mockups (or a coded prototype) for all five states, plus the spark in idle/listening/speaking variants and the badge card. Show the **Conversation + Live Demo split** as the hero. Demonstrate the **typed-text animation** and the hand-drawn spark. Frame everything as a **landscape iPad** kiosk in the Anthropic palette with Anthropic Serif.

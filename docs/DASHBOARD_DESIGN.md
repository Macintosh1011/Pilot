# BoothPilot — DASHBOARD DESIGN (implementation spec for the GPT-5.5 dashboard coder)

> **Owner:** Builder 2 (The Brain). **Reader:** the dashboard implementer.
> This is the **second screen** the team narrates to judges while a visitor talks to the booth — it must feel alive and prove "it's not one GPT call." Build it polished.
> **Stack:** Next.js (App Router) in `dashboard/` + the Convex React client (`convex/react`). Read every value from Convex reactively — never poll, never cache.
> Function names/shapes: see `INTERFACES.md` (single source of truth). Field names: `convex/schema.ts`. Content/badge/score semantics: `docs/BRAIN_DESIGN.md`.

---

## 0. Setup

```
dashboard/
  app/
    layout.tsx                       # dark theme shell, fonts
    providers.tsx                    # ConvexProvider (NEXT_PUBLIC_CONVEX_URL)
    page.tsx                         # "/" the live CRM dashboard (§1)
    review/page.tsx                  # "/review" the review queue (§3)
    badge/[sessionId]/page.tsx       # public collectible badge page (§4)
    badge/[sessionId]/opengraph-image.tsx  # dynamic OG via next/og (§4)
  components/
    CardGrid.tsx  LeadCard.tsx  Timeline.tsx  ReviewItem.tsx
    ConfidenceMeter.tsx  FiberPanel.tsx  UrgencyChip.tsx  BadgeChip.tsx
  lib/convex.ts
```
- `ConvexProvider` wraps the app; `NEXT_PUBLIC_CONVEX_URL` = the deployment's `.convex.cloud` URL. The dashboard uses **only public queries/mutations/actions** (no `internal.*`).
- Use `useQuery(api.sessions.list)` etc. (reactive). Mutations via `useMutation`, the gated send via `useAction(api.email.send)`.
- This is read-only company data on a trusted screen — no auth needed for the hackathon.

---

## 1. `/` — Live CRM dashboard (the hero screen)

**Data:** `useQuery(api.sessions.list)` → `Session[]` already sorted by confidence desc (then newest). Render a responsive grid of `LeadCard`s. A header strip shows live totals (count of cards, count `status:"done"`, count in review).

Each **`LeadCard`** renders, top to bottom:
1. **Identity** — `visitorName` · `role` · `company`. Small `status` pill (`active`/`enriching`/`demoing`/`finalizing`/`done`) with a subtle pulse while not `done`.
2. **Fiber panel** (`FiberPanel`, from `session.fiber`) — company line (`industry` · `employeeCount` emp · `funding` · `location`), person line (`title`, `headline`), and a **match flag** from `session.fiberMatch`:
   - `verified` → green check "Verified".
   - `mismatch` → amber warning "Self-report ≠ fiber" + a one-line "claimed X, found Y" (derive from the mismatch). **This is a judge moment — make it visible, not buried.**
   - `none` → grey "No match".
   - If `fiber.source === "fallback"`, show a tiny "demo data" tag so you're honest on stage.
3. **Problems / use case** — `useCase` as a sentence; `problems[]` as chips.
4. **Urgency** (`UrgencyChip`) — `urgency` colored (low grey / medium amber / high red) with `urgencyEvidence` as an italic quote on hover/below.
5. **Confidence** (`ConfidenceMeter`) — big `confidence` 0–100 with a bar; list `confidenceReasons` beneath. (The reasons encode the factor breakdown, e.g. "ICP fit 28/30: …".) Label it clearly **internal-only** so no one thinks it's shown to visitors.
6. **Demo shown** — `demoShown[]` as small view chips (churn/alerts/…).
7. **Badge** (`BadgeChip`) — `badge.archetype` + `badge.discountCode`; links to `/badge/[sessionId]`.
8. **Follow-up status** — `reviewStatus` pill; if `pending`/`edited`, a "Review →" link to `/review`.

**Selected card → live timeline.** Clicking a card opens a side panel (or expands it) showing the **agent timeline** for that session: `useQuery(api.events.bySession, { sessionId })` → `AgentEvent[]` in order. Render each as a row: step icon (`identify/enrich/needs/demo/score/badge/email/hw`), `label`, `detail`, and `ms` as a duration badge. New rows animate in as they arrive (Convex reactivity makes this automatic). This is the "agent thinking" artifact — the centerpiece of the narration. Keep an always-mounted timeline for the most-recent active session so something is always moving on screen during a live walkup.

**Empty state:** if `list` is empty, show a tasteful "Waiting for the next visitor…" with the seed instructions hint. (In practice the golden seeds keep it populated.)

---

## 2. Sorting, live behavior, polish
- The list is pre-sorted server-side; don't re-sort client-side (keeps cards from jumping mid-narration except when a real score lands — which is a *good* jump to show).
- Subtle entrance animation for new cards; a gentle highlight when a card's `confidence` first appears.
- Numbers (confidence, stats) count up on first paint.
- Everything is reactive: as `finalize` runs during a live demo, the judge watches the card fill in (fiber → needs → score → badge → email) without a refresh.

---

## 3. `/review` — The review queue (human-in-the-loop send)

**Data:** `useQuery(api.sessions.reviewQueue)` → only cards with an `emailDraft` and `reviewStatus ∈ {pending, edited}`, confidence desc.

Each **`ReviewItem`** shows: visitor identity + company, confidence + urgency (context for the reviewer), and the draft:
- **Subject** (editable input) + **Body** (editable textarea), prefilled from `session.emailDraft`.
- **To:** `session.email` (show it; if missing, disable Send and show "no contact email").
- Buttons:
  - **Approve** → `useMutation(api.email.approve)({ sessionId })` → status becomes `approved`.
  - **Save edits** → `useMutation(api.email.edit)({ sessionId, subject, body })` → status `edited`.
  - **Discard** → `useMutation(api.email.discard)({ sessionId })` → status `discarded` (item leaves the queue).
  - **Send** → `useAction(api.email.send)({ sessionId })`. **Disabled unless `reviewStatus ∈ {approved, edited}` and `session.email` present.** On success the item shows "Sent ✓" with `sentAt`; on `{ok:false}` show the returned `error`.
- **Hard rule, surfaced in the UI:** nothing sends without a human clicking Approve (or Save edits) then Send. Put a small "No emails are ever sent automatically" note at the top of the queue. (`finalize` only ever writes `pending`.)

**Lifecycle reference (mirror BRAIN_DESIGN §6.2):** `pending → approved|edited → sent`, or `→ discarded`. Reflect each state with a colored pill and disable buttons that don't apply.

---

## 4. `/badge/[sessionId]` — public collectible badge page + OG image

**Data:** `useQuery(api.sessions.get, { sessionId })`; render from `session.badge`. (No auth — it's meant to be shared.)

**Page (`badge/[sessionId]/page.tsx`):** a collectible-style card:
- Big `archetype` title + `tagline`.
- The grounded `compliment` as a featured quote.
- `badge.stats[]` as animated bars (label + value/100, value counts up). These are the flattering public mirror of the score — never show `confidence` here.
- `discountCode` in a copyable pill ("ACME-CW-7Q2X · 25% off").
- Visitor name/company (from `session`) for the personalized feel.
- A **Share** action (LinkedIn / X intent URLs pointing at this page URL). Optional soft CTA "see what the booth says about your teammates" — **inert in baseline** (the viral loop isn't built; don't wire `referrerSessionId`).
- Graceful state if `badge` is undefined yet (e.g. finalize still running): a "Your badge is being minted…" shimmer.

**Dynamic OG image (`badge/[sessionId]/opengraph-image.tsx`):** use Next.js built-in `next/og` `ImageResponse` (no extra dep). It runs server-side; fetch the badge data from Convex with the **HTTP query** form so shares (LinkedIn/X crawlers) render a rich card:
```tsx
import { ImageResponse } from "next/og";
export const runtime = "edge";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function OG({ params }: { params: { sessionId: string } }) {
  // Convex HTTP query endpoint: POST https://<deployment>.convex.cloud/api/query
  // body: { path: "sessions:get", args: { sessionId }, format: "json" }
  const res = await fetch(`${process.env.NEXT_PUBLIC_CONVEX_URL}/api/query`, {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ path: "sessions:get", args: { sessionId: params.sessionId }, format: "json" }),
    cache: "no-store",
  });
  const { value: session } = await res.json();
  const b = session?.badge;
  return new ImageResponse(
    ( /* dark card: archetype, tagline, top stat, "BoothPilot · Acme Analytics" footer */ <div>…</div> ),
    size,
  );
}
```
- Set page `metadata` (or `generateMetadata`) so `og:image` resolves to this route and `og:title`/`og:description` use the archetype + tagline.
- **`badge.ogImageId` stays unused in baseline.** It exists for a stretch where the image is pre-rendered to Convex file storage; the baseline renders on demand via `next/og`. Clarify this in code comments so nobody wires file storage by mistake. If you later want the pre-stored path, B2 fills `ogImageId` from `internal.badge.renderOg` and the page can prefer it when present.

---

## 5. Which Convex functions each view consumes (cross-ref INTERFACES)

| View / component | Convex function | Type |
|---|---|---|
| `/` card grid | `api.sessions.list` | query |
| `/` timeline panel | `api.events.bySession` | query |
| `/` card badge link target | `api.sessions.get` | query (on badge page) |
| `/review` list | `api.sessions.reviewQueue` | query |
| `/review` Approve | `api.email.approve` | mutation |
| `/review` Save edits | `api.email.edit` | mutation |
| `/review` Discard | `api.email.discard` | mutation |
| `/review` Send | `api.email.send` | action (gated) |
| `/badge/[sessionId]` | `api.sessions.get` | query |
| OG image route | `sessions:get` via Convex HTTP `/api/query` | query (server fetch) |

The dashboard does **not** call `sessions.create`, `messages.add`, `demoState.*`, `fiber.lookupVisitor`, or `finalize` — those are B1/agent paths. (Optional: a hidden dev-only "Run finalize" / "Reseed" button can call `api.finalize.finalize` / a seed function to rehearse the live fill-in — keep it out of the demo view.)

---

## 6. Visual direction (clean, modern, dark)

- **Theme:** near-black canvas (`#0B0D12`), elevated card surfaces (`#141821`), hairline borders (`rgba(255,255,255,0.06)`). One electric accent (e.g. violet→cyan gradient `#7C5CFF`→`#22D3EE`) used sparingly for confidence/active states. Generous spacing, large readable type (Inter / Geist), tabular numerals for scores.
- **Semantic colors:** urgency low `#64748B`, medium `#F59E0B`, high `#EF4444`; verified `#22C55E`, mismatch `#F59E0B`, none `#64748B`; sent `#22C55E`.
- **Confidence meter:** gradient-filled bar + big tabular number; segmented ticks at 25/50/75 so the rubric weighting reads visually.
- **Timeline:** vertical rail with step glyphs, monospace `ms` badges, newest pulses in. This is the screen you keep visible while narrating — make it the most alive element.
- **Motion:** quick, subtle (150–250ms), spring on card/timeline entrance, count-up on numbers. Nothing that distracts from a live walkup.
- **Density:** the dashboard is read from across a table on a big screen — favor 2–3 columns of cards at 1080p+, big fonts, high contrast. The badge page is read on a phone — single column, thumb-friendly, screenshot-worthy.
- **Honesty tags:** tiny "demo data" / "internal only" labels where relevant (fallback fiber, confidence) — these read as *rigor* to growth judges, not weakness.

---

## 7. Build order
1. Convex provider + `/` reading `sessions.list` against the **golden seeds** (BRAIN_DESIGN §8) — instant populated dashboard.
2. `LeadCard` (identity → fiber+match → problems → urgency → confidence+reasons → demo → badge).
3. Timeline panel (`events.bySession`) — the narration centerpiece.
4. `/review` queue with approve/edit/discard + gated send.
5. `/badge/[sessionId]` page, then its `opengraph-image.tsx`.
6. Visual polish pass (motion, count-ups, dark theme tuning).

Keep `main` demoable: every screen must render correctly off the seed data with no live pipeline running.

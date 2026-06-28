# BoothPilot Dashboard — Design Tokens

Reference for page agents. Everything here is already live in `app/globals.css` and `app/layout.tsx`.

---

## CSS Custom Properties

| Variable         | Hex / Value                  | Use when                                               |
|------------------|------------------------------|--------------------------------------------------------|
| `--paper`        | `#FAF9F5`                    | Page background, input backgrounds                     |
| `--panel`        | `#F0EEE6`                    | Inset sub-panels, timeline rows, nested sections       |
| `--panel2`       | `#F4F2EA`                    | Shimmer midpoint, secondary panel backgrounds          |
| `--card`         | `#FCFBF7`                    | Top-level cards, hero header, lead cards               |
| `--chip`         | `#E7E3D8`                    | Pill/chip fills, skeleton shimmer, code backgrounds    |
| `--ink`          | `#141413`                    | Body text, headings, primary buttons                   |
| `--muted`        | `#6B6B63`                    | Secondary text, captions, placeholder labels           |
| `--clay`         | `#CC785C`                    | Primary accent: CTAs, eyebrows, active pills, bars     |
| `--tan`          | `#D4A27F`                    | Warm accent: warnings, medium-urgency states           |
| `--rust`         | `#B05730`                    | High-urgency, destructive actions, hover on clay links |
| `--border`       | `rgba(20,20,19,0.12)`        | Default border on all surfaces                         |
| `--border-strong`| `rgba(20,20,19,0.28)`        | Prominent borders (badge bookplate inner rule, ghost btn)|
| `--success`      | `#5A7A58`                    | Verified/sent/done states                              |
| `--warning`      | `#C49A6C`                    | Pending / medium-urgency text                          |
| `--danger`       | `#B05730`                    | High-urgency text (same as `--rust`)                   |
| `--font-serif`   | Newsreader (loaded at root)  | Display headings, body copy, badge compliment          |
| `--font-mono`    | JetBrains Mono (loaded)      | Labels, eyebrows, chips, wordmark, metrics, nav        |

---

## Typography

**Newsreader (serif) → `var(--font-serif)`**
- Display headings: `font-size: clamp(3rem, 12vw, 6rem); font-weight: 500; letter-spacing: -0.03em`
- Section h2/h3: `font-weight: 500`
- Body: default, `font-weight: 400`
- Italic emphasis (badge compliment, tagline, blockquote): `font-style: italic`
- Large numbers / metrics: `font-variant-numeric: tabular-nums; font-weight: 500`

**JetBrains Mono → `var(--font-mono)`**
- Eyebrows / section labels: `font-size: 0.74rem; font-weight: 600; letter-spacing: 0.14em; text-transform: uppercase`
- Chips / pills: `font-size: 0.72rem; font-weight: 600; letter-spacing: 0.06em; text-transform: uppercase`
- Nav / top-nav: `font-size: 0.8rem; font-weight: 600; letter-spacing: 0.08em`
- Wordmark: `font-weight: 600; letter-spacing: 0.28em`
- Draft form labels: `font-size: 0.78rem; font-weight: 600; letter-spacing: 0.06em`

---

## Shared Class Names (stable — do not rename)

All classes below are defined in `app/globals.css`. Page agents inherit them by referencing the same class names — do not redefine them in module CSS.

**Shells**
- `.env-shell`, `.badge-page-shell` — full-page centering grid

**Cards / surfaces**
- `.env-card` — config error card (max-width 660px)
- `.badge-card` — badge display card
- `.badge-card.collectible` — collectible variant with clay radial overlay
- `.lead-card` — CRM lead card (hover/selected states built in)
- `.waiting-state`, `.empty-card`, `.skeleton-card`, `.skeleton-block` — loading/empty
- `.shimmer` — animated warm shimmer (apply to any element as loading indicator)

**Layout**
- `.dashboard-shell` — max-width 1680px centered
- `.dashboard-grid` — two-column (leads + side stack), collapses at 1180px
- `.card-grid` — auto-fit lead card grid
- `.side-stack` — right column, stacked panels
- `.hero-header` — flex header with h1 + stats
- `.header-stats` — 3-column mini-stat grid
- `.review-page` — review route shell

**Section containers**
- `.lead-section`, `.timeline-panel`, `.review-panel` — top-level section panels
- `.fiber-panel`, `.use-case`, `.confidence-meter`, `.card-section`, `.review-item` — nested sub-panels (panel background)
- `.review-panel.embedded` — scrollable variant
- `.review-list`, `.timeline-list` — list containers

**Text modifiers**
- `.eyebrow`, `.section-label` — clay mono uppercase label above a heading
- `.muted` — `color: var(--muted)`
- `.tagline`, `.soft-cta` — italic muted body text
- `.warning-copy`, `.success-copy`, `.status-copy`, `.guardrail-copy` — state text
- `.mismatch-copy`, `.fiber-company`, `.fiber-person`, `.to-line` — muted lead detail text
- `.reason-list` — muted reason list inside confidence meter

**Pills / chips**
All pills share: chip background, ink border, mono font, uppercase, letter-spaced.
- `.sync-pill`, `.queue-count`, `.honesty-tag`, `.ms-pill` — generic info pills
- `.live-dot` — clay pulse animation (prepends a dot via ::before)
- `.status-pill` / `.status-pill.done` — active=clay, done=success
- `.review-pill` / `.review-pill.pending` / `.review-pill.sent` — pending=warning, sent=success
- `.urgency-pill.low` / `.urgency-pill.medium` / `.urgency-pill.high` — muted/warning/danger
- `.urgency-box.low/.medium/.high` — left-border urgency block
- `.match-flag.verified` / `.match-flag.mismatch` — success/warning
- `.score-pill` — confidence score pill
- `.problem-chip`, `.view-chip` — content chips inside lead card
- `.badge-chip` — clay-tinted badge link pill
- `.badge-chip.muted-chip` — muted badge pill (minting state)
- `.discount-pill` — clay-tinted discount code row

**Meter / bars**
- `.meter-track` / `.meter-fill` — horizontal meter (fill = clay)
- `.meter-tick.one/.two/.three` — 25/50/75% tick marks
- `.stat-bars` / `.stat-bar` — badge stat bar grid

**Timeline**
- `.timeline-row` — event row (panel bg, rise animation)
- `.step-icon` — clay circle icon in timeline row

**Forms**
- `.draft-form` — email draft form grid
- `.draft-form label`, `.draft-form input`, `.draft-form textarea`
- `.review-actions` — action button row
- `.review-actions button` — ink pill button
- `.review-actions .ghost-button` — bordered ghost button
- `.review-actions .send-button` — clay send button
- `.share-actions a` — ink pill link

**Nav / links**
- `.top-nav` — clay mono back link
- `.review-link` — clay mono inline link (hover → rust)

**Topline / footer rows**
- `.section-heading`, `.review-topline`, `.card-topline`, `.fiber-header`, `.confidence-topline`, `.card-footer`

**Misc**
- `.chip-row` — flex wrap row for chips
- `.orb` — clay/tan floating orb (waiting state)
- `.badge-owner` — owner name/company block

**Animations available**
- `rise` — fade + translateY(10→0), used on lead-card and timeline-row
- `shimmer` — horizontal shimmer sweep
- `pulse` — clay radial pulse (live-dot)
- `float` — gentle up/down float (orb)
- `spark-spin` — 30s linear rotation (Spark component)
- `spark-breathe` — 6.5s scale breathe (Spark component)
- `stat-bar-grow` — scaleX 0→target (StatBar component)

---

## Primitive Components (`app/components/`)

All are server components unless noted.

### `Wordmark`
```tsx
import { Wordmark } from "@/app/components/Wordmark";
<Wordmark size={18} color="var(--ink)" className="..." />
```
Renders `BOOTHP\LOT` in JetBrains Mono, weight 600, letter-spacing 0.28em.

### `PaperBackground`
```tsx
import { PaperBackground } from "@/app/components/PaperBackground";
<PaperBackground />
```
Fixed full-page div (z-index: -1) with clay/tan corner radials. The film grain is already on `html::after` in globals.css — don't double-apply.

### `Spark`
```tsx
import { Spark } from "@/app/components/Spark";
<Spark size={80} color="var(--clay)" className="..." />
```
13-ray starburst SVG. Idles with a slow 30s rotation and gentle breathe. Decorative — aria-hidden.

### `Blob`
```tsx
import { Blob } from "@/app/components/Blob";
<Blob size={160} fill="var(--clay)" className="..." />
```
Organic 8-point quadratic-Bézier blob shape. Decorative — aria-hidden.

### `StatBar`
```tsx
import { StatBar } from "@/app/components/StatBar";
<StatBar label="GROWTH IQ" value="94" pct={0.94} />
```
Mono label + serif value + clay fill bar. Fill animates in via CSS on mount. `pct` is 0–1.

### `Chip`
```tsx
import { Chip } from "@/app/components/Chip";
<Chip variant="clay">Badge minting</Chip>
```
`variant`: `"default"` (chip bg, ink text) | `"clay"` (clay-tinted) | `"ink"` (ink bg, paper text).

### `Panel` / `Card`
```tsx
import { Panel, Card } from "@/app/components/Panel";
<Panel padding="1.5rem">...</Panel>
<Card radius="2rem">...</Card>
```
`Panel` → `--panel` background (inset sections).
`Card` → `--card` background (top-level surfaces).
Both accept `radius`, `padding`, `className`, `style`.

---

## Do not touch

- `app/types.ts` — Convex types, untouched.
- `app/ConvexClientProvider.tsx` — Convex wiring, untouched.
- Any `useQuery`/`useMutation` calls in existing pages.
- `convex/` directory.

Page agents own their route `.tsx` files and may create scoped `.module.css` files alongside them. They must not edit `app/globals.css`.

# BoothPilot — Demo Company Bible: Tessera

> The flagship fake prospect for the BoothPilot demo. This is the lead a booth operator
> clicks into on stage. Everything below is wired into `convex/seed.ts` (run `seed:run`)
> and renders across the dashboard CRM card, the agent timeline, the Booth Badge page,
> and the email review queue. Field shapes mirror `convex/schema.ts` and `INTERFACES.md §0`.

---

## The company

**Tessera** — a real-time double-entry ledger and reconciliation API for fintech and B2B
SaaS teams that move money. Think Modern Treasury / Fragment: developers integrate Tessera
to track balances, transfers, and reconciliation from one source of truth instead of
duct-taping a homegrown ledger onto Postgres.

| Field | Value |
|---|---|
| Niche | Fintech — ledger & reconciliation infrastructure |
| Stage / funding | Series A |
| Employees | 110 |
| Founded | 2021 |
| HQ | Toronto, ON |
| Domain | tessera.dev |
| Tech stack | Go, Postgres, Kafka, Temporal, Segment, Snowflake |

Why it fits Acme's ICP (seed-to-Series-B B2B SaaS, ~10–300 employees, cares about
retention/activation/product metrics): dead-center on stage and size, and Tessera lives or
dies on whether developer customers reach production. The only "interesting fit" asterisk is
that it's money-movement infra rather than a pure PLG product, which is exactly why the
`icpFit` score is 27/30 and not a flat 30.

## The persona

**Priya Raman**, Co-founder & Chief Product Officer. ex-Plaid (fintech-infra pedigree),
54 months in seat, decision-maker. LinkedIn: `/in/priya-raman-product`. She's at the
conference scouting for a way to fix Tessera's activation problem before their Series B
raise — she owns the product *and* the activation number, so she's both the buyer and the
person who feels the pain. That combination is what drives `authority` to 14/15.

## The problem (their words)

Tessera's North Star is "customer reaches first production reconciliation." Three pains,
each mapping cleanly to one Acme demo view:

1. **Activation cliff → `churn` view (activation cohorts).** Half their signups build a
   sandbox ledger and never push a real dollar through in production. They can't see the
   cohort drop-off clearly.
2. **Silent volume drop → `alerts` view.** When a live account's transaction volume falls
   off (a sign it's migrating away or hit a bug), nobody flags it until the QBR.
3. **Analyst bottleneck → `query-result` view.** PMs and solutions engineers wait on one
   data analyst to answer "how many accounts reached production this month?"

`urgency: "high"`, evidenced verbatim by: *"Half our signups build a sandbox ledger and
never go live, and we don't catch it until the quarterly review."*

## The conversation arc (the 60-second booth chat)

The seeded transcript (14 turns) is the ground truth scoring, the badge, and the email all
read from:

1. Concierge greets, asks who she is.
2. **Priya:** co-founder & CPO at Tessera, real-time ledger + reconciliation API for fintechs.
3. Concierge reframes: getting customers live in production is the whole game.
4. **Priya** names the pain: *"Half our signups build a sandbox ledger and never go live..."*
5. Concierge: "the activation cliff" → shows the **churn** view (activation cohorts).
6. **Priya** asks which accounts stalled this month.
7. Concierge → **alerts** view, warns before the QBR.
8. **Priya:** *"A customer goes quiet, transaction volume drops, and nobody flags it until renewal."*
9. Concierge asks about self-serve → **query-result** view.
10. **Priya:** PMs wait on one analyst; wants to ask "how many hit production this month" directly.
11. Concierge asks where she is in evaluating.
12. **Priya:** *"We've got budget approved and I want something live this quarter, before our Series B raise."*
13. Concierge captures email, promises sandbox + Booth Badge.
14. **Priya** gives `priya@tessera.dev`.

## Why she scores 91

`confidence` = sum of the five factors (the dashboard encodes the breakdown in
`confidenceReasons`):

| Factor | Score | Grounding |
|---|---|---|
| icpFit | 27/30 | Series A fintech infra, ~110 emp — dead-center; money-movement adjacency is the only asterisk. |
| intent | 23/25 | Budget approved, wants it live this quarter ahead of the Series B raise. |
| engagement | 18/20 | Long, substantive chat; multiple sharp follow-ups on cohorts, alerts, and self-serve. |
| authority | 14/15 | Co-founder and CPO — owns the product and the activation number outright. |
| demoDepth | 9/10 | Three views pulled: activation cohorts, real-time alerts, self-serve query. |
| **confidence** | **91** | New hero card (tops Maya/Northwind's 87). |

`bestAngle`: *"Lead with the sandbox-to-production activation cohort board and real-time
volume-drop alerts; she's a co-founder with budget and a Series B clock."*

## The badge

**The Activation Architect** — *"Builds the aha-moment on purpose."* (Archetype #3 of the 15
in `BRAIN_DESIGN.md §4.1`.) For a fintech-infra company the aha-moment is literally "first
reconciled transaction in production," which makes the archetype land.

- **Compliment (grounded, quotes her real line):** *"Anyone who can say 'half our signups
  build a sandbox ledger and never go live' without flinching has already diagnosed the
  activation cliff — Acme just hands you the map to the edge of it."*
- **Stats:** Activation IQ 93 · Aha Velocity 95 · Cohort Clarity 88 (public, flattering
  mirror of the score; floored ≥72).
- **Discount code:** `ACME-AA-9R4T` (format `ACME-<tag>-<4char>`; AA = Activation Architect).

## The follow-up email (review queue, `reviewStatus: "pending"`)

**Subject:** Sandbox-to-production activation for Tessera — quick follow-up from the booth

Warm, founder-to-operator, ~125 words. References the activation cohort board (churn view),
the volume-drop alerts, and the plain-English query ("how many hit production this month"),
quotes her own framing ("sandbox ledger and never go live," "quarterly review," "Series B"),
offers one soft next step (a seeded sandbox), drops `ACME-AA-9R4T` once, signs off
*"— The Acme Analytics team."* It sits in the review queue pending a human approve/send —
nothing auto-sends.

## The agent timeline

14 `events` rows tell the story end to end: identify → enrich (Found Tessera · match
verified · 2 credits) → needs → demo (churn → alerts → query-result) → score (Confidence 91,
factor breakdown in `detail`) → badge (The Activation Architect · ACME-AA-9R4T) → email
(Draft ready for review). Start/done pairs carry `ms` durations so the timeline reads like a
live pipeline, not one GPT call.

## The supporting live card

**Marcus Bell**, Head of Product at **Driftwood** (Seed-stage spend-management fintech,
Denver, 65 emp). Seeded `status: "demoing"` — identified, enriched, needs scoped, one
`alerts` view shown, **no score/badge/email yet**. Pain: trial teams sign up but never invite
their finance lead or connect a card (activation stalls). This is the live/non-final card so
the dashboard's in-progress state is also demoable next to the finished Tessera card.

## How to run it

```bash
npx convex run seed:run            # idempotent clear-then-insert; loads all goldens + Tessera + Marcus
npx convex run sessions:list '{}'  # Tessera (conf 91) sorts first
```

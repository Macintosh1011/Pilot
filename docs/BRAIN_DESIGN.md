# BoothPilot — BRAIN DESIGN (implementation spec for the GPT-5.5 backend coder)

> **Owner:** Builder 2 (The Brain). **Reader:** the backend implementer.
> Implement this **verbatim**. All field names mirror `convex/schema.ts` exactly. Public seams are locked in `INTERFACES.md` — do not rename anything that appears there.
> **Demo product:** a fictional SaaS, **Acme Analytics** (product analytics / churn & retention for B2B SaaS). The booth concierge demos Acme to each visitor's stated problem.
> **Secrets:** `OPENAI_API_KEY`, `FIBER_API_KEY`, `RESEND_API_KEY` live in **Convex env only** (`npx convex env set ...`). Never client-side, never committed.

### Convex file map (what to build)
```
convex/
  schema.ts        # LOCKED (exists)
  sessions.ts      # exists: create/get/list/setNeeds/captureContact/reviewQueue (+ internal)
  messages.ts      # exists: add/bySession/transcriptInternal
  demoState.ts     # exists: setDemoState/bySession  -> ADD setHighlight (INTERFACES §1.8)
  events.ts        # exists: log (internal)/bySession
  presence.ts      # exists: latest/record (internal)
  http.ts          # ADD: /hw/poll, /hw/ack, /hw/presence (INTERFACES §4)
  fiber.ts         # ADD: fiber client + lookupVisitor action (§5)
  scoring.ts       # ADD: confidence/urgency/bestAngle structured output (§3)
  badge.ts         # ADD: badge structured output (§4)
  email.ts         # ADD: draft (internal) + approve/edit/discard + send action (§6, INTERFACES §2)
  finalize.ts      # ADD: finalize action orchestrating score->badge->email (§3.4)
  openai.ts        # ADD: shared OpenAI client + structured-output helper
  seed.ts          # ADD: golden + dummy seed (§8)
  llm/prompts.ts   # ADD: the system prompt text + tool defs (this file §1, §2)
```
Dependencies (latest stable; verify on npm): `openai`, `zod`, `resend`. fiber is called over plain `fetch` (no SDK needed) to keep the action lean.

---

## 1. The GPT system prompt (verbatim)

This is the conversation prompt B1 sends to OpenAI (export it from `convex/llm/prompts.ts` as `BOOTH_SYSTEM_PROMPT` so B1 imports the exact string). Tools from §2 are attached to every turn.

```text
You are the booth concierge for Acme Analytics at a startup conference. Acme Analytics
is a product-analytics platform that helps B2B SaaS teams see why users churn, get alerts
when key metrics move, explore data with plain-English queries, and connect their existing
stack. You are warm, sharp, and genuinely curious about the person in front of you — like
the best founder you've ever met working their own booth.

YOUR JOB, in order:
1. IDENTIFY. Greet them and learn who they are: name, company, and role. If they offer a
   LinkedIn QR, use the URL. The moment you have a name, a company, OR a LinkedIn URL, call
   lookup_visitor so the booth can research them live. Do NOT set reveal=true yet.
2. RESEARCH. Use what fiber returns to sound like you already know their world (their
   industry, stage, what teams like theirs usually struggle with) — but never read raw data
   at them and never claim a fact you're unsure of. If what they said and what fiber found
   disagree, stay gracious and trust the person.
3. SCOPE. Find the ONE problem that matters most to them. Ask about it like a peer, not a
   form. As you learn, call set_needs with their problems, a one-line useCase, and your read
   on urgency. Quote them when you can.
4. DEMO. Show, don't tell. Call show_view to drive the screen to the Acme view that maps to
   their problem, and highlight to point at the exact thing you're describing. Pick the view
   that fits: churn/retention -> "churn"; metric monitoring or "we find out too late" ->
   "alerts"; "can my team self-serve answers" -> "query-result"; "does it plug into our
   stack" -> "integrations"; budget/plans -> "pricing"; orientation/recap -> "home". Walk
   them through what they're seeing in their terms.
5. CAPTURE. Once they're clearly interested, get a way to follow up — LinkedIn or work email
   is best. Call capture_contact. This is also when a contact reveal is appropriate
   (lookup_visitor with reveal=true) if you still need their work email.
6. WRAP. When the conversation is winding down, tell them their personalized Booth Badge is
   on its way and call finalize_session exactly once. Then say a warm goodbye.

HARD RULES:
- Never hard-sell. Never tell them which plan to buy or pressure them. You qualify and
  educate; the human team follows up later.
- Never say a number you're not sure of. No made-up customer logos, prices, or stats beyond
  what the demo screen shows.
- Keep turns short and spoken-friendly (you are being read aloud by TTS): 1-3 sentences,
  one idea, end with a question or a clear handoff. No bullet lists, no markdown, no emoji.
- Only ever drive the screen through the tools. Only use the view names and highlight ids
  you've been given. Never invent UI.
- The confidence score and any internal scoring are NEVER spoken to the visitor.
- If a tool fails or returns a fallback, keep the conversation natural — don't mention
  plumbing.

You have these tools: lookup_visitor, set_needs, show_view, highlight, capture_contact,
finalize_session. Use them proactively as the conversation unfolds — they are how the booth
comes alive around the visitor.
```

**Model:** use a fast tool-calling model for the conversation (e.g. `gpt-5.5` mini-tier / the fastest model that reliably tool-calls). Scoring/badge/email run in `finalize` and can use a slightly larger model (§3.2). Keep the conversation model and `finalize` model configurable via Convex env (`OPENAI_CONVO_MODEL`, `OPENAI_REASON_MODEL`) with sane defaults.

---

## 2. The 6 tools (JSON schemas + implementation notes)

The exact JSON schemas the model receives are in `INTERFACES.md §3` (single source of truth — export them from `convex/llm/prompts.ts` as `BOOTH_TOOLS` so B1 and any tests share them). Implementation notes per tool:

| Tool | Convex target | Notes |
|---|---|---|
| `lookup_visitor` | `fiber.lookupVisitor` (action) | `sessionId` injected by B1. Sets `status:"enriching"` while running, restores after. `reveal` default false. Always resolves (fallback). |
| `set_needs` | `sessions.setNeeds` (mutation) | already implemented; patches only provided fields; logs `needs`. |
| `show_view` | `demoState.setDemoState` (mutation) | already implemented; validates `view`, appends to `demoShown`, sets `status:"demoing"`, logs `demo`. |
| `highlight` | `demoState.setHighlight` (mutation) | **build this** — patch only `highlight`+`updatedAt` on the session's demoState row; create a `home` row if none; log `demo`. |
| `capture_contact` | `sessions.captureContact` (mutation) | already implemented; logs `identify`. Optionally trigger a reveal if `linkedinUrl` arrives and none done yet. |
| `finalize_session` | `finalize.finalize` (action) | **build this** — §3.4 orchestration. |

> **Tool-result contract:** every tool target returns small JSON (see INTERFACES). B1 feeds the tool result back to the model. Keep returns tiny and human-meaningless-safe (no secrets, no raw fiber payloads) so they don't pollute the spoken context.

---

## 3. Scoring spec (confidence + urgency + bestAngle)

One structured-output call in `finalize` produces all three. Confidence is **never** shown to the visitor.

### 3.1 The structured-output schema (Zod + JSON Schema)
```ts
// convex/scoring.ts
import { z } from "zod";

export const QualifySchema = z.object({
  factors: z.object({
    icpFit:     z.number().min(0).max(30), // ICP / fiber firmographic fit
    intent:     z.number().min(0).max(25), // intent language in the transcript
    engagement: z.number().min(0).max(20), // depth/length of the conversation
    authority:  z.number().min(0).max(15), // seniority / decision power
    demoDepth:  z.number().min(0).max(10), // how much demo they pulled
  }),
  confidence: z.number().min(0).max(100),  // MUST equal the sum of factors (we re-derive + clamp)
  confidenceReasons: z.array(z.string()).min(2).max(4),
  urgency: z.enum(["low", "medium", "high"]),
  urgencyEvidence: z.string(), // a short verbatim-ish quote from the transcript
  bestAngle: z.string(),       // one sentence: the sharpest follow-up angle for the human
});
export type Qualify = z.infer<typeof QualifySchema>;
```

JSON Schema equivalent (for the Responses API `text.format`, `strict:true`, all keys required, `additionalProperties:false`):
```jsonc
{
  "type": "object",
  "additionalProperties": false,
  "required": ["factors","confidence","confidenceReasons","urgency","urgencyEvidence","bestAngle"],
  "properties": {
    "factors": {
      "type": "object", "additionalProperties": false,
      "required": ["icpFit","intent","engagement","authority","demoDepth"],
      "properties": {
        "icpFit":     { "type": "number", "minimum": 0, "maximum": 30 },
        "intent":     { "type": "number", "minimum": 0, "maximum": 25 },
        "engagement": { "type": "number", "minimum": 0, "maximum": 20 },
        "authority":  { "type": "number", "minimum": 0, "maximum": 15 },
        "demoDepth":  { "type": "number", "minimum": 0, "maximum": 10 }
      }
    },
    "confidence":        { "type": "number", "minimum": 0, "maximum": 100 },
    "confidenceReasons": { "type": "array", "minItems": 2, "maxItems": 4, "items": { "type": "string" } },
    "urgency":           { "type": "string", "enum": ["low","medium","high"] },
    "urgencyEvidence":   { "type": "string" },
    "bestAngle":         { "type": "string" }
  }
}
```

### 3.2 How to compute / prompt it
- **Inputs:** the full transcript (`messages.transcriptInternal`), the normalized fiber payload (`sessions.fiber` + `fiberMatch`), `problems`/`useCase`/`urgency` already on the card, and `demoShown`.
- **Prompt (scoring system message):**
  ```text
  You are a B2B sales qualification analyst for Acme Analytics. Acme's ICP: seed-to-Series-B
  B2B SaaS / dev-tool teams (roughly 10-300 employees) that care about user retention,
  activation, and product metrics. Score this booth conversation.

  Rubric (max points): icpFit 30, intent 25, engagement 20, authority 15, demoDepth 10.
  - icpFit: how well the company (from fiber: industry, size, stage) matches the ICP. If
    fiberMatch is "mismatch", cap icpFit at 15 and note the discrepancy. If "none", judge
    from the transcript and cap at 20.
  - intent: explicit buying/evaluation language ("we're evaluating", "budget approved",
    "switching off X") scores high; idle curiosity scores low.
  - engagement: number of substantive visitor turns and follow-up questions.
  - authority: decision power from role/seniority (founder/VP/Head high; IC/student low).
  - demoDepth: how many demo views they engaged with and how specific they got.
  Set confidence to the exact sum of the five factors. Give 2-4 short, plain-English
  reasons, each tied to a factor and citing a concrete detail (prefix with the factor, e.g.
  "ICP fit 28/30: Series B B2B SaaS, dead-center target."). Pick urgency from transcript
  cues and quote the strongest evidence. bestAngle = the single sharpest angle a human rep
  should lead with in follow-up. Output ONLY the structured object.
  ```
- **Post-validation (do this in code, don't trust the model blindly):**
  1. Parse with `QualifySchema`. On parse failure → use the deterministic fallback (§3.3).
  2. Recompute `confidence = round(clamp(sum(factors), 0, 100))` — overwrite the model's number so it can never disagree with the factors.
  3. Ensure 2–4 reasons; truncate/pad from a generic reason if needed.
- **Persist (via `sessions.patchCard`):** `confidence`, `confidenceReasons`, `urgency`, `urgencyEvidence`, `bestAngle`. Do **not** persist `factors` (no schema field — see INTERFACES §7; the breakdown is encoded into the reason strings instead).

### 3.3 Deterministic cached fallback (never crash the pipeline)
If the model output is malformed/unavailable (bad JSON, timeout, no key), compute a heuristic score so the demo always produces a card:
```ts
// convex/scoring.ts — pure, deterministic, no network
export function fallbackQualify(s: Session, transcript: {role:string;text:string}[]): Qualify {
  const visitorText = transcript.filter(m => m.role === "visitor").map(m => m.text);
  const joined = visitorText.join(" ").toLowerCase();
  const has = (...w: string[]) => w.some(x => joined.includes(x));

  const icpFit     = s.fiberMatch === "verified" ? 26 : s.fiberMatch === "mismatch" ? 12 : 18;
  const intent     = has("evaluat","budget","switch","replace","pricing","buy","roll out") ? 20
                    : has("looking","interested","exploring") ? 12 : 7;
  const engagement = Math.min(20, visitorText.length * 3);
  const authority  = /founder|ceo|cto|vp|head|director|lead/i.test(s.role ?? "") ? 13
                    : /manager|owner|principal/i.test(s.role ?? "") ? 9 : 5;
  const demoDepth  = Math.min(10, (s.demoShown?.length ?? 0) * 4);
  const factors = { icpFit, intent, engagement, authority, demoDepth };
  const confidence = Math.round(icpFit + intent + engagement + authority + demoDepth);

  const urgency: Urgency = has("asap","this quarter","urgent","now","deadline") ? "high"
                          : has("soon","next quarter","evaluat") ? "medium" : "low";
  return {
    factors, confidence,
    confidenceReasons: [
      `ICP fit ${icpFit}/30: ${s.company ?? "company"} ${s.fiberMatch === "verified" ? "verified against fiber" : "unverified"}.`,
      `Intent ${intent}/25 and engagement ${engagement}/20 from the conversation.`,
    ],
    urgency,
    urgencyEvidence: visitorText.find(t => /asap|quarter|urgent|now|deadline|soon/i.test(t)) ?? "",
    bestAngle: `Lead with ${s.problems?.[0] ?? "their stated problem"} and the ${s.demoShown?.[0] ?? "churn"} view they saw.`,
  };
}
```
Cache the **last successful** real qualify per session in memory of the action run is unnecessary; the heuristic above is the cache-free fallback. (A "cached fallback" in the demo sense = the golden seed sessions in §8, which ship pre-scored.)

### 3.4 `finalize` orchestration (the action)
```ts
// convex/finalize.ts  (action)
finalize({ sessionId }):
  setStatus(sessionId, "finalizing")
  // 1. ensure we have enrichment + a contact reveal before scoring
  if (!session.fiber) await fiber.lookupVisitorInternal(sessionId, { reveal:true })  // best-effort
  log("score","Scoring lead", start)
  // 2. score (structured output -> validate -> fallback)
  q = await runQualify(sessionId)               // §3.2; fallbackQualify on failure
  patchCard(sessionId, { confidence, confidenceReasons, urgency, urgencyEvidence, bestAngle })
  log("score", `Confidence ${q.confidence}`, ms)
  // 3. badge (structured output -> validate -> fallback)  §4
  log("badge","Generating badge", start)
  badge = await runBadge(sessionId, q)
  patchCard(sessionId, { badge })
  log("badge", badge.archetype, ms)
  scheduler.runAfter(0, internal.badge.renderOg, { sessionId })   // async, non-blocking, optional
  // 4. email draft  §6
  log("email","Drafting follow-up", start)
  draft = await runEmailDraft(sessionId, q)     // never sends
  patchCard(sessionId, { emailDraft: draft, reviewStatus: "pending" })
  log("email","Draft ready for review", ms)
  setStatus(sessionId, "done")
  return { ok:true, confidence: q.confidence, badge, hasEmailDraft: true }
```
Every numbered step wraps a timer and writes an `events` row (powers the dashboard timeline). Each sub-step is independently try/caught with its fallback so one failure can't sink the others.

### 3.5 OpenAI structured-output helper (Responses API)
```ts
// convex/openai.ts
import OpenAI from "openai";
import { zodTextFormat } from "openai/helpers/zod";
const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function structured<T>(opts: {
  model: string; system: string; user: string; schema: z.ZodType<T>; name: string;
}): Promise<T | null> {
  try {
    const r = await client.responses.parse({
      model: opts.model,
      input: [
        { role: "system", content: opts.system },
        { role: "user",   content: opts.user },
      ],
      text: { format: zodTextFormat(opts.schema, opts.name) }, // strict structured outputs
    });
    return (r.output_parsed as T) ?? null;
  } catch {
    return null; // caller applies its deterministic fallback
  }
}
```
- Use **strict structured outputs** (`zodTextFormat` / `json_schema` with `strict:true`) so the model can only emit a conforming object. The `try/catch → null → fallback` pattern guarantees the pipeline never throws on a bad model response.
- If `OPENAI_API_KEY` is unset, `structured` should short-circuit to `null` immediately (check at the top) so local/dev runs use fallbacks without a network round-trip.

---

## 4. Badge spec (the shareable takeaway)

Structured-output call in `finalize` after scoring. The badge is the **public mirror** of the lead — flattering, witty, grounded.

### 4.1 Curated archetype list (the model must pick from these)
Pass this list into the prompt; the model selects the single best fit (it may not invent new archetypes). Each has a baked tagline the model may lightly adapt.

| # | archetype | tagline |
|---|---|---|
| 1 | The Churn Whisperer | "Hears the goodbye before they say it." |
| 2 | The Retention Renegade | "Refuses to let good users walk." |
| 3 | The Activation Architect | "Builds the aha-moment on purpose." |
| 4 | The North-Star Navigator | "Steers the whole team by one true metric." |
| 5 | The Cohort Cartographer | "Maps every user journey by the week they joined." |
| 6 | The Funnel Mechanic | "Finds the leak, tightens the bolt." |
| 7 | The Signal Hunter | "Catches the metric move before the dashboard does." |
| 8 | The Attribution Alchemist | "Turns messy touchpoints into clean credit." |
| 9 | The Revenue Archaeologist | "Digs expansion revenue out of old accounts." |
| 10 | The Onboarding Sherpa | "Gets every new user to the summit." |
| 11 | The Data Custodian | "Trusts the numbers because they cleaned them." |
| 12 | The Pipeline Plumber | "Keeps the whole data flow leak-free." |
| 13 | The Dashboard Dragon | "Hoards every metric that matters." |
| 14 | The Zero-to-One Operator | "Wears every hat, ships every week." |
| 15 | The Self-Serve Sommelier | "Pairs each question with the perfect query." |

### 4.2 The structured-output schema
```ts
// convex/badge.ts  — mirrors sessions.badge in schema.ts EXACTLY (minus ogImageId)
export const BadgeSchema = z.object({
  archetype: z.string(),                       // MUST be one of the 15 above (validate)
  tagline: z.string(),
  compliment: z.string(),                      // MUST quote a real transcript detail (§4.3)
  stats: z.array(z.object({
    label: z.string(),
    value: z.number().min(0).max(100),
  })).min(2).max(3),
  discountCode: z.string(),                     // we overwrite with our format (§4.4)
});
```
Persist as `sessions.badge` (the schema object). `ogImageId` is set later/optionally by the async OG step (§4.5) and is fine to leave undefined.

### 4.3 Grounded-compliment rule (enforced in code)
- **Prompt:** "The compliment MUST quote or closely paraphrase a real thing the visitor said in the transcript (a phrase, a problem, a number they mentioned). Make them feel *seen*, not flattered by a template."
- **Validation:** after generation, check the compliment shares a meaningful token overlap with the visitor's transcript (e.g. contains a ≥4-char word that appears in a visitor message, ignoring stopwords). If it fails, retry once; if still failing, fall back (§4.6) using a real `problems[0]`/`useCase` string spliced in.

### 4.4 Stats = public mirror of the internal score
Two or three flattering bars derived from the internal factors — **always flattering** (floored), never the raw confidence and never anything that could read as negative.
```ts
// floor at 72, cap at 99, so the visitor always looks great
const mirror = (factorPct: number) => Math.round(Math.min(99, Math.max(72, factorPct)));
// suggested mapping (factorPct = factor / maxForThatFactor * 100):
stats = [
  { label: archetypeStatLabel,     value: mirror(icpFit/30*100) },   // e.g. "Churn IQ"
  { label: "Growth Velocity",      value: mirror(intent/25*100) },
  { label: "Signal Strength",      value: mirror(engagement/20*100) }, // include if 3 stats
];
```
The model proposes `label`s themed to the archetype (e.g. Churn Whisperer → "Churn IQ", "Retention Instinct"); code recomputes `value` from the factors so the bars are honest mirrors, not hallucinated.

### 4.5 discountCode format (deterministic, stable)
Code-generated (don't trust the model's value — overwrite it):
```ts
// ACME-<2-3 letter archetype tag>-<4 char base32 from sessionId>
// e.g. "ACME-CW-7Q2X" for The Churn Whisperer
const tag = archetypeTag(archetype);                 // CW, RR, AA, NS, ...
const suffix = base32(hash(sessionId)).slice(0, 4).toUpperCase();
discountCode = `ACME-${tag}-${suffix}`;
```
Deterministic from `sessionId` so re-running `finalize` yields the same code.

### 4.6 Badge fallback
If structured output is malformed/unavailable: pick an archetype by simple rules (churn problem → Churn Whisperer; alerts → Signal Hunter; query-result → Self-Serve Sommelier; pricing/integrations → Zero-to-One Operator; else North-Star Navigator), use its baked tagline, build the compliment from `problems[0]`/`useCase` ("Loved how clearly you framed '<problem>' — that's exactly the muscle Acme builds."), compute stats from `fallbackQualify` factors, generate the discountCode.

### 4.7 Tone guardrails (put in the prompt + spot-check)
- **Witty, niche, specific.** B2B-insider, a little playful.
- **Never saccharine:** no "You're amazing!", "What a rockstar!", generic hype.
- **Never backhanded:** no "Surprisingly sharp for…", no "Not bad considering…", nothing that implies low expectations.
- Good: *"Anyone who says 'we find out users churned from the invoice' has clearly been burned — and is exactly who Acme's alerts were built for."*
- Bad: *"Wow, you're so smart and successful!"* (saccharine) / *"Impressive for a small team."* (backhanded).

### 4.8 OG image (optional, async, never blocks)
Baseline renders the share image on demand via Next.js `next/og` from the badge page route (see `docs/DASHBOARD_DESIGN.md §4`). `badge.ogImageId` (Convex file storage) **stays unused in baseline.** If you implement the stretch `internal.badge.renderOg`, it must run via `scheduler.runAfter(0, ...)` so the badge is usable immediately; store the file and patch `ogImageId` when done. Don't build this until the core loop is green.

---

## 5. fiber.ai call plan (`convex/fiber.ts` + `lookupVisitor`)

All calls run **server-side in a Convex action** (key secret). Grounded in `api.fiber.ai/llms.txt` (fetched, current). Auth: **`apiKey` in the JSON body for POST, in the query string for GET.** Base URL `https://api.fiber.ai`.

### 5.1 Endpoints used (and why)
| Step | Endpoint | Method | Cost | Used for |
|---|---|---|---|---|
| Credit check | `/v1/get-org-credits` | GET | free | gate spend before any chargeable call |
| Company | `/v1/kitchen-sink/company` | POST | ~2 cr | firmographics from name/domain/linkedin |
| Person (have LinkedIn) | `/v1/kitchen-sink/person` | POST | ~2 cr (+2 `liveFetch`) | profile + live LinkedIn snapshot |
| Person (no LinkedIn) | `/v1/text-to-profile-search` (`textToProfileSearch`) | POST | ~1 cr/result | resolve "<name> at <company>" → profile, then person lookup |
| Contact reveal | `/v1/contact-details/single` (`syncQuickContactReveal`) | POST | 2 work-email / 3 phone | reveal work email/phone **only when engaged** |

> Live LinkedIn: prefer folding it into `kitchen-sink/person` with the `liveFetch` flag (one call) rather than a separate `profileLiveEnrich`. Keep total chargeable calls ≤ 4 per visitor.

### 5.2 `lookupVisitor` flow
```
lookupVisitor({ sessionId, name?, company?, linkedinUrl?, reveal=false }):
  setStatus(sessionId, "enriching"); log("enrich","Researching visitor", start)

  if (!FIBER_API_KEY) -> writeFallback(sessionId, name, company); return {source:"fallback"}

  // cache: key by company domain (preferred) or linkedinUrl
  const key = domainOf(company) ?? linkedinUrl ?? company
  const cached = await fiberCache.get(key)
  let company_, person_
  if (cached) { ({company_, person_} = cached); source = "cache" }
  else {
    const credits = await GET /v1/get-org-credits?apiKey=...
    if (credits.available < MIN_CREDITS /*=10*/) -> writeFallback(...); return {source:"fallback"}
    company_ = await POST /v1/kitchen-sink/company { apiKey, companyName|companyDomain|companyIdentifier }
    if (linkedinUrl) person_ = await POST /v1/kitchen-sink/person { apiKey, profileIdentifier:{identifier:"linkedinUrl",value:linkedinUrl}, liveFetch:true }
    else if (name && company) {
      const hit = await POST /v1/text-to-profile-search { apiKey, query:`${name} at ${company}` }
      if (hit) person_ = await POST /v1/kitchen-sink/person { apiKey, profileIdentifier:{identifier:"linkedinUrl",value:hit.linkedinUrl}, liveFetch:true }
    }
    await fiberCache.put(key, { company_, person_ }); source = "fiber"
  }

  // optional contact reveal (gated)
  let contact
  if (reveal && (person_?.linkedinUrl ?? linkedinUrl)) {
    const r = await POST /v1/contact-details/single { apiKey, linkedinUrl: <li>, enrichmentType:{getWorkEmails:true, getPersonalEmails:false, getPhoneNumbers:true}, validateEmails:true }
    contact = pickContact(r.output.profile)  // first valid work email + mobile
  }

  const normalized = normalize(company_, person_, contact, source)   // §5.3
  const fiberMatch = crossCheck(stated:{name,company,role:session.role}, normalized)  // §5.4
  patchCard(sessionId, {
    fiber: normalized, fiberMatch,
    role: normalized.person?.title ?? session.role,
    company: session.company ?? normalized.company?.name,
    linkedinUrl: session.linkedinUrl ?? normalized.person?.linkedinUrl,
    ...(contact?.workEmail ? { email: contact.workEmail } : {}),
    ...(contact?.phone ? { phone: contact.phone } : {}),
  })
  log("enrich", `Found ${normalized.company?.name ?? "company"} · match ${fiberMatch}`, ms)
  setStatus(sessionId, prevStatus)
  return { ok:true, fiberMatch, source }
```
Notes: respect `chargeInfo` in each response (log credits charged into the `enrich` event detail for the "watch the credits tick" judge moment). Recommended timeouts: company 30s, person 60s, reveal 120s — but wrap each in a ~8–10s race so a slow fiber call can't stall the conversation; on timeout, proceed with whatever you have.

### 5.3 Normalized shape stored in `sessions.fiber`
fiber returns deep snake_case payloads (`output.data[]` for company; profile object for person). Normalize to this compact camelCase shape so the dashboard and scoring read a stable contract:
```ts
interface FiberNormalized {
  company?: {
    name?: string;
    domain?: string;
    industry?: string;
    employeeCount?: number;        // from employee_count_consensus
    founded?: number;              // from founded_on_consensus (year)
    funding?: string;              // human string from latest_funding_consensus, e.g. "Series B"
    location?: string;
    linkedinUrl?: string;
    description?: string;
    techStack?: string[];
  };
  person?: {
    fullName?: string;
    title?: string;
    seniority?: string;            // e.g. "VP", "Head", "IC"
    location?: string;
    linkedinUrl?: string;
    headline?: string;
    tenureMonths?: number;
    isDecisionMaker?: boolean;     // derived from seniority/title
  };
  contact?: {
    workEmail?: string;
    personalEmail?: string;
    phone?: string;
    emailStatus?: "valid" | "risky" | "unknown" | "invalid";
  };
  source: "fiber" | "cache" | "fallback";
  credits?: { available?: number; chargedThisVisit?: number };
  fetchedAt: number;
}
```

### 5.4 `fiberMatch` cross-check ("people lie on forms")
```ts
function crossCheck(stated, n: FiberNormalized): FiberMatch {
  if (!n.company && !n.person) return "none";
  const companyOk = !stated.company || !n.company?.name ||
    norm(stated.company) === norm(n.company.name) ||
    domainOf(stated.company) === n.company?.domain;
  const roleOk = !stated.role || !n.person?.title ||
    tokenOverlap(stated.role, n.person.title) > 0;        // loose
  if (companyOk && roleOk) return "verified";
  return "mismatch";   // e.g. claimed "Director at BigCo" but fiber says small co / different title
}
```
Surface mismatches as a flag on the card and feed them to scoring (cap `icpFit`). This is a headline judge moment — the booth verifies instead of trusting the form.

### 5.5 Canned fallback payload (key missing / out of credits)
Write a realistic Acme-ICP prospect so the loop always demos. Use the stated `name`/`company` if present, else these defaults:
```ts
const FIBER_FALLBACK: FiberNormalized = {
  company: {
    name: "Northwind Labs", domain: "northwindlabs.com", industry: "B2B SaaS — Developer Tools",
    employeeCount: 80, founded: 2021, funding: "Series A", location: "San Francisco, CA",
    linkedinUrl: "https://www.linkedin.com/company/northwind-labs",
    description: "Northwind Labs builds CI/CD observability for engineering teams.",
    techStack: ["React", "Postgres", "Segment", "Snowflake"],
  },
  person: {
    fullName: "Jordan Rivera", title: "Head of Growth", seniority: "Head",
    location: "San Francisco, CA", linkedinUrl: "https://www.linkedin.com/in/jordan-rivera-growth",
    headline: "Head of Growth at Northwind Labs · ex-Segment", tenureMonths: 14, isDecisionMaker: true,
  },
  contact: { workEmail: "jordan@northwindlabs.com", emailStatus: "valid" },
  source: "fallback",
  fetchedAt: Date.now(),
};
```
With the fallback, set `fiberMatch:"verified"` if it was built from stated values, else `"none"`. Never block on missing keys.

---

## 6. Email draft spec (`convex/email.ts`)

### 6.1 Draft generation (in `finalize`, never sends)
- **Model call:** plain text generation (a structured object with `{subject, body}` via `structured()` is cleanest). System guidance:
  ```text
  Draft a short, warm post-booth follow-up email from the Acme Analytics team to a visitor.
  Reference (a) the exact demo view they saw and (b) the specific problem they described, in
  their words. One clear, soft next step (a quick call or a sandbox), never pushy. 90-150
  words. Plain, human, founder-to-operator tone. No emoji, no hype, no fake stats. Sign off
  as "— The Acme Analytics team". You may include their discount code once, naturally.
  ```
- **Inputs:** `visitorName`, `company`, `problems`/`useCase`, `demoShown` (name the most relevant view, e.g. "the churn cohort board"), `bestAngle`, `badge.discountCode`.
- **Output → `sessions.emailDraft = { subject, body }`, `reviewStatus = "pending"`.** Subject should reference the demo + problem, e.g. `"Your churn cohorts in Acme — quick follow-up from the booth"`.
- **Fallback:** a templated draft splicing `visitorName`, `problems[0]`, the top `demoShown` view, and `discountCode`.

### 6.2 reviewStatus lifecycle (enforced)
```
pending ──approve──▶ approved ──send──▶ sent
   │  └──edit──▶ edited ──send──▶ sent
   └──discard──▶ discarded
```
- `email.approve` → `approved`. `email.edit({subject,body})` → overwrites `emailDraft`, sets `edited`. `email.discard` → `discarded`.
- `email.send` (action) sends via **Resend** **only if** `reviewStatus ∈ {approved, edited}` AND `session.email` present; sets `sent` + `sentAt`. Any other state returns `{ok:false, error}` and sends nothing.
- **NEVER auto-send.** `finalize` only ever writes `pending`. There is no scheduler path that sends. (This is a hard rule — judges and the brief both call it out.)

### 6.3 Resend call
```ts
import { Resend } from "resend";
const resend = new Resend(process.env.RESEND_API_KEY);
await resend.emails.send({
  from: "Acme Analytics <booth@<your-verified-domain>>",   // use Resend onboarding domain in dev
  to: session.email,
  subject: draft.subject,
  text: draft.body,
});
```
If `RESEND_API_KEY` is missing, `email.send` returns `{ok:false, error:"no resend key"}` without throwing.

---

## 7. events timeline (the "agent thinking" labels)

Log one `events` row per step (already have `internal.events.log`). `step` MUST be one of the schema enum values: `identify | enrich | needs | demo | score | badge | email | hw`. Suggested labels (`detail` optional, `ms` = step duration where measurable):

| step | when | example `label` | example `detail` |
|---|---|---|---|
| `identify` | session start, contact captured | "Session started" / "Captured contact" | `device ipad-1` / `jordan@northwindlabs.com` |
| `enrich` | fiber lookup | "Researching visitor" → "Found Northwind Labs · match verified" | `2 credits · Series A · 80 emp` |
| `needs` | `set_needs` | "Scoped needs" | `churn visibility · alerts too late` |
| `demo` | `show_view`/`highlight` | "Demo → churn" / "Highlight at-risk-accounts" | — |
| `score` | scoring | "Scoring lead" → "Confidence 87 (high intent)" | `icp 28 · intent 22 · eng 18 · auth 13 · demo 6` |
| `badge` | badge gen | "Generating badge" → "The Churn Whisperer" | `ACME-CW-7Q2X` |
| `email` | draft | "Drafting follow-up" → "Draft ready for review" | subject preview |
| `hw` | actuator enqueue (future) | "Queued LED green" | `deviceId booth-1` |

Pattern: log a "starting" row, then on completion either update or append a "done" row with `ms`. The dashboard renders these in order as a live timeline — this is the single most judge-impressing artifact ("it's not one GPT call").

---

## 8. Golden seed design (`convex/seed.ts`)

A `seed` mutation/action loads dummy + **golden** sessions so B1 can build UI and the team has a network-free demo fallback. Golden sessions are fully finished (`status:"done"`, fiber + score + badge + email draft `pending`). Provide an idempotent `seed` (clear-then-insert) the team runs before judging.

Ship **3 golden sessions** with these exact values:

### Golden A — high-intent, verified (the hero card)
```ts
{
  deviceId: "ipad-1", status: "done", createdAt: <now-3600_000>,
  visitorName: "Maya Chen", company: "Northwind Labs", role: "VP of Product",
  linkedinUrl: "https://www.linkedin.com/in/maya-chen-product", email: "maya@northwindlabs.com",
  fiber: { company:{ name:"Northwind Labs", domain:"northwindlabs.com", industry:"B2B SaaS — Developer Tools", employeeCount:80, founded:2021, funding:"Series A", location:"San Francisco, CA", linkedinUrl:"https://www.linkedin.com/company/northwind-labs", description:"CI/CD observability for engineering teams." },
           person:{ fullName:"Maya Chen", title:"VP of Product", seniority:"VP", location:"San Francisco, CA", linkedinUrl:"https://www.linkedin.com/in/maya-chen-product", headline:"VP Product at Northwind Labs · ex-Amplitude", isDecisionMaker:true },
           contact:{ workEmail:"maya@northwindlabs.com", emailStatus:"valid" }, source:"fiber", fetchedAt:<now> },
  fiberMatch: "verified",
  problems: ["No early warning before enterprise accounts churn", "Success team finds out from the invoice"],
  useCase: "Predict and prevent churn in mid-market accounts",
  urgency: "high", urgencyEvidence: "We literally found out two logos were leaving from the renewal call.",
  confidence: 87, confidenceReasons: [
    "ICP fit 28/30: Series A B2B SaaS, 80 employees — dead-center target.",
    "Intent 22/25: actively evaluating, named a deadline this quarter.",
    "Authority 13/15: VP of Product, owns the retention number.",
    "Demo depth 6/10: dug into churn cohorts and alerts."
  ],
  bestAngle: "Lead with predictive churn alerts on enterprise cohorts; she owns retention and has board pressure.",
  demoShown: ["churn", "alerts"],
  badge: { archetype:"The Churn Whisperer", tagline:"Hears the goodbye before they say it.",
    compliment:"Anyone who's found out a logo churned from the renewal call has earned the right to demand early-warning — exactly what you grilled us on.",
    stats:[{label:"Churn IQ",value:94},{label:"Growth Velocity",value:88},{label:"Signal Strength",value:82}],
    discountCode:"ACME-CW-7Q2X" },
  emailDraft: { subject:"Your churn cohorts in Acme — quick follow-up from the booth",
    body:"Hi Maya,\n\nGreat talking at the booth about catching at-risk Northwind accounts before the renewal call instead of after. The cohort board you saw flags accounts whose usage dips 30 days out, and the alerts route straight to your CS team.\n\nWorth a 20-minute look at your own data? I can spin up a sandbox this week. Your booth code ACME-CW-7Q2X takes 25% off year one.\n\n— The Acme Analytics team" },
  reviewStatus: "pending",
}
```

### Golden B — medium, self-serve analytics
```ts
{
  deviceId:"ipad-1", status:"done", createdAt:<now-3000_000>,
  visitorName:"Devon Park", company:"Loop Financial", role:"Growth Lead",
  linkedinUrl:"https://www.linkedin.com/in/devon-park-growth", email:"devon@loopfinancial.com",
  fiber:{ company:{ name:"Loop Financial", domain:"loopfinancial.com", industry:"Fintech — SaaS", employeeCount:140, founded:2019, funding:"Series B", location:"New York, NY" },
          person:{ fullName:"Devon Park", title:"Growth Lead", seniority:"Lead", isDecisionMaker:false, headline:"Growth @ Loop Financial" },
          contact:{ workEmail:"devon@loopfinancial.com", emailStatus:"valid" }, source:"fiber", fetchedAt:<now> },
  fiberMatch:"verified",
  problems:["Analysts are a bottleneck for every metric question","Wants the team to self-serve answers"],
  useCase:"Let PMs answer their own product questions without SQL",
  urgency:"medium", urgencyEvidence:"Every dashboard request goes through one analyst and it's a week-long queue.",
  confidence:64, confidenceReasons:[
    "ICP fit 24/30: Series B fintech SaaS, solid fit.",
    "Intent 16/25: exploring, no committed timeline.",
    "Engagement 16/20: asked sharp questions about plain-English queries.",
    "Authority 8/15: Growth Lead, likely an influencer not the buyer."],
  bestAngle:"Show the plain-English query builder; help him build the internal case to his Head of Data.",
  demoShown:["query-result","integrations"],
  badge:{ archetype:"The Self-Serve Sommelier", tagline:"Pairs each question with the perfect query.",
    compliment:"Calling your analyst queue a 'week-long bottleneck' is the most honest thing we heard all day — and exactly the queue Acme deletes.",
    stats:[{label:"Query Fluency",value:90},{label:"Team Leverage",value:78}], discountCode:"ACME-SS-3K9P" },
  emailDraft:{ subject:"Deleting the analyst queue at Loop — Acme follow-up",
    body:"Hi Devon,\n\nLoved the booth chat about getting your PMs off the analyst queue. The plain-English query view you tried turns 'why did activation dip in May?' into an answer in seconds — no SQL, no ticket.\n\nHappy to help you put a quick internal case together for your data team. Want me to send a sandbox seeded with sample product data? Booth code ACME-SS-3K9P for 25% off.\n\n— The Acme Analytics team" },
  reviewStatus:"pending",
}
```

### Golden C — founder, mismatch flag (shows the cross-check)
```ts
{
  deviceId:"ipad-1", status:"done", createdAt:<now-2400_000>,
  visitorName:"Sam Okafor", company:"BigCorp", role:"Director of Analytics",
  linkedinUrl:"https://www.linkedin.com/in/sam-okafor", email:"sam@tinypixel.io",
  fiber:{ company:{ name:"TinyPixel", domain:"tinypixel.io", industry:"B2B SaaS — Marketing Tech", employeeCount:6, founded:2024, funding:"Pre-seed", location:"Austin, TX" },
          person:{ fullName:"Sam Okafor", title:"Founder & CEO", seniority:"Founder", isDecisionMaker:true, headline:"Founder at TinyPixel" },
          contact:{ workEmail:"sam@tinypixel.io", emailStatus:"valid" }, source:"fiber", fetchedAt:<now> },
  fiberMatch:"mismatch",   // claimed "Director at BigCorp"; fiber says founder of a 6-person startup
  problems:["Standing up product analytics from scratch","No data team yet"],
  useCase:"Instrument the product and see activation without hiring an analyst",
  urgency:"medium", urgencyEvidence:"We're launching in three weeks and I'm flying blind.",
  confidence:58, confidenceReasons:[
    "ICP fit 15/30: capped — claimed Director at BigCorp but fiber shows founder of a 6-person pre-seed startup (mismatch).",
    "Intent 18/25: launching in three weeks, real urgency.",
    "Authority 15/15: it's his company, full decision power.",
    "Demo depth 10/10: walked through integrations and pricing."],
  bestAngle:"Treat as a founder, not an enterprise Director; lead with fastest-path instrumentation and the starter plan.",
  demoShown:["integrations","pricing","home"],
  badge:{ archetype:"The Zero-to-One Operator", tagline:"Wears every hat, ships every week.",
    compliment:"'Launching in three weeks and flying blind' is the most founder sentence imaginable — Acme gets you instrumented before the wheels are even on.",
    stats:[{label:"Builder Energy",value:96},{label:"Speed to Signal",value:84}], discountCode:"ACME-ZO-1F4D" },
  emailDraft:{ subject:"Instrumented before launch — Acme follow-up for TinyPixel",
    body:"Hi Sam,\n\nThree weeks to launch and flying blind is exactly when product analytics earns its keep. The integrations view you saw drops Acme in via a snippet plus Segment, so you'll see activation from day one without hiring a data person.\n\nWant a sandbox to wire up before launch? The starter plan covers a team your size; booth code ACME-ZO-1F4D takes 25% off.\n\n— The Acme Analytics team" },
  reviewStatus:"pending",
}
```

Also seed **1 in-progress dummy** (`status:"active"`, only identity + a `demoState` row) so B1 can build the live/non-final card state, and one **demoState** row pointing at `churn` for the demo-view team.

> **Demo fallback story:** with these golden sessions loaded, the dashboard, badge pages, and review queue are fully populated with zero network calls — the bulletproof "replay" if WiFi/fiber/OpenAI fail on stage.

---

## 9. Build order (so `main` stays demoable)
1. `demoState.setHighlight` + `http.ts` (`/hw/*`) — unblocks B1/B3 immediately. (signatures already in INTERFACES)
2. `seed.ts` golden sessions — unblocks all UI work + demo fallback.
3. `openai.ts` helper + `scoring.ts` + `finalize.ts` (with fallbacks) — real scoring on the golden transcripts.
4. `badge.ts` + `email.ts` (draft + review mutations + gated send).
5. `fiber.ts` `lookupVisitor` (real calls behind the fallback you already shipped).
6. async OG (`badge.renderOg`) — only if time; ogImageId stays optional.

Keep every model call wrapped in `try/catch → fallback`. The pipeline must always produce a complete card.

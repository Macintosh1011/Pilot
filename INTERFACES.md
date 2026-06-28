# BoothPilot — INTERFACES (the locked integration contract)

> **Owner:** Builder 2 (The Brain / Convex spine).
> **Audience:** Builder 1 (iPad: voice + demo view + QR) and Builder 3 (Pi: presence + actuators).
> **Status:** LOCKED. Treat every name, argument, and return shape here as a contract. If you need a change, ping B2 — do not fork signatures.
> Field names mirror `convex/schema.ts` **exactly**. Cross-reference: `docs/BRAIN_DESIGN.md`, `docs/DASHBOARD_DESIGN.md`.

---

## 0. Conventions (read once)

### Deployment URLs
- **Convex client (queries/mutations/actions):** `https://<deployment>.convex.cloud` — B2 publishes the exact URL in the team channel once `npx convex dev` is up.
- **Convex HTTP actions (the `/hw/*` routes B3 hits):** `https://<deployment>.convex.site` (note: `.convex.site`, **not** `.convex.cloud`).

### How to reference a function
Convex functions live in files under `convex/`. A function exported as `create` from `convex/sessions.ts` is referenced two ways:
- **TypeScript client (dashboard, B2):** `api.sessions.create`
- **Swift / non-JS client (B1 iPad, ConvexMobile):** the string `"sessions:create"` (`"<file>:<export>"`).

Both forms are listed for every function below.

### The `sessionId` rule (critical for B1)
The GPT model **never** sees or supplies `sessionId`. B1 creates a session at conversation start (`sessions.create`), keeps the returned `Id<"sessions">` in app state, and **injects it into every Convex call** when it executes a GPT tool. The tool JSON schemas the model sees (§3) deliberately omit `sessionId`.

### Types used below
```ts
// Convex document ids are opaque strings on the wire.
type Id<T extends string> = string; // e.g. Id<"sessions">

type SessionStatus = "active" | "enriching" | "demoing" | "finalizing" | "done";
type FiberMatch    = "verified" | "mismatch" | "none";
type Urgency       = "low" | "medium" | "high";
type ReviewStatus  = "pending" | "approved" | "edited" | "sent" | "discarded";

// The full CRM card (== a `sessions` row). All optional fields may be absent
// until the pipeline fills them in. Mirrors convex/schema.ts.
interface Session {
  _id: Id<"sessions">;
  _creationTime: number;          // Convex system field (ms)
  deviceId: string;
  status: SessionStatus;
  // identity
  visitorName?: string;
  company?: string;
  role?: string;
  linkedinUrl?: string;
  email?: string;
  phone?: string;
  // fiber enrichment (normalized shape -> docs/BRAIN_DESIGN.md §5)
  fiber?: FiberNormalized;
  fiberMatch?: FiberMatch;
  // needs + scoring
  problems?: string[];
  useCase?: string;
  urgency?: Urgency;
  urgencyEvidence?: string;       // a quote from the transcript
  confidence?: number;            // 0..100, NEVER shown to the visitor
  confidenceReasons?: string[];   // 2..4 plain-English reasons
  bestAngle?: string;
  demoShown?: string[];           // demoState views that were shown
  // shareable Booth Badge (public, flattering)
  badge?: Badge;
  // follow-up (human-in-the-loop)
  emailDraft?: { subject: string; body: string };
  reviewStatus?: ReviewStatus;
  sentAt?: number;
  // viral-loop hook (unused in baseline)
  referrerSessionId?: Id<"sessions">;
  createdAt: number;              // app-set ms timestamp
}

interface Badge {
  archetype: string;              // e.g. "The Churn Whisperer"
  tagline: string;
  compliment: string;             // grounded in a real transcript detail
  stats: { label: string; value: number }[]; // 2..3, value 0..100
  discountCode: string;
  ogImageId?: Id<"_storage">;     // optional; unused in baseline
}

interface Message {
  _id: Id<"messages">;
  _creationTime: number;
  sessionId: Id<"sessions">;
  role: "visitor" | "assistant" | "system" | "tool";
  text: string;
  ts: number;
}

interface DemoState {
  _id: Id<"demoState">;
  _creationTime: number;
  sessionId: Id<"sessions">;
  view: DemoView;                 // see §5
  params?: DemoParams;            // see §5
  highlight?: string;             // element id, see §5
  updatedAt: number;
}

interface AgentEvent {
  _id: Id<"events">;
  _creationTime: number;
  sessionId: Id<"sessions">;
  step: "identify" | "enrich" | "needs" | "demo" | "score" | "badge" | "email" | "hw";
  label: string;
  detail?: string;
  ms?: number;
  ts: number;
}

interface PresencePing {
  _id: Id<"presence">;
  _creationTime: number;
  deviceId: string;
  event: "approach" | "leave";
  ts: number;
}
```

---

## 1. Convex functions B1 (the iPad) calls

These are the write/read paths the voice loop drives. Items marked **GPT tool** are the execution target of a tool in §3 — B1 calls them when the model emits that tool, adding `sessionId`.

| Convex ref (TS) | Swift string | Type | Purpose |
|---|---|---|---|
| `api.sessions.create` | `"sessions:create"` | mutation | start a session (the CRM card) |
| `api.sessions.get` | `"sessions:get"` | query | read one card (reactive) |
| `api.messages.add` | `"messages:add"` | mutation | append a transcript turn |
| `api.messages.bySession` | `"messages:bySession"` | query | read transcript (reactive) |
| `api.fiber.lookupVisitor` | `"fiber:lookupVisitor"` | action | **GPT tool** `lookup_visitor` → fiber enrich |
| `api.sessions.setNeeds` | `"sessions:setNeeds"` | mutation | **GPT tool** `set_needs` |
| `api.demoState.setDemoState` | `"demoState:setDemoState"` | mutation | **GPT tool** `show_view` |
| `api.demoState.setHighlight` | `"demoState:setHighlight"` | mutation | **GPT tool** `highlight` |
| `api.demoState.bySession` | `"demoState:bySession"` | query | iPad demo view subscribes here |
| `api.sessions.captureContact` | `"sessions:captureContact"` | mutation | **GPT tool** `capture_contact` |
| `api.finalize.finalize` | `"finalize:finalize"` | action | **GPT tool** `finalize_session` |
| `api.presence.latest` | `"presence:latest"` | query | greet on `approach` (also useful to B1) |

### 1.1 `sessions.create` (mutation)
```ts
args:    { deviceId: string; referrerSessionId?: Id<"sessions"> }
returns: Id<"sessions">
```
Creates a card with `status:"active"`, logs an `identify` event. `referrerSessionId` is the viral-loop hook — **leave it unset in baseline.**

### 1.2 `sessions.get` (query)
```ts
args:    { sessionId: Id<"sessions"> }
returns: Session | null
```
Reactive — re-renders as the pipeline fills the card.

### 1.3 `messages.add` (mutation)
```ts
args:    { sessionId: Id<"sessions">; role: "visitor" | "assistant" | "system" | "tool"; text: string }
returns: Id<"messages">
```
Call once per finalized turn (visitor utterance and assistant reply). The transcript is the ground truth scoring/badge/email read from — **write turns even if you also do TTS locally.**

### 1.4 `messages.bySession` (query)
```ts
args:    { sessionId: Id<"sessions"> }
returns: Message[]   // ascending ts
```

### 1.5 `fiber.lookupVisitor` (action) — GPT tool `lookup_visitor`
```ts
args:    { sessionId: Id<"sessions">; name?: string; company?: string; linkedinUrl?: string; reveal?: boolean }
returns: { ok: boolean; fiberMatch: FiberMatch; source: "fiber" | "cache" | "fallback" }
```
- Runs server-side (key secret). Writes `sessions.fiber`, `sessions.fiberMatch`, and best-effort `role`/`company`/`linkedinUrl`. Logs `enrich` events.
- `reveal` defaults to **false** (no email/phone reveal). Pass `reveal:true` only once the visitor is engaged (cost discipline). `capture_contact` and `finalize` also trigger a reveal if not already done.
- Always returns a result — if the key/credits are missing it writes a canned fallback and returns `source:"fallback"` so the loop never breaks.

### 1.6 `sessions.setNeeds` (mutation) — GPT tool `set_needs`
```ts
args:    { sessionId: Id<"sessions">; problems?: string[]; useCase?: string; urgency?: Urgency; urgencyEvidence?: string }
returns: null
```
Patches only the provided fields; logs a `needs` event. (Scoring later overwrites `urgency`/`urgencyEvidence` with a grounded read, so passing them here is optional.)

### 1.7 `demoState.setDemoState` (mutation) — GPT tool `show_view`
```ts
args:    { sessionId: Id<"sessions">; view: DemoView; params?: DemoParams; highlight?: string }
returns: null
```
Upserts the single demoState row for the session, appends `view` to `sessions.demoShown`, sets `status:"demoing"`, logs a `demo` event. Invalid `view` falls back to `"home"`. See §5 for the view/params/highlight contract.

### 1.8 `demoState.setHighlight` (mutation) — GPT tool `highlight`
```ts
args:    { sessionId: Id<"sessions">; elementId: string }
returns: null
```
Patches only `highlight` (+ `updatedAt`) on the existing demoState row, keeping the current `view`/`params`. If no demoState row exists yet, it creates one with `view:"home"`. Logs a `demo` event. (New helper — see schema note in §7; not a schema change.)

### 1.9 `sessions.captureContact` (mutation) — GPT tool `capture_contact`
```ts
args:    { sessionId: Id<"sessions">; email?: string; phone?: string; linkedinUrl?: string }
returns: null
```
Patches contact fields; logs an `identify` event. If a `linkedinUrl` arrives here and fiber hasn't revealed contact yet, B2 may kick a reveal.

### 1.10 `finalize.finalize` (action) — GPT tool `finalize_session`
```ts
args:    { sessionId: Id<"sessions"> }
returns: { ok: boolean; confidence: number; badge: Badge; hasEmailDraft: boolean }
```
Runs the end pipeline: ensure-enrich → confidence+urgency+bestAngle → badge → (async OG image) → email draft → `reviewStatus:"pending"`. Sets `status:"done"`. Logs `score`/`badge`/`email` events. Idempotent-ish: safe to call once at end of conversation. **Never sends email.**

### 1.11 `presence.latest` (query)
```ts
args:    { deviceId?: string }
returns: PresencePing | null   // most recent; filtered by device if given
```
Subscribe to start the greeting when `event === "approach"`.

---

## 2. Dashboard / review-queue functions (B2 dashboard; documented for completeness)

| Convex ref (TS) | Swift string | Type | Purpose |
|---|---|---|---|
| `api.sessions.list` | `"sessions:list"` | query | all cards, sorted by confidence desc |
| `api.sessions.reviewQueue` | `"sessions:reviewQueue"` | query | cards with a draft awaiting review |
| `api.events.bySession` | `"events:bySession"` | query | the "agent thinking" timeline |
| `api.email.approve` | `"email:approve"` | mutation | mark a draft approved |
| `api.email.edit` | `"email:edit"` | mutation | save edits to a draft |
| `api.email.discard` | `"email:discard"` | mutation | discard a draft |
| `api.email.send` | `"email:send"` | action | **Resend** send (gated on approval) |

### 2.1 `sessions.list` (query)
```ts
args:    {}
returns: Session[]   // confidence desc, then createdAt desc
```

### 2.2 `sessions.reviewQueue` (query)
```ts
args:    {}
returns: Session[]   // only where emailDraft exists AND reviewStatus in {"pending","edited"}; confidence desc
```

### 2.3 `events.bySession` (query)
```ts
args:    { sessionId: Id<"sessions"> }
returns: AgentEvent[]   // ascending ts
```

### 2.4 `email.approve` (mutation)
```ts
args:    { sessionId: Id<"sessions"> }
returns: null            // sets reviewStatus:"approved"
```

### 2.5 `email.edit` (mutation)
```ts
args:    { sessionId: Id<"sessions">; subject: string; body: string }
returns: null            // overwrites emailDraft, sets reviewStatus:"edited"
```

### 2.6 `email.discard` (mutation)
```ts
args:    { sessionId: Id<"sessions"> }
returns: null            // sets reviewStatus:"discarded"
```

### 2.7 `email.send` (action) — gated, never auto
```ts
args:    { sessionId: Id<"sessions"> }
returns: { ok: boolean; error?: string }
```
Sends `emailDraft` to `session.email` via Resend **only if** `reviewStatus ∈ {"approved","edited"}` and `session.email` is present; otherwise returns `{ ok:false, error }`. On success sets `reviewStatus:"sent"` and `sentAt:Date.now()`. **There is no path that sends without a human pressing Approve then Send.**

---

## 3. The 6 GPT tools B1 wires into OpenAI tool-calling

Wire these verbatim into the OpenAI tool-calling array. **Omit `sessionId`** — B1 injects it (see §0). Full JSON schemas + implementation notes also in `docs/BRAIN_DESIGN.md §2`. The canonical system prompt lives in `docs/BRAIN_DESIGN.md §1`.

| Tool name | Maps to Convex | One-liner |
|---|---|---|
| `lookup_visitor` | `fiber.lookupVisitor` | research the visitor live via fiber |
| `set_needs` | `sessions.setNeeds` | record problems / use case / urgency |
| `show_view` | `demoState.setDemoState` | drive the iPad demo view |
| `highlight` | `demoState.setHighlight` | pulse one element in the current view |
| `capture_contact` | `sessions.captureContact` | save email / phone / LinkedIn |
| `finalize_session` | `finalize.finalize` | score → badge → draft follow-up |

```jsonc
[
  {
    "type": "function",
    "function": {
      "name": "lookup_visitor",
      "description": "Research the visitor live via fiber.ai when they share a name, company, or LinkedIn. Call as soon as you have any one of them. Do not request reveal until the visitor is engaged.",
      "parameters": {
        "type": "object",
        "properties": {
          "name":        { "type": "string", "description": "Visitor full name as stated." },
          "company":     { "type": "string", "description": "Company name or domain as stated." },
          "linkedinUrl": { "type": "string", "description": "LinkedIn profile URL, e.g. from the scanned QR." },
          "reveal":      { "type": "boolean", "description": "Reveal work email/phone. Only true once the visitor is clearly engaged.", "default": false }
        },
        "required": [],
        "additionalProperties": false
      }
    }
  },
  {
    "type": "function",
    "function": {
      "name": "set_needs",
      "description": "Record the visitor's problems, use case, and urgency as you learn them. Call whenever you learn something new about what they're trying to solve.",
      "parameters": {
        "type": "object",
        "properties": {
          "problems":        { "type": "array", "items": { "type": "string" }, "description": "Short phrases naming each pain point." },
          "useCase":         { "type": "string", "description": "One sentence: what they want to accomplish." },
          "urgency":         { "type": "string", "enum": ["low", "medium", "high"] },
          "urgencyEvidence": { "type": "string", "description": "A short quote from the visitor that signals urgency." }
        },
        "required": ["problems"],
        "additionalProperties": false
      }
    }
  },
  {
    "type": "function",
    "function": {
      "name": "show_view",
      "description": "Drive the on-screen Acme Analytics demo to the view that best matches the visitor's stated problem. The screen re-renders from shared state.",
      "parameters": {
        "type": "object",
        "properties": {
          "view":   { "type": "string", "enum": ["home", "churn", "alerts", "pricing", "integrations", "query-result"] },
          "params": { "type": "object", "description": "View-specific params; see the demoState view contract.", "additionalProperties": true }
        },
        "required": ["view"],
        "additionalProperties": false
      }
    }
  },
  {
    "type": "function",
    "function": {
      "name": "highlight",
      "description": "Pulse/focus a single element in the current demo view to draw the visitor's eye while you talk.",
      "parameters": {
        "type": "object",
        "properties": {
          "elementId": { "type": "string", "description": "An allowed element id for the current view (see the view contract)." }
        },
        "required": ["elementId"],
        "additionalProperties": false
      }
    }
  },
  {
    "type": "function",
    "function": {
      "name": "capture_contact",
      "description": "Save the visitor's contact info once they share it. Prefer LinkedIn or work email.",
      "parameters": {
        "type": "object",
        "properties": {
          "email":       { "type": "string" },
          "phone":       { "type": "string" },
          "linkedinUrl": { "type": "string" }
        },
        "required": [],
        "additionalProperties": false
      }
    }
  },
  {
    "type": "function",
    "function": {
      "name": "finalize_session",
      "description": "Wrap up: score the lead, generate their Booth Badge, and draft a follow-up email for human review. Call once, near the end, after the demo and contact capture.",
      "parameters": { "type": "object", "properties": {}, "required": [], "additionalProperties": false }
    }
  }
]
```

**Execution mapping (B1 pseudocode):**
```ts
async function runTool(name, args, sessionId) {
  switch (name) {
    case "lookup_visitor":   return convex.action("fiber:lookupVisitor",   { sessionId, ...args });
    case "set_needs":        return convex.mutation("sessions:setNeeds",    { sessionId, ...args });
    case "show_view":        return convex.mutation("demoState:setDemoState", { sessionId, ...args });
    case "highlight":        return convex.mutation("demoState:setHighlight", { sessionId, elementId: args.elementId });
    case "capture_contact":  return convex.mutation("sessions:captureContact", { sessionId, ...args });
    case "finalize_session": return convex.action("finalize:finalize",      { sessionId });
  }
}
```

---

## 4. HTTP actions B3 (the Pi) calls

Base host: `https://<deployment>.convex.site`. All are plain HTTP (debuggable with `curl`). Poll every ~800ms–1s.

### 4.1 `GET /hw/poll?deviceId=<id>`
Returns unacked commands for that device.
```ts
// 200 OK
{
  "commands": [
    { "commandId": string, "kind": "led" | "print" | string, "payload": any, "createdAt": number }
  ]
}
```
- `commands` is `[]` when there's nothing to do.
- `commandId` is the Convex `hwCommands._id`. Use it for ack.
- Empty/unknown `deviceId` → `{ "commands": [] }` (never 500 the poller).

### 4.2 `POST /hw/ack`
```ts
// request body (JSON)
{ "deviceId": string, "commandId": string }
// 200 OK
{ "ok": true }
```
- **Idempotent:** acking an already-acked or unknown `commandId` still returns `{ "ok": true }`. A poller restart can't double-execute, but design your executor so the actual side effect (LED set / print) is safe to repeat.

### 4.3 `POST /hw/presence`
```ts
// request body (JSON)
{ "deviceId": string, "event": "approach" | "leave" }
// 200 OK
{ "ok": true }
```
- Fire-and-forget: each call inserts a `presence` row; B1 reacts via `presence.latest`. Debounce on the Pi side (e.g. one `approach` per person, then a `leave` when the zone clears) — Convex does not dedupe for you.

> **Baseline note:** no actuator commands are produced by the baseline pipeline (no LED/printer in the BOM cut). `/hw/poll` will usually return `[]`. The endpoints exist so B3's poll/ack loop and presence greet are wired and demoable now; B2 can enqueue `hwCommands` later without B3 changing anything.

---

## 5. The demoState view contract (co-owned: B2 defines the seam, B1 renders)

`demoState` is the single source of truth for the demo screen. GPT writes it via `show_view` / `highlight`; the iPad demo view subscribes via `demoState.bySession` and re-renders in <100ms. **No browser automation.**

```ts
type DemoView =
  | "home" | "churn" | "alerts" | "pricing" | "integrations" | "query-result";

// params is view-specific. All fields optional — render sensible defaults from
// local sample data when absent. Unknown params must be ignored, not crash.
type DemoParams =
  | HomeParams | ChurnParams | AlertsParams | PricingParams
  | IntegrationsParams | QueryResultParams;
```

| view | `params` shape | allowed `highlight` element ids |
|---|---|---|
| `home` | `{ greeting?: string }` | `hero`, `cta`, `nav-churn`, `nav-alerts`, `nav-pricing`, `nav-integrations` |
| `churn` | `{ segment?: string; period?: "7d"\|"30d"\|"90d"; cohort?: string }` | `churn-rate`, `at-risk-accounts`, `cohort-chart`, `save-action` |
| `alerts` | `{ severity?: "low"\|"medium"\|"high"; metric?: string }` | `alert-list`, `new-alert`, `threshold-config` |
| `pricing` | `{ plan?: "starter"\|"growth"\|"enterprise"; seats?: number }` | `plan-starter`, `plan-growth`, `plan-enterprise`, `cta-contact-sales` |
| `integrations` | `{ provider?: "salesforce"\|"segment"\|"snowflake"\|"slack"\|"hubspot" }` | `int-salesforce`, `int-segment`, `int-snowflake`, `int-slack`, `int-hubspot`, `connect-button` |
| `query-result` | `{ query: string; columns?: string[]; rows?: (string\|number)[][]; chart?: "line"\|"bar"\|"table" }` | `query-input`, `result-table`, `result-chart` |

```ts
interface HomeParams         { greeting?: string; }
interface ChurnParams        { segment?: string; period?: "7d"|"30d"|"90d"; cohort?: string; }
interface AlertsParams       { severity?: "low"|"medium"|"high"; metric?: string; }
interface PricingParams      { plan?: "starter"|"growth"|"enterprise"; seats?: number; }
interface IntegrationsParams { provider?: "salesforce"|"segment"|"snowflake"|"slack"|"hubspot"; }
interface QueryResultParams  { query: string; columns?: string[]; rows?: (string|number)[][]; chart?: "line"|"bar"|"table"; }
```

**Rules:**
- B1 owns the *visual* and the local sample data for each view. B2 owns the *names* (views, param keys, highlight ids). Adding a view or a highlight id is a co-owned change — agree before adding so the GPT prompt and the renderer stay in lockstep.
- `highlight` is sticky until changed; `show_view` does **not** auto-clear it (B2's `setDemoState` passes `highlight` through). Send `highlight:""`/omit to clear on a fresh `show_view`, or call `setHighlight` to move it.
- The model is told (system prompt) to only emit element ids from this table for the active view.

---

## 6. Mock while you wait (don't block on B2's pipeline)

A shared Convex dev deployment means everyone can seed dummy docs and build against real reactivity immediately.

### B1 (iPad) — build the demo view + card UI before the agent exists
1. Create a session: call `sessions.create({ deviceId: "ipad-1" })`, keep the id.
2. Drive the screen by hand: call `demoState.setDemoState({ sessionId, view: "churn", params: { period: "30d" }, highlight: "at-risk-accounts" })` from a debug button. Subscribe to `demoState.bySession` and confirm the view reacts.
3. Fake a filled card: `sessions.setNeeds(...)` + `sessions.captureContact(...)`, then read `sessions.get` to lay out the CRM fields.
4. B2 will load **golden sessions** (finished cards with fiber/score/badge/email — see `docs/BRAIN_DESIGN.md §8`); use those to build the badge screen without running the pipeline.
5. Wire the 6 tools (§3) against these mutations now; swap the model in later.

### B3 (Pi) — build the poll/ack/presence loop before any actuators exist
1. Presence first: `curl -XPOST https://<deployment>.convex.site/hw/presence -d '{"deviceId":"booth-1","event":"approach"}'`. Confirm B1's greet fires (or watch the `presence` table).
2. Poll loop: hit `GET /hw/poll?deviceId=booth-1` on a timer — expect `{ "commands": [] }`.
3. To exercise ack end-to-end before B2 enqueues anything, B2 can hand-insert one `hwCommands` row (`kind:"led"`) on request; you poll it, "execute" (log it), then `POST /hw/ack`. Verify a second poll no longer returns it.
4. Keep acks idempotent and side effects repeat-safe.

### Everyone
- Until the OpenAI/fiber/Resend keys are in Convex env, B2's actions return **stubbed/canned** results (fiber fallback payload, deterministic score/badge, no real email). The full loop still runs end-to-end on seed data — integrate against it now.

---

## 7. Schema notes / gaps (from B2)

- **No schema changes are required for the baseline.** Everything above maps onto `convex/schema.ts` as written.
- `demoState.setHighlight` (§1.8) and the `email.*` review functions (§2) are **new Convex functions**, not schema changes — they operate on existing fields (`demoState.highlight`, `sessions.reviewStatus`/`emailDraft`/`sentAt`).
- **Optional enhancement (not in baseline):** the dashboard would love a per-factor score breakdown (ICP/intent/engagement/authority/demo-depth). The schema has no field for it; B2 encodes the breakdown inside `confidenceReasons` strings instead (e.g. `"ICP fit 28/30: Series B B2B SaaS — dead-center target"`). If we later want structured bars, add an optional `confidenceFactors` object to `sessions` — flagged here so it's a conscious choice, not a surprise migration.
- `badge.ogImageId` is optional and **stays unused in baseline** (OG images are rendered on-demand by Next.js `next/og`, not pre-stored to Convex file storage — see `docs/DASHBOARD_DESIGN.md §4`).
- `referrerSessionId` is present but unused (viral-loop hook).

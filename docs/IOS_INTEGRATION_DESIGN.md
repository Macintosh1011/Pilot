# BoothPilot — iOS Integration Design (Builder 1 iPad ↔ Builder 2 Brain)

> **Owner:** Design/Planning agent. **Reader:** the GPT-5.5 implementation agent (Builder 1 side).
> **Status:** DESIGN ARTIFACT. This is a spec to implement from — it contains **no shippable Swift/TS**; the illustrative snippets are shape guidance only.
> **Contract source of truth:** `INTERFACES.md` (LOCKED) + `convex/schema.ts`. Cross-ref: `docs/BRAIN_DESIGN.md`. Every Convex name / arg / return below is copied from those — do not fork signatures.
> **Two phases, kept strictly separate:**
> - **Phase 1 (PRIORITY — build now):** keep the existing scripted, demo-safe SwiftUI UX exactly as-is, but have it **drive the real Convex backend alongside the script** so the dashboard + `/badge/<sessionId>` page fill in with live fiber data and a real Codex-generated badge. No on-device LLM/voice.
> - **Phase 2 (DESIGN ONLY — build LAST):** add the Vapi voice layer so a live spoken conversation drives the same backend calls. Reasoning brain stays Codex/GPT-5.5 (the Convex-side `finalize` worker).

---

## 0. Deployment facts (use verbatim)

| Thing | Value |
|---|---|
| Convex **client** URL (queries/mutations/actions, used by `ConvexClient`) | `https://jovial-wildebeest-931.convex.cloud` |
| Convex **HTTP actions** URL (`.site`, B3/Pi only — B1 does NOT use this) | `https://jovial-wildebeest-931.convex.site` |
| Dashboard badge page | `<dashboard-host>/badge/<sessionId>` (Next app) |
| `deviceId` convention | `ipad-1` (matches the seed sessions in `BRAIN_DESIGN.md §8`) |

> The `.convex.cloud` host is for the Swift `ConvexClient`. The `.convex.site` host is **only** for the Pi's raw HTTP `/hw/*` routes; the iPad never touches it. Don't mix them.

---

## 1. Confirmed SDK packages (verified against live registries/repos)

### Convex Swift client — `ConvexMobile` (Phase 1)
- **SPM URL:** `https://github.com/get-convex/convex-swift`
- **Latest released version:** **`0.8.1`** (tags confirmed: 0.8.1, 0.8.0, 0.7.0, 0.6.1, 0.6.0). Pin `from: 0.8.1`.
- **Library product name:** `ConvexMobile` (this is the module you `import`).
- **Platforms (from its `Package.swift`):** `.iOS(.v13)`, `.macOS(.v10_15)` → our **iOS 17** deployment target is fully supported.
- **How it works:** built on the official Convex **Rust** client (shipped as a prebuilt `libconvexmobile-rs.xcframework` binary target via UniFFI). Maintains a WebSocket and implements the full Convex sync protocol. Functions are referenced by the `"file:export"` string (e.g. `"sessions:create"`), exactly as `INTERFACES.md` lists for the Swift client.

### Vapi iOS SDK — `Vapi` (Phase 2)
- **SPM URL:** `https://github.com/VapiAI/ios`
- **Versioning:** the repo publishes **no version tags** → pin **`branch: "main"`** (or a specific commit `revision:` for reproducibility). Library product name: `Vapi`.
- **Platforms (from its `Package.swift`):** `.iOS(.v13)`, `.macOS(.v12)` → iOS 17 fine.
- **Transitive dependency:** `https://github.com/daily-co/daily-client-ios` (Daily/WebRTC, `from: 0.31.0`) — pulled automatically. Voice runs over WebRTC.

_(Details on each SDK's real API are in §4.1 (Convex) and §7.1 (Vapi).)_

---

## 2. SPM dependencies → `ios/project.yml` (xcodegen)

xcodegen declares SPM packages in a top-level `packages:` map and wires them to a target via `dependencies: - package: …`. Add the following.

**Phase 1 (add now — Convex only):**

```yaml
# ios/project.yml  (top level, e.g. after `options:`)
packages:
  ConvexMobile:
    url: https://github.com/get-convex/convex-swift
    from: "0.8.1"

targets:
  BoothPilot:
    # …existing keys…
    dependencies:
      - package: ConvexMobile
        product: ConvexMobile
```

**Phase 2 (add LATER, when wiring Vapi — keep commented/absent until then):**

```yaml
packages:
  ConvexMobile:
    url: https://github.com/get-convex/convex-swift
    from: "0.8.1"
  Vapi:
    url: https://github.com/VapiAI/ios
    branch: main          # no tags published; or use `revision: <sha>` to pin

targets:
  BoothPilot:
    dependencies:
      - package: ConvexMobile
        product: ConvexMobile
      - package: Vapi
        product: Vapi
```

Notes:
- After editing `project.yml`, always re-run `xcodegen generate` (see §8). The first `xcodebuild`/Xcode build resolves and fetches the packages (needs network).
- `ConvexMobile` is a **binary (xcframework) target** — first resolve downloads the prebuilt Rust framework. See the risk in §9 about the simulator slice.

---

## 3. Config — how the app learns its URLs (mirrors the old `BoothWebURL`)

The previous WebView shell read a `BoothWebURL` Info.plist key, overridable per-device with `defaults write dev.parkt.boothpilot BoothWebURL …`. The current prototype dropped that key (it has zero networking). Re-introduce the **same pattern** for the backend URLs.

### 3.1 Info.plist keys (declared in `project.yml` under `targets.BoothPilot.info.properties`)

```yaml
        # add alongside the existing CFBundleDisplayName / orientation keys
        BoothConvexURL: https://jovial-wildebeest-931.convex.cloud
        BoothDashboardURL: https://localhost:3000      # set to the DEPLOYED dashboard for a scannable QR (see §5 / §9)
        BoothDeviceId: ipad-1
        # Phase 2 only — assistant id is non-secret; the PUBLIC key is fetched from Convex at launch (§6.4)
        BoothVapiAssistantId: ""
```

### 3.2 Resolution order (a tiny `BoothConfig` enum)

For each key, resolve in this order so any device can be overridden without a rebuild — exactly like `BoothWebURL`:

1. `UserDefaults.standard.string(forKey: "BoothConvexURL")` — set per-device via `defaults write dev.parkt.boothpilot BoothConvexURL "…"`, an Xcode scheme env var, or MDM.
2. `Bundle.main.object(forInfoDictionaryKey: "BoothConvexURL")` — the baked-in default above.
3. A hardcoded fallback constant (`https://jovial-wildebeest-931.convex.cloud`) so the app is never URL-less.

Shape guidance (NOT shippable code):

```swift
enum BoothConfig {
    static func string(_ key: String, default fallback: String) -> String {
        if let v = UserDefaults.standard.string(forKey: key), !v.isEmpty { return v }
        if let v = Bundle.main.object(forInfoDictionaryKey: key) as? String, !v.isEmpty { return v }
        return fallback
    }
    static var convexURL: String    { string("BoothConvexURL",    default: "https://jovial-wildebeest-931.convex.cloud") }
    static var dashboardURL: String { string("BoothDashboardURL", default: "https://localhost:3000") }
    static var deviceId: String     { string("BoothDeviceId",     default: "ipad-1") }
}
```

> The Convex **client URL** is the only URL Phase 1 strictly needs. `BoothDashboardURL` is only used to build the QR string on the Badge screen (§5).

---

## 4. `BoothBackend` — the single observable service

One `@MainActor final class BoothBackend: ObservableObject` owns the `ConvexClient`, the current `sessionId`, and the live session subscription. The `Director` (or, in Phase 2, the Vapi event handler) calls its methods. **Every method is non-throwing and fire-and-forget** (it catches and swallows errors) so the on-stage UX can never stall — see §6.

### 4.1 The Convex Swift API surface (verified, v0.8.1)

- `ConvexClient(deploymentUrl: String)` — create **one** instance for the process lifetime.
- `func subscribe<T: Decodable>(to: String, with: [String: ConvexEncodable?]? = nil, yielding: T.Type? = nil) -> AnyPublisher<T, ClientError>` — reactive query. Consume via Combine `.sink` or `for await … in publisher.replaceError(with:).values`.
- `func mutation<T: Decodable>(_ name: String, with: [String: ConvexEncodable?]? = nil) async throws -> T` — and a discardable/`Void` form for `returns: null` functions.
- `func action<T: Decodable>(_ name: String, with: [String: ConvexEncodable?]? = nil) async throws -> T` — same shape as `mutation`.
- Errors thrown: `ClientError.ConvexError(data)` (app-thrown), `.ServerError(msg)`, `.InternalError(msg)`.
- Arg encoding: dictionaries of `ConvexEncodable?`. Built-in conformances cover `String`, `Bool`, `Int`, `Double`, arrays, nested `[String: ConvexEncodable?]`, and `nil` (→ JSON null). Swift `Int` is encoded as a Convex **integer**; `Double` as a Convex **float**. For our Phase 1 calls all args are strings / arrays of strings, so encoding is trivial.

### 4.2 ⚠️ Number DECODING gotcha (the #1 correctness risk — read this)

Convex `v.number()` fields are plain JS `number`s, which the Swift client receives as **Convex floats**, NOT plain JSON ints. You **must** annotate numeric fields in `Decodable` structs:

| Wire type (from `convex/schema.ts`) | Swift property wrapper |
|---|---|
| `v.number()` (e.g. `badge.stats[].value`, `confidence`, `createdAt`, `ts`, `updatedAt`, `_creationTime`) | `@ConvexFloat var x: Double` / `@OptionalConvexFloat var x: Double?` |
| (only if a field were `v.int64()` — none in our schema) | `@ConvexInt` / `@OptionalConvexInt` |

- Using `@ConvexInt` (or a bare `Int`/`Double`) on a `v.number()` field **fails to decode** → the subscription publisher emits an error → with `.replaceError(with: nil)` the card silently shows nothing. This is the most likely "why is my badge blank" bug.
- Properties using a wrapper **must be `var`** and need explicit `CodingKeys`.
- **Strategy:** only model the fields you actually render, and wrap every numeric one with `@ConvexFloat`/`@OptionalConvexFloat`. Convert to `Int` for display via a computed property (`var intValue: Int { Int(value) }`).
- Fields beginning with `_` (e.g. `_id`) need a `CodingKeys` alias (`case id = "_id"`).

### 4.3 Codable return/read types (Phase 1 needs only these)

```swift
// sessions.get → Session | null   (only the fields the iPad renders)
struct BoothSession: Decodable {
    let id: String
    let status: String                 // active|enriching|demoing|finalizing|done
    let visitorName: String?
    let company: String?
    let badge: BoothBadge?
    enum CodingKeys: String, CodingKey { case id = "_id", status, visitorName, company, badge }
}

struct BoothBadge: Decodable {
    let archetype: String
    let tagline: String
    let compliment: String
    let discountCode: String
    let stats: [BoothStat]
}

struct BoothStat: Decodable {
    let label: String
    @ConvexFloat var value: Double      // v.number() → MUST be @ConvexFloat, never @ConvexInt
    enum CodingKeys: String, CodingKey { case label, value }
    var intValue: Int { Int(value.rounded()) }
}

// fiber.lookupVisitor → { ok, fiberMatch, source }  (all strings/bool — no number gotcha)
struct LookupResult: Decodable { let ok: Bool; let fiberMatch: String; let source: String }

// demoState.bySession → DemoState | null  (OPTIONAL read; params is v.any() → skip or model per-view)
struct BoothDemoState: Decodable {
    let view: String
    let highlight: String?
    enum CodingKeys: String, CodingKey { case view, highlight }
}
```

> **`finalize` return is deliberately NOT modeled for rendering.** `finalize.finalize` returns a *preview* (`{ ok, confidence, badge, hasEmailDraft:false }`) computed from the deterministic fallback and **returns immediately**; the real Codex badge lands asynchronously on the `sessions` doc (Codex worker, or a 60s safety fallback). The Badge screen therefore renders from the `sessions.get` **subscription**, not from `finalize`'s return value. Call `finalize` fire-and-forget (ignore or loosely await its result).

### 4.4 Method specs (signature · Swift `"file:export"` · args · return)

`sessionId` is stored in `BoothBackend` after `createSession` and injected into every subsequent call (per `INTERFACES §0`). All methods guard `guard let sessionId else { return }` (except `createSession`) so that if session creation failed, every later call cleanly no-ops and the UX falls back to the local script.

| Method | Convex `"file:export"` | Type | Args dict (exact INTERFACES names) | Returns |
|---|---|---|---|---|
| `createSession()` | `"sessions:create"` | mutation | `["deviceId": BoothConfig.deviceId]` | `String` (the `Id<"sessions">`); store it, then call `subscribeToSession()` |
| `addMessage(role:text:)` | `"messages:add"` | mutation | `["sessionId": sessionId, "role": role, "text": text]` | `String` (msg id) — discard |
| `lookupVisitor(name:company:linkedinUrl:reveal:)` | `"fiber:lookupVisitor"` | action | `["sessionId": sessionId, "name": name?, "company": company?, "linkedinUrl": linkedinUrl?, "reveal": reveal]` (omit nils) | `LookupResult` — discard |
| `setNeeds(problems:useCase:urgency:urgencyEvidence:)` | `"sessions:setNeeds"` | mutation | `["sessionId": sessionId, "problems": [String], "useCase": useCase?, "urgency": urgency?, "urgencyEvidence": urgencyEvidence?]` | `null` (Void form) |
| `setDemoState(view:params:highlight:)` | `"demoState:setDemoState"` | mutation | `["sessionId": sessionId, "view": view, "params": params?, "highlight": highlight?]` | `null` (Void form) |
| `setHighlight(elementId:)` | `"demoState:setHighlight"` | mutation | `["sessionId": sessionId, "elementId": elementId]` | `null` (Void form) |
| `captureContact(email:phone:linkedinUrl:)` | `"sessions:captureContact"` | mutation | `["sessionId": sessionId, "email": email?, "phone": phone?, "linkedinUrl": linkedinUrl?]` | `null` (Void form) |
| `finalize()` | `"finalize:finalize"` | action | `["sessionId": sessionId]` | `{…}` preview — **ignore for rendering** |
| `subscribeToSession()` | `"sessions:get"` | query (reactive) | `["sessionId": sessionId]` | `AnyPublisher<BoothSession?, ClientError>` → assign to `@Published liveSession` |
| `subscribeToDemoState()` _(optional)_ | `"demoState:bySession"` | query (reactive) | `["sessionId": sessionId]` | `AnyPublisher<BoothDemoState?, ClientError>` |

- For `view` values pass the demoState enum strings from `INTERFACES §5`: `home|churn|alerts|pricing|integrations|query-result`. For `params`, pass a `[String: ConvexEncodable?]` (e.g. `["period": "30d"]`); unknown/empty params are fine.
- `params` is `v.any()` server-side, so a Swift dict encodes cleanly. Keep Phase 1 params to string/enum values to avoid the encode side of the number gotcha.

### 4.5 Observable shape (guidance)

```swift
@MainActor
final class BoothBackend: ObservableObject {
    static let shared = BoothBackend()
    private let client = ConvexClient(deploymentUrl: BoothConfig.convexURL)
    @Published private(set) var sessionId: String?
    @Published private(set) var liveSession: BoothSession?   // ← Badge screen reads this
    private var sessionCancellable: AnyCancellable?

    func createSession() async { /* try? mutation "sessions:create"; store id; subscribeToSession() */ }
    func subscribeToSession() {
        guard let sessionId else { return }
        sessionCancellable = client
            .subscribe(to: "sessions:get", with: ["sessionId": sessionId], yielding: BoothSession?.self)
            .replaceError(with: nil)
            .receive(on: DispatchQueue.main)
            .assign(to: \.liveSession, on: self)   // or .sink
    }
    // addMessage / lookupVisitor / setNeeds / setDemoState / setHighlight / captureContact / finalize:
    // each: guard sessionId; do { try await client.<mutation|action>(...) } catch { /* log + swallow */ }
}
```

Inject once at the root: `BoothView()` gets `@StateObject private var backend = BoothBackend.shared`, passed into the `Director` (or held as a singleton the `Director` reads).

---

## 5. Beat → backend mapping (drive the spine alongside the existing script)

The `Director` keeps its existing screens (`attract → greeting → qr → conversation → badge`), `Demo.beats` (7 beats, indices 0–6), `Demo.accounts`, and `AcmeDemoPanel(stage:)` (stage 0–3). We add **side-effect hooks** at three places: on screen transitions in `goTo(_:)`, on each beat change in `setBeat(_:)`/the beat timer, and on `stage` changes. The local timers remain the **sole** driver of what's on screen (§7).

### 5.1 Sample identity (QR is optional in Phase 1)

The script has no scanned LinkedIn. Inject a concrete identity consistent with the seed hero so the dashboard shows a coherent verified card:

- `name: "Maya Chen"`, `company: "Northwind Labs"`, `linkedinUrl: "https://www.linkedin.com/in/maya-chen-product"`.

### 5.2 Stage → demoState `view` mapping

`AcmeDemoPanel` is a single evolving churn board; map its `stage` to the locked `view` enum:

| `stage` | `setDemoState` `view` | `params` | notes |
|---|---|---|---|
| 0 | `home` | `["greeting": "…"]` (optional) | "listening for your use case" state |
| 1 | `churn` | `["period": "30d"]` | at-risk accounts begin to reveal |
| 2 | `churn` | `["period": "30d"]` + `setHighlight("at-risk-accounts")` | all 4 accounts + MRR-at-risk |
| 3 | `alerts` | `["severity": "high"]` | smart alerts toggle on; forecast bends |

Use the `home/churn/alerts` views and the allowed highlight ids from `INTERFACES §5` (`at-risk-accounts`, `churn-rate`, `save-action`, `alert-list`, …). Call `setDemoState` only when the mapped view changes (dedupe), and `setHighlight` for the pulse.

### 5.3 The full mapping (transition / beat → calls)

| Trigger (existing flow) | Backend call(s) | Args |
|---|---|---|
| `goTo(.conversation)` (greeting/qr → conversation, beat resets to 0) | `createSession()` then `subscribeToSession()`; then `lookupVisitor(reveal:false)` (the RESEARCH step) | create: `["deviceId":"ipad-1"]`; lookup: `["sessionId", "name":"Maya Chen", "company":"Northwind Labs", "reveal":false]` |
| Beat **0** — VISITOR "We're Series A — *churn* is quietly killing our growth." (stage 0) | `addMessage(visitor)` + `setNeeds` | msg text = the beat line (strip the `*`); needs: `["problems":["churn / retention","growth stalling"], "useCase":"reduce churn and protect growth", "urgency":"high", "urgencyEvidence":"churn is quietly killing our growth"]` |
| Beat **1** — BOOTHPILOT "A retention problem. Let me pull up the view…" (stage 0) | `addMessage(assistant)` | text = beat line |
| Beat **2** — BOOTHPILOT "This is *Acme Analytics* — tuned to your at-risk accounts…" (stage 1) | `addMessage(assistant)` + `setDemoState(view:"churn", params:["period":"30d"])` | — |
| Beat **3** — BOOTHPILOT "Four accounts… *$22.6k* of MRR at risk." (stage 2) | `addMessage(assistant)` + `setHighlight("at-risk-accounts")` | — |
| Beat **4** — VISITOR "Can my team get *pinged* before those accounts leave?" (stage 2) | `addMessage(visitor)` + `setNeeds` (append the alerts need) | needs: `["problems":["churn / retention","wants proactive churn alerts"], "useCase":"get pinged before accounts churn", "urgency":"high"]` |
| Beat **5** — BOOTHPILOT "Yes — *smart alerts* route the riskiest ones first…" (stage 3) | `addMessage(assistant)` + `setDemoState(view:"alerts", params:["severity":"high"])` + `captureContact` | contact: `["linkedinUrl":"https://www.linkedin.com/in/maya-chen-product"]` |
| Beat **6** — BOOTHPILOT "Love what you're building. Let me *mint your bookplate*…" (stage 3) | `addMessage(assistant)` + `finalize()` | finalize: `["sessionId"]` — call here so the pipeline has a head start before the Badge screen |
| `goTo(.badge)` | (no new write) Badge screen renders from `backend.liveSession` | — |
| `goTo(.attract)` (restart) | clear `sessionId`/`liveSession`, cancel subscription | — |

> **Why `finalize` at beat 6 (not on the Badge screen):** the Badge screen auto-advances after 30s, but `finalize`'s real result can take up to its 60s safety fallback. Kicking it at beat 6 (≈ one beat, ~4.6s, before the badge appears) maximizes the chance the real badge has landed; the mock badge covers the gap regardless (§6).

### 5.4 Badge screen must render the REAL badge

Replace the hardcoded constants in `BadgeScreen` (`visitorName`, `archetype`, `compliment`, `discountCode`, `stats`) with values from `backend.liveSession`:

- `archetype` ← `liveSession.badge.archetype`
- `compliment` ← `liveSession.badge.compliment`
- `discountCode` ← `liveSession.badge.discountCode`
- `visitorName` ← `liveSession.visitorName` (or the sample "Maya Chen")
- the three stat bars ← `liveSession.badge.stats` (`label` + `intValue`, `pct = value/100`)
- **QR** ← encode `"\(BoothConfig.dashboardURL)/badge/\(sessionId)"` (replaces the current `https://boothpilot.dev/b/<code>`), so scanning opens the live dashboard badge page.

If `liveSession?.badge` is `nil` when the screen appears, render the existing hardcoded mock badge, then **crossfade to the real values** if/when the subscription delivers them (the `badgeKey`/`.id()` machinery already re-renders on change). The finale therefore always looks complete (§6).

---

## 6. Demo-safety / offline fallback (NON-NEGOTIABLE)

The booth runs live on stage. The backend is driven **alongside** the script, never **gating** it. Rules the builder must follow exactly:

1. **Local timers are the only source of truth for screen advancement.** Do NOT make `goTo`, `tap()`, `setBeat`, `restartBeatTimer`, or the screen transitions `await` anything. The existing `DispatchQueue.main.asyncAfter` / `Timer` flow is untouched.
2. **All backend work is launched in a detached task and never awaited on the UX path:**
   ```swift
   // inside a Director hook — fire and move on
   Task { await BoothBackend.shared.addMessage(role: "assistant", text: line) }
   ```
   The beat advances on its own timer regardless of whether that task succeeds, fails, or hangs.
3. **Every method catches and swallows.** `do { try await client.mutation(…) } catch { /* optionally log; never rethrow */ }`. No backend error ever surfaces to SwiftUI.
4. **Subscriptions use `.replaceError(with: nil)`** so a query error degrades to "no live data" (→ mock badge), never a crash or stuck state.
5. **`sessionId` guard = automatic offline fallback.** If `createSession` failed (no network), `sessionId` stays `nil` and every later call early-returns. The run proceeds purely on `Demo.beats`/`Demo.accounts`/`AcmeDemoPanel(stage:)` — identical to today's prototype.
6. **No timeouts needed because nothing is awaited**, but if the builder ever *does* await (e.g. to read `lookupVisitor`), wrap it so a slow/unreachable Convex can't block: a detached task whose result is simply ignored if the screen has already moved on. The WebSocket auto-reconnects; mid-run reconnects just resume filling the dashboard.
7. **Badge screen never blanks:** render the hardcoded mock immediately; swap in `liveSession.badge` when/if it arrives. Worst case (offline) the audience sees the same beautiful scripted badge as today.
8. **Idempotency / re-runs:** on restart (`goTo(.attract)`), drop `sessionId` + `liveSession` and cancel the subscription so the next visitor gets a fresh card. `finalize` is safe to call once per session; don't call it twice.

Net effect: with Wi-Fi/Convex up, the dashboard + badge page fill in live; with them down, the on-stage experience is byte-for-byte the current demo.

---

## 7. Phase 2 — Vapi voice plan (DESIGN ONLY; implement LAST)

Goal: replace the scripted `Director` turns with a **live spoken conversation** that drives the *same* `BoothBackend` calls. The reasoning brain (scoring/badge/email) stays in the Convex `finalize` Codex worker — Phase 2 only changes how the *conversation* is produced and how tools fire.

### 7.1 Vapi iOS API (verified)
- `let vapi = Vapi(publicKey: <public key>)` (or `Vapi(configuration:)`).
- `try await vapi.start(assistantId: <id>, assistantOverrides: ["variableValues": [...]])` → `WebCallResponse`. Also `start(assistant: [String:Any], …)` for an inline assistant. Throws if a call is already active.
- `vapi.stop()`, `try await vapi.setMuted(_:)`, `vapi.send(message: VapiMessage)` (inject an `add-message` back into the live conversation — used to feed tool results to the model).
- Events: `vapi.eventPublisher: AnyPublisher<Vapi.Event, Never>`. Relevant cases: `.callDidStart`, `.callDidEnd`, `.transcript(Transcript)` (live STT, per role), `.toolCalls(ToolCalls)` and legacy `.functionCall(FunctionCall)` (the model's tool calls), `.toolCallsResult`, `.modelOutput`, `.speechUpdate`, `.userInterrupted`, `.error(Error)`.
- App setup: `Info.plist` already has `NSMicrophoneUsageDescription`; **add** `UIBackgroundModes` = `["voip", "audio"]` (Daily/WebRTC requirement).

### 7.2 Keys & config (keys already provisioned)
The Vapi keys are already stored in **Convex env** as `VAPI_PUBLIC_KEY` (publishable, safe on-device) and `VAPI_PRIVATE_KEY` (**server-only — never shipped to the app**).
- **The app reads the PUBLIC key at launch via a Convex query/action** — e.g. a small `config:vapiPublicKey` query (or fold it into an existing config call) that returns `process.env.VAPI_PUBLIC_KEY`. This keeps the publishable key out of the binary/Info.plist and lets it rotate server-side. (Builder 2 adds this tiny read-only Convex function; it returns only the *public* key.)
- The **private key never leaves Convex.** It is used only if/when tool calls are routed through a Convex HTTP action server-side (not the recommended path — see 7.4).
- `BoothVapiAssistantId` (non-secret) can stay an Info.plist/UserDefaults value, or also be returned by the same config query.
- **Do not hardcode or log key values anywhere.**

### 7.3 Where the conversation LLM lives — recommendation + trade-off
- **RECOMMENDED: a Vapi-native fast tool-calling model** configured on the assistant (Vapi orchestrates STT → LLM → TTS end-to-end). Lowest latency, most reliable real-time voice, native barge-in/interruption handling. The assistant's **system prompt = `BOOTH_SYSTEM_PROMPT`** and its **tools = the 6 tools**, both exported from `convex/llm/prompts.ts` (`INTERFACES §3`) so prompt + renderer stay in lockstep.
- **Alternative: route the conversation through Codex/GPT-5.5** via Vapi's "custom LLM" (OpenAI-compatible endpoint pointed at our Codex). **Trade-off:** one consistent brain/prompt with the finalize step, but it adds a network hop on every spoken turn → higher latency and another live-failure surface during the demo. For a booth/stage, voice responsiveness wins.
- **Decision:** Vapi-native model for the live conversation; **Codex/GPT-5.5 stays the brain for `finalize`** (scoring/badge/email) exactly as today. The transcript is still the ground truth, so every turn must be written via `messages.add` (see 7.5).

### 7.4 Tool-call → BoothBackend mapping (the 6 tools)
Configure the assistant's tools as the 6 from `INTERFACES §3` (`lookup_visitor`, `set_needs`, `show_view`, `highlight`, `capture_contact`, `finalize_session`), **omitting `sessionId`** (the app injects it).
- **RECOMMENDED transport: client-side, NO `serverUrl`.** When the assistant has no server URL, Vapi surfaces the tool call to the client (it lands in the message feed / `.toolCalls` event). The app's handler runs the same dispatch as `INTERFACES §3` pseudocode, injecting `sessionId`:
  - `lookup_visitor` → `BoothBackend.lookupVisitor(...)` → `"fiber:lookupVisitor"`
  - `set_needs` → `"sessions:setNeeds"`
  - `show_view` → `"demoState:setDemoState"`
  - `highlight` → `"demoState:setHighlight"`
  - `capture_contact` → `"sessions:captureContact"`
  - `finalize_session` → `"finalize:finalize"`
  Then return the small JSON result to the model via `vapi.send(message:)` (an `add-message`/tool result) so it can keep talking. This reuses the exact Phase-1 `BoothBackend` path and keeps `sessionId` injection on-device.
- _(Less preferred)_ Set the assistant `serverUrl` to a Convex **HTTP action** (`.convex.site`) that executes tools server-side. Only worthwhile if you want zero client tool logic; it complicates `sessionId` handoff and adds the private-key/server surface. Default to the client-side path.

### 7.5 What changes in the app
- **Replace the scripted `Director` timers** (the `greeting`/`qr`/`conversation` beat advancement) with **Vapi-event-driven** state:
  - `.callDidStart` → move to greeting/conversation; drive the `Spark` mode from `.speechUpdate`/`.modelOutput` (speaking) vs `.transcript` of the visitor (listening).
  - `.transcript` (final, per role) → `BoothBackend.addMessage(role:text:)` so the transcript ground-truth is preserved for scoring/badge/email.
  - `.toolCalls` `show_view`/`highlight` → update `AcmeDemoPanel` (map view→stage, or render `params` directly) **and** call `setDemoState`/`setHighlight`.
  - `finalize_session` tool → trigger the Badge screen (which still renders from `sessions.get`).
  - `.callDidEnd`/`.error` → graceful exit / restart.
- **Keep `Demo.beats` as an explicit fallback path.** If there is no Vapi public key, the call fails to start, or `.error` fires, fall back to the existing timer-driven script. Same `BoothBackend` calls either way.
- **Keep all of §6's demo-safety rules.** Voice failures must degrade to the scripted demo, never a dead booth.
- Implement this **only after Phase 1 is green** and the key path (7.2) is confirmed.

---

## 8. Verification plan

### 8.1 Regenerate + compile headlessly

```bash
cd /Users/akhilnagori/Documents/Pilot/ios
xcodegen generate          # rewrites BoothPilot.xcodeproj from project.yml (incl. SPM packages)

xcodebuild \
  -project BoothPilot.xcodeproj \
  -scheme BoothPilot \
  -destination 'platform=iOS Simulator,name=iPad Pro (11-inch)' \
  build
```

- First build resolves/fetches the SPM packages (needs network) and downloads the `ConvexMobile` xcframework. If you see `Could not resolve package dependencies`, re-run with network or add `-disableAutomaticPackageResolution` after a manual resolve.
- If `iPad Pro (11-inch)` isn't an exact match on this machine, list installed names and substitute:
  ```bash
  xcrun simctl list devices available | grep -i 'iPad Pro'
  ```
  (e.g. `iPad Pro 11-inch (M4)` or `iPad Pro (11-inch) (4th generation)`).
- A clean compile of the Convex wiring confirms the Codable structs decode (watch for the §4.2 number gotcha — a decode mismatch shows at runtime, not compile time, so also do 8.2).

### 8.2 Run the hybrid in the simulator while the dashboard fills in

1. Confirm the Convex dev deployment is live (B2): the client URL `https://jovial-wildebeest-931.convex.cloud` responds. Optionally `npx convex dev` running in `convex/`.
2. Open the dashboard (deployed, or `cd dashboard && pnpm dev`): the sessions list, a session card, and `/<host>/badge/<sessionId>`.
3. Build + launch the app in the iPad simulator (Product → Run in Xcode, or `xcrun simctl launch booted dev.parkt.boothpilot`).
4. Let the scripted run play (or tap to advance). **Watch the dashboard:** a new card appears on `createSession`; `status` walks `active → enriching → demoing → finalizing → done`; `fiber`/`fiberMatch` (Maya Chen · Northwind Labs · verified) populate; `problems`/`useCase`/`urgency` fill from `setNeeds`; `demoShown` grows (`churn`, `alerts`); the events timeline streams; and on `finalize`, the badge + email draft land. The `/badge/<sessionId>` page renders the real archetype/tagline/compliment/stats/discountCode.
5. **Demo-safety check:** turn off Wi-Fi (or point `BoothConvexURL` at a bad host via `defaults write dev.parkt.boothpilot BoothConvexURL "https://invalid.example"`) and re-run — the on-stage UX must be unchanged (scripted beats + mock badge), with no stalls or errors.
6. Quick screen checks use the existing launch args, e.g. `-screen badge` / `-screen conversation -beat 3`.

### 8.3 (Phase 2) Voice check — only after keys/SDK wired
- Confirm the app fetches the public key from Convex at launch (no key in the binary), `vapi.start(...)` connects (`.callDidStart`), transcripts append via `messages.add`, and a `show_view` tool call moves the demo + writes `demoState`. Pull the network and confirm fallback to the scripted `Director`.

---

## 9. Key decisions the builder MUST follow + risks

### Decisions (do these exactly)
1. **Add `ConvexMobile` (`get-convex/convex-swift`, `from: "0.8.1"`, product `ConvexMobile`) now; add `Vapi` (`VapiAI/ios`, `branch: main`, product `Vapi`) only in Phase 2.**
2. **One `ConvexClient`** for the app lifetime, inside a single `@MainActor` `BoothBackend: ObservableObject`. URLs come from `BoothConfig` (UserDefaults → Info.plist → constant), mirroring the old `BoothWebURL`.
3. **`sessionId` is created once per visitor (`sessions:create`) and injected into every other call**; the model (Phase 2) never sees it.
4. **Backend is driven alongside the script and is always fire-and-forget** (detached `Task`, catch-and-swallow, `sessionId` guard). Local timers remain the sole screen driver. (§6)
5. **Numeric Convex fields decode with `@ConvexFloat`/`@OptionalConvexFloat`, never `@ConvexInt`** (schema uses `v.number()`). Model only the fields you render; alias `_id` via `CodingKeys`. (§4.2)
6. **The Badge screen renders the REAL badge from the `sessions:get` subscription**, with the mock as the always-present fallback. Call `finalize` at beat 6 (not on the Badge screen). The QR encodes `<BoothDashboardURL>/badge/<sessionId>`.
7. **Phase 2 public key is fetched from Convex at launch; private key stays server-side; never print/commit key values.**

### Risks
- **[High] Number decoding.** `@ConvexInt` on a `v.number()` field throws at runtime and (with `.replaceError`) silently blanks the card. Use `@ConvexFloat`/`@OptionalConvexFloat`. This is the most likely "badge is empty" bug.
- **[Med] `ConvexMobile` is a prebuilt Rust xcframework binary target.** It must include an iOS-Simulator slice (incl. Apple-Silicon `arm64-simulator`) for `xcodebuild -destination 'platform=iOS Simulator…'` to link. v0.8.1 ships universal slices, but if the simulator build fails to find the module, build/run on a device or a different sim arch and report it. First resolve needs network.
- **[Med] `finalize` returns a preview, not the final badge.** The real badge arrives async (Codex worker or 60s fallback) on the `sessions` doc. Never render from `finalize`'s return; always read `sessions:get`. Because the Badge screen dwells 30s < 60s fallback, kick `finalize` early (beat 6) and keep the mock visible until the real badge lands.
- **[Med] Dashboard URL for the QR.** `BoothDashboardURL` defaults to localhost; for an off-device scannable QR it must point at the **deployed** Next dashboard. Flagged in §3.
- **[Low] `.cloud` vs `.site` mix-up.** B1 uses `.convex.cloud` (ConvexClient) only; `.convex.site` is the Pi's HTTP host.
- **[Low/Phase 2] Vapi has no version tags** → pin `branch: main` (or a commit `revision:` for reproducibility); it pulls in `daily-client-ios` (WebRTC) and needs `UIBackgroundModes` = `[voip, audio]`. Tool-calls without a `serverUrl` are surfaced client-side (confirmed behavior) — the recommended path.
- **[Low] iOS 17 / Swift concurrency.** ConvexMobile supports iOS 13+ and its calls are safe from the main actor; the reactive publisher must be observed for the lifetime of the view/`ObservableObject` or the subscription cancels. Keep `BoothBackend` alive for the app lifetime.

---

## Appendix — file/function quick reference (from the locked contract)

| Phase-1 call | Swift string | Type | Returns |
|---|---|---|---|
| create session | `"sessions:create"` | mutation | `Id<"sessions">` (String) |
| read card (reactive) | `"sessions:get"` | query | `Session \| null` |
| append turn | `"messages:add"` | mutation | `Id<"messages">` |
| fiber enrich | `"fiber:lookupVisitor"` | action | `{ ok, fiberMatch, source }` |
| record needs | `"sessions:setNeeds"` | mutation | `null` |
| drive demo view | `"demoState:setDemoState"` | mutation | `null` |
| pulse element | `"demoState:setHighlight"` | mutation | `null` |
| read demo view (optional) | `"demoState:bySession"` | query | `DemoState \| null` |
| capture contact | `"sessions:captureContact"` | mutation | `null` |
| score→badge→email | `"finalize:finalize"` | action | `{ ok, confidence, badge, hasEmailDraft }` (preview) |


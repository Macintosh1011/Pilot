import Foundation
import Combine
import ConvexMobile

// MARK: - Live documents (the subset of B2's Convex schema the iPad renders)
// Field names + function paths mirror INTERFACES.md / convex/schema.ts exactly — the locked contract.

/// One at-risk account the agent can stream into the live dashboard. All strings so they decode
/// cleanly regardless of how the model formats numbers; `risk` is parsed to an Int at render time.
struct ParamAccount: Decodable {
    var name: String?
    var mrr: String?
    var signal: String?
    var risk: String?

    enum CodingKeys: String, CodingKey { case name, mrr, signal, risk }
    init(from decoder: Decoder) throws {
        let c = try decoder.container(keyedBy: CodingKeys.self)
        name = try? c.decode(String.self, forKey: .name)
        mrr = try? c.decode(String.self, forKey: .mrr)
        signal = try? c.decode(String.self, forKey: .signal)
        risk = try? c.decode(String.self, forKey: .risk)
    }
}

/// The visitor's own numbers, streamed by the agent's `show_view` params so the Acme dashboard
/// mirrors their business live. Every field optional + per-field-tolerant: a malformed value
/// drops to nil (the panel falls back to its defaults) rather than failing the whole decode.
struct DemoParams: Decodable {
    var netMrr: String?
    var churnRate: String?
    var mrrAtRisk: String?
    var series: String?
    var headline: String?
    var accounts: [ParamAccount]?

    enum CodingKeys: String, CodingKey { case netMrr, churnRate, mrrAtRisk, series, headline, accounts }
    init(from decoder: Decoder) throws {
        let c = try decoder.container(keyedBy: CodingKeys.self)
        netMrr = try? c.decode(String.self, forKey: .netMrr)
        churnRate = try? c.decode(String.self, forKey: .churnRate)
        mrrAtRisk = try? c.decode(String.self, forKey: .mrrAtRisk)
        series = try? c.decode(String.self, forKey: .series)
        headline = try? c.decode(String.self, forKey: .headline)
        accounts = try? c.decode([ParamAccount].self, forKey: .accounts)
    }
}

struct DemoStateDoc: Decodable {
    let view: String
    let highlight: String?
    let params: DemoParams?

    enum CodingKeys: String, CodingKey { case view, highlight, params }
    init(from decoder: Decoder) throws {
        let c = try decoder.container(keyedBy: CodingKeys.self)
        view = try c.decode(String.self, forKey: .view)
        highlight = try? c.decode(String.self, forKey: .highlight)
        // Isolate params: a bad params blob must never drop `view` (which drives navigation).
        params = try? c.decode(DemoParams.self, forKey: .params)
    }
}

/// A badge stat. `value` is `v.number()` → a Convex float, so it MUST decode via `@ConvexFloat`
/// (a bare `Double` throws on the `{"$float": …}` wire form → blank badge). See IOS_INTEGRATION_DESIGN §4.2.
struct BadgeStat: Decodable {
    let label: String
    @ConvexFloat var value: Double
    enum CodingKeys: String, CodingKey { case label, value }
    var intValue: Int { Int(value.rounded()) }
}

/// The public Booth Badge (lives under `sessions.badge`).
struct BadgeDoc: Decodable {
    let archetype: String
    let tagline: String
    let compliment: String
    let discountCode: String
    let stats: [BadgeStat]
}

/// The CRM card (`sessions.get`) — only the fields the iPad renders. `visitorName` is a
/// top-level session field; the badge nests under it.
struct BoothSession: Decodable {
    let status: String?
    let visitorName: String?
    let company: String?
    let badge: BadgeDoc?
}

// Action return shapes (INTERFACES §1.5 / §1.10). All fields optional so the decode never
// throws — the real results land on the card and arrive via the `liveSession` subscription.
private struct LookupResult: Decodable { let ok: Bool?; let fiberMatch: String?; let source: String? }
private struct FinalizeResult: Decodable { let ok: Bool?; let hasEmailDraft: Bool? }

/// Convex function paths ("module:export"), verbatim from INTERFACES §1.
private enum Fn {
    static let createSession = "sessions:create"      // mutation → Id<"sessions">
    static let addMessage = "messages:add"            // mutation
    static let setNeeds = "sessions:setNeeds"         // mutation  (GPT set_needs)
    static let setDemoState = "demoState:setDemoState" // mutation  (GPT show_view)
    static let setHighlight = "demoState:setHighlight" // mutation  (GPT highlight)
    static let captureContact = "sessions:captureContact" // mutation (GPT capture_contact)
    static let lookupVisitor = "fiber:lookupVisitor"  // action    (GPT lookup_visitor)
    static let finalize = "finalize:finalize"         // action    (GPT finalize_session)
    static let watchSession = "sessions:get"          // query
    static let watchDemoState = "demoState:bySession" // query
}

/// The single observable backend service. Owns one `ConvexClient` for the app lifetime, the
/// current `sessionId`, and the live `sessions.get` subscription that the Badge screen reads.
///
/// Driven **alongside** the scripted UX, never gating it: every method is fire-and-forget,
/// guards `sessionId`, and swallows errors, so a slow/offline Convex degrades to the local
/// script + mock badge with no stalls (IOS_INTEGRATION_DESIGN §6). B1 owns `sessionId` and
/// injects it into every call — the model (Phase 2) never sees it.
@MainActor
final class BoothBackend: ObservableObject {
    @Published private(set) var liveSession: BoothSession?   // ← Badge screen reads this
    @Published private(set) var sessionId: String?
    @Published var demoView: String?                         // Phase 2 voice demo drive
    @Published var demoHighlight: String?
    @Published var demoParams: DemoParams?                    // live numbers → Acme dashboard

    private let client: ConvexClient
    private var sessionCancellables = Set<AnyCancellable>()

    init() {
        client = ConvexClient(deploymentUrl: BoothConfig.convexURL)
    }

    private func subscribeToSession(_ id: String) {
        client.subscribe(to: Fn.watchSession, with: ["sessionId": id], yielding: BoothSession?.self)
            .replaceError(with: nil)
            .receive(on: DispatchQueue.main)
            .sink { [weak self] in self?.liveSession = $0 }
            .store(in: &sessionCancellables)

        client.subscribe(to: Fn.watchDemoState, with: ["sessionId": id], yielding: DemoStateDoc?.self)
            .replaceError(with: nil)
            .receive(on: DispatchQueue.main)
            .sink { [weak self] doc in
                self?.demoView = doc?.view
                self?.demoHighlight = doc?.highlight
                self?.demoParams = doc?.params
            }
            .store(in: &sessionCancellables)
    }

    /// Drop the current session so the next visitor gets a fresh card.
    func reset() {
        sessionCancellables.removeAll()
        sessionId = nil
        liveSession = nil
        demoView = nil
        demoHighlight = nil
        demoParams = nil
    }

    // MARK: - Tool surface (sessionId injected here; all fire-and-forget)

    func createSession() async {
        do {
            let id: String = try await client.mutation(Fn.createSession, with: ["deviceId": BoothConfig.deviceId])
            sessionId = id
            subscribeToSession(id)
        } catch { print("[Convex] createSession:", error) }
    }

    /// Persist a transcript turn — scoring/badge/email read this as ground truth (INTERFACES §1.3).
    func addMessage(role: String, text: String) async {
        guard let id = sessionId, !text.isEmpty else { return }
        try? await client.mutation(Fn.addMessage, with: ["sessionId": id, "role": role, "text": text])
    }

    func setNeeds(problems: [String], useCase: String? = nil,
                  urgency: String? = nil, urgencyEvidence: String? = nil) async {
        guard let id = sessionId else { return }
        var args: [String: ConvexEncodable?] = [
            "sessionId": id,
            "problems": problems.map { $0 as ConvexEncodable? },
        ]
        if let useCase { args["useCase"] = useCase }
        if let urgency { args["urgency"] = urgency }
        if let urgencyEvidence { args["urgencyEvidence"] = urgencyEvidence }
        try? await client.mutation(Fn.setNeeds, with: args)
    }

    func showView(_ view: String, params: [String: ConvexEncodable?]? = nil) async {
        guard let id = sessionId else { return }
        var args: [String: ConvexEncodable?] = ["sessionId": id, "view": view]
        if let params { args["params"] = params }
        try? await client.mutation(Fn.setDemoState, with: args)
    }

    func setHighlight(_ elementId: String) async {
        guard let id = sessionId else { return }
        try? await client.mutation(Fn.setHighlight, with: ["sessionId": id, "elementId": elementId])
    }

    func captureContact(email: String? = nil, phone: String? = nil, linkedinUrl: String? = nil) async {
        guard let id = sessionId else { return }
        var args: [String: ConvexEncodable?] = ["sessionId": id]
        if let email { args["email"] = email }
        if let phone { args["phone"] = phone }
        if let linkedinUrl { args["linkedinUrl"] = linkedinUrl }
        try? await client.mutation(Fn.captureContact, with: args)
    }

    func lookupVisitor(name: String? = nil, company: String? = nil,
                       linkedinUrl: String? = nil, reveal: Bool? = nil) async {
        guard let id = sessionId else { return }
        var args: [String: ConvexEncodable?] = ["sessionId": id]
        if let name { args["name"] = name }
        if let company { args["company"] = company }
        if let linkedinUrl { args["linkedinUrl"] = linkedinUrl }
        if let reveal { args["reveal"] = reveal }
        let _: LookupResult? = try? await client.action(Fn.lookupVisitor, with: args)
    }

    /// Score → badge → email draft. Returns a preview immediately; the real Codex badge lands
    /// async on the card and arrives via `liveSession`. Never render from this return.
    func finalize() async {
        guard let id = sessionId else { return }
        let _: FinalizeResult? = try? await client.action(Fn.finalize, with: ["sessionId": id])
    }
}

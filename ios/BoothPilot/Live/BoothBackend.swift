import Foundation
import Combine
import ConvexMobile

// MARK: - Live documents (the subset of B2's Convex schema the iPad renders)
// Field names + function paths mirror INTERFACES.md exactly — that doc is the locked contract.

struct DemoStateDoc: Decodable {
    let view: String
    let highlight: String?
}

struct PresenceDoc: Decodable {
    let event: String   // "approach" | "leave"
}

/// Badge stat. B2's schema stores `value` as `v.number()` → float64, so it decodes as Double.
struct BadgeStat: Decodable {
    let label: String
    let value: Double
}

/// The public Booth Badge (lives under `sessions.badge`). `visitorName` is NOT here —
/// it's a top-level session field, surfaced separately by the backend.
struct BadgeDoc: Decodable {
    let archetype: String
    let tagline: String
    let compliment: String
    let discountCode: String
    let stats: [BadgeStat]
}

private struct SessionDoc: Decodable {
    let visitorName: String?
    let badge: BadgeDoc?
}

// Action return shapes (INTERFACES.md §1.5 / §1.10). All fields optional so the decode
// never throws — the badge/enrichment land on the card and arrive via the subscriptions.
private struct LookupResult: Decodable { let ok: Bool?; let fiberMatch: String?; let source: String? }
private struct FinalizeResult: Decodable { let ok: Bool?; let confidence: Double?; let badge: BadgeDoc?; let hasEmailDraft: Bool? }

/// Convex function paths ("module:export"), verbatim from INTERFACES.md §1.
private enum Fn {
    static let createSession = "sessions:create"      // mutation
    static let addMessage = "messages:add"            // mutation
    static let setNeeds = "sessions:setNeeds"         // mutation  (GPT set_needs)
    static let setDemoState = "demoState:setDemoState" // mutation  (GPT show_view)
    static let setHighlight = "demoState:setHighlight" // mutation  (GPT highlight)
    static let captureContact = "sessions:captureContact" // mutation (GPT capture_contact)
    static let lookupVisitor = "fiber:lookupVisitor"  // action    (GPT lookup_visitor)
    static let finalize = "finalize:finalize"         // action    (GPT finalize_session)
    static let watchDemoState = "demoState:bySession" // query
    static let watchPresence = "presence:latest"      // query
    static let watchSession = "sessions:get"          // query
}

/// The realtime spine. Subscribes to presence / demoState / session badge and exposes the
/// mutations + actions the voice loop calls as GPT tools. Nil unless a Convex URL is
/// configured, so the booth runs fully offline without it. B1 owns `sessionId` and injects
/// it into every call (the model never sees it — INTERFACES.md §0).
@MainActor
final class BoothBackend: ObservableObject {
    @Published var presenceEvent: String?
    @Published var demoView: String?
    @Published var demoHighlight: String?
    @Published var badge: BadgeDoc?
    @Published var visitorName: String?
    @Published private(set) var sessionId: String?

    private let client: ConvexClient
    private let deviceId: String
    private var cancellables = Set<AnyCancellable>()

    init?(deviceId: String) {
        guard let url = Secrets.convexURL else { return nil }
        client = ConvexClient(deploymentUrl: url.absoluteString)
        self.deviceId = deviceId
    }

    /// Watch for someone approaching this device (greet on "approach").
    func startWatchingPresence() {
        client.subscribe(to: Fn.watchPresence, with: ["deviceId": deviceId], yielding: PresenceDoc?.self)
            .replaceError(with: nil)
            .receive(on: DispatchQueue.main)
            .sink { [weak self] in self?.presenceEvent = $0?.event }
            .store(in: &cancellables)
    }

    private func watch(session id: String) {
        client.subscribe(to: Fn.watchDemoState, with: ["sessionId": id], yielding: DemoStateDoc?.self)
            .replaceError(with: nil)
            .receive(on: DispatchQueue.main)
            .sink { [weak self] doc in self?.demoView = doc?.view; self?.demoHighlight = doc?.highlight }
            .store(in: &cancellables)

        client.subscribe(to: Fn.watchSession, with: ["sessionId": id], yielding: SessionDoc?.self)
            .replaceError(with: nil)
            .receive(on: DispatchQueue.main)
            .sink { [weak self] in self?.badge = $0?.badge; self?.visitorName = $0?.visitorName }
            .store(in: &cancellables)
    }

    // MARK: - Tool surface (called by the voice loop on GPT tool calls; sessionId injected here)

    func createSession() async {
        do {
            let id: String = try await client.mutation(Fn.createSession, with: ["deviceId": deviceId])
            sessionId = id
            watch(session: id)
        } catch { print("[Convex] createSession:", error) }
    }

    /// Persist a transcript turn — scoring/badge/email read this as ground truth (INTERFACES.md §1.3).
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

    func showView(_ view: String) async {
        guard let id = sessionId else { return }
        try? await client.mutation(Fn.setDemoState, with: ["sessionId": id, "view": view])
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

    func finalize() async {
        guard let id = sessionId else { return }
        let _: FinalizeResult? = try? await client.action(Fn.finalize, with: ["sessionId": id])
    }
}

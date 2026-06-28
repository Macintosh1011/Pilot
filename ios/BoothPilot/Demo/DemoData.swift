import SwiftUI
import Combine

enum Screen { case attract, greeting, conversation, qr, badge }

struct Beat {
    let step: Int          // which MEET·UNDERSTAND·SHOW·BADGE step is active
    let spark: SparkMode
    let speaker: String
    let line: String       // *starred* spans render in clay
    let stage: Int         // drives how much of the Acme demo is revealed
}

struct Account: Identifiable {
    let name: String
    let initials: String
    let mrr: String
    let signal: String
    let risk: Int
    var id: String { name }
}

enum Demo {
    static let beats: [Beat] = [
        Beat(step: 0, spark: .listening, speaker: "VISITOR",
             line: "“We’re Series A — *churn* is quietly killing our growth.”", stage: 0),
        Beat(step: 1, spark: .thinking, speaker: "BOOTHPILOT",
             line: "A retention problem. Let me pull up the view that *actually matters* for you.", stage: 0),
        Beat(step: 1, spark: .speaking, speaker: "BOOTHPILOT",
             line: "This is *Acme Analytics* — tuned to your at-risk accounts, not vanity metrics.", stage: 1),
        Beat(step: 2, spark: .speaking, speaker: "BOOTHPILOT",
             line: "Four accounts are flashing churn signals this week — *$22.6k* of MRR at risk.", stage: 2),
        Beat(step: 2, spark: .listening, speaker: "VISITOR",
             line: "“Can my team get *pinged* before those accounts actually leave?”", stage: 2),
        Beat(step: 3, spark: .speaking, speaker: "BOOTHPILOT",
             line: "Yes — *smart alerts* route the riskiest ones to your team first. Watch the forecast bend.", stage: 3),
        Beat(step: 3, spark: .thinking, speaker: "BOOTHPILOT",
             line: "Love what you’re building. Let me *mint your bookplate*…", stage: 3),
    ]

    static let accounts: [Account] = [
        Account(name: "Northwind Trading", initials: "NT", mrr: "$4.2k", signal: "Usage down 64% MoM", risk: 92),
        Account(name: "Globex Corp", initials: "GX", mrr: "$8.9k", signal: "No admin login in 12 days", risk: 87),
        Account(name: "Initech", initials: "IN", mrr: "$3.1k", signal: "Support tickets spiking", risk: 81),
        Account(name: "Soylent Inc", initials: "SY", mrr: "$6.4k", signal: "Seats down 40% this quarter", risk: 76),
    ]

    static func riskColor(_ r: Int) -> Color {
        r >= 88 ? .rust : r >= 80 ? .clay : .tan
    }

    static func visibleCount(stage: Int) -> Int {
        stage <= 0 ? 0 : stage == 1 ? 2 : 4
    }

    /// Maps a live Convex `demoState.view` (set by GPT's `show_view` tool) to how much
    /// of the Acme panel is revealed. The view vocabulary is agreed between B1 and B2.
    static func stage(forView view: String?) -> Int {
        switch view {
        case "home", "pricing", "integrations": return 1
        case "churn", "query-result": return 2
        case "alerts": return 3
        default: return 0
        }
    }
}

/// Drives the booth through its states. With Convex + a Vapi public key configured it runs
/// LIVE: a tap starts the greet, the voice loop drives the spark + caption, GPT
/// tool calls write `demoState`, and the finished badge comes from Convex. With no
/// secrets it runs the hands-free offline demo (canned beats; tap to skip forward).
@MainActor
final class Director: ObservableObject {
    @Published var screen: Screen = .attract
    @Published var beat = 0
    @Published var badgeKey = 1
    @Published var linkedInURL: String?

    /// One Convex client for the app lifetime. Always present (real deployment URL baked into
    /// `BoothConfig`); its calls no-op cleanly when offline, so the booth never stalls.
    let backend = BoothBackend()
    /// Single front-camera session shared by the QR screen and the conversation PiP, so the
    /// preview never restarts between screens. Owned here for the app lifetime (live mode).
    let camera = FrontCameraSession()
    /// Live voice loop — nil unless a Vapi public key is configured. `nil` ⇒ scripted Phase 1.
    let voice: VapiVoice?
    private var cancellables = Set<AnyCancellable>()
    private var transition: DispatchWorkItem?
    private var beatTimer: Timer?

    /// Live voice experience (Phase 2). Phase 1 (no key) runs the scripted UX + live backend.
    var live: Bool { voice != nil }

    init() {
        voice = VapiVoice(backend: backend)
        // Republish backend + camera changes so dependent screens re-render (live card, camera ready).
        backend.objectWillChange.sink { [weak self] in self?.objectWillChange.send() }.store(in: &cancellables)
        camera.objectWillChange.sink { [weak self] in self?.objectWillChange.send() }.store(in: &cancellables)
        if live {
            observeLive()
        }
        // Both modes open on the welcome screen. Nothing — camera, session, or voice — starts
        // until the visitor taps START. (A launch arg can still jump straight to a screen for dev.)
        applyLaunchScreen()
    }

    private func observeLive() {
        guard let voice else { return }
        voice.objectWillChange.sink { [weak self] in self?.objectWillChange.send() }.store(in: &cancellables)

        voice.$finalized.filter { $0 }.receive(on: RunLoop.main)
            .sink { [weak self] _ in if self?.screen != .badge { self?.goTo(.badge) } }.store(in: &cancellables)

        backend.$liveSession.compactMap { $0?.badge }.receive(on: RunLoop.main)
            .sink { [weak self] _ in if self?.screen != .badge { self?.goTo(.badge) } }.store(in: &cancellables)

        // Agent asked for a pose (capture_photo) → snap a front-camera frame and upload it.
        backend.$liveSession.compactMap { $0?.photoRequestedAt }.removeDuplicates()
            .receive(on: RunLoop.main)
            .sink { [weak self] _ in self?.snapBoothPhoto() }.store(in: &cancellables)
    }

    private func snapBoothPhoto() {
        Task { [weak self] in
            guard let self, let data = await self.camera.capturePhoto() else { return }
            await self.backend.uploadPhoto(data)
        }
    }

    /// Dev: `simctl launch … -screen badge [-beat 6]` boots straight into a frozen screen.
    /// `-autostart` instead runs the full scripted flow from attract (greet → … → badge) hands-free,
    /// useful for a headless demo loop or verifying the live backend drive end to end.
    /// Returns true if a launch argument took control of the initial screen.
    @discardableResult
    private func applyLaunchScreen() -> Bool {
        let args = ProcessInfo.processInfo.arguments
        if args.contains("-autostart") {
            DispatchQueue.main.async { self.goTo(.greeting) }
            return true
        }
        guard let i = args.firstIndex(of: "-screen"), i + 1 < args.count else { return false }
        let map: [String: Screen] = [
            "attract": .attract, "greeting": .greeting, "conversation": .conversation,
            "qr": .qr, "badge": .badge,
        ]
        guard let s = map[args[i + 1]] else { return false }
        screen = s
        if let j = args.firstIndex(of: "-beat"), j + 1 < args.count, let b = Int(args[j + 1]) {
            beat = b
        } else if s == .conversation {
            beat = lastBeat
        }
        return true
    }

    /// Idempotent — starts the shared front camera once, routing scans to the agent flow.
    private func startCameraIfNeeded() {
        camera.start(onCode: { [weak self] in self?.captureLinkedIn($0) })
    }

    var current: Beat { Demo.beats[min(beat, Demo.beats.count - 1)] }
    var lastBeat: Int { Demo.beats.count - 1 }

    // MARK: - What the screens render (live vs offline)

    var displaySpark: SparkMode {
        if live, screen == .conversation { return voice?.spark ?? .idle }
        return spark
    }
    var displaySpeaker: String {
        live && screen == .conversation ? (voice?.speaker ?? "") : current.speaker
    }
    var displayCaption: String {
        live && screen == .conversation ? (voice?.transcript ?? "") : current.line
    }
    var displayStage: Int {
        live && screen == .conversation ? Demo.stage(forView: backend.demoView) : stage
    }
    var displayStep: Int {
        guard live, screen == .conversation else { return stepIndex }
        let s = Demo.stage(forView: backend.demoView)
        return s == 0 ? 1 : min(s + 1, 3)
    }

    /// The Booth Badge QR / share target — the live dashboard badge page for this session.
    var badgeURL: String {
        let base = BoothConfig.dashboardURL
        if let id = backend.sessionId { return "\(base)/badge/\(id)" }
        return "\(base)/badge/preview"
    }

    private var spark: SparkMode {
        switch screen {
        case .conversation: return current.spark
        case .greeting, .badge: return .speaking
        case .qr: return .listening
        case .attract: return .idle
        }
    }
    private var stage: Int { screen == .conversation ? current.stage : 0 }
    private var stepIndex: Int { screen == .conversation ? current.step : 0 }

    func goTo(_ s: Screen) {
        cancelAll()
        if s == .attract || s == .badge { voice?.stop() }
        if s == .attract { backend.reset() }   // fresh card for the next visitor
        screen = s
        if s == .conversation { beat = 0 }
        if s == .badge { badgeKey += 1 }
        schedule(for: s)
    }

    /// Tap to drive the booth. Live is fully voice + scan driven and opens on the QR scanner, so
    /// background taps do nothing (the badge has its own restart control). Scripted advances on tap.
    func tap() {
        if live {
            if screen == .attract { goTo(.qr) }
            return
        }
        switch screen {
        case .attract: goTo(.greeting)
        case .greeting: goTo(.qr)
        case .qr: goTo(.conversation)
        case .conversation:
            if beat < lastBeat { goToBeat(beat + 1); restartBeatTimer() } else { goTo(.badge) }
        case .badge: goTo(.attract)
        }
    }

    /// A scanned LinkedIn QR — enrich the session and (in live mode) nudge the agent to greet.
    /// In scripted mode, navigates to the conversation screen as before.
    /// Guard prevents double-scan from re-firing.
    func captureLinkedIn(_ url: String) {
        guard linkedInURL == nil else { return }
        linkedInURL = url
        Task { await backend.lookupVisitor(linkedinUrl: url) }
        if live {
            // Server-side lookupVisitor injects the identity; this nudge prompts the agent to
            // greet by name. Move off the QR scanner into the live demo.
            voice?.noteScannedLinkedIn()
            if screen == .qr { goTo(.conversation) }
        } else {
            goTo(.conversation)
        }
    }

    /// Next-visitor reset (from the badge): back to the welcome screen. goTo(.attract) already
    /// stops the voice and resets the card, so the next START begins a clean session.
    func restart() {
        camera.rearm()
        goTo(.attract)
    }

    private func schedule(for s: Screen) {
        if live {
            switch s {
            case .qr:
                // The live entry point (reached only after the START tap): webcam scanner up,
                // session created, voice asking for the QR. Wait for the mic grant before the call
                // so it never comes up mic-dead behind a stacked permission dialog.
                linkedInURL = nil
                startCameraIfNeeded()
                camera.rearm()
                Task { [weak self] in
                    guard let self else { return }
                    if self.backend.sessionId == nil { await self.backend.createSession() }
                    await self.voice?.ensureMicPermission()
                    self.voice?.start(sessionId: self.backend.sessionId)
                }
            case .greeting:
                // Legacy `-autostart` path only — normal launch opens on .qr.
                voice?.prepare()
                Task { [weak self] in
                    guard let self else { return }
                    await self.backend.createSession()
                    try? await Task.sleep(for: .seconds(1.8))
                    if self.screen == .greeting { self.goTo(.conversation) }
                }
            case .conversation:
                startCameraIfNeeded()
                voice?.start(sessionId: backend.sessionId)
            default: break // attract + badge wait for a tap
            }
            return
        }
        switch s {
        case .greeting: after(6.0) { self.goTo(.qr) }
        case .qr: after(5.5) { self.goTo(.conversation) }
        case .conversation:
            restartBeatTimer()
            driveConversationBackend()
        case .badge: after(30) { self.goTo(.attract) }
        case .attract: break
        }
    }

    private func restartBeatTimer() {
        beatTimer?.invalidate()
        beatTimer = Timer.scheduledTimer(withTimeInterval: 4.6, repeats: true) { [weak self] _ in
            Task { @MainActor in
                guard let self else { return }
                if self.beat >= self.lastBeat {
                    self.beatTimer?.invalidate()
                    self.after(4.6) { self.goTo(.badge) }
                } else {
                    self.goToBeat(self.beat + 1)
                }
            }
        }
    }

    private func goToBeat(_ i: Int) {
        beat = max(0, min(lastBeat, i))
        fireBeatHooks(beat)
    }

    // MARK: - Drive the real Convex backend alongside the scripted beats (IOS_INTEGRATION_DESIGN §5)

    /// Kick the session at conversation start with a concrete sample identity (no live QR in the
    /// scripted run), consistent with the seed hero so the dashboard shows a coherent verified card.
    private func driveConversationBackend() {
        Task {
            await backend.createSession()
            await backend.lookupVisitor(name: "Maya Chen", company: "Northwind Labs",
                                        linkedinUrl: "https://www.linkedin.com/in/maya-chen-product", reveal: false)
            fireBeatHooks(0)
        }
    }

    /// Fire-and-forget the backend calls a beat maps to — the transcript turn plus the matching
    /// needs / demo view / contact / finalize. The screen still advances on its own timer (§6).
    private func fireBeatHooks(_ n: Int) {
        let b = Demo.beats[n]
        let text = b.line.replacingOccurrences(of: "*", with: "")
        let role = b.speaker == "VISITOR" ? "visitor" : "assistant"
        Task {
            await backend.addMessage(role: role, text: text)
            switch n {
            case 0:
                await backend.setNeeds(problems: ["churn / retention", "growth stalling"],
                                       useCase: "reduce churn and protect growth",
                                       urgency: "high", urgencyEvidence: "churn is quietly killing our growth")
            case 2:
                await backend.showView("churn", params: ["period": "30d"])
            case 3:
                await backend.setHighlight("at-risk-accounts")
            case 4:
                await backend.setNeeds(problems: ["churn / retention", "wants proactive churn alerts"],
                                       useCase: "get pinged before accounts churn", urgency: "high")
            case 5:
                await backend.showView("alerts", params: ["severity": "high"])
                await backend.captureContact(linkedinUrl: "https://www.linkedin.com/in/maya-chen-product")
            case 6:
                await backend.finalize()
            default:
                break
            }
        }
    }

    private func after(_ seconds: Double, _ block: @escaping () -> Void) {
        let work = DispatchWorkItem(block: block)
        transition = work
        DispatchQueue.main.asyncAfter(deadline: .now() + seconds, execute: work)
    }

    private func cancelAll() {
        transition?.cancel(); transition = nil
        beatTimer?.invalidate(); beatTimer = nil
    }
}

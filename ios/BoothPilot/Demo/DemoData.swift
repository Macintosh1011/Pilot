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

/// Drives the booth through its states. With Convex + an OpenAI key configured it runs
/// LIVE: presence triggers the greet, the voice loop drives the spark + caption, GPT
/// tool calls write `demoState`, and the finished badge comes from Convex. With no
/// secrets it runs the hands-free offline demo (canned beats; tap to skip forward).
@MainActor
final class Director: ObservableObject {
    @Published var screen: Screen = .attract
    @Published var beat = 0
    @Published var badgeKey = 1
    @Published var linkedInURL: String?

    let backend: BoothBackend?
    let voice: RealtimeVoice?
    private var cancellables = Set<AnyCancellable>()
    private var transition: DispatchWorkItem?
    private var beatTimer: Timer?

    /// Full live experience needs both the Convex spine and the voice loop.
    var live: Bool { backend != nil && voice != nil }

    init() {
        backend = BoothBackend(deviceId: Secrets.deviceId)
        voice = RealtimeVoice(backend: backend)
        if live {
            backend?.startWatchingPresence()
            observeLive()
        }
        applyLaunchScreen()
    }

    private func observeLive() {
        guard let backend, let voice else { return }
        // re-publish nested service changes so the conversation view updates
        voice.objectWillChange.sink { [weak self] in self?.objectWillChange.send() }.store(in: &cancellables)
        backend.objectWillChange.sink { [weak self] in self?.objectWillChange.send() }.store(in: &cancellables)

        backend.$presenceEvent.compactMap { $0 }.receive(on: RunLoop.main).sink { [weak self] event in
            guard let self else { return }
            if event == "approach", self.screen == .attract { self.goTo(.greeting) }
            if event == "leave" { self.voice?.stop(); self.goTo(.attract) }
        }.store(in: &cancellables)

        voice.$finalized.filter { $0 }.receive(on: RunLoop.main)
            .sink { [weak self] _ in self?.goTo(.badge) }.store(in: &cancellables)

        backend.$badge.compactMap { $0 }.receive(on: RunLoop.main)
            .sink { [weak self] _ in if self?.screen != .badge { self?.goTo(.badge) } }.store(in: &cancellables)
    }

    /// Dev: `simctl launch … -screen badge [-beat 6]` boots straight into a frozen screen.
    private func applyLaunchScreen() {
        let args = ProcessInfo.processInfo.arguments
        guard let i = args.firstIndex(of: "-screen"), i + 1 < args.count else { return }
        let map: [String: Screen] = [
            "attract": .attract, "greeting": .greeting, "conversation": .conversation,
            "qr": .qr, "badge": .badge,
        ]
        guard let s = map[args[i + 1]] else { return }
        screen = s
        if let j = args.firstIndex(of: "-beat"), j + 1 < args.count, let b = Int(args[j + 1]) {
            beat = b
        } else if s == .conversation {
            beat = lastBeat
        }
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
        live && screen == .conversation ? Demo.stage(forView: backend?.demoView) : stage
    }
    var displayStep: Int {
        guard live, screen == .conversation else { return stepIndex }
        let s = Demo.stage(forView: backend?.demoView)
        return s == 0 ? 1 : min(s + 1, 3)
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
        screen = s
        if s == .conversation { beat = 0 }
        if s == .badge { badgeKey += 1 }
        schedule(for: s)
    }

    /// Tap anywhere — advance the story (offline demo only; live is driven by voice/presence).
    func tap() {
        guard !live else { return }
        switch screen {
        case .attract: goTo(.greeting)
        case .greeting: goTo(.qr)
        case .qr: goTo(.conversation)
        case .conversation:
            if beat < lastBeat { setBeat(beat + 1) } else { goTo(.badge) }
        case .badge: goTo(.attract)
        }
    }

    /// A scanned LinkedIn QR — enrich straight off the profile (INTERFACES.md §1.5).
    func captureLinkedIn(_ url: String) {
        linkedInURL = url
        if live { Task { await backend?.lookupVisitor(linkedinUrl: url) } }
        goTo(.conversation)
    }

    private func setBeat(_ i: Int) {
        beat = max(0, min(lastBeat, i))
        restartBeatTimer()
    }

    private func schedule(for s: Screen) {
        if live {
            switch s {
            case .greeting:
                Task { await backend?.createSession() }
                after(2.5) { self.goTo(.conversation) }
            case .conversation: voice?.start()
            default: break // attract waits for presence; badge stays until leave/new approach
            }
            return
        }
        switch s {
        case .greeting: after(6.0) { self.goTo(.qr) }
        case .qr: after(5.5) { self.goTo(.conversation) }
        case .conversation: restartBeatTimer()
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
                    self.beat += 1
                }
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

import SwiftUI

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
}

/// Drives the booth through its states. Hands-free auto-run touches all five screens;
/// a tap anywhere skips forward. Later this is replaced by presence + the voice loop.
@MainActor
final class Director: ObservableObject {
    @Published var screen: Screen = .attract
    @Published var beat = 0
    @Published var badgeKey = 1

    private var transition: DispatchWorkItem?
    private var beatTimer: Timer?

    init() {
        // Dev: `simctl launch … -screen badge [-beat 6]` boots straight into a frozen screen.
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

    var spark: SparkMode {
        switch screen {
        case .conversation: return current.spark
        case .greeting, .badge: return .speaking
        case .qr: return .listening
        case .attract: return .idle
        }
    }
    var stage: Int { screen == .conversation ? current.stage : 0 }
    var stepIndex: Int { screen == .conversation ? current.step : 0 }

    func goTo(_ s: Screen) {
        cancelAll()
        screen = s
        if s == .conversation { beat = 0 }
        if s == .badge { badgeKey += 1 }
        schedule(for: s)
    }

    /// Tap anywhere — advance the story.
    func tap() {
        switch screen {
        case .attract: goTo(.greeting)
        case .greeting: goTo(.qr)
        case .qr: goTo(.conversation)
        case .conversation:
            if beat < lastBeat { setBeat(beat + 1) } else { goTo(.badge) }
        case .badge: goTo(.attract)
        }
    }

    private func setBeat(_ i: Int) {
        beat = max(0, min(lastBeat, i))
        restartBeatTimer()
    }

    private func schedule(for s: Screen) {
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

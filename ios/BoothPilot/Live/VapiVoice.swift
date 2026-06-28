import AVFoundation
import Combine
import Foundation
import ConvexMobile
import Vapi

/// Vapi owns audio I/O; Convex provides a transient custom-LLM assistant config.
@MainActor
final class VapiVoice: ObservableObject {
    @Published var transcript = ""
    @Published var speaker = "BOOTHPILOT"
    @Published var spark: SparkMode = .idle
    @Published var finalized = false

    private let vapi: Vapi
    private let client: ConvexClient
    private weak var backend: BoothBackend?
    private var cancellable: AnyCancellable?
    private var started = false

    private enum Fn {
        static let vapiStartConfig = "vapi:startConfig"
    }

    init?(backend: BoothBackend?) {
        guard let publicKey = Secrets.vapiPublicKey else { return nil }
        vapi = Vapi(publicKey: publicKey)
        client = ConvexClient(deploymentUrl: BoothConfig.convexURL)
        self.backend = backend
    }

    func start(sessionId: String?) {
        guard !started else { return }
        guard let resolvedSessionId = sessionId ?? backend?.sessionId, !resolvedSessionId.isEmpty else {
            print("[Vapi] missing session id")
            return
        }
        started = true
        finalized = false
        transcript = ""
        speaker = "BOOTHPILOT"
        spark = .thinking
        subscribe()

        Task { [weak self] in
            guard let self else { return }
            guard let assistant = await self.fetchAssistantConfig(sessionId: resolvedSessionId) else {
                print("[Vapi] assistant config unavailable")
                self.started = false
                self.spark = .idle
                return
            }

            do {
                _ = try await self.vapi.start(
                    assistant: assistant,
                    metadata: ["sessionId": resolvedSessionId, "deviceId": BoothConfig.deviceId]
                )
            } catch {
                print("[Vapi] start failed:", error)
                self.started = false
                self.spark = .idle
            }
        }
    }

    func stop() {
        guard started else {
            spark = .idle
            return
        }
        vapi.stop()
        started = false
        spark = .idle
    }

    /// Nudges the agent to greet the visitor by name immediately after a LinkedIn QR scan.
    /// The server-side injection from `lookupVisitor` supplies the real identity; this message
    /// simply prompts the agent to respond. Fire-and-forget — never crashes the kiosk.
    func noteScannedLinkedIn() {
        Task {
            do {
                try await vapi.send(
                    message: VapiMessage(
                        type: "add-message",
                        role: "user",
                        content: "I just showed you my LinkedIn QR code."
                    )
                )
            } catch {
                print("[Vapi] noteScannedLinkedIn failed:", error)
            }
        }
    }

    /// Pre-warm mic authorization during the greeting so the system prompt never interrupts
    /// the live conversation. Idempotent — a no-op once the user has decided.
    func prepare() {
        guard AVAudioApplication.shared.recordPermission == .undetermined else { return }
        AVAudioApplication.requestRecordPermission { _ in }
    }

    /// Await the mic-permission decision so the call never starts before the audio session is
    /// authorized. Resolves immediately if already decided.
    func ensureMicPermission() async {
        guard AVAudioApplication.shared.recordPermission == .undetermined else { return }
        await withCheckedContinuation { (cont: CheckedContinuation<Void, Never>) in
            AVAudioApplication.requestRecordPermission { _ in cont.resume() }
        }
    }

    private func subscribe() {
        guard cancellable == nil else { return }
        cancellable = vapi.eventPublisher
            .receive(on: DispatchQueue.main)
            .sink { [weak self] event in
                self?.handle(event)
            }
    }

    private func handle(_ event: Vapi.Event) {
        switch event {
        case .callDidStart:
            spark = .thinking
        case .callDidEnd:
            started = false
            finalized = true
            spark = .idle
        case .transcript(let transcript):
            handleTranscript(transcript)
        case .speechUpdate(let update):
            handleSpeechUpdate(update)
        case .error(let error):
            print("[Vapi] event error:", error)
            started = false
            spark = .idle
        default:
            break
        }
    }

    /// Live caption + spark, typed against the SDK's `Transcript` (role + partial/final).
    private func handleTranscript(_ event: Transcript) {
        let text = event.transcript.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !text.isEmpty else { return }
        transcript = text
        let isFinal = event.transcriptType == .final
        switch event.role {
        case .user:
            speaker = "VISITOR"
            spark = isFinal ? .thinking : .listening
        case .assistant:
            speaker = "BOOTHPILOT"
            spark = isFinal ? .listening : .speaking
        }
    }

    /// Speech start/stop leads the transcript, so it drives the spark between captions.
    private func handleSpeechUpdate(_ update: SpeechUpdate) {
        switch update.role {
        case .user:
            speaker = "VISITOR"
            spark = update.status == .stopped ? .thinking : .listening
        case .assistant:
            speaker = "BOOTHPILOT"
            spark = update.status == .stopped ? .listening : .speaking
        }
    }

    private func fetchAssistantConfig(sessionId: String) async -> [String: Any]? {
        do {
            let config: JSONValue = try await client.action(
                Fn.vapiStartConfig,
                with: ["sessionId": sessionId, "deviceId": BoothConfig.deviceId]
            )

            if let assistant = config.anyValue as? [String: Any] {
                return assistant
            }
            if case .string(let string) = config {
                return Self.decodeAssistantConfig(string)
            }

            print("[Vapi] assistant config had unexpected shape")
            return nil
        } catch {
            print("[Vapi] startConfig failed:", error)
            return nil
        }
    }

    private static func decodeAssistantConfig(_ string: String) -> [String: Any]? {
        guard let data = string.data(using: .utf8) else { return nil }
        do {
            return try JSONSerialization.jsonObject(with: data) as? [String: Any]
        } catch {
            print("[Vapi] config parse failed:", error)
            return nil
        }
    }
}

private enum JSONValue: Decodable {
    case object([String: JSONValue])
    case array([JSONValue])
    case string(String)
    case number(Double)
    case bool(Bool)
    case null

    init(from decoder: Decoder) throws {
        let container = try decoder.singleValueContainer()
        if container.decodeNil() {
            self = .null
        } else if let object = try? container.decode([String: JSONValue].self) {
            self = .object(object)
        } else if let array = try? container.decode([JSONValue].self) {
            self = .array(array)
        } else if let string = try? container.decode(String.self) {
            self = .string(string)
        } else if let bool = try? container.decode(Bool.self) {
            self = .bool(bool)
        } else {
            self = .number(try container.decode(Double.self))
        }
    }

    var anyValue: Any {
        switch self {
        case .object(let object):
            return object.mapValues { $0.anyValue }
        case .array(let array):
            return array.map { $0.anyValue }
        case .string(let string):
            return string
        case .number(let number):
            return number
        case .bool(let bool):
            return bool
        case .null:
            return NSNull()
        }
    }
}

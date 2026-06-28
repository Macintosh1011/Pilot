import Combine
import Foundation
import Vapi

/// Vapi owns audio I/O; Convex provides a transient custom-LLM assistant config.
@MainActor
final class VapiVoice: ObservableObject {
    @Published var transcript = ""
    @Published var speaker = "BOOTHPILOT"
    @Published var spark: SparkMode = .idle
    @Published var finalized = false

    private let vapi: Vapi
    private weak var backend: BoothBackend?
    private var cancellable: AnyCancellable?
    private var started = false

    init?(backend: BoothBackend?) {
        guard let publicKey = Secrets.vapiPublicKey else { return nil }
        vapi = Vapi(publicKey: publicKey)
        self.backend = backend
    }

    func start() {
        guard !started else { return }
        guard let backend, let sessionId = backend.sessionId else {
            print("[Vapi] missing session id")
            return
        }
        started = true
        finalized = false
        transcript = ""
        speaker = "BOOTHPILOT"
        spark = .thinking
        subscribe()

        Task { [weak self, weak backend] in
            guard let self, let backend else { return }
            guard let configString = await backend.vapiAssistantConfig(),
                  let assistant = Self.decodeAssistantConfig(configString) else {
                print("[Vapi] assistant config unavailable")
                self.started = false
                self.spark = .idle
                return
            }

            do {
                try await self.vapi.start(
                    assistant: assistant,
                    metadata: ["sessionId": sessionId, "deviceId": BoothConfig.deviceId]
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

    private func subscribe() {
        guard cancellable == nil else { return }
        cancellable = vapi.eventPublisher
            .receive(on: DispatchQueue.main)
            .sink { [weak self] event in
                self?.handle(event)
            }
    }

    private func handle(_ event: Event) {
        switch event {
        case .callDidStart:
            spark = .thinking
        case .callDidEnd:
            started = false
            finalized = true
            spark = .idle
        case .appMessageReceived(let message, from: _):
            handleAppMessage(message)
        case .error(let error):
            print("[Vapi] event error:", error)
            spark = .idle
        default:
            break
        }
    }

    private func handleAppMessage(_ message: [String: Any]) {
        guard (message["type"] as? String) == "transcript" else { return }
        let text = (message["transcript"] as? String)?
            .trimmingCharacters(in: .whitespacesAndNewlines) ?? ""
        guard !text.isEmpty else { return }

        let role = message["role"] as? String
        let transcriptType = message["transcriptType"] as? String
        transcript = text

        switch role {
        case "user":
            speaker = "VISITOR"
            spark = transcriptType == "final" ? .thinking : .listening
        case "assistant":
            speaker = "BOOTHPILOT"
            spark = transcriptType == "final" ? .listening : .speaking
        default:
            break
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

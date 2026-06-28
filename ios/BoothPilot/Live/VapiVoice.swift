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
                try await self.vapi.start(
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

    private func handleTranscript(_ transcriptEvent: Transcript) {
        let text = stringValue(named: ["transcript", "text", "content"], in: transcriptEvent)?
            .trimmingCharacters(in: .whitespacesAndNewlines) ?? ""
        guard !text.isEmpty else { return }

        transcript = text
        updateSpeaker(
            role: stringValue(named: ["role"], in: transcriptEvent),
            transcriptType: stringValue(named: ["transcriptType", "transcript_type"], in: transcriptEvent)
        )
    }

    private func handleSpeechUpdate(_ update: SpeechUpdate) {
        let role = stringValue(named: ["role"], in: update)
        let status = stringValue(named: ["status"], in: update)?.lowercased()

        switch normalizedRole(role) {
        case "user", "customer":
            speaker = "VISITOR"
            spark = status == "stopped" ? .thinking : .listening
        case "assistant", "bot":
            speaker = "BOOTHPILOT"
            spark = status == "stopped" ? .listening : .speaking
        default:
            break
        }
    }

    private func updateSpeaker(role: String?, transcriptType: String?) {
        let kind = transcriptType?.lowercased()
        switch normalizedRole(role) {
        case "user", "customer":
            speaker = "VISITOR"
            spark = kind == "final" ? .thinking : .listening
        case "assistant":
            speaker = "BOOTHPILOT"
            spark = kind == "final" ? .listening : .speaking
        default:
            break
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

    private func stringValue(named names: [String], in value: Any) -> String? {
        let mirror = Mirror(reflecting: value)
        for child in mirror.children {
            guard let label = child.label, names.contains(label) else { continue }
            return stringify(child.value)
        }
        return nil
    }

    private func stringify(_ value: Any) -> String? {
        if let string = value as? String { return string }
        let mirror = Mirror(reflecting: value)
        if mirror.displayStyle == .optional {
            guard let child = mirror.children.first else { return nil }
            return stringify(child.value)
        }
        if let rawValue = mirror.children.first(where: { $0.label == "rawValue" })?.value as? String {
            return rawValue
        }
        return String(describing: value)
    }

    private func normalizedRole(_ role: String?) -> String? {
        role?.trimmingCharacters(in: .whitespacesAndNewlines).lowercased()
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

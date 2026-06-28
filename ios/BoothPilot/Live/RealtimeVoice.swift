import Foundation

/// The voice loop: a single WebSocket to the OpenAI Realtime API (`gpt-realtime`, GA).
/// Mic audio streams up, the model's audio streams down through `AudioIO`, server-VAD
/// handles turn-taking, and GPT tool calls are routed to the Convex backend. Drives the
/// on-screen spark + caption. Nil unless an OpenAI key is configured.
final class RealtimeVoice: NSObject, ObservableObject {
    @Published var transcript = ""
    @Published var speaker = "BOOTHPILOT"
    @Published var spark: SparkMode = .idle
    @Published var finalized = false

    private let apiKey: String
    private weak var backend: BoothBackend?
    private let audio = AudioIO()
    private let session = URLSession(configuration: .default)
    private var ws: URLSessionWebSocketTask?
    private var started = false
    private var pendingAssistant = ""   // accumulates the current assistant turn for transcript persistence

    init?(backend: BoothBackend?) {
        guard let key = Secrets.openAIKey else { return nil }
        apiKey = key
        self.backend = backend
    }

    private static let instructions = """
    You are BoothPilot, a warm, witty AI host at an expo booth for Acme Analytics, a \
    customer-retention product. Greet the visitor, ask their name and company, then call \
    lookup_visitor (pass reveal:false until they're clearly engaged). In one or two short \
    questions, scope the problem they care about and call set_needs with the problems you hear. \
    Demo by calling show_view to match their problem (views: home, churn, alerts, pricing, \
    integrations, query-result) — narrate what they're seeing, and use highlight to pulse one \
    element while you talk. If they share an email or LinkedIn, call capture_contact. When \
    you've shown real value, call finalize_session to mint their badge. Keep turns short, human, \
    and specific. Never sound robotic.
    """

    // MARK: - Lifecycle

    func start() {
        guard !started else { return }
        started = true
        var request = URLRequest(url: URL(string: "wss://api.openai.com/v1/realtime?model=gpt-realtime")!)
        request.setValue("Bearer \(apiKey)", forHTTPHeaderField: "Authorization")
        ws = session.webSocketTask(with: request)
        ws?.resume()
        receive()
    }

    func stop() {
        audio.stop()
        ws?.cancel(with: .goingAway, reason: nil)
        ws = nil
        started = false
        set { $0.spark = .idle }
    }

    // MARK: - Receive loop

    private func receive() {
        ws?.receive { [weak self] result in
            guard let self else { return }
            switch result {
            case .success(let message):
                if case let .string(text) = message { self.handle(text) }
                else if case let .data(data) = message, let text = String(data: data, encoding: .utf8) { self.handle(text) }
                self.receive()
            case .failure(let error):
                print("[Realtime] socket error:", error)
            }
        }
    }

    private func handle(_ text: String) {
        guard let data = text.data(using: .utf8),
              let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
              let type = json["type"] as? String else { return }

        switch type {
        case "session.created":
            sendSessionConfig()
            startAudio()
            send(["type": "response.create"]) // greet first
            set { $0.spark = .thinking }

        case "input_audio_buffer.speech_started":
            audio.flushPlayback() // barge-in
            send(["type": "response.cancel"])
            set { $0.spark = .listening; $0.speaker = "YOU"; $0.transcript = "" }

        case "response.created":
            set { $0.spark = .thinking; $0.speaker = "BOOTHPILOT" }

        case "response.output_audio.delta":
            if let b64 = json["delta"] as? String, let pcm = Data(base64Encoded: b64) {
                audio.enqueue(pcm)
                set { $0.spark = .speaking }
            }

        case "response.output_audio.done":
            set { $0.spark = .listening }

        case "response.output_audio_transcript.delta":
            if let delta = json["delta"] as? String {
                pendingAssistant += delta
                set { $0.speaker = "BOOTHPILOT"; $0.transcript += delta }
            }

        case "conversation.item.input_audio_transcription.completed":
            let t = (json["transcript"] as? String)?.trimmingCharacters(in: .whitespacesAndNewlines) ?? ""
            if !t.isEmpty {
                persist(role: "visitor", text: t)
                set { $0.speaker = "YOU"; $0.transcript = t }
            }

        case "response.done":
            flushAssistant()
            handleFunctionCalls(in: json)

        case "error":
            print("[Realtime] error:", json)

        default:
            break
        }
    }

    // MARK: - Transcript persistence (ground truth for scoring/badge/email)

    private func flushAssistant() {
        let t = pendingAssistant.trimmingCharacters(in: .whitespacesAndNewlines)
        pendingAssistant = ""
        persist(role: "assistant", text: t)
    }

    private func persist(role: String, text: String) {
        guard !text.isEmpty else { return }
        Task { [backend] in await backend?.addMessage(role: role, text: text) }
    }

    // MARK: - Tool calls

    private func handleFunctionCalls(in json: [String: Any]) {
        guard let response = json["response"] as? [String: Any],
              let outputs = response["output"] as? [[String: Any]] else { return }
        for item in outputs where (item["type"] as? String) == "function_call" {
            guard let name = item["name"] as? String,
                  let callId = item["call_id"] as? String,
                  let argsString = item["arguments"] as? String else { continue }
            Task { [weak self] in
                let result = await self?.runTool(name: name, argsJSON: argsString) ?? "{}"
                self?.send([
                    "type": "conversation.item.create",
                    "item": ["type": "function_call_output", "call_id": callId, "output": result],
                ])
                self?.send(["type": "response.create"])
            }
        }
    }

    private func runTool(name: String, argsJSON: String) async -> String {
        let args = (try? JSONSerialization.jsonObject(with: Data(argsJSON.utf8)) as? [String: Any]) ?? [:]
        switch name {
        case "lookup_visitor":
            await backend?.lookupVisitor(name: args["name"] as? String,
                                         company: args["company"] as? String,
                                         linkedinUrl: args["linkedinUrl"] as? String,
                                         reveal: args["reveal"] as? Bool)
        case "set_needs":
            await backend?.setNeeds(problems: args["problems"] as? [String] ?? [],
                                    useCase: args["useCase"] as? String,
                                    urgency: args["urgency"] as? String,
                                    urgencyEvidence: args["urgencyEvidence"] as? String)
        case "show_view":
            await backend?.showView(args["view"] as? String ?? "home")
        case "highlight":
            await backend?.setHighlight(args["elementId"] as? String ?? "")
        case "capture_contact":
            await backend?.captureContact(email: args["email"] as? String,
                                          phone: args["phone"] as? String,
                                          linkedinUrl: args["linkedinUrl"] as? String)
        case "finalize_session":
            await backend?.finalize()
            set { $0.finalized = true }
        default:
            return #"{"error":"unknown tool"}"#
        }
        return #"{"ok":true}"#
    }

    // MARK: - Session config

    private func sendSessionConfig() {
        // The 6 GPT tools — verbatim from INTERFACES.md §3. sessionId is injected by the
        // backend, never exposed to the model.
        let tools: [[String: Any]] = [
            tool("lookup_visitor",
                 "Research the visitor live via fiber.ai when they share a name, company, or LinkedIn. Call as soon as you have any one of them. Keep reveal:false until they're clearly engaged.",
                 ["name": "string", "company": "string", "linkedinUrl": "string", "reveal": "boolean"],
                 required: []),
            tool("set_needs",
                 "Record the visitor's problems, use case, and urgency as you learn them.",
                 ["problems": "array", "useCase": "string", "urgency": "string", "urgencyEvidence": "string"],
                 required: ["problems"]),
            tool("show_view",
                 "Drive the on-screen Acme Analytics demo to the view that best matches the visitor's problem.",
                 ["view": "string"], required: ["view"]),
            tool("highlight",
                 "Pulse/focus a single element in the current demo view to draw the visitor's eye.",
                 ["elementId": "string"], required: ["elementId"]),
            tool("capture_contact",
                 "Save the visitor's contact info once they share it. Prefer LinkedIn or work email.",
                 ["email": "string", "phone": "string", "linkedinUrl": "string"], required: []),
            tool("finalize_session",
                 "Wrap up: score the lead, generate their Booth Badge, and draft a follow-up. Call once, near the end.",
                 [:], required: []),
        ]
        send([
            "type": "session.update",
            "session": [
                "type": "realtime",
                "model": "gpt-realtime",
                "instructions": Self.instructions,
                "output_modalities": ["audio"],
                "audio": [
                    "input": [
                        "format": ["type": "audio/pcm", "rate": 24_000],
                        "transcription": ["model": "gpt-4o-mini-transcribe"],
                        "turn_detection": [
                            "type": "server_vad",
                            "threshold": 0.6,
                            "prefix_padding_ms": 300,
                            "silence_duration_ms": 600,
                            "create_response": true,
                            "interrupt_response": true,
                        ],
                    ],
                    "output": ["format": ["type": "audio/pcm", "rate": 24_000], "voice": "coral"],
                ],
                "tools": tools,
                "tool_choice": "auto",
            ],
        ])
    }

    private func tool(_ name: String, _ description: String,
                      _ props: [String: String], required: [String]) -> [String: Any] {
        var properties: [String: Any] = [:]
        for (key, type) in props {
            properties[key] = type == "array"
                ? ["type": "array", "items": ["type": "string"]]
                : ["type": type]
        }
        return [
            "type": "function", "name": name, "description": description,
            "parameters": ["type": "object", "properties": properties, "required": required],
        ]
    }

    // MARK: - Audio + send

    private func startAudio() {
        do {
            try audio.start { [weak self] pcm in
                self?.send(["type": "input_audio_buffer.append", "audio": pcm.base64EncodedString()])
            }
        } catch {
            print("[Realtime] audio start failed:", error)
        }
    }

    private func send(_ dict: [String: Any]) {
        guard let data = try? JSONSerialization.data(withJSONObject: dict),
              let text = String(data: data, encoding: .utf8) else { return }
        ws?.send(.string(text)) { if let error = $0 { print("[Realtime] send error:", error) } }
    }

    /// Apply UI-state changes on the main thread (events arrive off-main).
    private func set(_ change: @escaping (RealtimeVoice) -> Void) {
        DispatchQueue.main.async { [weak self] in
            guard let self else { return }
            change(self)
        }
    }
}

import Foundation

/// Runtime configuration for the live layer. Loaded from an optional, gitignored
/// `Secrets.plist` in the app bundle, with environment-variable overrides (Xcode
/// scheme / CI). When nothing is configured the booth runs the offline demo, so
/// `main` stays demoable without any keys.
enum Secrets {
    private static let values: [String: String] = {
        var out: [String: String] = [:]
        if let url = Bundle.main.url(forResource: "Secrets", withExtension: "plist"),
           let dict = NSDictionary(contentsOf: url) as? [String: Any] {
            for (key, value) in dict {
                if let s = value as? String, !s.isEmpty { out[key] = s }
            }
        }
        let env = ProcessInfo.processInfo.environment
        for key in ["OPENAI_API_KEY", "CONVEX_URL", "ELEVENLABS_API_KEY", "DEVICE_ID"] {
            if let v = env[key], !v.isEmpty { out[key] = v }
        }
        return out
    }()

    static var openAIKey: String? { values["OPENAI_API_KEY"] }
    static var convexURL: URL? { values["CONVEX_URL"].flatMap { URL(string: $0) } }
    static var elevenLabsKey: String? { values["ELEVENLABS_API_KEY"] }
    static var deviceId: String { values["DEVICE_ID"] ?? "booth-ipad-1" }

    static var hasVoice: Bool { openAIKey != nil }
    static var hasConvex: Bool { convexURL != nil }
}

import Foundation

/// Secret keys for the live layer. Loaded from an optional, gitignored `Secrets.plist` in the
/// app bundle, with an env-var override (Xcode scheme / CI). Only the OpenAI key (Phase 2 voice)
/// is a secret — non-secret backend URLs live in `BoothConfig`. With no key the booth runs the
/// scripted Phase 1 (UI + live Convex backend), so `main` stays demoable.
enum Secrets {
    private static let values: [String: String] = {
        var out: [String: String] = [:]
        if let url = Bundle.main.url(forResource: "Secrets", withExtension: "plist"),
           let dict = NSDictionary(contentsOf: url) as? [String: Any] {
            for (key, value) in dict {
                if let s = value as? String, !s.isEmpty { out[key] = s }
            }
        }
        if let v = ProcessInfo.processInfo.environment["OPENAI_API_KEY"], !v.isEmpty {
            out["OPENAI_API_KEY"] = v
        }
        return out
    }()

    static var openAIKey: String? { values["OPENAI_API_KEY"] }
    static var hasVoice: Bool { openAIKey != nil }
}

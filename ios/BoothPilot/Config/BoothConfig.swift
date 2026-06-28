import Foundation

/// Non-secret backend config (Convex URL, dashboard URL, device id). Resolves
/// UserDefaults → Info.plist → hardcoded fallback, so any device can be re-pointed
/// without a rebuild (`defaults write dev.parkt.boothpilot BoothConvexURL …`).
/// Secrets (the OpenAI key) live separately in `Secrets`.
enum BoothConfig {
    private static func string(_ key: String, default fallback: String) -> String {
        if let v = UserDefaults.standard.string(forKey: key), !v.isEmpty { return v }
        if let v = Bundle.main.object(forInfoDictionaryKey: key) as? String, !v.isEmpty { return v }
        return fallback
    }

    /// The Convex **client** host (`.convex.cloud`) for ConvexClient. Never the `.convex.site` HTTP host.
    static var convexURL: String { string("BoothConvexURL", default: "https://jovial-wildebeest-931.convex.cloud") }
    static var dashboardURL: String { string("BoothDashboardURL", default: "https://localhost:3000") }
    static var deviceId: String { string("BoothDeviceId", default: "ipad-1") }

    /// True when the dashboard is a real off-device host — so the WebView "business site" demo and
    /// the off-device badge QR actually resolve. localhost ⇒ false (fall back to the native demo).
    static var dashboardIsRemote: Bool {
        guard let host = URL(string: dashboardURL)?.host, !host.isEmpty else { return false }
        return host != "localhost" && host != "127.0.0.1"
    }
}

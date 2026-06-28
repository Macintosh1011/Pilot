import SwiftUI
import WebKit

/// Where the web experience lives. Order of precedence:
/// 1. `UserDefaults` key `BoothWebURL` (set per-device without a rebuild)
/// 2. `Info.plist` key `BoothWebURL`
/// 3. localhost fallback for the simulator.
enum BoothConfig {
    static var webURL: URL {
        if let override = UserDefaults.standard.string(forKey: "BoothWebURL"),
           let url = URL(string: override) { return url }
        if let plist = Bundle.main.object(forInfoDictionaryKey: "BoothWebURL") as? String,
           let url = URL(string: plist) { return url }
        return URL(string: "http://localhost:3000")!
    }
}

struct KioskView: View {
    var body: some View {
        WebContainer()
            .background(Color.black)
            .ignoresSafeArea()
    }
}

/// A fullscreen WKWebView tuned for a voice + camera kiosk: inline media,
/// no user-gesture gate on audio, and auto-granted mic/camera so `getUserMedia`
/// never shows a system prompt the visitor would have to tap.
struct WebContainer: UIViewRepresentable {
    func makeCoordinator() -> Coordinator { Coordinator() }

    func makeUIView(context: Context) -> WKWebView {
        let config = WKWebViewConfiguration()
        config.allowsInlineMediaPlayback = true
        config.mediaTypesRequiringUserActionForPlayback = []
        config.defaultWebpagePreferences.allowsContentJavaScript = true

        let web = WKWebView(frame: .zero, configuration: config)
        web.uiDelegate = context.coordinator
        web.navigationDelegate = context.coordinator
        web.isOpaque = false
        web.backgroundColor = .black
        web.scrollView.backgroundColor = .black
        web.scrollView.bounces = false
        web.scrollView.contentInsetAdjustmentBehavior = .never
        web.allowsLinkPreview = false
        #if DEBUG
        if #available(iOS 16.4, *) { web.isInspectable = true } // Safari Web Inspector
        #endif

        context.coordinator.web = web
        web.load(URLRequest(url: BoothConfig.webURL))
        return web
    }

    func updateUIView(_ uiView: WKWebView, context: Context) {}

    @MainActor
    final class Coordinator: NSObject, WKUIDelegate, WKNavigationDelegate {
        weak var web: WKWebView?

        /// Auto-grant mic + camera so the voice loop and QR scanner start without a tap.
        func webView(_ webView: WKWebView,
                     requestMediaCapturePermissionFor origin: WKSecurityOrigin,
                     initiatedByFrame frame: WKFrameInfo,
                     type: WKMediaCaptureType,
                     decisionHandler: @escaping (WKPermissionDecision) -> Void) {
            decisionHandler(.grant)
        }

        // The web dev server may not be up yet on first launch — keep retrying.
        func webView(_ webView: WKWebView, didFailProvisionalNavigation navigation: WKNavigation!, withError error: Error) {
            retryLoad()
        }

        func webView(_ webView: WKWebView, didFail navigation: WKNavigation!, withError error: Error) {
            retryLoad()
        }

        private func retryLoad() {
            DispatchQueue.main.asyncAfter(deadline: .now() + 1.5) { [weak self] in
                guard let web = self?.web else { return }
                web.load(URLRequest(url: BoothConfig.webURL))
            }
        }
    }
}

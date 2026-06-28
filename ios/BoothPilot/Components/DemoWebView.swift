import SwiftUI
import WebKit

/// Loads the tailored "business site" demo for a session ({dashboardURL}/demo/{sessionId}) in a
/// WKWebView. The page subscribes to Convex demoState, so the agent's show_view/highlight/params
/// drive it live. Reports load failure so ConversationScreen can fall back to the native panel —
/// the booth is never blank.
struct DemoWebView: UIViewRepresentable {
    let url: URL
    var onFailure: () -> Void = {}

    func makeUIView(context: Context) -> WKWebView {
        let config = WKWebViewConfiguration()
        config.allowsInlineMediaPlayback = true
        let webView = WKWebView(frame: .zero, configuration: config)
        webView.navigationDelegate = context.coordinator
        webView.isOpaque = false
        webView.backgroundColor = .clear
        webView.scrollView.isScrollEnabled = false
        webView.scrollView.bounces = false
        webView.load(URLRequest(url: url))
        return webView
    }

    func updateUIView(_ uiView: WKWebView, context: Context) {}

    func makeCoordinator() -> Coordinator { Coordinator(onFailure: onFailure) }

    final class Coordinator: NSObject, WKNavigationDelegate {
        private let onFailure: () -> Void
        init(onFailure: @escaping () -> Void) { self.onFailure = onFailure }

        func webView(_ webView: WKWebView, didFail navigation: WKNavigation!, withError error: Error) {
            onFailure()
        }
        func webView(_ webView: WKWebView, didFailProvisionalNavigation navigation: WKNavigation!, withError error: Error) {
            onFailure()
        }
    }
}

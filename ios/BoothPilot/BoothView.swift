import SwiftUI

/// Root of the booth. The whole experience is authored in a fixed 1374×1030 space
/// (matching the design) and scaled to fit whatever iPad it runs on.
struct BoothView: View {
    @StateObject private var director = Director()

    var body: some View {
        GeometryReader { geo in
            let scale = min(geo.size.width / 1374, geo.size.height / 1030)
            ZStack {
                Color.paper.ignoresSafeArea()
                ZStack {
                    PaperBackground()
                    screen
                        .id(screenIdentity)
                        .transition(.opacity)
                }
                .frame(width: 1374, height: 1030)
                .animation(.easeInOut(duration: 0.45), value: director.screen)
                .scaleEffect(scale)
                .frame(width: geo.size.width, height: geo.size.height)
            }
            .contentShape(Rectangle())
            .onTapGesture { if director.screen != .badge { director.tap() } }
        }
        .ignoresSafeArea()
    }

    private var screenIdentity: String {
        "\(director.screen)-\(director.screen == .badge ? director.badgeKey : 0)"
    }

    @ViewBuilder private var screen: some View {
        switch director.screen {
        case .attract: AttractScreen()
        case .greeting: GreetingScreen()
        case .qr: QRScreen(live: director.live, camera: director.camera,
                           onScan: { director.captureLinkedIn($0) })
        case .conversation: ConversationScreen(director: director)
        case .badge: BadgeScreen(onRestart: { director.restart() },
                                 live: director.backend.liveSession?.badge,
                                 liveName: director.backend.liveSession?.visitorName,
                                 badgeURL: director.badgeURL,
                                 isLive: director.live)
        }
    }
}

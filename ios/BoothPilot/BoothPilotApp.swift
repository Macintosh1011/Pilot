import SwiftUI

@main
struct BoothPilotApp: App {
    init() {
        // Kiosk: never dim or sleep while on the stand.
        UIApplication.shared.isIdleTimerDisabled = true
    }

    var body: some Scene {
        WindowGroup {
            KioskView()
                .ignoresSafeArea()
                .statusBarHidden()
                .persistentSystemOverlays(.hidden)
        }
    }
}

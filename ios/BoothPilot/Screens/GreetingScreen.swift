import SwiftUI

/// 2 · GREETING — the spark wakes, the headline types into a warm welcome.
struct GreetingScreen: View {
    var body: some View {
        ZStack {
            Blob(radii: [1.0, 0.94, 1.05, 0.9, 1.03, 0.95, 1.02, 0.92])
                .fill(Color.tan)
                .frame(width: 200, height: 200)
                .rotationEffect(.degrees(12))
                .opacity(0.55)
                .position(x: 180, y: 50)

            VStack(spacing: 34) {
                Spark(mode: .speaking)
                    .frame(width: 236, height: 236)

                VStack(spacing: 0) {
                    Text("WELCOME")
                        .font(.mono(14, weight: 600))
                        .tracking(5)
                        .foregroundColor(.clay)
                        .padding(.bottom, 22)

                    TypeText(
                        text: "Hello. *Good to see you.*",
                        font: .serif(72, weight: 500),
                        speed: 56, keepCursor: false, tracking: -1.4, alignment: .center
                    )

                    TypeText(
                        text: "Tell me what you’re working on — I’ll take it from there.",
                        font: .serif(30), color: .muted,
                        speed: 30, startDelay: 1100, showCursor: false,
                        lineSpacing: 6, alignment: .center
                    )
                    .frame(maxWidth: 760)
                    .padding(.top, 26)
                }
            }
            .padding(.horizontal, 120)
        }
        .frame(width: 1374, height: 1030)
    }
}

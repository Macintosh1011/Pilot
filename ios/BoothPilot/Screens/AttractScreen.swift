import SwiftUI

/// 1 · ATTRACT — a printed poster that's quietly alive. Spark slowly turning,
/// a big serif line typing itself out, cut-paper clay shapes.
struct AttractScreen: View {
    var onStart: () -> Void = {}

    var body: some View {
        ZStack {
            // cut-paper shapes
            Blob(radii: [1.0, 0.9, 1.06, 0.94, 1.02, 0.88, 1.05, 0.95])
                .fill(Color.clay)
                .frame(width: 230, height: 230)
                .rotationEffect(.degrees(-8))
                .opacity(0.92)
                .shadow(color: Color.rust.opacity(0.5), radius: 25, x: 0, y: 24)
                .position(x: 1151, y: 55)

            Circle()
                .fill(Color.tan)
                .frame(width: 300, height: 300)
                .opacity(0.5)
                .position(x: 110, y: 950)

            Circle()
                .strokeBorder(Color.rust, lineWidth: 2)
                .frame(width: 84, height: 84)
                .opacity(0.55)
                .position(x: 192, y: 868)

            // wordmark, pinned top-left
            Wordmark(size: 18, tracking: 5)
                .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
                .padding(.leading, 56)
                .padding(.top, 46)

            // centre
            VStack(spacing: 30) {
                Spark(mode: .idle)
                    .frame(width: 248, height: 248)

                VStack(spacing: 30) {
                    TypeText(
                        text: "Tell me what you’re *building*.",
                        font: .serif(76, weight: 500),
                        speed: 50, keepCursor: true, tracking: -1.5, alignment: .center
                    )
                    .frame(maxWidth: 1000)

                    Button(action: onStart) {
                        Text("START")
                            .font(.mono(18, weight: 600)).tracking(4).foregroundColor(.paper)
                            .padding(.horizontal, 64).padding(.vertical, 22)
                            .background(Capsule().fill(Color.ink))
                            .shadow(color: Color.ink.opacity(0.28), radius: 18, x: 0, y: 12)
                    }
                    .buttonStyle(.plain)

                    Text("TAP START — IT TAKES ABOUT SIXTY SECONDS")
                        .font(.mono(14, weight: 500))
                        .tracking(3)
                        .foregroundColor(.muted)
                }
            }
            .padding(.horizontal, 120)

            // sponsors, pinned bottom
            Text("POWERED BY OPENAI · CONVEX · FIBER.AI · VAPI")
                .font(.mono(12, weight: 500))
                .tracking(3)
                .foregroundColor(.muted.opacity(0.7))
                .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .bottom)
                .padding(.bottom, 44)
        }
        .frame(width: 1374, height: 1030)
    }
}

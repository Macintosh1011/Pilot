import SwiftUI

/// 5 · BADGE (finale) — an editorial collectible like a letterpress bookplate.
/// Cream stock, ink + clay, the spark. Reveals in sequence.
struct BadgeScreen: View {
    var onRestart: () -> Void = {}
    var live: BadgeDoc? = nil
    var liveName: String? = nil
    var badgeURL: String = "https://boothpilot.dev/b/preview"

    private var visitorName: String { liveName ?? "Alex Rivera" }
    private var archetype: String { live?.archetype ?? "The Churn Slayer" }
    private var compliment: String {
        live?.compliment ?? "You spot the leak before the ship even lists — Acme was built for operators like you."
    }
    private var discountCode: String { live?.discountCode ?? "ACME-CHURN40" }

    private var stats: [(label: String, value: String, pct: CGFloat, delay: Double)] {
        let delays = [1.9, 2.05, 2.2]
        if let s = live?.stats, !s.isEmpty {
            return s.prefix(3).enumerated().map { i, st in
                (st.label, "\(Int(st.value.rounded()))", CGFloat(st.value) / 100, delays[min(i, 2)])
            }
        }
        return [("GROWTH IQ", "94", 0.94, 1.9), ("VISION", "91", 0.91, 2.05), ("VELOCITY", "88", 0.88, 2.2)]
    }

    @State private var grow = false

    private var firstName: String { visitorName.split(separator: " ").first.map(String.init) ?? visitorName }

    var body: some View {
        HStack(spacing: 58) {
            bookplate
            sidePanel
        }
        .padding(56)
        .frame(width: 1374, height: 1030)
        .onAppear {
            grow = false
            withAnimation(.easeOut(duration: 0.9).delay(1.9)) { grow = true }
        }
    }

    // MARK: Bookplate card

    private var bookplate: some View {
        VStack(spacing: 0) {
            HStack {
                Wordmark(size: 12, tracking: 3)
                Spacer()
                Text("NO. 047").font(.mono(11)).tracking(2).foregroundColor(.muted)
            }

            VStack(spacing: 0) {
                Spark(mode: .speaking).frame(width: 128, height: 128).padding(.bottom, 18)
                Text("YOUR ARCHETYPE").font(.mono(12, weight: 600)).tracking(4)
                    .foregroundColor(.clay).padding(.bottom, 14)
                TypeText(text: archetype, font: .serif(50, weight: 500),
                         speed: 72, showCursor: false, tracking: -1, alignment: .center)
                TypeText(text: compliment, font: .serif(21, italic: true), color: .muted,
                         speed: 24, startDelay: 1500, showCursor: false, lineSpacing: 7, alignment: .center)
                    .frame(maxWidth: 330)
                    .padding(.top, 18)
            }
            .frame(maxHeight: .infinity)

            VStack(spacing: 14) {
                ForEach(Array(stats.enumerated()), id: \.offset) { _, s in statBar(s) }
            }
            .padding(.bottom, 22)

            HStack {
                VStack(alignment: .leading, spacing: 5) {
                    Text("ISSUED TO").font(.mono(10)).tracking(2).foregroundColor(.muted)
                    Text(visitorName).font(.serif(20, weight: 500)).foregroundColor(.ink)
                }
                Spacer()
                QRCodeView(string: badgeURL)
                    .frame(width: 62, height: 62)
            }
            .padding(.top, 18)
            .overlay(Rectangle().fill(Color.ink.opacity(0.18)).frame(height: 1), alignment: .top)
        }
        .padding(.horizontal, 32).padding(.vertical, 30)
        .overlay(RoundedRectangle(cornerRadius: 5).strokeBorder(Color.ink.opacity(0.28)))
        .padding(14)
        .frame(width: 476, height: 686)
        .background(RoundedRectangle(cornerRadius: 10).fill(Color.paper))
        .overlay(RoundedRectangle(cornerRadius: 10).strokeBorder(Color.ink.opacity(0.5)))
        .shadow(color: Color.ink.opacity(0.4), radius: 45, x: 0, y: 40)
    }

    private func statBar(_ s: (label: String, value: String, pct: CGFloat, delay: Double)) -> some View {
        VStack(spacing: 7) {
            HStack(alignment: .firstTextBaseline) {
                Text(s.label).font(.mono(12)).tracking(1.5).foregroundColor(.muted)
                Spacer()
                Text(s.value).font(.serif(20, weight: 500)).foregroundColor(.ink)
            }
            GeometryReader { geo in
                ZStack(alignment: .leading) {
                    Rectangle().fill(Color.ink.opacity(0.12))
                    Rectangle().fill(Color.clay)
                        .frame(width: grow ? geo.size.width * s.pct : 0)
                }
            }
            .frame(height: 3)
        }
    }

    // MARK: Side panel

    private var sidePanel: some View {
        VStack(alignment: .leading, spacing: 26) {
            VStack(alignment: .leading, spacing: 14) {
                Text("That’s a wrap,\n\(firstName).")
                    .font(.serif(44, weight: 500)).tracking(-1).foregroundColor(.ink)
                    .lineSpacing(2)
                Text("Your bookplate is ready to share. Flash the code at our booth for the founder rate.")
                    .font(.serif(21)).foregroundColor(.muted).lineSpacing(5)
            }

            VStack(alignment: .leading, spacing: 12) {
                Text("YOUR REWARD").font(.mono(11)).tracking(2).foregroundColor(.muted)
                HStack {
                    Text(discountCode).font(.mono(23, weight: 600)).tracking(1).foregroundColor(.ink)
                    Spacer()
                    Text("40% OFF PRO").font(.mono(12)).tracking(1).foregroundColor(.paper)
                        .padding(.horizontal, 13).padding(.vertical, 7)
                        .background(Capsule().fill(Color.clay))
                }
            }
            .padding(.horizontal, 24).padding(.vertical, 22)
            .background(RoundedRectangle(cornerRadius: 14).fill(Color.panel))
            .overlay(RoundedRectangle(cornerRadius: 14).strokeBorder(Color.ink.opacity(0.1)))

            HStack(spacing: 14) {
                ShareLink(item: URL(string: badgeURL) ?? URL(string: "https://boothpilot.dev")!) {
                    Text("SHARE BADGE").font(.mono(15, weight: 500)).tracking(1).foregroundColor(.paper)
                        .frame(maxWidth: .infinity).padding(.vertical, 19)
                        .background(Capsule().fill(Color.ink))
                }
                Button(action: onRestart) {
                    Text("↻").font(.system(size: 22)).foregroundColor(.ink)
                        .frame(width: 62).padding(.vertical, 16)
                        .overlay(Capsule().strokeBorder(Color.ink.opacity(0.25)))
                }
            }
            .buttonStyle(.plain)

            Text("POWERED BY OPENAI · CONVEX · FIBER.AI · ELEVENLABS")
                .font(.mono(11)).tracking(2.5).foregroundColor(.muted.opacity(0.65))
                .frame(maxWidth: .infinity)
        }
        .frame(width: 380)
    }
}

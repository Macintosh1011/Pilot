import SwiftUI
import UIKit

/// 5 · BADGE (finale) — an editorial collectible like a letterpress bookplate.
/// Cream stock, ink + clay, the spark. Reveals in sequence.
struct BadgeScreen: View {
    var onRestart: () -> Void = {}
    var live: BadgeDoc? = nil
    var liveName: String? = nil
    var photoURL: String? = nil
    var badgeURL: String = "https://boothpilot.dev/b/preview"
    var isLive: Bool = false

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
    @State private var badgeHasArrived = false

    private var firstName: String { visitorName.split(separator: " ").first.map(String.init) ?? visitorName }

    /// Stable 3-digit badge number derived from the session id (matches the web badge's hash).
    private var badgeNumber: String {
        let id = badgeURL.split(separator: "/").last.map(String.init) ?? badgeURL
        let n = id.unicodeScalars.reduce(0) { ($0 &* 31 &+ Int($1.value)) & 0xffff }
        return String(format: "%03d", (n % 900) + 100)
    }

    var body: some View {
        ZStack {
            if isLive && !badgeHasArrived {
                loadingView
            } else {
                HStack(spacing: 58) {
                    bookplate
                    sidePanel
                }
                .padding(56)
                .frame(width: 1374, height: 1030)
            }
        }
        .frame(width: 1374, height: 1030)
        .animation(.easeInOut(duration: 0.55), value: badgeHasArrived)
        .onAppear {
            badgeHasArrived = live != nil || !isLive
            if badgeHasArrived {
                grow = false
                withAnimation(.easeOut(duration: 0.9).delay(1.9)) { grow = true }
            }
        }
        .onChange(of: live == nil) { _, isNil in
            guard !isNil, isLive else { return }
            badgeHasArrived = true
            grow = false
            // Delay slightly to let the cross-fade finish before the bars animate in.
            withAnimation(.easeOut(duration: 0.9).delay(0.65)) { grow = true }
        }
    }

    private var loadingView: some View {
        VStack(spacing: 22) {
            Spark(mode: .thinking).frame(width: 96, height: 96)
            Text("Crafting your booth badge…")
                .font(.serif(26, italic: true))
                .foregroundColor(.muted)
        }
        .frame(width: 1374, height: 1030)
    }

    // MARK: Bookplate card

    private var bookplate: some View {
        VStack(spacing: 0) {
            HStack {
                Wordmark(size: 12, tracking: 3)
                Spacer()
                Text("NO. \(badgeNumber)").font(.mono(11)).tracking(2).foregroundColor(.muted)
            }

            VStack(spacing: 0) {
                Group {
                    if let photoURL, let url = URL(string: photoURL) {
                        AsyncImage(url: url) { image in
                            image.resizable().scaledToFill()
                        } placeholder: {
                            Spark(mode: .speaking)
                        }
                        .frame(width: 128, height: 128)
                        .clipShape(Circle())
                        .overlay(Circle().strokeBorder(Color.clay, lineWidth: 2))
                    } else {
                        Spark(mode: .speaking).frame(width: 128, height: 128)
                    }
                }
                .padding(.bottom, 18)
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
                    Text("SHARE").font(.mono(15, weight: 500)).tracking(1).foregroundColor(.paper)
                        .frame(maxWidth: .infinity).padding(.vertical, 19)
                        .background(Capsule().fill(Color.ink))
                }
                Button(action: printBadge) {
                    Text("PRINT").font(.mono(15, weight: 500)).tracking(1).foregroundColor(.paper)
                        .frame(maxWidth: .infinity).padding(.vertical, 19)
                        .background(Capsule().fill(Color.clay))
                }
                Button(action: onRestart) {
                    Text("↻").font(.system(size: 22)).foregroundColor(.ink)
                        .frame(width: 62).padding(.vertical, 16)
                        .overlay(Capsule().strokeBorder(Color.ink.opacity(0.25)))
                }
            }
            .buttonStyle(.plain)

            Text("POWERED BY OPENAI · CONVEX · FIBER.AI · VAPI")
                .font(.mono(11)).tracking(2.5).foregroundColor(.muted.opacity(0.65))
                .frame(maxWidth: .infinity)
        }
        .frame(width: 380)
    }

    // MARK: Print (AirPrint a keepsake photo card)

    private func printBadge() {
        Task {
            var photo: UIImage?
            if let s = photoURL, let url = URL(string: s),
               let (data, _) = try? await URLSession.shared.data(from: url) {
                photo = UIImage(data: data)
            }
            await MainActor.run { presentPrint(photo: photo) }
        }
    }

    @MainActor private func presentPrint(photo: UIImage?) {
        let card = BadgePrintCard(
            visitorName: visitorName, archetype: archetype, compliment: compliment,
            discountCode: discountCode,
            stats: stats.map { (label: $0.label, value: $0.value, pct: $0.pct) },
            photo: photo, badgeURL: badgeURL)
        let renderer = ImageRenderer(content: card)
        renderer.scale = 3
        guard let image = renderer.uiImage else { return }

        let controller = UIPrintInteractionController.shared
        let info = UIPrintInfo(dictionary: nil)
        info.outputType = .photo
        info.jobName = "BoothPilot Badge"
        controller.printInfo = info
        controller.printingItem = image

        let scene = UIApplication.shared.connectedScenes
            .compactMap { $0 as? UIWindowScene }
            .first { $0.activationState == .foregroundActive }
            ?? UIApplication.shared.connectedScenes.compactMap { $0 as? UIWindowScene }.first
        if let window = scene?.windows.first(where: { $0.isKeyWindow }) ?? scene?.windows.first,
           let root = window.rootViewController {
            controller.present(
                from: CGRect(x: window.bounds.midX, y: window.bounds.midY, width: 1, height: 1),
                in: root.view, animated: true, completionHandler: nil)
        } else {
            controller.present(animated: true, completionHandler: nil)
        }
    }
}

/// Static, print-ready keepsake card (no animations, so ImageRenderer captures it fully).
private struct BadgePrintCard: View {
    let visitorName: String
    let archetype: String
    let compliment: String
    let discountCode: String
    let stats: [(label: String, value: String, pct: CGFloat)]
    let photo: UIImage?
    let badgeURL: String

    var body: some View {
        VStack(spacing: 0) {
            HStack {
                Wordmark(size: 14, tracking: 3)
                Spacer()
                Text("BOOTH BADGE").font(.mono(11)).tracking(2).foregroundColor(.muted)
            }

            VStack(spacing: 12) {
                Group {
                    if let photo {
                        Image(uiImage: photo).resizable().scaledToFill()
                    } else {
                        Spark(mode: .speaking)
                    }
                }
                .frame(width: 150, height: 150)
                .clipShape(Circle())
                .overlay(Circle().strokeBorder(Color.clay, lineWidth: 2))

                Text("YOUR ARCHETYPE").font(.mono(12, weight: 600)).tracking(4).foregroundColor(.clay)
                Text(archetype).font(.serif(38, weight: 500)).tracking(-1).foregroundColor(.ink)
                    .multilineTextAlignment(.center)
                Text(compliment).font(.serif(18, italic: true)).foregroundColor(.muted)
                    .multilineTextAlignment(.center).lineSpacing(5).frame(maxWidth: 420)
            }
            .padding(.vertical, 26)

            VStack(spacing: 12) {
                ForEach(Array(stats.enumerated()), id: \.offset) { _, s in
                    VStack(spacing: 6) {
                        HStack(alignment: .firstTextBaseline) {
                            Text(s.label).font(.mono(12)).tracking(1.5).foregroundColor(.muted)
                            Spacer()
                            Text(s.value).font(.serif(20, weight: 500)).foregroundColor(.ink)
                        }
                        GeometryReader { geo in
                            ZStack(alignment: .leading) {
                                Rectangle().fill(Color.ink.opacity(0.12))
                                Rectangle().fill(Color.clay).frame(width: geo.size.width * s.pct)
                            }
                        }
                        .frame(height: 4)
                    }
                }
            }

            Spacer(minLength: 24)

            HStack(alignment: .bottom) {
                VStack(alignment: .leading, spacing: 6) {
                    Text("ISSUED TO").font(.mono(10)).tracking(2).foregroundColor(.muted)
                    Text(visitorName).font(.serif(22, weight: 500)).foregroundColor(.ink)
                    Text(discountCode).font(.mono(18, weight: 600)).tracking(1).foregroundColor(.clay)
                        .padding(.top, 6)
                    Text("Flash this code at the booth for the founder rate.")
                        .font(.mono(10)).foregroundColor(.muted)
                }
                Spacer()
                QRCodeView(string: badgeURL).frame(width: 92, height: 92)
            }
        }
        .padding(40)
        .frame(width: 612, height: 792)
        .background(Color.paper)
    }
}

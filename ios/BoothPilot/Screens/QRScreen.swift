import SwiftUI

/// 4 · LINKEDIN QR — a friendly typed prompt over a tasteful viewfinder with a clay scan frame.
struct QRScreen: View {
    var onScan: (String) -> Void = { _ in }
    @State private var scan = false

    var body: some View {
        ZStack {
            VStack(spacing: 0) {
                Text("PERSONALIZE THIS")
                    .font(.mono(13, weight: 600))
                    .tracking(4)
                    .foregroundColor(.clay)
                    .padding(.bottom, 18)

                TypeText(
                    text: "Scan your *LinkedIn QR*.",
                    font: .serif(46, weight: 500),
                    speed: 50, keepCursor: true, tracking: -0.8, alignment: .center
                )

                Text("I’ll tailor your demo — and your badge — to what you actually do.")
                    .font(.serif(23))
                    .foregroundColor(.muted)
                    .lineSpacing(5)
                    .multilineTextAlignment(.center)
                    .frame(maxWidth: 460)
                    .padding(.top, 16)

                viewfinder
                    .padding(.top, 36)
                    .padding(.bottom, 28)

                Text("HOLD YOUR PHONE’S QR INSIDE THE FRAME · NOTHING IS STORED")
                    .font(.mono(12))
                    .tracking(1.5)
                    .foregroundColor(.muted)
            }
            .padding(.vertical, 46)
            .padding(.horizontal, 52)
            .frame(width: 720)
            .background(
                RoundedRectangle(cornerRadius: 26)
                    .fill(Color.card)
                    .overlay(RoundedRectangle(cornerRadius: 26).strokeBorder(Color.ink.opacity(0.12)))
                    .shadow(color: Color.ink.opacity(0.32), radius: 45, x: 0, y: 30)
            )
        }
        .frame(width: 1374, height: 1030)
        .onAppear {
            withAnimation(.easeInOut(duration: 2.6).repeatForever(autoreverses: true)) { scan = true }
        }
    }

    private var viewfinder: some View {
        ZStack {
            RoundedRectangle(cornerRadius: 20).fill(Color.panel)
            RoundedRectangle(cornerRadius: 20).strokeBorder(Color.ink.opacity(0.1))

            if QRScanner.isSupported {
                QRScanner(onCode: onScan)
                    .clipShape(RoundedRectangle(cornerRadius: 20))
            } else {
                // diagonal hatch + faint spark (sim / no-camera fallback)
                Canvas { ctx, size in
                    var x = -size.height
                    while x < size.width {
                        var p = Path()
                        p.move(to: CGPoint(x: x, y: 0))
                        p.addLine(to: CGPoint(x: x + size.height, y: size.height))
                        ctx.stroke(p, with: .color(Color.ink.opacity(0.03)), lineWidth: 12)
                        x += 24
                    }
                }
                .clipShape(RoundedRectangle(cornerRadius: 20))
                Spark(mode: .idle).frame(width: 120, height: 120).opacity(0.4)
            }

            ForEach(0..<4, id: \.self) { i in
                LBracket()
                    .stroke(Color.clay, style: StrokeStyle(lineWidth: 3, lineCap: .square))
                    .frame(width: 50, height: 50)
                    .rotationEffect(.degrees(Double(i) * 90))
                    .frame(maxWidth: .infinity, maxHeight: .infinity,
                           alignment: [Alignment.topLeading, .topTrailing, .bottomTrailing, .bottomLeading][i])
                    .padding(30)
            }

            Rectangle()
                .fill(Color.clay.opacity(0.8))
                .frame(height: 2)
                .padding(.horizontal, 30)
                .frame(maxHeight: .infinity, alignment: .top)
                .offset(y: scan ? 251 : 23)
        }
        .frame(width: 286, height: 286)
    }
}

/// Top-left corner bracket; rotate to place the other three corners.
private struct LBracket: Shape {
    func path(in rect: CGRect) -> Path {
        var p = Path()
        p.move(to: CGPoint(x: rect.minX, y: rect.maxY))
        p.addLine(to: CGPoint(x: rect.minX, y: rect.minY))
        p.addLine(to: CGPoint(x: rect.maxX, y: rect.minY))
        return p
    }
}

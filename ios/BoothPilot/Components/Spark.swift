import SwiftUI

enum SparkMode: String { case idle, listening, speaking, thinking }

/// BoothPilot's AI presence — a hand-drawn starburst in clay ink on paper.
/// Single-weight, slightly imperfect rays. Idle slowly turns and breathes;
/// listening ripples; speaking shimmers livelier; thinking draws itself stroke by stroke.
struct Spark: View {
    var mode: SparkMode = .idle
    var color: Color = .clay

    @State private var thinkStart = Date()

    private static let count = 13

    /// Ray endpoints in a 0…100 viewBox, with baked-in hand-drawn jitter.
    private static let rays: [(inner: CGPoint, outer: CGPoint)] = {
        var out: [(CGPoint, CGPoint)] = []
        let c = 50.0
        for i in 0..<count {
            let jitter = (i % 2 == 1 ? 2.4 : -2.0) + Double(i % 3 - 1) * 1.1
            let ang = (Double(i) * (360.0 / Double(count)) + jitter) * .pi / 180
            let inner = 8.5 + Double(i % 3) * 0.9
            let outer = 32.0 + Double((i * 5) % 9) - 3.0
            out.append((
                CGPoint(x: c + cos(ang) * inner, y: c + sin(ang) * inner),
                CGPoint(x: c + cos(ang) * outer, y: c + sin(ang) * outer)
            ))
        }
        return out
    }()

    var body: some View {
        TimelineView(.animation) { tl in
            Canvas { ctx, size in draw(&ctx, size, now: tl.date) }
        }
        .onAppear { thinkStart = Date() }
        .onChange(of: mode) { _, new in if new == .thinking { thinkStart = Date() } }
    }

    private func draw(_ ctx: inout GraphicsContext, _ size: CGSize, now: Date) {
        let t = now.timeIntervalSinceReferenceDate
        let s = min(size.width, size.height)
        ctx.translateBy(x: (size.width - s) / 2, y: (size.height - s) / 2)
        ctx.scaleBy(x: s / 100, y: s / 100)

        // rotation + breathing about the center
        let angle: Double
        switch mode {
        case .idle: angle = (t / 30).truncatingRemainder(dividingBy: 1) * 360
        case .listening: angle = (t / 75).truncatingRemainder(dividingBy: 1) * 360
        default: angle = 0
        }
        let breathe: Double
        switch mode {
        case .idle: breathe = 1.035 + 0.035 * sin(2 * .pi * t / 6.5)
        case .speaking: breathe = 1.035 + 0.035 * sin(2 * .pi * t / 1.9)
        default: breathe = 1
        }
        ctx.translateBy(x: 50, y: 50)
        ctx.rotate(by: .degrees(angle))
        ctx.scaleBy(x: breathe, y: breathe)
        ctx.translateBy(x: -50, y: -50)

        let elapsed = t - thinkStart.timeIntervalSinceReferenceDate

        for (i, ray) in Self.rays.enumerated() {
            var opacity = 1.0
            var width = 2.5
            var end = ray.outer

            switch mode {
            case .idle:
                break
            case .listening:
                let phase = (t - Double(i) * 0.085) / 1.7
                opacity = 0.69 - 0.31 * cos(2 * .pi * phase)
            case .speaking:
                let phase = (t - Double(i) * 0.045) / 0.78
                opacity = 0.725 - 0.275 * cos(2 * .pi * phase)
                width = 2.8 - 0.6 * cos(2 * .pi * phase)
            case .thinking:
                let p = min(max((elapsed - Double(i) * 0.09) / 0.5, 0), 1)
                if p <= 0 { continue }
                end = CGPoint(x: ray.inner.x + (ray.outer.x - ray.inner.x) * p,
                              y: ray.inner.y + (ray.outer.y - ray.inner.y) * p)
            }

            var path = Path()
            path.move(to: ray.inner)
            path.addLine(to: end)
            ctx.stroke(path, with: .color(color.opacity(opacity)),
                       style: StrokeStyle(lineWidth: width, lineCap: .round))
        }

        // center dot
        var dotOpacity = 1.0
        if mode == .thinking { dotOpacity = elapsed >= 1.2 ? 1 : 0 }
        let r = 3.2
        ctx.fill(Path(ellipseIn: CGRect(x: 50 - r, y: 50 - r, width: r * 2, height: r * 2)),
                 with: .color(color.opacity(dotOpacity)))
    }
}

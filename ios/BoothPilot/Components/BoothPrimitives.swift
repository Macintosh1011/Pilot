import SwiftUI
import CoreImage

// MARK: - Wordmark

/// BOOTHP\LOT — in the spirit of ANTHROP\C. Mono, uppercase, letter-spaced.
struct Wordmark: View {
    var size: CGFloat = 18
    var tracking: CGFloat = 5
    var color: Color = .ink

    var body: some View {
        Text("BOOTHP\\LOT")
            .font(.mono(size, weight: 600))
            .tracking(tracking)
            .foregroundColor(color)
    }
}

// MARK: - Cut-paper blob

/// An organic, hand-torn shape — a wobbly circle smoothed through its midpoints.
struct Blob: Shape {
    var radii: [CGFloat] = [1.0, 0.92, 1.05, 0.95, 1.02, 0.9, 1.04, 0.96]

    func path(in rect: CGRect) -> Path {
        let n = radii.count
        let cx = rect.midX, cy = rect.midY
        let rx = rect.width / 2, ry = rect.height / 2
        var pts: [CGPoint] = []
        for i in 0..<n {
            let a = Double(i) / Double(n) * 2 * .pi - .pi / 2
            pts.append(CGPoint(x: cx + cos(a) * rx * radii[i], y: cy + sin(a) * ry * radii[i]))
        }
        let mid = { (a: CGPoint, b: CGPoint) in CGPoint(x: (a.x + b.x) / 2, y: (a.y + b.y) / 2) }
        var path = Path()
        path.move(to: mid(pts[n - 1], pts[0]))
        for i in 0..<n {
            path.addQuadCurve(to: mid(pts[i], pts[(i + 1) % n]), control: pts[i])
        }
        path.closeSubpath()
        return path
    }
}

// MARK: - Paper background

private enum PaperNoise {
    static let image: Image? = {
        let ctx = CIContext(options: nil)
        guard let noise = CIFilter(name: "CIRandomGenerator")?.outputImage else { return nil }
        let mono = noise.applyingFilter("CIColorControls", parameters: [kCIInputSaturationKey: 0])
        let rect = CGRect(x: 0, y: 0, width: 200, height: 200)
        guard let cg = ctx.createCGImage(mono, from: rect) else { return nil }
        return Image(decorative: cg, scale: 1)
    }()
}

/// Warm paper: base tone, two faint clay washes in opposite corners, and a subtle grain.
struct PaperBackground: View {
    var body: some View {
        ZStack {
            Color.paper
            RadialGradient(colors: [Color.clay.opacity(0.06), .clear],
                           center: UnitPoint(x: 0.82, y: 0.12), startRadius: 0, endRadius: 480)
            RadialGradient(colors: [Color.tan.opacity(0.07), .clear],
                           center: UnitPoint(x: 0.12, y: 0.88), startRadius: 0, endRadius: 460)
            if let noise = PaperNoise.image {
                noise.resizable(resizingMode: .tile).opacity(0.06).blendMode(.multiply)
            }
        }
        .allowsHitTesting(false)
    }
}

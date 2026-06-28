import SwiftUI
import CoreText

// MARK: - Palette (from the BoothPilot Editorial design)

extension Color {
    init(hex: UInt, alpha: Double = 1) {
        self.init(
            .sRGB,
            red: Double((hex >> 16) & 0xFF) / 255,
            green: Double((hex >> 8) & 0xFF) / 255,
            blue: Double(hex & 0xFF) / 255,
            opacity: alpha
        )
    }

    static let paper = Color(hex: 0xFAF9F5)
    static let panel = Color(hex: 0xF0EEE6)
    static let panel2 = Color(hex: 0xF4F2EA)
    static let card = Color(hex: 0xFCFBF7)
    static let chip = Color(hex: 0xE7E3D8)
    static let ink = Color(hex: 0x141413)
    static let muted = Color(hex: 0x6B6B63)
    static let clay = Color(hex: 0xCC785C)
    static let tan = Color(hex: 0xD4A27F)
    static let rust = Color(hex: 0xB05730)
}

// MARK: - Variable-font helpers

/// 4-char OpenType axis tag → CoreText axis identifier.
private func axisTag(_ s: String) -> Int {
    s.utf8.reduce(0) { ($0 << 8) | Int($1) }
}

extension UIFont {
    /// Build a variable-font instance with explicit axis values (wght / opsz / …).
    /// Newsreader's defaults are Regular/18pt and JetBrains Mono's is Regular, so
    /// every call sets the axes it cares about rather than trusting the default instance.
    static func variable(family: String? = nil, name: String? = nil,
                         size: CGFloat, axes: [String: CGFloat]) -> UIFont {
        var attrs: [UIFontDescriptor.AttributeName: Any] = [:]
        if let family { attrs[.family] = family }
        if let name { attrs[.name] = name }
        if !axes.isEmpty {
            var dict: [Int: CGFloat] = [:]
            for (tag, value) in axes { dict[axisTag(tag)] = value }
            attrs[UIFontDescriptor.AttributeName(rawValue: kCTFontVariationAttribute as String)] = dict
        }
        return UIFont(descriptor: UIFontDescriptor(fontAttributes: attrs), size: size)
    }
}

extension Font {
    /// Newsreader serif — the voice of everything that matters. Optical size tracks
    /// the point size so large display text gains contrast and small text stays readable.
    static func serif(_ size: CGFloat, weight: CGFloat = 400, italic: Bool = false,
                      opsz: CGFloat? = nil) -> Font {
        let o = opsz ?? min(max(size, 6), 72)
        // Address each face by its PostScript name — the upright + italic share the family
        // "Newsreader 16pt", so a bare `.family` lookup is ambiguous and silently falls back
        // to the system sans. The PostScript name pins the exact face the variation axes apply to.
        let ui: UIFont = italic
            ? .variable(name: "Newsreader16pt-Italic", size: size, axes: ["wght": weight, "opsz": o])
            : .variable(name: "Newsreader16pt-Regular", size: size, axes: ["wght": weight, "opsz": o])
        return Font(ui)
    }

    /// JetBrains Mono — nav, micro-labels, the wordmark, the discount code.
    static func mono(_ size: CGFloat, weight: CGFloat = 400) -> Font {
        Font(UIFont.variable(family: "JetBrains Mono", size: size, axes: ["wght": weight]))
    }
}

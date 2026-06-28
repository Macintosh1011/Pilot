import SwiftUI

/// The booth's signature motion: text types itself out character by character with
/// slight timing jitter, longer pauses after punctuation, and a blinking clay cursor
/// trailing it. `*starred*` spans finish in clay. Ported from the design's `TypeLine`.
struct TypeText: View {
    let text: String
    var font: Font
    var color: Color = .ink
    var emphasis: Color = .clay
    var speed: Double = 42      // ms per char (before jitter)
    var startDelay: Double = 0  // ms before the first char
    var keepCursor: Bool = false
    var showCursor: Bool = true
    var lineSpacing: CGFloat = 0
    var tracking: CGFloat = 0
    var alignment: TextAlignment = .leading

    @State private var shown = 0
    @State private var cursorOn = true
    @Environment(\.accessibilityReduceMotion) private var reduceMotion

    private var chars: [(ch: Character, clay: Bool)] {
        var out: [(Character, Bool)] = []
        var clay = false
        for c in text {
            if c == "*" { clay.toggle(); continue }
            out.append((c, clay))
        }
        return out
    }

    var body: some View {
        let glyphs = chars
        let done = shown >= glyphs.count
        let wantCursor = showCursor && (!done || keepCursor)

        var composed = Text("")
        for g in glyphs.prefix(shown) {
            composed = composed + Text(String(g.ch)).foregroundColor(g.clay ? emphasis : color)
        }
        if wantCursor {
            composed = composed + Text("▏").foregroundColor(cursorOn ? emphasis : .clear)
        }

        return composed
            .font(font)
            .tracking(tracking)
            .lineSpacing(lineSpacing)
            .multilineTextAlignment(alignment)
            .task(id: text) { await type(count: glyphs.count) }
            .onReceive(Timer.publish(every: 0.525, on: .main, in: .common).autoconnect()) { _ in
                cursorOn.toggle()
            }
    }

    private func type(count: Int) async {
        if reduceMotion { shown = count; return }
        shown = 0
        cursorOn = true
        if startDelay > 0 {
            try? await Task.sleep(for: .milliseconds(Int(startDelay)))
            if Task.isCancelled { return }
        }
        let glyphs = chars
        var i = 0
        while i < count {
            i += 1
            shown = i
            if i >= count { break }
            let prev = glyphs[i - 1].ch
            var d = speed + Double.random(in: 0...(speed * 0.7))
            if prev == "." || prev == "?" || prev == "!" { d += 360 }
            else if prev == "," || prev == ";" || prev == "—" { d += 170 }
            else if Double.random(in: 0...1) < 0.06 { d += 240 }
            try? await Task.sleep(for: .milliseconds(Int(d)))
            if Task.isCancelled { return }
        }
    }
}

import SwiftUI

/// The live "Acme Analytics" demo, reskinned in cream/ink/clay. Everything is a pure
/// function of `stage` (0…3) so it changes calmly as the conversation advances.
struct AcmeDemoPanel: View {
    let stage: Int

    private var churnHi: Bool { stage >= 1 }
    private var chartActive: Bool { stage >= 2 }
    private var alertsOn: Bool { stage >= 3 }
    private var count: Int { Demo.visibleCount(stage: stage) }

    var body: some View {
        VStack(spacing: 0) {
            header
            Divider().background(Color.ink.opacity(0.08))
            body(in: 22)
        }
        .background(RoundedRectangle(cornerRadius: 22).fill(Color.card))
        .overlay(RoundedRectangle(cornerRadius: 22).strokeBorder(Color.ink.opacity(0.1)))
        .shadow(color: Color.ink.opacity(0.22), radius: 30, x: 0, y: 24)
    }

    private var header: some View {
        HStack {
            HStack(spacing: 12) {
                RoundedRectangle(cornerRadius: 8).fill(Color.clay)
                    .frame(width: 28, height: 28)
                    .overlay(RoundedRectangle(cornerRadius: 4)
                        .strokeBorder(Color.paper, lineWidth: 1.6).frame(width: 13, height: 13))
                Text("Acme Analytics").font(.serif(20, weight: 600)).tracking(-0.3).foregroundColor(.ink)
            }
            Spacer()
            HStack(spacing: 9) {
                Text("RETENTION").font(.mono(11)).tracking(2).foregroundColor(.muted)
                Circle().fill(Color.clay).frame(width: 7, height: 7)
            }
        }
        .padding(.horizontal, 24).padding(.vertical, 18)
    }

    private func body(in _: CGFloat) -> some View {
        VStack(alignment: .leading, spacing: 0) {
            Text("CUSTOMER HEALTH").font(.mono(11)).tracking(2).foregroundColor(.muted).padding(.bottom, 6)
            Text("At-Risk Accounts").font(.serif(30, weight: 500)).tracking(-0.6).foregroundColor(.ink)
                .padding(.bottom, 22)

            HStack(spacing: 16) {
                statCard(label: "NET MRR", value: "$148.2k", valueColor: .ink, highlighted: false)
                churnCard
                statCard(label: "MRR AT RISK", value: count == 0 ? "$0" : "$22.6k",
                         valueColor: count == 0 ? .ink : .rust, highlighted: false)
            }
            .padding(.bottom, 22)

            chartBlock.padding(.bottom, 22)

            alertsRow.padding(.bottom, 12)

            accountsList
        }
        .padding(.horizontal, 28).padding(.vertical, 26)
        .frame(maxHeight: .infinity, alignment: .top)
    }

    private func statCard(label: String, value: String, valueColor: Color, highlighted: Bool) -> some View {
        VStack(alignment: .leading, spacing: 9) {
            Text(label).font(.mono(11)).tracking(1.5).foregroundColor(.muted)
            Text(value).font(.serif(30, weight: 500)).tracking(-0.5).foregroundColor(valueColor)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(.horizontal, 20).padding(.vertical, 18)
        .background(RoundedRectangle(cornerRadius: 15).fill(Color.panel))
        .overlay(RoundedRectangle(cornerRadius: 15).strokeBorder(Color.ink.opacity(0.06)))
    }

    private var churnCard: some View {
        VStack(alignment: .leading, spacing: 9) {
            Text("CHURN RATE").font(.mono(11)).tracking(1.5).foregroundColor(.muted)
            HStack(alignment: .firstTextBaseline, spacing: 8) {
                Text("5.8%").font(.serif(30, weight: 500)).tracking(-0.5)
                    .foregroundColor(churnHi ? .rust : .ink)
                Text(stage >= 3 ? "forecast ↓" : "↑ 1.4pt")
                    .font(.mono(12)).foregroundColor(stage >= 3 ? .clay : .rust)
            }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(.horizontal, 20).padding(.vertical, 18)
        .background(RoundedRectangle(cornerRadius: 15)
            .fill(churnHi ? Color.clay.opacity(0.12) : Color.panel))
        .overlay(RoundedRectangle(cornerRadius: 15)
            .strokeBorder(churnHi ? Color.clay.opacity(0.5) : Color.ink.opacity(0.06)))
        .animation(.easeInOut(duration: 0.4), value: churnHi)
    }

    private var chartBlock: some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack {
                Text("CHURN SIGNAL · 8 WEEKS").font(.mono(11)).tracking(1.5).foregroundColor(.muted)
                Spacer()
                if chartActive {
                    Text("PROJECTED WITH ALERTS ↓").font(.mono(11)).tracking(1).foregroundColor(.clay)
                        .transition(.opacity)
                }
            }
            ChurnChart(active: chartActive).frame(height: 116)
        }
        .padding(.horizontal, 20).padding(.top, 18).padding(.bottom, 12)
        .background(RoundedRectangle(cornerRadius: 15).fill(Color.panel2))
        .overlay(RoundedRectangle(cornerRadius: 15).strokeBorder(Color.ink.opacity(0.06)))
        .animation(.easeInOut(duration: 0.5), value: chartActive)
    }

    private var alertsRow: some View {
        HStack {
            Text("FLAGGED THIS WEEK").font(.mono(11)).tracking(1.5).foregroundColor(.muted)
            Spacer()
            HStack(spacing: 11) {
                Text("SMART CHURN ALERTS").font(.mono(11)).tracking(1)
                    .foregroundColor(alertsOn ? .clay : .muted.opacity(0.7))
                ZStack(alignment: alertsOn ? .trailing : .leading) {
                    Capsule().fill(alertsOn ? Color.ink : Color.ink.opacity(0.16))
                        .frame(width: 50, height: 28)
                    Circle().fill(Color.paper).frame(width: 22, height: 22).padding(3)
                }
                .animation(.easeInOut(duration: 0.35), value: alertsOn)
            }
        }
    }

    private var accountsList: some View {
        VStack(spacing: 10) {
            if count == 0 {
                Text("LISTENING FOR YOUR USE CASE…")
                    .font(.mono(12)).tracking(1.5).foregroundColor(.muted.opacity(0.7))
                    .frame(maxWidth: .infinity)
                    .padding(28)
                    .overlay(RoundedRectangle(cornerRadius: 13)
                        .strokeBorder(style: StrokeStyle(lineWidth: 1, dash: [5, 4]))
                        .foregroundColor(.ink.opacity(0.14)))
            } else {
                ForEach(Demo.accounts.prefix(count)) { AccountRow(account: $0) }
            }
        }
    }
}

private struct AccountRow: View {
    let account: Account

    var body: some View {
        HStack(spacing: 16) {
            Text(account.initials)
                .font(.mono(13, weight: 600)).foregroundColor(.ink)
                .frame(width: 38, height: 38)
                .background(RoundedRectangle(cornerRadius: 10).fill(Color.chip))
            VStack(alignment: .leading, spacing: 1) {
                Text(account.name).font(.serif(19, weight: 500)).foregroundColor(.ink)
                Text(account.signal).font(.mono(11)).tracking(0.5).foregroundColor(.muted)
            }
            Spacer(minLength: 0)
            Text(account.mrr).font(.serif(18, weight: 500)).foregroundColor(.ink)
                .frame(width: 60, alignment: .trailing)
            VStack(spacing: 5) {
                HStack {
                    Text("RISK").font(.mono(10)).tracking(1).foregroundColor(.muted)
                    Spacer()
                    Text("\(account.risk)%").font(.mono(12, weight: 600))
                        .foregroundColor(Demo.riskColor(account.risk))
                }
                GeometryReader { geo in
                    ZStack(alignment: .leading) {
                        Capsule().fill(Color.ink.opacity(0.08))
                        Capsule().fill(Demo.riskColor(account.risk))
                            .frame(width: geo.size.width * CGFloat(account.risk) / 100)
                    }
                }
                .frame(height: 6)
            }
            .frame(width: 120)
        }
        .padding(.horizontal, 18).padding(.vertical, 14)
        .background(RoundedRectangle(cornerRadius: 13).fill(Color.panel2))
        .overlay(RoundedRectangle(cornerRadius: 13).strokeBorder(Color.ink.opacity(0.07)))
        .transition(.move(edge: .bottom).combined(with: .opacity))
    }
}

/// The 8-week churn signal area chart, with an optional clay "projected with alerts" branch.
private struct ChurnChart: View {
    let active: Bool

    private let main: [CGPoint] = [
        .init(x: 0, y: 98), .init(x: 95, y: 90), .init(x: 190, y: 96), .init(x: 285, y: 74),
        .init(x: 380, y: 80), .init(x: 475, y: 58), .init(x: 570, y: 64), .init(x: 665, y: 44),
        .init(x: 760, y: 40),
    ]
    private let proj: [CGPoint] = [
        .init(x: 475, y: 58), .init(x: 570, y: 72), .init(x: 665, y: 92), .init(x: 760, y: 110),
    ]

    var body: some View {
        Canvas { ctx, size in
            let sx = size.width / 760, sy = size.height / 150
            func map(_ p: CGPoint) -> CGPoint { CGPoint(x: p.x * sx, y: p.y * sy) }

            // main area
            var area = Path()
            area.move(to: map(main[0]))
            main.dropFirst().forEach { area.addLine(to: map($0)) }
            area.addLine(to: map(CGPoint(x: 760, y: 150)))
            area.addLine(to: map(CGPoint(x: 0, y: 150)))
            area.closeSubpath()
            ctx.fill(area, with: .linearGradient(
                Gradient(colors: [Color.rust.opacity(0.18), Color.rust.opacity(0)]),
                startPoint: .zero, endPoint: CGPoint(x: 0, y: size.height)))

            // main line
            var line = Path()
            line.move(to: map(main[0]))
            main.dropFirst().forEach { line.addLine(to: map($0)) }
            ctx.stroke(line, with: .color(.rust), style: StrokeStyle(lineWidth: 2.5, lineJoin: .round))

            guard active else { return }
            // projected area + dashed branch
            var parea = Path()
            parea.move(to: map(proj[0]))
            proj.dropFirst().forEach { parea.addLine(to: map($0)) }
            parea.addLine(to: map(CGPoint(x: 760, y: 150)))
            parea.addLine(to: map(CGPoint(x: 475, y: 150)))
            parea.closeSubpath()
            ctx.fill(parea, with: .linearGradient(
                Gradient(colors: [Color.clay.opacity(0.2), Color.clay.opacity(0)]),
                startPoint: .zero, endPoint: CGPoint(x: 0, y: size.height)))

            var pline = Path()
            pline.move(to: map(proj[0]))
            proj.dropFirst().forEach { pline.addLine(to: map($0)) }
            ctx.stroke(pline, with: .color(.clay),
                       style: StrokeStyle(lineWidth: 2.5, lineJoin: .round, dash: [6, 5]))

            let end = map(proj.last!)
            ctx.fill(Path(ellipseIn: CGRect(x: end.x - 4.5, y: end.y - 4.5, width: 9, height: 9)),
                     with: .color(.clay))
        }
    }
}

import SwiftUI

/// 3 · CONVERSATION + LIVE DEMO (the hero). Left rail = spark + the AI's typed caption +
/// the MEET·UNDERSTAND·SHOW·BADGE step indicator.
///
/// Right pane (live mode):
///   displayStage == 0  → full front-camera preview so the visitor sees themselves + QR
///                        scan overlay (dismissed once they've been identified).
///   displayStage > 0   → AcmeDemoPanel driven by GPT's show_view tool calls, with the
///                        webcam shrunk to a rounded-corner PiP in the bottom-right corner.
///
/// Right pane (scripted mode): AcmeDemoPanel only, unchanged behaviour.
struct ConversationScreen: View {
    @ObservedObject var director: Director
    // Shared with the QR screen so the front-camera preview never restarts between screens.
    @ObservedObject private var camera: FrontCameraSession

    init(director: Director) {
        self.director = director
        _camera = ObservedObject(wrappedValue: director.camera)
    }

    private let labels = ["MEET", "UNDERSTAND", "SHOW", "BADGE"]

    var body: some View {
        HStack(spacing: 0) {
            leftRail
            rightPane
        }
        .frame(width: 1374, height: 1030)
    }

    // MARK: - Right pane

    @ViewBuilder private var rightPane: some View {
        if director.live {
            liveRightPane
                .frame(maxWidth: .infinity, maxHeight: .infinity)
        } else {
            AcmeDemoPanel(stage: director.displayStage, params: director.backend.demoParams)
                .padding(.horizontal, 38).padding(.vertical, 34)
                .frame(maxWidth: .infinity, maxHeight: .infinity)
        }
    }

    private var liveRightPane: some View {
        GeometryReader { geo in
            liveContent(geo: geo)
        }
    }

    private func liveContent(geo: GeometryProxy) -> some View {
        let showAcme = director.displayStage > 0
        let pipW: CGFloat = 160
        let pipH: CGFloat = 120
        let pipPad: CGFloat = 20

        return ZStack(alignment: .topLeading) {
            // Acme demo panel — fades in when the agent starts driving views.
            AcmeDemoPanel(stage: director.displayStage, params: director.backend.demoParams)
                .padding(.horizontal, 38).padding(.vertical, 34)
                .frame(width: geo.size.width, height: geo.size.height)
                .opacity(showAcme ? 1 : 0)

            // Camera preview — transitions from full pane to PiP as the demo unfolds.
            ZStack {
                CameraPreviewView(session: camera.session)
                // QR overlay: only while awaiting scan (hidden after identity captured)
                if !showAcme && director.linkedInURL == nil {
                    qrScanOverlay
                }
            }
            .clipShape(
                RoundedRectangle(
                    cornerRadius: showAcme ? 12 : 20,
                    style: .continuous
                )
            )
            .overlay {
                if showAcme {
                    RoundedRectangle(cornerRadius: 12, style: .continuous)
                        .strokeBorder(Color.white.opacity(0.22), lineWidth: 1)
                }
            }
            .shadow(color: showAcme ? .black.opacity(0.28) : .clear, radius: 10)
            .frame(
                width:  showAcme ? pipW : geo.size.width,
                height: showAcme ? pipH : geo.size.height
            )
            .offset(
                x: showAcme ? geo.size.width  - pipW - pipPad : 0,
                y: showAcme ? geo.size.height - pipH - pipPad : 0
            )
        }
        .animation(.spring(response: 0.5, dampingFraction: 0.82), value: showAcme)
    }

    // Corner-bracket frame + label shown over the webcam while awaiting QR scan.
    private var qrScanOverlay: some View {
        ZStack {
            ForEach(0..<4, id: \.self) { i in
                ScanBracket()
                    .stroke(Color.clay, style: StrokeStyle(lineWidth: 2.5, lineCap: .square))
                    .frame(width: 44, height: 44)
                    .rotationEffect(.degrees(Double(i) * 90))
                    .frame(
                        maxWidth: .infinity, maxHeight: .infinity,
                        alignment: [
                            Alignment.topLeading, .topTrailing,
                            .bottomTrailing, .bottomLeading
                        ][i]
                    )
                    .padding(40)
            }
            VStack {
                Spacer()
                Text("SHOW ME YOUR LINKEDIN QR")
                    .font(.mono(12, weight: 600))
                    .tracking(2)
                    .foregroundColor(.white)
                    .padding(.horizontal, 16).padding(.vertical, 10)
                    .background(Color.ink.opacity(0.58))
                    .clipShape(RoundedRectangle(cornerRadius: 8))
                    .padding(.bottom, 28)
            }
        }
    }

    // MARK: - Left rail (unchanged)

    private var leftRail: some View {
        VStack(alignment: .leading, spacing: 0) {
            Wordmark(size: 15, tracking: 4)

            VStack(alignment: .leading, spacing: 30) {
                Spark(mode: director.displaySpark)
                    .frame(width: 172, height: 172)
                    .padding(.leading, -8)

                VStack(alignment: .leading, spacing: 18) {
                    Text(director.displaySpeaker)
                        .font(.mono(13, weight: 600)).tracking(3).foregroundColor(.clay)

                    TypeText(
                        text: director.displayCaption,
                        font: .serif(39, weight: 400),
                        speed: 40, keepCursor: true, lineSpacing: 9, tracking: -0.5
                    )
                    .frame(maxWidth: .infinity, minHeight: 200, alignment: .topLeading)
                }
            }
            .frame(maxHeight: .infinity, alignment: .center)

            stepIndicator
        }
        .padding(.horizontal, 44).padding(.vertical, 46)
        .frame(width: 540)
        .overlay(Rectangle().fill(Color.ink.opacity(0.1)).frame(width: 1), alignment: .trailing)
    }

    private var stepIndicator: some View {
        HStack(spacing: 12) {
            ForEach(Array(labels.enumerated()), id: \.offset) { i, label in
                let state = i < director.displayStep ? 2 : (i == director.displayStep ? 1 : 0)
                Text(label)
                    .font(.mono(13, weight: state == 1 ? 600 : 500))
                    .tracking(2)
                    .foregroundColor(state == 1 ? .clay : state == 2 ? .ink : .ink.opacity(0.32))
                if i < labels.count - 1 {
                    Text("·").font(.mono(13)).foregroundColor(.ink.opacity(0.25))
                }
            }
        }
    }
}

/// Top-left corner bracket for the QR scan frame; rotate to place the other three.
/// (QRScreen.swift has its own private copy — these live separately by design.)
private struct ScanBracket: Shape {
    func path(in rect: CGRect) -> Path {
        var p = Path()
        p.move(to: CGPoint(x: rect.minX, y: rect.maxY))
        p.addLine(to: CGPoint(x: rect.minX, y: rect.minY))
        p.addLine(to: CGPoint(x: rect.maxX, y: rect.minY))
        return p
    }
}

import SwiftUI

/// 3 · CONVERSATION + LIVE DEMO (the hero). Left rail = spark + the AI's typed caption +
/// the MEET·UNDERSTAND·SHOW·BADGE step indicator. Right = the Acme Analytics demo.
struct ConversationScreen: View {
    @ObservedObject var director: Director

    private let labels = ["MEET", "UNDERSTAND", "SHOW", "BADGE"]

    var body: some View {
        HStack(spacing: 0) {
            leftRail
            AcmeDemoPanel(stage: director.displayStage)
                .padding(.horizontal, 38).padding(.vertical, 34)
                .frame(maxWidth: .infinity, maxHeight: .infinity)
        }
        .frame(width: 1374, height: 1030)
    }

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

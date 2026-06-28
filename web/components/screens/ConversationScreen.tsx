"use client";

import AcmeDemoPanel from "@/components/AcmeDemoPanel";
import { Mono } from "@/components/BoothUI";
import Spark from "@/components/Spark";
import TypeText from "@/components/Typewriter";
import Wordmark from "@/components/Wordmark";
import { useDirector } from "@/lib/director";

/*
 * 3 · CONVERSATION + LIVE DEMO (the hero). Left rail = Spark + the AI's typed
 * caption + the MEET·UNDERSTAND·SHOW·BADGE step indicator. Right = the Acme
 * Analytics demo, revealed by displayStage / highlight. Ported from
 * ios/BoothPilot/Screens/ConversationScreen.swift.
 */

const LABELS = ["MEET", "UNDERSTAND", "SHOW", "BADGE"] as const;

export default function ConversationScreen() {
  const {
    displaySpark,
    displaySpeaker,
    displayCaption,
    displayStage,
    displayStep,
    highlight,
  } = useDirector();

  return (
    <div style={{ position: "absolute", inset: 0, display: "flex" }}>
      {/* Left rail */}
      <div
        style={{
          position: "relative",
          flex: "0 0 540px",
          width: 540,
          height: "100%",
          display: "flex",
          flexDirection: "column",
          padding: "46px 44px",
          borderRight: "1px solid rgba(20, 20, 19, 0.1)",
        }}
      >
        <Wordmark size={15} tracking={4} />

        <div
          style={{
            flex: 1,
            minHeight: 0,
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            gap: 30,
          }}
        >
          <div style={{ marginLeft: -8 }}>
            <Spark mode={displaySpark} size={172} />
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
            <Mono size={13} weight={600} tracking={3} color="var(--clay)">
              {displaySpeaker}
            </Mono>

            <div
              style={{
                minHeight: 200,
                fontWeight: 400,
                letterSpacing: -0.5,
                lineHeight: 1.23,
              }}
            >
              {/* Re-keying on the caption restarts the typewriter each beat. */}
              <TypeText
                key={displayCaption}
                text={displayCaption}
                size={39}
                speed={40}
                keepCursor
              />
            </div>
          </div>
        </div>

        <StepIndicator step={displayStep} />
      </div>

      {/* Right: the live demo */}
      <div
        style={{
          flex: 1,
          minWidth: 0,
          height: "100%",
          padding: "34px 38px",
        }}
      >
        <AcmeDemoPanel stage={displayStage} highlight={highlight} />
      </div>
    </div>
  );
}

function StepIndicator({ step }: { step: number }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
      {LABELS.map((label, i) => {
        // 2 = done, 1 = current, 0 = upcoming (mirrors the SwiftUI ternary).
        const state = i < step ? 2 : i === step ? 1 : 0;
        const color =
          state === 1 ? "var(--clay)" : state === 2 ? "var(--ink)" : "rgba(20, 20, 19, 0.32)";
        return (
          <div key={label} style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <Mono size={13} weight={state === 1 ? 600 : 500} tracking={2} color={color}>
              {label}
            </Mono>
            {i < LABELS.length - 1 && (
              <Mono size={13} weight={500} tracking={0} color="rgba(20, 20, 19, 0.25)">
                ·
              </Mono>
            )}
          </div>
        );
      })}
    </div>
  );
}

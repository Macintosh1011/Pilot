"use client";

import type { ReactNode } from "react";

import Artboard from "@/components/Artboard";
import AttractScreen from "@/components/screens/AttractScreen";
import BadgeScreen from "@/components/screens/BadgeScreen";
import ConversationScreen from "@/components/screens/ConversationScreen";
import GreetingScreen from "@/components/screens/GreetingScreen";
import QRScreen from "@/components/screens/QRScreen";
import { useDirector } from "@/lib/director";

/*
 * BoothStage — the web port of ios/BoothPilot/BoothView.swift's screen router.
 *
 * It scales the fixed 1374×1030 artboard to fit the viewport (via <Artboard>),
 * cross-fades between the five Director screens, and forwards the whole-stage
 * tap gesture:
 *
 *   • attract → begin()  (live: create session + greet + start voice; scripted:
 *                          advance into the walkthrough)
 *   • greeting/qr/conversation → tap()  (scripted advance; a no-op in live mode,
 *                          where Vapi voice + Convex tool calls drive the state)
 *   • badge → ignored  (matches BoothView's `if screen != .badge`; the Badge
 *                        screen has its own Share / restart buttons)
 *
 * Each Director.screen maps to one ported screen component:
 *   attract → AttractScreen · greeting → GreetingScreen · qr → QRScreen ·
 *   conversation → ConversationScreen · badge → BadgeScreen.
 */

const FADE_KEYFRAMES = `
@keyframes boothScreenFade { from { opacity: 0; } to { opacity: 1; } }
.booth-screen { animation: boothScreenFade 0.45s ease both; }
@media (prefers-reduced-motion: reduce) {
  .booth-screen { animation: none; }
}
`;

function screenFor(screen: ReturnType<typeof useDirector>["screen"]): ReactNode {
  switch (screen) {
    case "attract":
      return <AttractScreen />;
    case "greeting":
      return <GreetingScreen />;
    case "qr":
      return <QRScreen />;
    case "conversation":
      return <ConversationScreen />;
    case "badge":
      return <BadgeScreen />;
    default:
      return null;
  }
}

export default function BoothStage() {
  const director = useDirector();
  const { screen, begin, tap } = director;

  const onStageClick = () => {
    if (screen === "attract") {
      begin();
      return;
    }
    if (screen === "badge") return;
    tap();
  };

  const interactive = screen !== "badge";

  return (
    <div
      onClick={interactive ? onStageClick : undefined}
      style={{
        position: "fixed",
        inset: 0,
        cursor: interactive ? "pointer" : "default",
      }}
    >
      <style>{FADE_KEYFRAMES}</style>
      <Artboard>
        {/* Re-keying on the screen identity re-mounts (and fades in) each screen,
            mirroring BoothView's `.id(...)` + `.transition(.opacity)`. */}
        <div
          key={screen}
          className="booth-screen"
          style={{ position: "absolute", inset: 0 }}
        >
          {screenFor(screen)}
        </div>
      </Artboard>
    </div>
  );
}

"use client";

import { Mono } from "@/components/BoothUI";
import QRScanner from "@/components/QRScanner";
import TypeText from "@/components/Typewriter";
import { useDirector } from "@/lib/director";

/*
 * 4 · LINKEDIN QR — a friendly typed prompt over a tasteful viewfinder with a
 * clay scan frame. Ported from ios/BoothPilot/Screens/QRScreen.swift.
 *
 * Live voice mode skips QR (greeting → conversation), so this screen only shows
 * in the scripted walkthrough. We now render the live <QRScanner>: it opens the
 * rear camera and decodes a LinkedIn QR via @zxing/browser, calling
 * Director.captureLinkedIn(url) (→ enters the conversation with that contact). If
 * there's no camera / permission / decoder, the scanner renders the same mock
 * viewfinder as before and the whole-stage tap (BoothStage → Director.tap) still
 * advances the walkthrough, exactly like the iOS `QRScanner.isSupported` fallback.
 */

export default function QRScreen() {
  const director = useDirector();

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <div
        style={{
          width: 720,
          padding: "46px 52px",
          borderRadius: 26,
          background: "var(--card)",
          border: "1px solid rgba(20, 20, 19, 0.12)",
          boxShadow: "0 30px 45px rgba(20, 20, 19, 0.32)",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
        }}
      >
        <Mono size={13} weight={600} tracking={4} color="var(--clay)" style={{ marginBottom: 18 }}>
          PERSONALIZE THIS
        </Mono>

        <div style={{ textAlign: "center", fontWeight: 500, letterSpacing: -0.8, lineHeight: 1.1 }}>
          <TypeText text="Scan your *LinkedIn QR*." size={46} speed={50} keepCursor />
        </div>

        <p
          style={{
            maxWidth: 460,
            marginTop: 16,
            textAlign: "center",
            fontFamily: "var(--font-serif)",
            fontSize: 23,
            lineHeight: 1.32,
            color: "var(--muted)",
          }}
        >
          I’ll tailor your demo — and your badge — to what you actually do.
        </p>

        <div style={{ marginTop: 36, marginBottom: 28 }}>
          <QRScanner active onResult={(url) => director.captureLinkedIn(url)} />
        </div>

        <Mono size={12} weight={500} tracking={1.5} color="var(--muted)">
          HOLD YOUR PHONE’S QR INSIDE THE FRAME · NOTHING IS STORED
        </Mono>
      </div>
    </div>
  );
}

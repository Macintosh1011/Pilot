"use client";

import Blob from "@/components/Blob";
import { Mono, PoweredBy, positioned } from "@/components/BoothUI";
import Spark from "@/components/Spark";
import TypeText from "@/components/Typewriter";
import Wordmark from "@/components/Wordmark";

/*
 * 1 · ATTRACT — a printed poster that's quietly alive: Spark slowly turning, a
 * big serif line typing itself out, cut-paper clay shapes. Ported from
 * ios/BoothPilot/Screens/AttractScreen.swift. Authored in the 1374×1030 space.
 */

export default function AttractScreen() {
  return (
    <div style={{ position: "absolute", inset: 0 }}>
      {/* cut-paper shapes */}
      <div style={positioned(1151, 55)}>
        <Blob
          size={230}
          rotation={-8}
          fill="var(--clay)"
          opacity={0.92}
          radii={[1.0, 0.9, 1.06, 0.94, 1.02, 0.88, 1.05, 0.95]}
          shadowColor="rgba(176, 87, 48, 0.5)"
          shadowBlur={25}
          shadowOffset={{ x: 0, y: 24 }}
        />
      </div>

      <div
        style={{
          ...positioned(110, 950),
          width: 300,
          height: 300,
          borderRadius: "50%",
          background: "var(--tan)",
          opacity: 0.5,
        }}
      />

      <div
        style={{
          ...positioned(192, 868),
          width: 84,
          height: 84,
          borderRadius: "50%",
          border: "2px solid var(--rust)",
          opacity: 0.55,
        }}
      />

      {/* wordmark, pinned top-left */}
      <Wordmark size={18} tracking={5} style={{ position: "absolute", top: 46, left: 56 }} />

      {/* centre */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 30,
          padding: "0 120px",
        }}
      >
        <Spark mode="idle" size={248} />

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 26,
          }}
        >
          <div
            style={{
              maxWidth: 1000,
              textAlign: "center",
              fontWeight: 500,
              letterSpacing: -1.5,
              lineHeight: 1.08,
            }}
          >
            <TypeText
              text="Tell me what you’re *building*."
              size={76}
              speed={50}
              keepCursor
            />
          </div>

          <Mono size={15} weight={500} tracking={3} color="var(--muted)">
            STEP UP — IT TAKES ABOUT SIXTY SECONDS
          </Mono>
        </div>
      </div>

      {/* sponsors, pinned bottom */}
      <div
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          bottom: 44,
          display: "flex",
          justifyContent: "center",
        }}
      >
        <PoweredBy size={12} tracking={3} opacity={0.7} />
      </div>
    </div>
  );
}

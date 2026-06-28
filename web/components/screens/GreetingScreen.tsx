"use client";

import Blob from "@/components/Blob";
import { Mono, positioned } from "@/components/BoothUI";
import Spark from "@/components/Spark";
import TypeText from "@/components/Typewriter";

/*
 * 2 · GREETING — the spark wakes, the headline types into a warm welcome.
 * Ported from ios/BoothPilot/Screens/GreetingScreen.swift.
 */

export default function GreetingScreen() {
  return (
    <div style={{ position: "absolute", inset: 0 }}>
      <div style={positioned(180, 50)}>
        <Blob
          size={200}
          rotation={12}
          fill="var(--tan)"
          opacity={0.55}
          radii={[1.0, 0.94, 1.05, 0.9, 1.03, 0.95, 1.02, 0.92]}
        />
      </div>

      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 34,
          padding: "0 120px",
        }}
      >
        <Spark mode="speaking" size={236} />

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
          }}
        >
          <Mono size={14} weight={600} tracking={5} color="var(--clay)" style={{ marginBottom: 22 }}>
            WELCOME
          </Mono>

          <div style={{ textAlign: "center", fontWeight: 500, letterSpacing: -1.4, lineHeight: 1.1 }}>
            <TypeText text="Hello. *Good to see you.*" size={72} speed={56} />
          </div>

          <div
            style={{
              maxWidth: 760,
              marginTop: 26,
              textAlign: "center",
              lineHeight: 1.2,
            }}
          >
            <TypeText
              text="Tell me what you’re working on — I’ll take it from there."
              size={30}
              color="var(--muted)"
              speed={30}
              startDelay={1100}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

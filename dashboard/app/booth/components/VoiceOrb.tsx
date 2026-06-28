// Pure CSS state-driven starburst — server component, no JS runtime.
// Extends the 13-ray Spark.tsx geometry with per-state animation speeds.
// idle: slow spin + gentle breathe
// listening: faster spin + pulsing rings
// thinking: very slow spin + asymmetric scale/opacity oscillation + glow
// speaking: rapid spin + strong breathe + livelier ray weight

import styles from "./VoiceOrb.module.css";

export type VoiceState = "idle" | "listening" | "thinking" | "speaking";

// 13-ray geometry — same jitter values as Spark.tsx / iOS Spark.swift
const COUNT = 13;

interface Ray {
  ix: number;
  iy: number;
  ox: number;
  oy: number;
}

const RAYS: Ray[] = Array.from({ length: COUNT }, (_, i) => {
  const jitter = (i % 2 === 1 ? 2.4 : -2.0) + (i % 3 - 1) * 1.1;
  const ang = ((i * (360.0 / COUNT)) + jitter) * (Math.PI / 180);
  const inner = 8.5 + (i % 3) * 0.9;
  const outer = 32.0 + ((i * 5) % 9) - 3.0;
  return {
    ix: 50 + Math.cos(ang) * inner,
    iy: 50 + Math.sin(ang) * inner,
    ox: 50 + Math.cos(ang) * outer,
    oy: 50 + Math.sin(ang) * outer,
  };
});

// Lookup tables — type-safe CSS Module class access
const SPIN_CLASS: Record<VoiceState, string> = {
  idle:      styles.spinIdle,
  listening: styles.spinListening,
  thinking:  styles.spinThinking,
  speaking:  styles.spinSpeaking,
};

const BREATHE_CLASS: Record<VoiceState, string> = {
  idle:      styles.breatheIdle,
  listening: styles.breatheListening,
  thinking:  styles.breatheThinking,
  speaking:  styles.breatheSpeaking,
};

const ARIA_LABEL: Record<VoiceState, string> = {
  idle:      "AI assistant: idle",
  listening: "AI assistant: listening",
  thinking:  "AI assistant: thinking",
  speaking:  "AI assistant: speaking",
};

export function VoiceOrb({ state, size = 120 }: { state: VoiceState; size?: number }) {
  const showRings = state === "listening" || state === "speaking";

  return (
    <div
      className={styles.container}
      style={{ width: size, height: size }}
      role="img"
      aria-label={ARIA_LABEL[state]}
    >
      {/* Expanding rings — listening has slow rings, speaking has fast rings */}
      {showRings && (
        <>
          <span
            className={
              state === "listening"
                ? `${styles.ring} ${styles.ringListening1}`
                : `${styles.ring} ${styles.ringSpeaking1}`
            }
          />
          <span
            className={
              state === "listening"
                ? `${styles.ring} ${styles.ringListening2}`
                : `${styles.ring} ${styles.ringSpeaking2}`
            }
          />
        </>
      )}

      {/* Warm radial glow behind starburst during thinking */}
      {state === "thinking" && <span className={styles.thinkGlow} aria-hidden="true" />}

      <svg
        width="100%"
        height="100%"
        viewBox="-5 -5 110 110"
        fill="none"
        aria-hidden="true"
        className={styles.svg}
      >
        {/* Outer breathe group — scale oscillation speed varies per state */}
        <g
          style={{ transformOrigin: "50px 50px" }}
          className={BREATHE_CLASS[state]}
        >
          {/* Inner spin group — rotation speed varies per state */}
          <g
            style={{ transformOrigin: "50px 50px" }}
            className={SPIN_CLASS[state]}
          >
            {RAYS.map((ray, i) => (
              <line
                key={i}
                x1={ray.ix}
                y1={ray.iy}
                x2={ray.ox}
                y2={ray.oy}
                stroke="var(--clay)"
                strokeWidth={state === "speaking" ? 3.0 : 2.5}
                strokeLinecap="round"
              />
            ))}
            <circle cx={50} cy={50} r={3.2} fill="var(--clay)" />
          </g>
        </g>
      </svg>
    </div>
  );
}

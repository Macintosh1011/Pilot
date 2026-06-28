import type { SparkMode } from "@/lib/sparkMode";

/**
 * The scripted booth walkthrough, ported 1:1 from
 * `ios/BoothPilot/Demo/DemoData.swift` (the `Demo` enum + `Beat` struct).
 *
 * The Director (lib/director.tsx) plays these beats in scripted mode (no Vapi
 * key) and uses {@link stageForView} / {@link visibleCount} in both modes to
 * decide how much of the Acme demo panel is revealed. The on-screen Typewriter
 * styles the `*starred*` spans in clay, so the asterisks are preserved verbatim
 * (along with the curly quotes / em-dashes / ellipsis from the iOS copy).
 */

/** The five booth states, matching the iOS `Screen` enum. */
export type Screen = "attract" | "greeting" | "conversation" | "qr" | "badge";

/** A single scripted conversation turn. */
export type Beat = {
  /** Which MEET·UNDERSTAND·SHOW·BADGE step is active (0–3). */
  step: number;
  /** Spark animation state while this beat is on screen. */
  spark: SparkMode;
  /** Who is talking: "VISITOR" or "BOOTHPILOT". */
  speaker: "VISITOR" | "BOOTHPILOT";
  /** Caption text; `*starred*` spans render in clay. */
  line: string;
  /** How much of the Acme demo is revealed (drives {@link visibleCount}). */
  stage: number;
};

/** The 7 scripted beats (indices 0–6), copied verbatim from DemoData.swift. */
export const BEATS: readonly Beat[] = [
  {
    step: 0,
    spark: "listening",
    speaker: "VISITOR",
    line: "“We’re Series A — *churn* is quietly killing our growth.”",
    stage: 0,
  },
  {
    step: 1,
    spark: "thinking",
    speaker: "BOOTHPILOT",
    line: "A retention problem. Let me pull up the view that *actually matters* for you.",
    stage: 0,
  },
  {
    step: 1,
    spark: "speaking",
    speaker: "BOOTHPILOT",
    line: "This is *Acme Analytics* — tuned to your at-risk accounts, not vanity metrics.",
    stage: 1,
  },
  {
    step: 2,
    spark: "speaking",
    speaker: "BOOTHPILOT",
    line: "Four accounts are flashing churn signals this week — *$22.6k* of MRR at risk.",
    stage: 2,
  },
  {
    step: 2,
    spark: "listening",
    speaker: "VISITOR",
    line: "“Can my team get *pinged* before those accounts actually leave?”",
    stage: 2,
  },
  {
    step: 3,
    spark: "speaking",
    speaker: "BOOTHPILOT",
    line: "Yes — *smart alerts* route the riskiest ones to your team first. Watch the forecast bend.",
    stage: 3,
  },
  {
    step: 3,
    spark: "thinking",
    speaker: "BOOTHPILOT",
    line: "Love what you’re building. Let me *mint your bookplate*…",
    stage: 3,
  },
];

/** Index of the final beat (mirrors `Director.lastBeat`). */
export const LAST_BEAT = BEATS.length - 1;

/**
 * Maps a live Convex `demoState.view` (set by GPT's `show_view` tool) to how
 * much of the Acme panel is revealed — the agreed B1/B2 view vocabulary.
 * Mirrors `Demo.stage(forView:)`.
 */
export function stageForView(view: string | null | undefined): number {
  switch (view) {
    case "home":
    case "pricing":
    case "integrations":
      return 1;
    case "churn":
    case "query-result":
      return 2;
    case "alerts":
      return 3;
    default:
      return 0;
  }
}

/** How many at-risk account rows to reveal at a given stage. Mirrors `Demo.visibleCount(stage:)`. */
export function visibleCount(stage: number): number {
  return stage <= 0 ? 0 : stage === 1 ? 2 : 4;
}

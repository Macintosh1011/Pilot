// Design tokens ported from ios/BoothPilot/Theme.swift.
// CSS variables (the canonical source) live in app/globals.css; these constants
// mirror them for components that need the values in JavaScript (e.g. SVG fills,
// canvas drawing, the artboard scale math).

/** The exact editorial palette. Hex strings match Theme.swift one-for-one. */
export const colors = {
  paper: "#FAF9F5",
  panel: "#F0EEE6",
  panel2: "#F4F2EA",
  card: "#FCFBF7",
  chip: "#E7E3D8",
  ink: "#141413",
  muted: "#6B6B63",
  clay: "#CC785C",
  tan: "#D4A27F",
  rust: "#B05730",
} as const;

export type ColorToken = keyof typeof colors;

/** `var(--token)` references, for inline styles that prefer the CSS variable. */
export const cssVars = {
  paper: "var(--paper)",
  panel: "var(--panel)",
  panel2: "var(--panel2)",
  card: "var(--card)",
  chip: "var(--chip)",
  ink: "var(--ink)",
  muted: "var(--muted)",
  clay: "var(--clay)",
  tan: "var(--tan)",
  rust: "var(--rust)",
} as const;

/** Font stacks exposed by app/globals.css (wired to next/font in app/layout.tsx). */
export const fonts = {
  serif: "var(--font-serif)",
  mono: "var(--font-mono)",
} as const;

/**
 * The booth is authored in a fixed coordinate space and scaled to fit the
 * viewport, matching ios/BoothPilot/BoothView.swift.
 */
export const ARTBOARD = {
  width: 1374,
  height: 1030,
} as const;

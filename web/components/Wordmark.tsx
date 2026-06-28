import type { CSSProperties } from "react";

/*
 * Wordmark — "BOOTHP\LOT", in the spirit of ANTHROP\C. Mono, uppercase,
 * letter-spaced, with a literal backslash glyph. Ported from `Wordmark` in
 * ios/BoothPilot/Components/BoothPrimitives.swift (default size 18, weight 600,
 * tracking 5, ink).
 */

type WordmarkProps = {
  /** Font size in px (artboard coordinate space). */
  size?: number;
  /** Font weight (JetBrains Mono variable axis). */
  weight?: number;
  /** Letter spacing in px. */
  tracking?: number;
  /** Any CSS color; defaults to ink. */
  color?: string;
  style?: CSSProperties;
};

export default function Wordmark({
  size = 18,
  weight = 600,
  tracking = 5,
  color = "var(--ink)",
  style,
}: WordmarkProps) {
  return (
    <span
      style={{
        fontFamily: "var(--font-mono)",
        fontSize: size,
        fontWeight: weight,
        letterSpacing: tracking,
        color,
        textTransform: "uppercase",
        whiteSpace: "nowrap",
        display: "inline-block",
        lineHeight: 1,
        ...style,
      }}
    >
      {"BOOTHP\\LOT"}
    </span>
  );
}

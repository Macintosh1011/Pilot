import type { CSSProperties, ReactNode } from "react";

/*
 * BoothUI — small cross-screen helpers used by the booth screens.
 *
 * Note on scope: ios/BoothPilot/Components/BoothPrimitives.swift only defined
 * `Wordmark`, `Blob`, and `PaperBackground`, which already exist as their own
 * web components (Wordmark.tsx / Blob.tsx / PaperBackground.tsx) and are NOT
 * redefined here. This file instead holds the genuinely shared layout/typography
 * helpers the screens lean on (the SwiftUI `Text(...).font(.mono(...))` micro
 * labels, the sponsors footer, the QR viewfinder corner bracket, and the
 * `.position(x:y:)` → CSS centering helper), so each screen stays declarative.
 */

const MONO = "var(--font-mono)";

/**
 * SwiftUI `.position(x:, y:)` centers a view's *center* at (x, y) within its
 * parent. In the 1374×1030 artboard that's an absolutely-positioned box nudged
 * back by half its own size.
 */
export function positioned(x: number, y: number): CSSProperties {
  return {
    position: "absolute",
    left: x,
    top: y,
    transform: "translate(-50%, -50%)",
  };
}

type MonoProps = {
  /** Font size in px (artboard space). */
  size?: number;
  /** JetBrains Mono weight axis. */
  weight?: number;
  /** Letter spacing in px (SwiftUI `.tracking`). */
  tracking?: number;
  /** Any CSS color (incl. `var(--…)`). */
  color?: string;
  children: ReactNode;
  style?: CSSProperties;
};

/**
 * A mono micro-label — the booth's recurring `Text(...).font(.mono(size, weight))
 * .tracking(t).foregroundColor(c)` pattern (nav, eyebrows, step labels, codes).
 */
export function Mono({
  size = 13,
  weight = 500,
  tracking = 2,
  color = "var(--muted)",
  children,
  style,
}: MonoProps) {
  return (
    <span
      style={{
        fontFamily: MONO,
        fontSize: size,
        fontWeight: weight,
        letterSpacing: tracking,
        color,
        lineHeight: 1,
        display: "inline-block",
        ...style,
      }}
    >
      {children}
    </span>
  );
}

type PoweredByProps = {
  size?: number;
  tracking?: number;
  color?: string;
  opacity?: number;
  style?: CSSProperties;
};

/** The sponsors footer line, shared by Attract and Badge. */
export function PoweredBy({
  size = 12,
  tracking = 3,
  color = "var(--muted)",
  opacity = 0.7,
  style,
}: PoweredByProps) {
  return (
    <span
      style={{
        fontFamily: MONO,
        fontSize: size,
        fontWeight: 500,
        letterSpacing: tracking,
        color,
        opacity,
        whiteSpace: "nowrap",
        lineHeight: 1,
        ...style,
      }}
    >
      POWERED BY OPENAI · CONVEX · FIBER.AI · ELEVENLABS
    </span>
  );
}

type LBracketProps = {
  /** Bracket box size in px. */
  size?: number;
  /** Stroke color; defaults to clay. */
  color?: string;
  /** Stroke width in px. */
  width?: number;
  /** Rotation in degrees (0/90/180/270 → the four corners). */
  rotation?: number;
  style?: CSSProperties;
};

/**
 * Top-left corner bracket for the QR viewfinder; rotate to place the other three
 * corners. Ported from the private `LBracket` Shape in QRScreen.swift
 * (move(minX,maxY) → (minX,minY) → (maxX,minY)).
 */
export function LBracket({
  size = 50,
  color = "var(--clay)",
  width = 3,
  rotation = 0,
  style,
}: LBracketProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      aria-hidden
      style={{
        display: "block",
        transform: rotation ? `rotate(${rotation}deg)` : undefined,
        overflow: "visible",
        ...style,
      }}
    >
      <path
        d={`M 0 ${size} L 0 0 L ${size} 0`}
        fill="none"
        stroke={color}
        strokeWidth={width}
        strokeLinecap="square"
      />
    </svg>
  );
}

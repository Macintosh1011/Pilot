import { useMemo, type CSSProperties } from "react";

/*
 * Blob — an organic, hand-torn cut-paper shape: a wobbly circle smoothed
 * through the midpoints between control points. Ported from `Blob` in
 * ios/BoothPilot/Components/BoothPrimitives.swift.
 *
 * The SwiftUI shape places N control points at evenly spaced angles (starting
 * at -90deg), each pushed out by a per-vertex radius multiplier, then draws a
 * closed path of quadratic curves whose endpoints are the midpoints between
 * adjacent control points and whose control points are the vertices themselves.
 */

const DEFAULT_RADII = [1.0, 0.92, 1.05, 0.95, 1.02, 0.9, 1.04, 0.96];

type Point = { x: number; y: number };

function blobPath(radii: number[], size: number): string {
  const n = radii.length;
  const cx = size / 2;
  const cy = size / 2;
  const rx = size / 2;
  const ry = size / 2;

  const pts: Point[] = radii.map((r, i) => {
    const a = (i / n) * 2 * Math.PI - Math.PI / 2;
    return { x: cx + Math.cos(a) * rx * r, y: cy + Math.sin(a) * ry * r };
  });

  const mid = (a: Point, b: Point): Point => ({
    x: (a.x + b.x) / 2,
    y: (a.y + b.y) / 2,
  });

  const round = (v: number) => Math.round(v * 1000) / 1000;
  const start = mid(pts[n - 1], pts[0]);

  let d = `M ${round(start.x)} ${round(start.y)}`;
  for (let i = 0; i < n; i++) {
    const end = mid(pts[i], pts[(i + 1) % n]);
    d += ` Q ${round(pts[i].x)} ${round(pts[i].y)} ${round(end.x)} ${round(end.y)}`;
  }
  d += " Z";
  return d;
}

type BlobProps = {
  /** Width/height of the blob box in px. */
  size?: number;
  /** Rotation in degrees. */
  rotation?: number;
  /** Fill color (any CSS color); defaults to clay. */
  fill?: string;
  /** Per-vertex radius multipliers; defaults to the iOS 8-control shape. */
  radii?: number[];
  /** Optional drop shadow color (e.g. rust for the clay blob on Attract). */
  shadowColor?: string;
  /** Drop shadow blur radius in px. */
  shadowBlur?: number;
  /** Drop shadow offset in px. */
  shadowOffset?: { x: number; y: number };
  /** Optional fill opacity. */
  opacity?: number;
  style?: CSSProperties;
};

export default function Blob({
  size = 200,
  rotation = 0,
  fill = "var(--clay)",
  radii = DEFAULT_RADII,
  shadowColor,
  shadowBlur = 0,
  shadowOffset = { x: 0, y: 0 },
  opacity,
  style,
}: BlobProps) {
  const d = useMemo(() => blobPath(radii, size), [radii, size]);

  const filter = shadowColor
    ? `drop-shadow(${shadowOffset.x}px ${shadowOffset.y}px ${shadowBlur}px ${shadowColor})`
    : undefined;

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      aria-hidden
      style={{
        display: "block",
        // The shape can extend slightly past the box (radii > 1); don't clip it.
        overflow: "visible",
        transform: rotation ? `rotate(${rotation}deg)` : undefined,
        filter,
        ...style,
      }}
    >
      <path d={d} fill={fill} opacity={opacity} />
    </svg>
  );
}

// Organic cut-paper blob — web port of iOS BoothPrimitives.swift Blob.
// 8 control points smoothed through midpoints with quadratic Bézier curves.
// Server component — static SVG, no interactivity.

// Radii array from iOS (relative to bounding-box half-width/height).
const RADII = [1.0, 0.92, 1.05, 0.95, 1.02, 0.9, 1.04, 0.96];
const N = RADII.length;
const CX = 50;
const CY = 50;
const RX = 50;
const RY = 50;

// Compute control points in 100×100 SVG space.
const pts = RADII.map((r, i) => {
  const a = (i / N) * 2 * Math.PI - Math.PI / 2;
  return { x: CX + Math.cos(a) * RX * r, y: CY + Math.sin(a) * RY * r };
});

const mid = (a: { x: number; y: number }, b: { x: number; y: number }) => ({
  x: (a.x + b.x) / 2,
  y: (a.y + b.y) / 2,
});

// Build the SVG path string once at module load.
const start = mid(pts[N - 1], pts[0]);
let PATH_D = `M ${start.x.toFixed(2)} ${start.y.toFixed(2)}`;
for (let i = 0; i < N; i++) {
  const to = mid(pts[i], pts[(i + 1) % N]);
  PATH_D += ` Q ${pts[i].x.toFixed(2)} ${pts[i].y.toFixed(2)} ${to.x.toFixed(2)} ${to.y.toFixed(2)}`;
}
PATH_D += " Z";

interface BlobProps {
  size?: number;
  fill?: string;
  className?: string;
}

export function Blob({ size = 160, fill = "var(--clay)", className }: BlobProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="-5 -5 110 110"
      fill="none"
      aria-hidden="true"
      className={className}
      style={{ display: "block" }}
    >
      <path d={PATH_D} fill={fill} />
    </svg>
  );
}

// BoothPilot starburst mark — web port of iOS Spark.swift.
// 13 rays with baked-in hand-drawn jitter, slow idle rotation + breathe.
// Pure SVG + CSS animations — no JS at runtime, no "use client" needed.

// Ray geometry matches iOS exactly (0…100 viewBox, center 50,50).
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

interface SparkProps {
  size?: number;
  color?: string;
  className?: string;
}

export function Spark({ size = 80, color = "var(--clay)", className }: SparkProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="-5 -5 110 110"
      fill="none"
      aria-hidden="true"
      className={className}
      style={{ display: "block", flexShrink: 0 }}
    >
      {/* Outer group: gentle breathe scale */}
      <g
        style={{
          transformOrigin: "50px 50px",
          animation: "spark-breathe 6.5s ease-in-out infinite",
        }}
      >
        {/* Inner group: slow continuous rotation */}
        <g
          style={{
            transformOrigin: "50px 50px",
            animation: "spark-spin 30s linear infinite",
          }}
        >
          {RAYS.map((ray, i) => (
            <line
              key={i}
              x1={ray.ix}
              y1={ray.iy}
              x2={ray.ox}
              y2={ray.oy}
              stroke={color}
              strokeWidth={2.5}
              strokeLinecap="round"
            />
          ))}
          {/* Center dot — matches iOS r=3.2 */}
          <circle cx={50} cy={50} r={3.2} fill={color} />
        </g>
      </g>
    </svg>
  );
}

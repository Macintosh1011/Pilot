// Horizontal stat bar — mirrors iOS BadgeScreen statBar().
// Mono label left, serif value right, clay fill animates in on mount via CSS.
// Pure CSS animation (scaleX from 0 → pct) — no "use client" needed.

interface StatBarProps {
  label: string;
  value: string | number;
  pct: number;       // 0–1
  className?: string;
}

export function StatBar({ label, value, pct, className }: StatBarProps) {
  const clampedPct = Math.max(0, Math.min(1, pct));

  return (
    <div
      className={className}
      style={{ display: "grid", gap: "0.45rem" }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", gap: "1rem", alignItems: "baseline" }}>
        <span
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: "0.72rem",
            fontWeight: 600,
            letterSpacing: "0.1em",
            textTransform: "uppercase",
            color: "var(--muted)",
          }}
        >
          {label}
        </span>
        <strong
          style={{
            fontFamily: "var(--font-serif)",
            fontSize: "1.25rem",
            fontWeight: 500,
            color: "var(--ink)",
            fontVariantNumeric: "tabular-nums",
          }}
        >
          {value}
        </strong>
      </div>

      {/* Track */}
      <div
        role="meter"
        aria-valuenow={clampedPct * 100}
        aria-valuemin={0}
        aria-valuemax={100}
        style={{
          position: "relative",
          overflow: "hidden",
          height: "3px",
          borderRadius: "999px",
          background: "rgba(20, 20, 19, 0.1)",
        }}
      >
        {/* Fill — scaleX animates from 0 via CSS keyframe in globals.css */}
        <div
          style={{
            height: "100%",
            borderRadius: "inherit",
            background: "var(--clay)",
            transform: `scaleX(${clampedPct})`,
            transformOrigin: "left",
            animation: "stat-bar-grow 0.8s cubic-bezier(0.4, 0, 0.2, 1) both",
          }}
        />
      </div>
    </div>
  );
}

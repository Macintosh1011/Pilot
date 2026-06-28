// BOOTHP\LOT — mirrors iOS BoothPrimitives.swift Wordmark.
// JetBrains Mono, weight 600, uppercase, letter-spaced.
// Server component — no client interactivity needed.

interface WordmarkProps {
  size?: number;
  color?: string;
  className?: string;
}

export function Wordmark({ size = 18, color = "var(--ink)", className }: WordmarkProps) {
  return (
    <span
      className={className}
      style={{
        fontFamily: "var(--font-mono)",
        fontSize: size,
        fontWeight: 600,
        letterSpacing: "0.28em",
        color,
        textTransform: "uppercase" as const,
        userSelect: "none",
      }}
    >
      BOOTHP\LOT
    </span>
  );
}

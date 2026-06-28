// Pill chip — mono label on chip background.
// Covers the same use as iOS Capsule().fill(Color.chip).
// Server component.

import { type ReactNode } from "react";

interface ChipProps {
  children: ReactNode;
  variant?: "default" | "clay" | "ink";
  className?: string;
}

const variantStyles: Record<NonNullable<ChipProps["variant"]>, React.CSSProperties> = {
  default: {
    background: "var(--chip)",
    borderColor: "var(--border)",
    color: "var(--ink)",
  },
  clay: {
    background: "rgba(204, 120, 92, 0.1)",
    borderColor: "rgba(204, 120, 92, 0.28)",
    color: "var(--clay)",
  },
  ink: {
    background: "var(--ink)",
    borderColor: "var(--ink)",
    color: "var(--paper)",
  },
};

export function Chip({ children, variant = "default", className }: ChipProps) {
  return (
    <span
      className={className}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "0.35rem",
        border: "1px solid",
        borderRadius: "999px",
        padding: "0.38rem 0.68rem",
        fontFamily: "var(--font-mono)",
        fontSize: "0.72rem",
        fontWeight: 600,
        textTransform: "uppercase",
        letterSpacing: "0.06em",
        whiteSpace: "nowrap",
        ...variantStyles[variant],
      }}
    >
      {children}
    </span>
  );
}

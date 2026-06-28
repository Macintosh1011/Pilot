// Panel and Card — warm paper surface wrappers.
//
// Panel  → #F0EEE6 (panel) — inset sections, sub-panels, discount blocks.
// Card   → #FCFBF7 (card)  — top-level surfaces, lead cards, hero header.
//
// Both mirror the iOS convention from BadgeScreen / ConversationScreen.
// Server components.

import { type ReactNode } from "react";

interface SurfaceProps {
  children: ReactNode;
  radius?: number | string;
  padding?: string;
  className?: string;
  style?: React.CSSProperties;
}

export function Panel({ children, radius = "1.2rem", padding = "1rem", className, style }: SurfaceProps) {
  return (
    <div
      className={className}
      style={{
        border: "1px solid var(--border)",
        borderRadius: radius,
        background: "var(--panel)",
        padding,
        ...style,
      }}
    >
      {children}
    </div>
  );
}

export function Card({ children, radius = "1.6rem", padding = "1rem", className, style }: SurfaceProps) {
  return (
    <div
      className={className}
      style={{
        border: "1px solid var(--border)",
        borderRadius: radius,
        background: "var(--card)",
        padding,
        boxShadow: "0 2px 16px rgba(20, 20, 19, 0.05)",
        ...style,
      }}
    >
      {children}
    </div>
  );
}

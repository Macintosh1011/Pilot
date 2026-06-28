// Warm paper base layer — mirrors iOS BoothPrimitives.swift PaperBackground.
// Adds the two corner radial washes on top of the body's base color.
// The film grain is already on html::after in globals.css.
// Server component — position: fixed, pointer-events: none, aria-hidden.

interface PaperBackgroundProps {
  className?: string;
}

export function PaperBackground({ className }: PaperBackgroundProps) {
  return (
    <div
      aria-hidden="true"
      className={className}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: -1,
        pointerEvents: "none",
        background: [
          "radial-gradient(circle at 82% 12%, rgba(204, 120, 92, 0.06) 0%, transparent 55%)",
          "radial-gradient(circle at 12% 88%, rgba(212, 162, 127, 0.07) 0%, transparent 52%)",
          "var(--paper)",
        ].join(", "),
      }}
    />
  );
}

import type { CSSProperties } from "react";

/*
 * Warm paper background, ported from PaperBackground in
 * ios/BoothPilot/Components/BoothPrimitives.swift:
 *   - base paper tone
 *   - a faint clay radial wash in the top-right  (~82%, 12%), r480, 6%
 *   - a faint tan  radial wash in the bottom-left (~12%, 88%), r460, 7%
 *   - a subtle tiled grain at ~6%, multiply-blended
 *
 * The radial radii (480 / 460) are in the 1374x1030 artboard coordinate space,
 * so they are expressed in pixels and live inside the scaled stage (Artboard).
 */

// Desaturated fractal-noise grain as an inline data-URI (no external assets),
// approximating the desaturated CIRandomGenerator tile used on iOS.
const NOISE_DATA_URI =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200'%3E%3Cfilter id='paperNoise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/%3E%3CfeColorMatrix type='saturate' values='0'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23paperNoise)'/%3E%3C/svg%3E";

const fill: CSSProperties = { position: "absolute", inset: 0 };

export default function PaperBackground() {
  return (
    <div
      aria-hidden
      style={{
        ...fill,
        background: "var(--paper)",
        pointerEvents: "none",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          ...fill,
          background: [
            "radial-gradient(circle 480px at 82% 12%, rgba(204, 120, 92, 0.06), rgba(204, 120, 92, 0))",
            "radial-gradient(circle 460px at 12% 88%, rgba(212, 162, 127, 0.07), rgba(212, 162, 127, 0))",
          ].join(", "),
        }}
      />
      <div
        style={{
          ...fill,
          backgroundImage: `url("${NOISE_DATA_URI}")`,
          backgroundRepeat: "repeat",
          backgroundSize: "200px 200px",
          opacity: 0.06,
          mixBlendMode: "multiply",
        }}
      />
    </div>
  );
}

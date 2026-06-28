"use client";

import { useEffect, useRef } from "react";
import type { OrbState } from "@/lib/stage";

const ENERGY: Record<OrbState, number> = {
  idle: 0.35,
  listening: 0.7,
  thinking: 0.5,
  speaking: 1,
};

/**
 * The living centerpiece of the booth. Layered aurora gradients that breathe when
 * idle and react to `level` (0..1, e.g. mic/TTS amplitude) when active. Pure CSS
 * transforms + blur so it stays GPU-cheap inside a WKWebView.
 */
export function VoiceOrb({
  state = "idle",
  level = 0,
  className = "",
}: {
  state?: OrbState;
  level?: number;
  className?: string;
}) {
  const coreRef = useRef<HTMLDivElement>(null);

  // Smoothly track incoming level on a rAF loop so jittery amplitude reads feel organic.
  useEffect(() => {
    let raf = 0;
    let current = 0;
    const target = () => Math.min(1, level * ENERGY[state] + ENERGY[state] * 0.25);
    const tick = () => {
      current += (target() - current) * 0.12;
      const el = coreRef.current;
      if (el) {
        const s = 1 + current * 0.14;
        el.style.transform = `scale(${s})`;
        el.style.filter = `brightness(${1 + current * 0.5}) saturate(${1 + current * 0.4})`;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [level, state]);

  return (
    <div className={`relative aspect-square ${className}`}>
      {/* soft outer halo */}
      <div
        className="animate-halo absolute inset-[-22%] rounded-full blur-3xl"
        style={{
          background:
            "radial-gradient(circle at 50% 50%, rgba(139,92,246,0.55), rgba(99,102,241,0.32) 40%, rgba(34,211,238,0.12) 62%, transparent 72%)",
        }}
      />

      {/* breathing wrapper holds the rotating aurora + core */}
      <div className="animate-breathe absolute inset-0">
        {/* rotating aurora band */}
        <div
          className="animate-spin-slow absolute inset-[6%] rounded-full opacity-90 blur-xl"
          style={{
            background:
              "conic-gradient(from 0deg, #6366f1, #22d3ee, #8b5cf6, #fb7185, #fbbf24, #6366f1)",
          }}
        />
        {/* counter-rotating inner band for depth */}
        <div
          className="animate-spin-rev absolute inset-[20%] rounded-full opacity-70 blur-lg mix-blend-screen"
          style={{
            background:
              "conic-gradient(from 180deg, #22d3ee, #8b5cf6, #fb7185, #6366f1, #22d3ee)",
          }}
        />

        {/* the bright reactive core */}
        <div
          ref={coreRef}
          className="absolute inset-[26%] rounded-full will-change-transform"
          style={{
            background:
              "radial-gradient(circle at 38% 32%, #ffffff 0%, #e9d5ff 16%, #8b5cf6 46%, #4f46e5 72%, #1e1b4b 100%)",
            boxShadow:
              "0 0 60px rgba(139,92,246,0.55), inset 0 0 40px rgba(255,255,255,0.25)",
          }}
        />
        {/* glossy specular highlight */}
        <div
          className="absolute inset-[26%] rounded-full"
          style={{
            background:
              "radial-gradient(circle at 36% 28%, rgba(255,255,255,0.85), transparent 30%)",
          }}
        />
      </div>
    </div>
  );
}

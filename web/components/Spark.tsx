"use client";

import { useEffect, useRef } from "react";
import type { SparkMode } from "@/lib/sparkMode";

/*
 * Spark — BoothPilot's AI presence, a hand-drawn 13-ray starburst in clay ink on
 * paper. Ported 1:1 from ios/BoothPilot/Components/Spark.swift (SwiftUI Canvas +
 * TimelineView) to an HTML <canvas> driven by requestAnimationFrame.
 *
 * The rays carry baked-in hand-drawn jitter and the four modes animate the same
 * way as on iOS:
 *   - idle:      full 360deg turn every ~30s; gentle breathe (period ~6.5s).
 *   - listening: slow turn (~75s); per-ray opacity ripple.
 *   - speaking:  no turn; faster breathe (~1.9s); livelier per-ray shimmer.
 *   - thinking:  rays draw outward staggered; center dot fades in ~1.2s.
 *
 * Respects prefers-reduced-motion by rendering a single static starburst.
 */

const COUNT = 13;

type Ray = {
  innerX: number;
  innerY: number;
  outerX: number;
  outerY: number;
};

/** Ray endpoints in a 0..100 space, with the same baked-in jitter as iOS. */
const RAYS: Ray[] = (() => {
  const out: Ray[] = [];
  const c = 50.0;
  for (let i = 0; i < COUNT; i++) {
    const jitter = (i % 2 === 1 ? 2.4 : -2.0) + ((i % 3) - 1) * 1.1;
    const ang = ((i * (360.0 / COUNT) + jitter) * Math.PI) / 180;
    const inner = 8.5 + (i % 3) * 0.9;
    const outer = 32.0 + ((i * 5) % 9) - 3.0;
    out.push({
      innerX: c + Math.cos(ang) * inner,
      innerY: c + Math.sin(ang) * inner,
      outerX: c + Math.cos(ang) * outer,
      outerY: c + Math.sin(ang) * outer,
    });
  }
  return out;
})();

type SparkProps = {
  /** Animation state; defaults to "idle". */
  mode?: SparkMode;
  /** Square render size in CSS px; defaults to 100 (the native viewBox). */
  size?: number;
  /** Any CSS color (incl. `var(--clay)`); defaults to the clay token. */
  color?: string;
};

export default function Spark({
  mode = "idle",
  size = 100,
  color = "var(--clay)",
}: SparkProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const modeRef = useRef<SparkMode>(mode);
  const thinkStartRef = useRef(0);

  // Track the current mode without restarting the animation loop, and reset the
  // "thinking" stagger clock whenever we (re)enter thinking — mirroring the iOS
  // onChange(of: mode) { thinkStart = Date() }.
  useEffect(() => {
    modeRef.current = mode;
    if (mode === "thinking") {
      thinkStartRef.current = performance.now() / 1000;
    }
  }, [mode]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.round(size * dpr);
    canvas.height = Math.round(size * dpr);
    canvas.style.width = `${size}px`;
    canvas.style.height = `${size}px`;

    // Resolve the (possibly `var(--clay)`) color to a concrete rgb() so we can
    // tint via globalAlpha, matching SwiftUI's color.opacity(...).
    canvas.style.color = color;
    const resolved = getComputedStyle(canvas).color || "#CC785C";

    const drawFrame = (t: number) => {
      const m = modeRef.current;

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, size, size);
      // Work in the native 0..100 coordinate space.
      ctx.scale(size / 100, size / 100);

      let angleDeg = 0;
      if (m === "idle") angleDeg = (((t / 30) % 1) + 1) % 1 * 360;
      else if (m === "listening") angleDeg = (((t / 75) % 1) + 1) % 1 * 360;

      let breathe = 1;
      if (m === "idle") breathe = 1.035 + 0.035 * Math.sin((2 * Math.PI * t) / 6.5);
      else if (m === "speaking")
        breathe = 1.035 + 0.035 * Math.sin((2 * Math.PI * t) / 1.9);

      ctx.translate(50, 50);
      ctx.rotate((angleDeg * Math.PI) / 180);
      ctx.scale(breathe, breathe);
      ctx.translate(-50, -50);

      const elapsed = t - thinkStartRef.current;

      ctx.lineCap = "round";
      ctx.strokeStyle = resolved;

      for (let i = 0; i < RAYS.length; i++) {
        const ray = RAYS[i];
        let opacity = 1.0;
        let width = 2.5;
        let endX = ray.outerX;
        let endY = ray.outerY;

        if (m === "listening") {
          const phase = (t - i * 0.085) / 1.7;
          opacity = 0.69 - 0.31 * Math.cos(2 * Math.PI * phase);
        } else if (m === "speaking") {
          const phase = (t - i * 0.045) / 0.78;
          opacity = 0.725 - 0.275 * Math.cos(2 * Math.PI * phase);
          width = 2.8 - 0.6 * Math.cos(2 * Math.PI * phase);
        } else if (m === "thinking") {
          const p = Math.min(Math.max((elapsed - i * 0.09) / 0.5, 0), 1);
          if (p <= 0) continue;
          endX = ray.innerX + (ray.outerX - ray.innerX) * p;
          endY = ray.innerY + (ray.outerY - ray.innerY) * p;
        }

        ctx.globalAlpha = Math.max(0, Math.min(1, opacity));
        ctx.lineWidth = width;
        ctx.beginPath();
        ctx.moveTo(ray.innerX, ray.innerY);
        ctx.lineTo(endX, endY);
        ctx.stroke();
      }

      // Center dot.
      let dotOpacity = 1.0;
      if (m === "thinking") dotOpacity = elapsed >= 1.2 ? 1 : 0;
      const r = 3.2;
      ctx.globalAlpha = dotOpacity;
      ctx.fillStyle = resolved;
      ctx.beginPath();
      ctx.arc(50, 50, r, 0, 2 * Math.PI);
      ctx.fill();

      ctx.globalAlpha = 1;
    };

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) {
      // Static starburst: full rays + dot, no rotation/breathe.
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, size, size);
      ctx.scale(size / 100, size / 100);
      ctx.lineCap = "round";
      ctx.strokeStyle = resolved;
      ctx.globalAlpha = 1;
      ctx.lineWidth = 2.5;
      for (const ray of RAYS) {
        ctx.beginPath();
        ctx.moveTo(ray.innerX, ray.innerY);
        ctx.lineTo(ray.outerX, ray.outerY);
        ctx.stroke();
      }
      ctx.fillStyle = resolved;
      ctx.beginPath();
      ctx.arc(50, 50, 3.2, 0, 2 * Math.PI);
      ctx.fill();
      return;
    }

    let raf = 0;
    const loop = () => {
      drawFrame(performance.now() / 1000);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [size, color]);

  return <canvas ref={canvasRef} aria-hidden style={{ display: "block" }} />;
}

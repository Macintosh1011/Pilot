"use client";

import { useEffect, useState, type CSSProperties, type ReactNode } from "react";
import PaperBackground from "./PaperBackground";
import { ARTBOARD } from "@/lib/theme";

/*
 * Artboard — the booth is authored in a fixed 1374x1030 coordinate space and
 * scaled to fit the viewport, matching ios/BoothPilot/BoothView.swift:
 *   scale = min(width / 1374, height / 1030), centered.
 *
 * Children render directly in the 1374x1030 space (in CSS px), so all layout
 * inside can use the same absolute coordinates as the iOS design.
 */

type ArtboardProps = {
  children?: ReactNode;
  /** Extra styles applied to the inner 1374x1030 stage. */
  style?: CSSProperties;
};

export default function Artboard({ children, style }: ArtboardProps) {
  const [scale, setScale] = useState(1);

  useEffect(() => {
    const compute = () => {
      setScale(
        Math.min(
          window.innerWidth / ARTBOARD.width,
          window.innerHeight / ARTBOARD.height,
        ),
      );
    };
    compute();
    window.addEventListener("resize", compute);
    return () => window.removeEventListener("resize", compute);
  }, []);

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        overflow: "hidden",
        background: "var(--paper)",
      }}
    >
      <div
        style={{
          position: "relative",
          flex: "0 0 auto",
          width: ARTBOARD.width,
          height: ARTBOARD.height,
          transform: `scale(${scale})`,
          transformOrigin: "center center",
          ...style,
        }}
      >
        <PaperBackground />
        {children}
      </div>
    </div>
  );
}

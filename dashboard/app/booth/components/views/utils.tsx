"use client";

// Shared view utilities — import from here, do not re-declare in view files.

import { useEffect, useState } from "react";

// ─── Class combiner ───────────────────────────────────────────────────────────

export function cx(...cls: (string | false | undefined | null)[]): string {
  return cls.filter(Boolean).join(" ");
}

// ─── Severity color ───────────────────────────────────────────────────────────

export function severityColor(sev: string): string {
  switch (sev.toLowerCase()) {
    case "high":   return "var(--rust)";
    case "medium": return "var(--tan)";
    default:       return "var(--muted)";
  }
}

// ─── SVG chart helpers ────────────────────────────────────────────────────────

/** Safe overestimate of any line's total length in the 760 × 150 viewBox. */
export const LINE_LENGTH = 1000;

/** Map visitor-supplied CSV series to SVG coordinate space (760 × 150). Higher value → lower y. */
export function parseSeriesCsv(csv: string | undefined): { x: number; y: number }[] | null {
  if (!csv) return null;
  const vals = csv.split(",").map((v) => parseFloat(v.trim())).filter((v) => !isNaN(v));
  if (vals.length < 2) return null;
  const lo   = Math.min(...vals);
  const hi   = Math.max(...vals);
  const span = Math.max(hi - lo, 0.0001);
  const yTop = 16, yBot = 140;
  return vals.map((v, i) => ({
    x: (i / (vals.length - 1)) * 760,
    y: yBot - ((v - lo) / span) * (yBot - yTop),
  }));
}

export function svgLinePath(pts: ReadonlyArray<{ x: number; y: number }>): string {
  return pts.map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");
}

export function svgAreaPath(
  pts: ReadonlyArray<{ x: number; y: number }>,
  bottom: number,
): string {
  if (pts.length === 0) return "";
  const last  = pts[pts.length - 1] ?? { x: 760, y: 150 };
  const first = pts[0]              ?? { x: 0,   y: 150 };
  return `${svgLinePath(pts)} L${last.x.toFixed(1)},${bottom} L${first.x.toFixed(1)},${bottom} Z`;
}

// ─── Count-up hook + component ────────────────────────────────────────────────

type ParsedStat = { prefix: string; value: number; suffix: string; decimals: number };

function parseStatValue(raw: string): ParsedStat | null {
  const m = raw.match(/^([^0-9]*)([0-9]+(?:\.[0-9]+)?)(.*?)$/);
  if (!m) return null;
  const value = parseFloat(m[2]);
  if (isNaN(value)) return null;
  const decimals = (m[2].split(".")[1] ?? "").length;
  return { prefix: m[1], value, suffix: m[3], decimals };
}

function fmtStat(val: number, p: ParsedStat): string {
  return `${p.prefix}${val.toFixed(p.decimals)}${p.suffix}`;
}

export function useCountUp(target: string, duration = 570): string {
  const parsed = parseStatValue(target);
  const [display, setDisplay] = useState(() =>
    parsed ? fmtStat(0, parsed) : target,
  );

  useEffect(() => {
    if (!parsed) { setDisplay(target); return; }
    const start = performance.now();
    let frameId: number;
    const tick = (now: number) => {
      const t     = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - t, 3);
      setDisplay(fmtStat(parsed.value * eased, parsed));
      if (t < 1) frameId = requestAnimationFrame(tick);
    };
    frameId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frameId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target]);

  return display;
}

export function CountUpStat({ value, className }: { value: string; className?: string }) {
  const display = useCountUp(value);
  return <span className={className}>{display}</span>;
}

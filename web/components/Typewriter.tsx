"use client";

import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";

/*
 * TypeText — the booth's signature motion: text types itself out char by char
 * with slight timing jitter, longer pauses after punctuation, and a blinking
 * clay cursor. `*starred*` spans render in clay. Ported 1:1 from
 * ios/BoothPilot/Components/Typewriter.swift.
 *
 * Respects prefers-reduced-motion (renders the full text instantly) and
 * restarts whenever `text` changes.
 */

type Glyph = { ch: string; clay: boolean };

type TypeTextProps = {
  /** The line to type. `*emphasis*` spans toggle clay color. */
  text: string;
  /** Milliseconds per char before jitter; defaults to 42 (matches iOS). */
  speed?: number;
  /** Milliseconds before the first char appears; defaults to 0. */
  startDelay?: number;
  /** Keep the cursor visible after the line finishes; defaults to false. */
  keepCursor?: boolean;
  className?: string;
  /** font-family (e.g. `var(--font-serif)`); defaults to the serif token. */
  font?: string;
  /** Font size in px. */
  size?: number;
  /** Base ink color (non-emphasis chars); defaults to `var(--ink)`. */
  color?: string;
};

const EMPHASIS = "var(--clay)";

function parseGlyphs(text: string): Glyph[] {
  const out: Glyph[] = [];
  let clay = false;
  for (const ch of text) {
    if (ch === "*") {
      clay = !clay;
      continue;
    }
    out.push({ ch, clay });
  }
  return out;
}

function delayAfter(prev: string, speed: number): number {
  let d = speed + Math.random() * (speed * 0.7);
  if (prev === "." || prev === "?" || prev === "!") d += 360;
  else if (prev === "," || prev === ";" || prev === "—") d += 170;
  else if (Math.random() < 0.06) d += 240;
  return d;
}

export default function TypeText({
  text,
  speed = 42,
  startDelay = 0,
  keepCursor = false,
  className,
  font = "var(--font-serif)",
  size,
  color = "var(--ink)",
}: TypeTextProps) {
  const glyphs = useMemo(() => parseGlyphs(text), [text]);
  const [shown, setShown] = useState(0);
  const [cursorOn, setCursorOn] = useState(true);

  // Typing loop — restarts whenever the text (or timing) changes.
  useEffect(() => {
    const total = glyphs.length;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) {
      setShown(total);
      return;
    }

    setShown(0);
    setCursorOn(true);

    if (total === 0) return;

    let cancelled = false;
    let timer: ReturnType<typeof setTimeout>;

    const reveal = (i: number) => {
      if (cancelled) return;
      setShown(i);
      if (i >= total) return;
      // Pause based on the char we just revealed (glyphs[i - 1]), as in iOS.
      const prev = glyphs[i - 1].ch;
      timer = setTimeout(() => reveal(i + 1), delayAfter(prev, speed));
    };

    timer = setTimeout(() => reveal(1), startDelay);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [glyphs, speed, startDelay]);

  // Blinking cursor (~525ms), held steady under reduced motion.
  const blinkRef = useRef<ReturnType<typeof setInterval> | null>(null);
  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) {
      setCursorOn(true);
      return;
    }
    blinkRef.current = setInterval(() => setCursorOn((c) => !c), 525);
    return () => {
      if (blinkRef.current) clearInterval(blinkRef.current);
    };
  }, []);

  const done = shown >= glyphs.length;
  const wantCursor = !done || keepCursor;
  const plain = useMemo(() => glyphs.map((g) => g.ch).join(""), [glyphs]);

  const style: CSSProperties = {
    fontFamily: font,
    fontSize: size,
    color,
  };

  return (
    <span className={className} style={style} aria-label={plain}>
      <span aria-hidden>
        {glyphs.slice(0, shown).map((g, i) => (
          <span key={i} style={g.clay ? { color: EMPHASIS } : undefined}>
            {g.ch}
          </span>
        ))}
        {wantCursor && (
          <span style={{ color: cursorOn ? EMPHASIS : "transparent" }}>▏</span>
        )}
      </span>
    </span>
  );
}

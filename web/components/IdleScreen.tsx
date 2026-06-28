"use client";

import { useEffect, useState } from "react";
import { VoiceOrb } from "./VoiceOrb";
import { SponsorStrip } from "./SponsorStrip";

const TAGLINES = [
  "Tell me who you are — I'll build the demo around you.",
  "Founder? Show me what you're working on.",
  "Thirty seconds. I'll make it about you.",
  "Walk up, say hi, and watch what happens.",
];

export function IdleScreen({ onBegin }: { onBegin?: () => void }) {
  const [tag, setTag] = useState(0);
  const [level, setLevel] = useState(0);

  // rotate taglines
  useEffect(() => {
    const id = setInterval(() => setTag((t) => (t + 1) % TAGLINES.length), 4200);
    return () => clearInterval(id);
  }, []);

  // gentle synthetic "breathing" amplitude so the orb feels alive at rest
  useEffect(() => {
    let raf = 0;
    let t = 0;
    const tick = () => {
      t += 0.016;
      setLevel(0.5 + 0.5 * Math.sin(t * 1.1));
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <div
      onClick={onBegin}
      className="relative flex h-dvh w-screen flex-col items-center justify-between overflow-hidden px-10 py-9"
    >
      {/* ambient backdrop glow */}
      <div
        className="pointer-events-none absolute inset-0 -z-10"
        style={{
          background:
            "radial-gradient(120% 80% at 50% 38%, rgba(99,102,241,0.16), transparent 60%), radial-gradient(90% 70% at 50% 120%, rgba(251,113,133,0.10), transparent 60%)",
        }}
      />

      {/* top bar */}
      <header
        className="animate-rise flex w-full items-center justify-between"
        style={{ animationDelay: "0.05s" }}
      >
        <div className="font-display text-lg font-semibold tracking-tight text-snow">
          Booth<span className="text-aurora">Pilot</span>
        </div>
        <div className="flex items-center gap-2 rounded-full border border-line bg-ink-2/60 px-3 py-1.5 font-mono text-[11px] uppercase tracking-[0.18em] text-fog backdrop-blur">
          <span className="animate-dot h-1.5 w-1.5 rounded-full bg-cyan shadow-[0_0_10px_#22d3ee]" />
          Listening
        </div>
      </header>

      {/* center */}
      <main className="flex flex-1 flex-col items-center justify-center gap-9">
        <VoiceOrb
          state="idle"
          level={level}
          className="animate-rise orb w-[min(42vh,440px)]"
        />

        <div className="flex flex-col items-center gap-4 text-center">
          <h1
            className="animate-rise font-display text-6xl font-semibold leading-[1.02] tracking-tight md:text-7xl"
            style={{ animationDelay: "0.15s" }}
          >
            Hey. <span className="text-aurora">Talk to me.</span>
          </h1>
          <p
            key={tag}
            className="animate-rise max-w-2xl text-balance text-xl text-cloud/85"
            style={{ animationDelay: "0.25s" }}
          >
            {TAGLINES[tag]}
          </p>
        </div>
      </main>

      {/* bottom bar */}
      <footer
        className="animate-rise flex w-full items-end justify-between"
        style={{ animationDelay: "0.3s" }}
      >
        <SponsorStrip />
        <div className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.2em] text-fog/60">
          Tap to begin
          <span className="inline-block h-3 w-px bg-fog/40" />
        </div>
      </footer>
    </div>
  );
}

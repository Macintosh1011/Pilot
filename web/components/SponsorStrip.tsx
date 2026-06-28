const SPONSORS = ["OpenAI", "Convex", "Cursor", "fiber.ai", "ElevenLabs"];

export function SponsorStrip() {
  return (
    <div className="flex items-center gap-3 font-mono text-[11px] uppercase tracking-[0.2em] text-fog/70">
      <span className="text-fog/50">Powered by</span>
      {SPONSORS.map((s, i) => (
        <span key={s} className="flex items-center gap-3">
          <span>{s}</span>
          {i < SPONSORS.length - 1 && <span className="text-fog/25">·</span>}
        </span>
      ))}
    </div>
  );
}

"use client";

import { QuillChrome, hl as getHl } from "./QuillChrome";
import { cx } from "./utils";
import type { ViewProps } from "./types";
import s from "../AcmeDemoPanel.module.css";
import v from "./brand-voice.module.css";

// ─── Defaults ─────────────────────────────────────────────────────────────────

const DEFAULT_QUESTION =
  "How do I cancel my subscription?";

const DEFAULT_BEFORE =
  "To cancel your subscription, navigate to Account Settings > Subscription " +
  "and click 'Cancel Subscription.' You will receive a confirmation email " +
  "upon completion of this process.";

const DEFAULT_AFTER =
  "We're sorry to see you go — cancelling is quick! Head to Account Settings → " +
  "Subscription and hit 'Cancel.' You'll get a confirmation right away. " +
  "And if something isn't right, we'd love to help first. Just send us a message.";

// ─── Slider definitions ───────────────────────────────────────────────────────

type SliderDef = { left: string; right: string; pct: number };

function resolveSliders(tone: string | undefined): SliderDef[] {
  const t = (tone ?? "").toLowerCase();
  const friendly = t.includes("formal") || t.includes("professional") ? 22 : 68;
  const concise  = t.includes("detail") || t.includes("verbose")     ? 74 : 28;
  const serious  = t.includes("serious")  ? 76 : t.includes("playful") ? 22 : 42;
  return [
    { left: "Formal",  right: "Friendly", pct: friendly },
    { left: "Concise", right: "Detailed", pct: concise  },
    { left: "Playful", right: "Serious",  pct: serious  },
  ];
}

// ─── SliderRow ────────────────────────────────────────────────────────────────

function SliderRow({ sl }: { sl: SliderDef }) {
  return (
    <div className={v.sliderRow} role="presentation">
      <span className={v.sliderEndLabel}>{sl.left}</span>
      <div className={v.sliderTrack} aria-hidden="true">
        <div className={v.sliderFill} style={{ width: `${sl.pct}%` }} />
        <div className={v.sliderThumb} style={{ left: `${sl.pct}%` }} />
      </div>
      <span className={cx(v.sliderEndLabel, v.right)}>{sl.right}</span>
    </div>
  );
}

// ─── View ─────────────────────────────────────────────────────────────────────

export default function BrandVoiceView({ params, highlight }: ViewProps) {
  const hl = (id: string) => getHl(highlight, id);

  const toneLabel = params?.tone ?? "Friendly · Concise";
  const question  = params?.sampleQuestion ?? DEFAULT_QUESTION;
  const sliders   = resolveSliders(params?.tone);

  return (
    <QuillChrome active="brand-voice" company={params?.company} highlight={highlight}>
      {/* ── Header ── */}
      <div className={s.sectionRow}>
        <div>
          <p className={s.eyebrow}>BRAND VOICE</p>
          <h2 className={s.heading} style={{ marginBottom: 0 }}>Sound like you.</h2>
        </div>
        <span className={v.toneBadge} aria-label={`Active tone preset: ${toneLabel}`}>
          {toneLabel}
        </span>
      </div>

      {/* ── Tone controls ── */}
      <div
        data-el="tone-controls"
        className={cx(v.toneCard, hl("tone-controls"))}
        aria-label="Tone calibration"
      >
        <div className={v.toneCardHeader}>
          <span className={s.eyebrow} style={{ margin: 0 }}>TONE CALIBRATION</span>
          <span
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: "0.62rem",
              fontWeight: 700,
              letterSpacing: "0.08em",
              textTransform: "uppercase" as const,
              padding: "0.2rem 0.55rem",
              background: "rgba(90,122,88,0.10)",
              border: "1px solid rgba(90,122,88,0.22)",
              borderRadius: "999px",
              color: "var(--success)",
            }}
          >
            SAVED
          </span>
        </div>

        <div
          data-el="voice-sliders"
          className={cx(v.sliderList, hl("voice-sliders"))}
          aria-label="Tone dimension sliders"
        >
          {sliders.map((sl) => (
            <SliderRow key={sl.left} sl={sl} />
          ))}
        </div>
      </div>

      {/* ── Before / After comparison ── */}
      <p className={s.eyebrow} style={{ marginBottom: "0.625rem" }}>
        SAMPLE — {question}
      </p>
      <div
        data-el="before-after"
        className={cx(v.beforeAfter, hl("before-after"))}
        aria-label="Before and after brand voice comparison"
      >
        {/* Before */}
        <div className={cx(v.baCard, v.before)}>
          <p className={v.baLabel}>DEFAULT</p>
          <p className={cx(v.baText, v.muted)}>{DEFAULT_BEFORE}</p>
        </div>

        {/* After */}
        <div className={cx(v.baCard, v.after)}>
          <p className={cx(v.baLabel, v.afterLabel)}>
            <span className={v.baLabelDot} aria-hidden="true" />
            YOUR BRAND
          </p>
          <p
            data-el="sample-answer"
            className={cx(v.baText, hl("sample-answer"))}
          >
            {DEFAULT_AFTER}
          </p>
        </div>
      </div>
    </QuillChrome>
  );
}

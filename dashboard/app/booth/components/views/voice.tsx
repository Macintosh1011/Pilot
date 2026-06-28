"use client";

// 'use client' needed: waveform animation relies on CSS custom properties
// set per-bar via style, which is fine for a decorative SaaS display.

import { QuillChrome, hl as getHl } from "./QuillChrome";
import { cx } from "./utils";
import type { ViewProps } from "./types";
import s from "./voice.module.css";
import p from "../AcmeDemoPanel.module.css";

// ─── Waveform config ──────────────────────────────────────────────────────────

const WAVE_BARS: ReadonlyArray<{ dur: number; delay: number; h: number }> = [
  { dur: 520, delay:   0, h: 22 }, { dur: 700, delay:  80, h: 30 },
  { dur: 440, delay: 160, h: 18 }, { dur: 620, delay:  40, h: 28 },
  { dur: 580, delay: 120, h: 32 }, { dur: 480, delay: 200, h: 20 },
  { dur: 660, delay:  60, h: 26 }, { dur: 540, delay: 140, h: 24 },
  { dur: 720, delay:  20, h: 30 }, { dur: 460, delay: 180, h: 22 },
  { dur: 600, delay: 100, h: 28 }, { dur: 500, delay:  30, h: 18 },
  { dur: 640, delay: 160, h: 32 }, { dur: 560, delay:  70, h: 26 },
];

// ─── Default transcript ───────────────────────────────────────────────────────

type TranscriptLine = { speaker: "caller" | "quill"; text: string };

const DEFAULT_TRANSCRIPT: ReadonlyArray<TranscriptLine> = [
  { speaker: "caller", text: "Hi, when does my subscription renew?"                          },
  { speaker: "quill",  text: "Let me pull that up for you right away."                       },
  { speaker: "caller", text: "And will my card on file be charged automatically?"            },
  { speaker: "quill",  text: "Yes — I'm sending you the full renewal details now."           },
];

// ─── View ─────────────────────────────────────────────────────────────────────

export default function VoiceView({ params, highlight }: ViewProps) {
  const hl = (id: string) => getHl(highlight, id);

  const caller       = params?.caller       ?? "Michael Torres";
  const callDuration = params?.callDuration ?? "1:42";
  const answer       = params?.answer       ??
    "Your subscription renews on August 15th. Your Visa ending 4242 will be charged $49/mo automatically. I've sent a full summary to your email on file — no action needed from you.";

  const initials = caller
    .split(" ")
    .map((n) => n[0] ?? "")
    .join("")
    .slice(0, 2)
    .toUpperCase();

  // Use visitor's question as the first caller line if provided
  const transcript: ReadonlyArray<TranscriptLine> =
    params?.question
      ? [
          { speaker: "caller", text: params.question },
          ...DEFAULT_TRANSCRIPT.slice(1),
        ]
      : DEFAULT_TRANSCRIPT;

  return (
    <QuillChrome active="voice" company={params?.company} highlight={highlight}>
      {/* Header */}
      <div className={p.sectionRow}>
        <div>
          <p className={p.eyebrow}>VOICE</p>
          <h2 className={p.heading} style={{ marginBottom: 0 }}>
            Answered — no hold time.
          </h2>
        </div>
        <span
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: "0.68rem",
            fontWeight: 600,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            color: "var(--success)",
            background: "rgba(90,122,88,0.10)",
            border: "1px solid rgba(90,122,88,0.25)",
            padding: "0.2rem 0.625rem",
            borderRadius: "999px",
          }}
        >
          LIVE CALL
        </span>
      </div>

      {/* Call card — caller info + waveform + duration */}
      <div
        data-el="caller"
        className={cx(s.callCard, hl("caller"))}
        role="region"
        aria-label={`Incoming call from ${caller}`}
      >
        <div className={s.callerAvatar} aria-hidden="true">
          {initials}
        </div>
        <div className={s.callerInfo}>
          <p className={s.callerName}>{caller}</p>
          <p className={s.callerMeta}>Inbound · Phone</p>
        </div>
        {/* Animated waveform */}
        <div className={s.waveform} role="presentation" aria-hidden="true">
          {WAVE_BARS.map((bar, i) => (
            <div
              key={i}
              className={s.waveBar}
              style={{
                height: `${bar.h}px`,
                animationDuration: `${bar.dur}ms`,
                animationDelay: `${bar.delay}ms`,
              }}
            />
          ))}
        </div>
        <div className={s.callRight}>
          <span className={s.callDuration} aria-label={`Call duration ${callDuration}`}>
            {callDuration}
          </span>
          <span className={s.callActivePill}>● Active</span>
        </div>
      </div>

      {/* Live transcript */}
      <div
        data-el="transcript"
        className={cx(s.transcriptCard, hl("transcript"))}
        role="log"
        aria-label="Live call transcript"
        aria-live="polite"
      >
        <span className={s.transcriptEyebrow}>LIVE TRANSCRIPT</span>
        {transcript.map((line, i) => (
          <div
            key={i}
            className={s.transcriptLine}
            style={{ animationDelay: `${i * 100}ms` }}
          >
            <span
              className={
                line.speaker === "quill"
                  ? s.transcriptSpeakerQuill
                  : s.transcriptSpeakerCaller
              }
            >
              {line.speaker === "quill" ? "Quill" : "Caller"}
            </span>
            <p className={s.transcriptText}>&ldquo;{line.text}&rdquo;</p>
          </div>
        ))}
      </div>

      {/* Quill's spoken answer */}
      <div
        data-el="voice-answer"
        className={cx(s.voiceAnswerCard, hl("voice-answer"))}
        role="article"
        aria-label="Quill's spoken answer"
      >
        <div className={s.voiceAnswerLabel}>
          <span className={s.voiceAnswerDot} aria-hidden="true" />
          Quill · Speaking
        </div>
        <p className={s.voiceAnswerText}>{answer}</p>
      </div>

      {/* Call stats */}
      <div
        data-el="call-stats"
        className={cx(s.callStats, hl("call-stats"))}
        role="region"
        aria-label="Call outcome statistics"
      >
        <div className={s.callStatCard} style={{ animationDelay: "0ms" }}>
          <span className={s.callStatValue}>{callDuration}</span>
          <span className={s.callStatLabel}>Handle Time</span>
        </div>
        <div className={cx(s.callStatCard, s.success)} style={{ animationDelay: "60ms" }}>
          <span className={cx(s.callStatValue, s.good)}>✓ Yes</span>
          <span className={s.callStatLabel}>Resolved</span>
        </div>
        <div className={s.callStatCard} style={{ animationDelay: "120ms" }}>
          <span className={cx(s.callStatValue, s.good)}>0</span>
          <span className={s.callStatLabel}>Agents Needed</span>
        </div>
      </div>
    </QuillChrome>
  );
}

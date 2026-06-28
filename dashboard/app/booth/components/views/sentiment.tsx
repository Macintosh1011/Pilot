"use client";

import { useState, useEffect, useId } from "react";
import { cx } from "./utils";
import { QuillChrome, hl as getHl } from "./QuillChrome";
import type { ViewProps } from "./types";
import s from "./sentiment.module.css";

// ─── Sentiment parsing ────────────────────────────────────────────────────────

const SENTIMENT_MAP: Record<string, number> = {
  calm: 12, satisfied: 25, neutral: 48,
  anxious: 65, frustrated: 80, angry: 94,
};

function parseSentimentPct(raw: string | undefined): number {
  if (!raw) return 80;
  const lower = raw.toLowerCase().trim();
  if (lower in SENTIMENT_MAP) return SENTIMENT_MAP[lower];
  const n = parseFloat(lower);
  return !isNaN(n) ? Math.min(100, Math.max(0, n)) : 80;
}

function sentimentLabel(pct: number): string {
  if (pct < 25) return "Calm";
  if (pct < 52) return "Neutral";
  if (pct < 72) return "Frustrated";
  if (pct < 87) return "Very frustrated";
  return "Escalating";
}

function needleFill(pct: number): string {
  if (pct < 40) return "var(--success)";
  if (pct < 65) return "var(--warning)";
  return "var(--rust)";
}

function statusClass(pct: number): string {
  if (pct < 30) return s.meterStatusCalm;
  if (pct < 60) return s.meterStatusNeutral;
  return s.meterStatusFrustrated;
}

// ─── Tier badge helpers ───────────────────────────────────────────────────────

function tierStyle(tier: string): { bg: string; border: string; color: string } {
  const t = tier.toLowerCase();
  if (t === "enterprise" || t === "vip")
    return {
      bg:     "rgba(204,120,92,0.12)",
      border: "rgba(204,120,92,0.28)",
      color:  "var(--clay)",
    };
  if (t === "pro" || t === "growth")
    return {
      bg:     "rgba(90,122,88,0.10)",
      border: "rgba(90,122,88,0.22)",
      color:  "var(--success)",
    };
  return { bg: "var(--chip)", border: "var(--border)", color: "var(--muted)" };
}

function initials(name: string): string {
  return name
    .split(" ")
    .map((w) => w[0] ?? "")
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

// ─── Sentiment meter (animated SVG) ──────────────────────────────────────────

function SentimentMeter({
  pct,
  mounted,
  gradId,
}: {
  pct: number;
  mounted: boolean;
  gradId: string;
}) {
  const W = 280;
  const trackY = 16;
  const trackH = 12;
  const trackR = 6;
  const svgH   = 54;
  const needleX = (pct / 100) * W;

  return (
    <svg
      viewBox={`0 0 ${W} ${svgH}`}
      width="100%"
      height={svgH}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%"   stopColor="#5A7A58" />
          <stop offset="45%"  stopColor="#C49A6C" />
          <stop offset="100%" stopColor="#B05730" />
        </linearGradient>
      </defs>

      {/* Track background */}
      <rect
        x={0} y={trackY} width={W} height={trackH} rx={trackR}
        fill="rgba(20,20,19,0.09)"
      />

      {/* Gradient fill */}
      <rect
        x={0} y={trackY} width={W} height={trackH} rx={trackR}
        fill={`url(#${gradId})`}
        opacity={0.88}
      />

      {/* Animated needle group — starts at left, springs to pct position */}
      <g
        style={{
          transform: `translateX(${mounted ? needleX : 0}px)`,
          transition: mounted
            ? "transform 700ms cubic-bezier(0.34, 1.56, 0.64, 1)"
            : "none",
        }}
      >
        <circle
          cx={0}
          cy={trackY + trackH / 2}
          r={10}
          fill="white"
          stroke="rgba(20,20,19,0.18)"
          strokeWidth={1.5}
        />
        <circle
          cx={0}
          cy={trackY + trackH / 2}
          r={4}
          fill={needleFill(pct)}
        />
      </g>

      {/* End labels */}
      <text
        x={0} y={svgH - 1}
        fontFamily="var(--font-mono)"
        fontSize={8.5}
        fontWeight={700}
        fill="var(--success)"
        letterSpacing="0.08em"
      >
        CALM
      </text>
      <text
        x={W} y={svgH - 1}
        fontFamily="var(--font-mono)"
        fontSize={8.5}
        fontWeight={700}
        fill="var(--rust)"
        letterSpacing="0.08em"
        textAnchor="end"
      >
        FRUSTRATED
      </text>
    </svg>
  );
}

// ─── Queue data ───────────────────────────────────────────────────────────────

const QUEUE_OTHERS = [
  { name: "Alex T.",  tier: "Pro",      delay: 80  },
  { name: "Jamie L.", tier: "Growth",   delay: 150 },
  { name: "Wei C.",   tier: "Standard", delay: 220 },
] as const;

// ─── View ─────────────────────────────────────────────────────────────────────

export default function SentimentView({ params, highlight }: ViewProps) {
  const hl    = (id: string) => getHl(highlight, id);
  const rawId = useId();
  // Sanitize useId() output (e.g. ":r0:") to a valid HTML id
  const gradId = "sg" + rawId.replace(/[^a-zA-Z0-9]/g, "");

  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    const raf = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(raf);
  }, []);

  const pct      = parseSentimentPct(params?.sentiment);
  const label    = sentimentLabel(pct);
  const customer = params?.customer ?? "Marcus Chen";
  const tier     = params?.tier     ?? "Enterprise";
  const routedTo = params?.routedTo ?? "Sarah K. · Senior Support";
  const tStyle   = tierStyle(tier);

  // Split "Name · Role" → name + role
  const [routedName = routedTo, routedRole = "Senior Support"] =
    routedTo.split("·").map((p) => p.trim());

  return (
    <QuillChrome active="sentiment" company={params?.company} highlight={highlight}>
      <div className={s.sectionRow}>
        <div>
          <p className={s.eyebrow}>Sentiment &amp; VIP Routing</p>
          <h2 className={s.heading}>Detected. Prioritized. Routed.</h2>
        </div>
        <span className={s.topLabel}>Real-time</span>
      </div>

      {/* ── Top row: meter + VIP ── */}
      <div className={s.topRow}>
        {/* Sentiment meter */}
        <div
          data-el="sentiment-meter"
          className={cx(s.meterCard, hl("sentiment-meter"))}
          aria-label={`Sentiment level: ${label}`}
        >
          <p className={s.meterCardLabel}>Frustration Level</p>
          <div className={s.meterWrap}>
            <SentimentMeter pct={pct} mounted={mounted} gradId={gradId} />
          </div>
          <span className={statusClass(pct)}>
            {label} &middot; {pct}%
          </span>
        </div>

        {/* VIP flag */}
        <div
          data-el="vip-flag"
          className={cx(s.vipCard, hl("vip-flag"))}
          aria-label={`Customer: ${customer}, Tier: ${tier}`}
        >
          <p className={s.vipCardLabel}>Customer Tier</p>
          <div className={s.vipCustomerRow}>
            <div className={s.vipAvatar} aria-hidden="true">
              {initials(customer)}
            </div>
            <div>
              <p className={s.vipCustomerName}>{customer}</p>
              <span className={s.vipArrLabel}>$48k ARR</span>
            </div>
          </div>
          <span
            className={s.vipTierChip}
            style={{
              background:  tStyle.bg,
              border:      `1px solid ${tStyle.border}`,
              color:       tStyle.color,
            }}
          >
            {tier}
          </span>
        </div>
      </div>

      {/* ── Priority queue ── */}
      <div
        data-el="priority-queue"
        className={cx(s.queueSection, hl("priority-queue"))}
        role="list"
        aria-label="Priority support queue"
      >
        <div className={s.queueLabel}>
          Priority Queue
          <span className={s.queueJumpedChip}>Jumped to #1</span>
        </div>

        {/* Active (VIP) ticket */}
        <div
          className={cx(s.queueItem, s.active)}
          role="listitem"
          aria-label={`${customer} — ${tier} — urgent`}
        >
          <span className={s.queueRank}>#1</span>
          <span className={s.queueName}>{customer}</span>
          <span
            className={s.queueTier}
            style={{
              background:  tStyle.bg,
              borderColor: tStyle.border,
              color:       tStyle.color,
            }}
          >
            {tier}
          </span>
          <span className={s.queuePriority}>Urgent</span>
        </div>

        {/* Other tickets (dimmed — pushed down) */}
        {QUEUE_OTHERS.map((item, i) => (
          <div
            key={item.name}
            className={cx(s.queueItem, s.dimmed)}
            role="listitem"
            style={{ animationDelay: `${item.delay}ms` }}
          >
            <span className={s.queueRank}>#{i + 2}</span>
            <span className={s.queueName}>{item.name}</span>
            <span className={s.queueTier}>{item.tier}</span>
          </div>
        ))}
      </div>

      {/* ── Routed-to ── */}
      <div
        data-el="routed-to"
        className={cx(s.routedCard, hl("routed-to"))}
        aria-label={`Assigned to ${routedName}`}
      >
        <div className={s.routedAvatar} aria-hidden="true">
          {initials(routedName)}
        </div>
        <div className={s.routedAgent}>
          <p className={s.routedCardLabel}>Assigned To</p>
          <p className={s.routedAgentName}>{routedName}</p>
          <span className={s.routedNotification}>
            Notified &middot; {routedRole} &middot; 3s ago
          </span>
        </div>
        <div className={s.routedStat} aria-label="Routing time: 3 seconds">
          <span className={s.routedStatTime}>3s</span>
          <span className={s.routedStatLabel}>Routing</span>
        </div>
      </div>
    </QuillChrome>
  );
}

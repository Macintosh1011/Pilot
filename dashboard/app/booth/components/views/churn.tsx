"use client";

import { useId, useState, useEffect } from "react";
import { QuillChrome, hl as getHl } from "./QuillChrome";
import { cx, CountUpStat, parseSeriesCsv, svgLinePath, svgAreaPath, LINE_LENGTH } from "./utils";
import type { ViewProps } from "./types";
import s from "../AcmeDemoPanel.module.css";

// ─── Constants ────────────────────────────────────────────────────────────────

const DEFAULT_TOPICS: { topic: string; share: string; trend: string }[] = [
  { topic: "Billing & Invoices", share: "38%", trend: "up"     },
  { topic: "API & Webhooks",     share: "22%", trend: "stable" },
  { topic: "Account Settings",   share: "18%", trend: "down"   },
  { topic: "Password Reset",     share: "14%", trend: "up"     },
  { topic: "Integrations",       share: "8%",  trend: "stable" },
];

const DEFAULT_DEFLECT_PTS: ReadonlyArray<{ x: number; y: number }> = [
  { x: 0,   y: 138 }, { x: 95,  y: 118 }, { x: 190, y: 103 }, { x: 285, y: 86 },
  { x: 380, y: 70 },  { x: 475, y: 52 },  { x: 570, y: 38 },  { x: 665, y: 26 },
  { x: 760, y: 20 },
];

// ─── Topic row ────────────────────────────────────────────────────────────────

function TopicRow({
  topic,
  index,
}: {
  topic: { topic: string; share: string; trend: string };
  index: number;
}) {
  const glyph = topic.trend === "up" ? "↑" : topic.trend === "down" ? "↓" : "–";
  const color = topic.trend === "up" ? "var(--success)" : "var(--muted)";
  return (
    <div className={s.topicRow} role="listitem" style={{ animationDelay: `${index * 60}ms` }}>
      <span className={s.topicName}>{topic.topic}</span>
      <span className={s.topicShare}>{topic.share}</span>
      <span className={s.topicTrend} style={{ color }}>{glyph}</span>
    </div>
  );
}

// ─── Trend chart ─────────────────────────────────────────────────────────────

function TrendChart({
  series,
  svgId,
  endLabel,
}: {
  series: string | undefined;
  svgId: string;
  endLabel: string;
}) {
  const customPts = parseSeriesCsv(series);
  const mainPts   = customPts ?? DEFAULT_DEFLECT_PTS;

  const [drawn, setDrawn] = useState(false);
  useEffect(() => {
    const raf = requestAnimationFrame(() => setDrawn(true));
    return () => cancelAnimationFrame(raf);
  }, []);

  const lastPt    = mainPts[mainPts.length - 1] ?? { x: 760, y: 20 };
  const clayGradId = `${svgId}-clay`;

  return (
    <svg
      viewBox="0 0 760 150"
      preserveAspectRatio="none"
      width="100%"
      height="100%"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id={clayGradId} x1="0" y1="0" x2="0" y2="150" gradientUnits="userSpaceOnUse">
          <stop offset="0%"   stopColor="var(--clay)" stopOpacity={0.22} />
          <stop offset="100%" stopColor="var(--clay)" stopOpacity={0}    />
        </linearGradient>
      </defs>

      {([38, 76, 114] as const).map((y) => (
        <line key={y} x1={0} y1={y} x2={760} y2={y}
          stroke="rgba(20,20,19,0.055)" strokeWidth={1} />
      ))}
      <line x1={0} y1={148} x2={760} y2={148}
        stroke="rgba(20,20,19,0.10)" strokeWidth={1} />

      <path d={svgAreaPath(mainPts, 150)} fill={`url(#${clayGradId})`} />

      <path
        d={svgLinePath(mainPts)}
        fill="none"
        stroke="var(--clay)"
        strokeWidth={2.5}
        strokeLinejoin="round"
        style={{
          strokeDasharray: LINE_LENGTH,
          strokeDashoffset: drawn ? 0 : LINE_LENGTH,
          transition: "stroke-dashoffset 650ms cubic-bezier(0.4,0,0.2,1)",
        }}
      />

      <circle
        cx={lastPt.x} cy={lastPt.y} r={4.5}
        fill="var(--clay)"
        style={{ opacity: drawn ? 1 : 0, transition: "opacity 220ms ease 600ms" }}
      />
      <text
        x={lastPt.x - 8} y={lastPt.y - 10}
        fontFamily="var(--font-mono)" fontSize={10} fontWeight={700}
        fill="var(--clay)" textAnchor="end"
        style={{ opacity: drawn ? 1 : 0, transition: "opacity 220ms ease 660ms" }}
      >
        {endLabel}
      </text>
    </svg>
  );
}

// ─── View ─────────────────────────────────────────────────────────────────────

export default function ChurnView({ params, highlight }: ViewProps) {
  const rawId = useId();
  const svgId = "g" + rawId.replace(/[^a-zA-Z0-9]/g, "");
  const hl = (id: string) => getHl(highlight, id);

  const deflectionRate = params?.deflectionRate ?? "63%";
  const firstResponse  = params?.firstResponse  ?? "8s";
  const csat           = params?.csat           ?? "4.7/5";
  const hoursSaved     = params?.hoursSaved     ?? "120 hrs/mo";

  const deflectedCount = (() => {
    const vol  = parseInt((params?.ticketVolume ?? "").replace(/[^0-9]/g, ""), 10);
    const rate = parseFloat((params?.deflectionRate ?? "").replace(/[^0-9.]/g, "")) / 100;
    if (!isNaN(vol) && !isNaN(rate) && vol > 0) {
      return `${Math.round(vol * rate).toLocaleString()}/mo`;
    }
    return "1,512/mo";
  })();

  const endLabel = (() => {
    const csv = params?.series;
    if (!csv) return "63%";
    const last = csv.split(",").map((v) => parseFloat(v.trim())).filter((v) => !isNaN(v)).pop();
    return last != null ? `${last.toFixed(0)}%` : "63%";
  })();

  const topics = (params?.topTopics && params.topTopics.length > 0)
    ? params.topTopics.slice(0, 5)
    : DEFAULT_TOPICS;

  return (
    <QuillChrome active="churn" company={params?.company} highlight={highlight}>
      <div className={s.sectionRow}>
        <div>
          <p className={s.eyebrow}>IMPACT DASHBOARD</p>
          <h2 className={s.heading} style={{ marginBottom: 0 }}>Support deflected.</h2>
        </div>
        <span style={{
          fontFamily: "var(--font-mono)", fontSize: "0.68rem", fontWeight: 600,
          letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--muted)",
        }}>
          QUILL · THIS MONTH
        </span>
      </div>

      <div className={s.statCards}>
        <div data-el="deflection-rate" className={cx(s.statCard, s.churnActive, hl("deflection-rate"))}>
          <span className={s.statLabel}>Deflection Rate</span>
          <CountUpStat value={deflectionRate} className={cx(s.statNumber, s.good)} />
        </div>
        <div data-el="deflected-count" className={cx(s.statCard, hl("deflected-count"))}>
          <span className={s.statLabel}>Deflected</span>
          <CountUpStat value={deflectedCount} className={s.statNumber} />
        </div>
        <div data-el="response-time" className={cx(s.statCard, hl("response-time"))}>
          <span className={s.statLabel}>First Response</span>
          <CountUpStat value={firstResponse} className={s.statNumber} />
        </div>
      </div>

      <div className={s.statCards} style={{ gridTemplateColumns: "1fr 2fr" }}>
        <div data-el="csat" className={cx(s.statCard, hl("csat"))}>
          <span className={s.statLabel}>CSAT Score</span>
          <CountUpStat value={csat} className={s.statNumber} />
        </div>
        <div className={s.statCard}>
          <span className={s.statLabel}>Hours Saved</span>
          <CountUpStat value={hoursSaved} className={cx(s.statNumber, s.good)} />
        </div>
      </div>

      <div data-el="deflection-trend" className={cx(s.chartBlock, hl("deflection-trend"))}>
        <div className={s.chartHeader}>
          <span className={s.chartLabel}>DEFLECTION TREND · 8 WEEKS</span>
          <span className={s.chartProjLabel}>{endLabel} now</span>
        </div>
        <div className={s.chartSvgWrap}>
          <TrendChart series={params?.series} svgId={svgId} endLabel={endLabel} />
        </div>
      </div>

      <p className={s.eyebrow} style={{ marginBottom: "0.625rem" }}>TOP DEFLECTED TOPICS</p>
      <div
        data-el="top-topics"
        className={cx(s.topicList, hl("top-topics"))}
        role="list"
        aria-label="Most-deflected support topics"
      >
        {topics.map((t, i) => (
          <TopicRow key={t.topic} topic={t} index={i} />
        ))}
      </div>
    </QuillChrome>
  );
}

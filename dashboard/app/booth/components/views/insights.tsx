"use client";

import { useId, useState, useEffect } from "react";
import { QuillChrome, hl as getHl } from "./QuillChrome";
import { cx } from "./utils";
import type { ViewProps } from "./types";
import s from "../AcmeDemoPanel.module.css";

// ─── Default data ──────────────────────────────────────────────────────────────

const DEFAULT_CLUSTERS: { topic: string; share: string | number; trend: string }[] = [
  { topic: "Billing & Refunds",      share: "34%", trend: "up"     },
  { topic: "Onboarding & Setup",     share: "22%", trend: "up"     },
  { topic: "API & Webhooks",         share: "18%", trend: "stable" },
  { topic: "Password & Auth",        share: "13%", trend: "down"   },
  { topic: "Integrations",           share: "9%",  trend: "stable" },
  { topic: "Other",                  share: "4%",  trend: "stable" },
];

const DEFAULT_RISING = "Onboarding & Setup";

// ─── Helpers ───────────────────────────────────────────────────────────────────

function shareToNum(share: string | number): number {
  if (typeof share === "number") return share;
  return parseFloat(share.replace(/[^0-9.]/g, "")) || 0;
}

function shareLabel(share: string | number): string {
  if (typeof share === "number") return `${share}%`;
  return share.toString();
}

// ─── Animated bar component ────────────────────────────────────────────────────

function ClusterBar({
  topic,
  share,
  trend,
  widthPct,
  isTop,
  delay,
  dataEl,
  hlClass,
}: {
  topic: string;
  share: string | number;
  trend: string;
  widthPct: number;
  isTop: boolean;
  delay: number;
  dataEl?: string;
  hlClass?: string;
}) {
  const [drawn, setDrawn] = useState(false);

  useEffect(() => {
    const raf = requestAnimationFrame(() => setDrawn(true));
    return () => cancelAnimationFrame(raf);
  }, []);

  const trendGlyph = trend === "up" ? "↑" : trend === "down" ? "↓" : "–";
  const trendColor =
    trend === "up" ? "var(--success)" :
    trend === "down" ? "var(--rust)" :
    "var(--muted)";

  return (
    <div
      data-el={dataEl}
      className={hlClass}
      style={{
        display: "grid",
        gridTemplateColumns: "9.5rem 1fr 2.75rem 1.25rem",
        alignItems: "center",
        gap: "0.625rem",
        paddingBottom: "0.375rem",
      }}
    >
      {/* Topic label */}
      <span style={{
        fontFamily: "var(--font-serif)", fontSize: "0.9rem",
        color: isTop ? "var(--ink)" : "var(--muted)",
        fontWeight: isTop ? 500 : 400,
        whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
      }}>
        {topic}
      </span>

      {/* Bar track */}
      <div style={{
        height: "0.4375rem", borderRadius: "999px",
        background: "rgba(20,20,19,0.07)", overflow: "hidden",
      }} aria-hidden="true">
        <div style={{
          height: "100%",
          width: drawn ? `${widthPct}%` : "0%",
          borderRadius: "999px",
          background: isTop ? "var(--clay)" : "rgba(204,120,92,0.38)",
          transition: `width 600ms cubic-bezier(0.4,0,0.2,1) ${delay}ms`,
        }} />
      </div>

      {/* Share label */}
      <span style={{
        fontFamily: "var(--font-mono)", fontSize: "0.7rem", fontWeight: 600,
        color: isTop ? "var(--clay)" : "var(--muted)", textAlign: "right",
      }}>
        {shareLabel(share)}
      </span>

      {/* Trend glyph */}
      <span style={{
        fontFamily: "var(--font-mono)", fontSize: "0.72rem", fontWeight: 700,
        color: trendColor, textAlign: "center",
      }} aria-label={trend}>
        {trendGlyph}
      </span>
    </div>
  );
}

// ─── View ──────────────────────────────────────────────────────────────────────

export default function InsightsView({ params, highlight }: ViewProps) {
  const rawId   = useId();
  const svgId   = "g" + rawId.replace(/[^a-zA-Z0-9]/g, "");
  const hl      = (id: string) => getHl(highlight, id);

  const clusters = (params?.clusters && params.clusters.length > 0)
    ? params.clusters
    : DEFAULT_CLUSTERS;

  const risingTopic = params?.risingTopic ?? DEFAULT_RISING;

  // Find the cluster with the highest share for top-cluster data-el
  const topCluster = clusters.reduce<(typeof clusters)[0] | null>((best, c) => {
    if (!best) return c;
    return shareToNum(c.share) > shareToNum(best.share) ? c : best;
  }, null);

  const maxShare = Math.max(...clusters.map((c) => shareToNum(c.share)), 1);

  // Treemap-ish: largest cluster is displayed separately at the top, then the rest
  const sortedClusters = [...clusters].sort(
    (a, b) => shareToNum(b.share) - shareToNum(a.share),
  );

  // Compute bar widths proportional to top cluster
  const barOf = (share: string | number) =>
    Math.round((shareToNum(share) / maxShare) * 100);

  // Suggested fix copy is derived from risingTopic
  const fixSummary =
    `Add an in-app guide for "${risingTopic}" — a 3-step interactive walkthrough would deflect ` +
    `an estimated 35–45% of these tickets and reduce first-response load on support agents.`;

  // Effort/impact for the suggested fix (static for demo clarity)
  const fixMeta: { label: string; color: string }[] = [
    { label: "EFFORT: MEDIUM", color: "var(--tan)"     },
    { label: "IMPACT: HIGH",   color: "var(--success)" },
  ];

  // Void the svgId lint warning (it's kept for potential future chart use)
  void svgId;

  return (
    <QuillChrome active="insights" company={params?.company} highlight={highlight}>

      {/* ── Section header ── */}
      <div className={s.sectionRow}>
        <div>
          <p className={s.eyebrow}>Voice-of-Customer Insights</p>
          <h2 className={s.heading} style={{ marginBottom: 0 }}>
            What customers ask.
          </h2>
        </div>
        <span style={{
          fontFamily: "var(--font-mono)", fontSize: "0.68rem", fontWeight: 600,
          letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--muted)",
        }}>
          QUILL · LAST 30 DAYS
        </span>
      </div>

      {/* ── Cluster bars ── */}
      <p className={s.eyebrow} style={{ marginBottom: "0.5rem" }}>Question Clusters</p>
      <div
        data-el="clusters"
        className={cx(s.chartBlock, hl("clusters"))}
        style={{ marginBottom: "1rem" }}
        aria-label="Topic cluster distribution"
      >
        <div className={s.chartHeader}>
          <span className={s.chartLabel}>TOPIC DISTRIBUTION</span>
          <span style={{
            fontFamily: "var(--font-mono)", fontSize: "0.62rem", fontWeight: 600,
            color: "var(--muted)",
          }}>
            {clusters.length} CLUSTERS
          </span>
        </div>

        {/* Column headers */}
        <div style={{
          display: "grid",
          gridTemplateColumns: "9.5rem 1fr 2.75rem 1.25rem",
          gap: "0.625rem",
          margin: "0.625rem 0 0.375rem",
        }}>
          {["TOPIC", "", "SHARE", ""].map((h, i) => (
            <span key={i} style={{
              fontFamily: "var(--font-mono)", fontSize: "0.58rem", fontWeight: 600,
              letterSpacing: "0.09em", textTransform: "uppercase", color: "var(--muted)",
              textAlign: i >= 2 ? "right" : "left",
            }}>{h}</span>
          ))}
        </div>

        {/* Bar rows */}
        <div style={{ display: "grid", gap: "0.25rem" }}>
          {sortedClusters.map((c, i) => {
            const isTop = topCluster?.topic === c.topic;
            return (
              <ClusterBar
                key={c.topic}
                topic={c.topic}
                share={c.share}
                trend={c.trend}
                widthPct={barOf(c.share)}
                isTop={isTop}
                delay={i * 60}
                dataEl={isTop ? "top-cluster" : undefined}
                hlClass={isTop ? hl("top-cluster") : undefined}
              />
            );
          })}
        </div>
      </div>

      {/* ── Rising topic alert ── */}
      <div
        data-el="rising-topic"
        className={hl("rising-topic")}
        style={{
          display: "flex", alignItems: "flex-start", gap: "0.75rem",
          padding: "0.875rem 1rem",
          background: "rgba(212,162,127,0.12)",
          border: "1px solid rgba(212,162,127,0.35)",
          borderRadius: "0.9375rem",
          marginBottom: "1rem",
        }}
      >
        {/* Up-arrow icon */}
        <span style={{
          width: "1.75rem", height: "1.75rem", borderRadius: "50%",
          background: "rgba(212,162,127,0.18)",
          border: "1px solid rgba(212,162,127,0.38)",
          display: "grid", placeItems: "center", flexShrink: 0, marginTop: "0.125rem",
          fontFamily: "var(--font-mono)", fontSize: "0.85rem", fontWeight: 700,
          color: "var(--tan)",
        }} aria-hidden="true">
          ↑
        </span>

        <div style={{ minWidth: 0 }}>
          <p style={{
            fontFamily: "var(--font-mono)", fontSize: "0.62rem", fontWeight: 700,
            letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--tan)",
            margin: "0 0 0.25rem",
          }}>
            Rising Topic · +28% this week
          </p>
          <p style={{
            fontFamily: "var(--font-serif)", fontSize: "1rem", fontWeight: 500,
            color: "var(--ink)", margin: "0 0 0.25rem",
          }}>
            {risingTopic}
          </p>
          <p style={{
            fontFamily: "var(--font-mono)", fontSize: "0.68rem",
            color: "var(--muted)", margin: 0, lineHeight: 1.5,
          }}>
            Volume increasing faster than deflection — Quill detected a knowledge gap for this topic.
          </p>
        </div>
      </div>

      {/* ── Suggested product fix ── */}
      <p className={s.eyebrow} style={{ marginBottom: "0.5rem" }}>Suggested Product Fix</p>
      <div
        data-el="suggested-fix"
        className={cx(s.docGapCard, hl("suggested-fix"))}
        style={{ marginBottom: 0 }}
      >
        <div className={s.docGapHeader}>
          <span className={s.docGapTitle}>QUILL PRODUCT RECOMMENDATION</span>
        </div>
        <p className={s.docGapTopic}>{risingTopic}</p>
        <p className={s.docGapSuggestion}>{fixSummary}</p>

        {/* Effort / impact tags */}
        <div style={{ display: "flex", gap: "0.4rem", marginTop: "0.625rem", flexWrap: "wrap" }}>
          {fixMeta.map((tag) => (
            <span key={tag.label} style={{
              fontFamily: "var(--font-mono)", fontSize: "0.6rem", fontWeight: 700,
              letterSpacing: "0.08em", textTransform: "uppercase",
              padding: "0.15rem 0.5rem", borderRadius: "999px",
              background: "rgba(20,20,19,0.06)", border: "1px solid rgba(20,20,19,0.12)",
              color: tag.color,
            }}>
              {tag.label}
            </span>
          ))}
        </div>

        {/* Share as insight CTA (decorative) */}
        <button
          className={s.docGapAction}
          aria-label="Share this insight with the product team"
          tabIndex={-1}
        >
          Share with product team →
        </button>
      </div>

    </QuillChrome>
  );
}

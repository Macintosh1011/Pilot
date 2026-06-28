"use client";

import { QuillChrome, hl as getHl } from "./QuillChrome";
import { cx } from "./utils";
import type { ViewProps } from "./types";
import s from "../AcmeDemoPanel.module.css";
import cs from "./experiments.module.css";

// ─── Defaults ─────────────────────────────────────────────────────────────────

const DEFAULT_QUESTION = "What's your return policy?";
const DEFAULT_A =
  "You can return any item within 30 days of purchase for a full refund. Log in to your account and open the Orders page to start a return.";
const DEFAULT_B =
  "Returns are easy — send back any item within 30 days for a full refund. Open the Returns Portal in your account and we'll handle everything in 60 seconds.";

// ─── Metric row ───────────────────────────────────────────────────────────────

function MetricRow({
  value,
  label,
  barWidth,
  barColor,
  good,
}: {
  value: string;
  label: string;
  barWidth: string;
  barColor: string;
  good?: boolean;
}) {
  return (
    <div className={cs.metric}>
      <span className={cx(cs.metricValue, good ? cs.metricGood : "")}>{value}</span>
      <span className={cs.metricLabel}>{label}</span>
      <div className={cs.metricTrack} aria-hidden="true">
        <div className={cs.metricBar} style={{ width: barWidth, background: barColor }} />
      </div>
    </div>
  );
}

// ─── View ─────────────────────────────────────────────────────────────────────

export default function ExperimentsView({ params, highlight }: ViewProps) {
  const hl = (id: string) => getHl(highlight, id);

  const question = params?.question ?? DEFAULT_QUESTION;
  const variantA = params?.variantA ?? DEFAULT_A;
  const variantB = params?.variantB ?? DEFAULT_B;
  const company  = params?.company;

  return (
    <QuillChrome active="experiments" company={company} highlight={highlight}>
      {/* ── Header ── */}
      <div className={s.sectionRow}>
        <div>
          <p className={s.eyebrow}>A/B ANSWER TESTING</p>
          <h2 className={s.heading} style={{ marginBottom: 0 }}>Test. Learn. Ship.</h2>
        </div>
        <span className={cs.statusChip} aria-label="Live experiment running">
          Live experiment
        </span>
      </div>

      {/* ── Question being tested ── */}
      <div className={cs.questionCard} aria-label="Question under test">
        <span className={cs.questionLabel}>Testing</span>
        <p className={cs.questionText}>&ldquo;{question}&rdquo;</p>
      </div>

      {/* ── Variants side by side ── */}
      <div className={cs.variantGrid}>
        {/* Variant A */}
        <div
          data-el="variant-a"
          className={cx(cs.variantCard, hl("variant-a"))}
          role="article"
          aria-label="Variant A — Control"
        >
          <div className={cs.variantHeader}>
            <span className={cs.variantBadge} aria-hidden="true">A</span>
            <span className={cs.variantTitle}>Control</span>
          </div>
          <p className={cs.variantText}>{variantA}</p>
          <div className={cs.variantMetrics} aria-label="Variant A metrics">
            <MetricRow value="71%" label="Resolution" barWidth="71%" barColor="var(--muted)" />
            <MetricRow value="4.2" label="CSAT"       barWidth="84%" barColor="var(--muted)" />
            <MetricRow value="18%" label="Follow-ups"  barWidth="18%" barColor="var(--tan)"  />
          </div>
        </div>

        {/* Variant B */}
        <div
          data-el="variant-b"
          className={cx(cs.variantCard, cs.variantCardWinner, hl("variant-b"))}
          role="article"
          aria-label="Variant B — Challenger, winner"
        >
          <div className={cs.variantHeader}>
            <span className={cx(cs.variantBadge, cs.variantBadgeB)} aria-hidden="true">B</span>
            <span className={cs.variantTitle}>Challenger</span>
            <span className={cs.upliftBadge} aria-label="18% uplift">+18%</span>
          </div>
          <p className={cs.variantText}>{variantB}</p>
          <div className={cs.variantMetrics} aria-label="Variant B metrics">
            <MetricRow value="84%" label="Resolution" barWidth="84%" barColor="var(--clay)" good />
            <MetricRow value="4.7" label="CSAT"       barWidth="94%" barColor="var(--clay)" good />
            <MetricRow value="9%"  label="Follow-ups"  barWidth="9%"  barColor="var(--success)" good />
          </div>
        </div>
      </div>

      {/* ── Metrics summary ── */}
      <div
        data-el="metrics"
        className={cx(cs.metricsSummary, hl("metrics"))}
        aria-label="Experiment metrics"
      >
        <div className={cs.summaryItem}>
          <span className={cs.summaryVal}>312</span>
          <span className={cs.summaryLabel}>Conversations tested</span>
        </div>
        <div className={cs.summaryItem}>
          <span className={cs.summaryVal}>6 days</span>
          <span className={cs.summaryLabel}>Run time</span>
        </div>
        <div className={cs.summaryItem}>
          <span className={cs.summaryVal}>p &lt; 0.01</span>
          <span className={cs.summaryLabel}>Significance</span>
        </div>
      </div>

      {/* ── Winner banner ── */}
      <div
        data-el="winner"
        className={cx(cs.winnerBanner, hl("winner"))}
        role="status"
        aria-label="Variant B selected as winner and shipped"
      >
        <div className={cs.winnerLeft}>
          <span className={cs.winnerIcon} aria-hidden="true">✓</span>
          <div>
            <div className={cs.winnerTitle}>Variant B shipped</div>
            <div className={cs.winnerSub}>
              Now serving 100% of traffic · 97% confidence
            </div>
          </div>
        </div>
        <span className={cs.winnerCta} aria-label="Start next test">Start next test</span>
      </div>
    </QuillChrome>
  );
}

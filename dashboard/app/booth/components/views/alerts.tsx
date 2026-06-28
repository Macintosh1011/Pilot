"use client";

import { QuillChrome, hl as getHl } from "./QuillChrome";
import { cx, severityColor } from "./utils";
import type { ViewProps } from "./types";
import s from "../AcmeDemoPanel.module.css";

// ─── Constants ────────────────────────────────────────────────────────────────

const DEFAULT_ESCALATIONS: { question: string; reason: string }[] = [
  { question: "Can I get a refund for the annual plan?",      reason: "Billing dispute — policy edge case"   },
  { question: "My SSO integration broke after the update.",   reason: "Technical — requires engineering"     },
  { question: "We need a custom contract with net-60 terms.", reason: "Legal / enterprise procurement"       },
  { question: "Why did my API rate limit drop overnight?",    reason: "Account change — needs investigation" },
];

// ─── Notify chip ──────────────────────────────────────────────────────────────

function NotifyChip({ label, active }: { label: string; active: boolean }) {
  return (
    <span style={{
      fontFamily: "var(--font-mono)", fontSize: "0.65rem", fontWeight: 600,
      letterSpacing: "0.06em", textTransform: "uppercase",
      padding: "0.2rem 0.55rem", borderRadius: "999px",
      border: `1px solid ${active ? "rgba(90,122,88,0.25)" : "var(--border)"}`,
      background: active ? "rgba(90,122,88,0.1)" : "var(--chip)",
      color: active ? "var(--success)" : "var(--muted)",
    }}>
      {label}
    </span>
  );
}

// ─── View ─────────────────────────────────────────────────────────────────────

export default function AlertsView({ params, highlight }: ViewProps) {
  const hl = (id: string) => getHl(highlight, id);

  const escalations = (params?.escalations && params.escalations.length > 0)
    ? params.escalations
    : DEFAULT_ESCALATIONS;

  const sev      = params?.severity?.toLowerCase() ?? "medium";
  const sevColor = severityColor(sev);
  const sevLabel = sev === "high" ? "HIGH" : sev === "medium" ? "MED" : "LOW";

  return (
    <QuillChrome active="alerts" company={params?.company} highlight={highlight}>
      <div className={s.sectionRow}>
        <div>
          <p className={s.eyebrow}>ESCALATIONS</p>
          <h2 className={s.heading} style={{ marginBottom: 0 }}>Handed to a human.</h2>
        </div>
      </div>

      <div
        data-el="escalation-list"
        className={cx(s.alertList, hl("escalation-list"))}
        role="list"
        aria-label="Escalated support tickets"
      >
        {escalations.slice(0, 4).map((e, i) => (
          <div
            key={e.question}
            className={s.alertItem}
            role="listitem"
            style={{ animationDelay: `${i * 70}ms` }}
          >
            <div className={s.alertDot} aria-hidden="true" style={{ background: sevColor }} />
            <div className={s.alertInfo}>
              <p className={s.alertName}>{e.question}</p>
              <p className={s.alertSignal}>{e.reason}</p>
            </div>
            <span
              className={s.alertSeverity}
              style={{ color: sevColor, borderColor: `${sevColor}55`, background: `${sevColor}18` }}
            >
              {sevLabel}
            </span>
          </div>
        ))}
      </div>

      <div
        data-el="doc-gap"
        className={cx(s.docGapCard, hl("doc-gap"))}
        aria-label="Documentation gap detected"
      >
        <div className={s.docGapHeader}>
          <span className={s.docGapTitle}>DOC GAP DETECTED</span>
        </div>
        <p className={s.docGapTopic}>API Rate Limits</p>
        <p className={s.docGapSuggestion}>No article covers this — Quill escalated 12 tickets this week.</p>
        <button className={s.docGapAction} aria-label="Draft a rate limits article">
          Draft article →
        </button>
      </div>

      <div
        data-el="escalation-rules"
        className={cx(s.thresholdPanel, hl("escalation-rules"))}
        aria-label="Escalation rule configuration"
      >
        <div className={s.thresholdTopRow}>
          <span className={s.thresholdTitle}>Confidence Threshold</span>
          <span className={s.thresholdValue}>70%</span>
        </div>
        <div
          className={s.thresholdTrack}
          role="slider"
          aria-valuenow={70}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label="Escalation confidence threshold"
        >
          <div className={s.thresholdFill} style={{ width: "70%" }} />
          <div className={s.thresholdHandle} style={{ left: "70%" }} aria-hidden="true" />
        </div>
        <div className={s.notifyRow}>
          <span className={s.notifyLabel}>Escalate via</span>
          <NotifyChip label="Slack" active />
          <NotifyChip label="Email" active />
          <NotifyChip label="Jira"  active={false} />
        </div>
      </div>
    </QuillChrome>
  );
}

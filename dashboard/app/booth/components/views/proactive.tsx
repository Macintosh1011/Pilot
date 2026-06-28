"use client";

import { cx } from "./utils";
import { QuillChrome, hl as getHl } from "./QuillChrome";
import type { ViewProps } from "./types";
import s from "./proactive.module.css";

// ─── Defaults ─────────────────────────────────────────────────────────────────

const DEFAULT_SIGNAL =
  "3 failed payment attempts in 4 minutes";
const DEFAULT_RULE =
  "Payment failure ≥ 2 in 5 min on same account";
const DEFAULT_MESSAGE =
  "Hi! I noticed you've been having trouble completing your payment. " +
  "I can help you sort this out right now — want me to walk you through it?";
const DEFAULT_CHANNEL  = "Live Chat";
const DEFAULT_CUSTOMER = "Sarah M.";
const DEFAULT_OUTCOME  = "Resolved in 2 min · no agent needed";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function capitalizeWords(str: string): string {
  return str
    .replace(/[-_]/g, " ")
    .split(" ")
    .map((w) => (w ? w[0].toUpperCase() + w.slice(1).toLowerCase() : ""))
    .join(" ");
}

// ─── View ─────────────────────────────────────────────────────────────────────

export default function ProactiveView({ params, highlight }: ViewProps) {
  const hl = (id: string) => getHl(highlight, id);

  const signal   = params?.signal   ?? DEFAULT_SIGNAL;
  const message  = params?.message  ?? DEFAULT_MESSAGE;
  const channel  = capitalizeWords(params?.channel ?? DEFAULT_CHANNEL);
  const customer = params?.customer ?? DEFAULT_CUSTOMER;
  const outcome  = params?.outcome  ?? DEFAULT_OUTCOME;

  return (
    <QuillChrome active="proactive" company={params?.company} highlight={highlight}>
      <div className={s.sectionRow}>
        <div>
          <p className={s.eyebrow}>Proactive Outreach</p>
          <h2 className={s.heading}>Quill reaches out first.</h2>
        </div>
        <span className={s.beforeLabel}>Before they ask</span>
      </div>

      <div className={s.flowStack}>
        {/* 1 — Signal detected */}
        <div
          data-el="signal"
          className={cx(s.signalCard, hl("signal"))}
          role="region"
          aria-label="Detected signal"
        >
          <div className={s.signalHeader}>
            <span className={s.signalDot} aria-hidden="true" />
            <span className={s.signalLabel}>Signal Detected</span>
          </div>
          <p className={s.signalText}>{signal}</p>
          <span className={s.signalMeta}>{customer} &middot; just now</span>
        </div>

        <div className={s.connector} aria-hidden="true">
          <div className={s.connectorLine} />
          <div className={s.connectorArrow} />
        </div>

        {/* 2 — Trigger rule */}
        <div
          data-el="trigger-rule"
          className={cx(s.ruleCard, hl("trigger-rule"))}
          role="region"
          aria-label="Trigger rule"
        >
          <p className={s.ruleLabel}>Trigger Rule</p>
          <p className={s.ruleText}>{DEFAULT_RULE}</p>
          <div className={s.ruleChannels}>
            <span className={s.ruleChannelLabel}>Active on:</span>
            {(["Live Chat", "Email", "In-App"] as const).map((ch) => (
              <span key={ch} className={s.channelChip}>{ch}</span>
            ))}
          </div>
        </div>

        <div className={s.connector} aria-hidden="true">
          <div className={s.connectorLine} />
          <div className={s.connectorArrow} />
        </div>

        {/* 3 — Outreach message */}
        <div
          data-el="outreach-message"
          className={cx(s.messageCard, hl("outreach-message"))}
          role="region"
          aria-label="Proactive outreach message from Quill"
        >
          <div className={s.messageHeader}>
            <div className={s.messageLabel}>
              <span className={s.messageDot} aria-hidden="true" />
              Quill Reached Out
            </div>
            <span className={s.channelBadge}>{channel}</span>
          </div>
          <p className={s.messageBubble}>&ldquo;{message}&rdquo;</p>
          <span className={s.messageTiming}>Sent &middot; 12s after trigger fired</span>
        </div>

        <div className={s.connector} aria-hidden="true">
          <div className={s.connectorLine} />
          <div className={s.connectorArrow} />
        </div>

        {/* 4 — Outcome */}
        <div
          data-el="outcome"
          className={cx(s.outcomeCard, hl("outcome"))}
          role="region"
          aria-label="Resolution outcome"
        >
          <span className={s.outcomeDot} aria-hidden="true" />
          <div className={s.outcomeBody}>
            <p className={s.outcomeTitle}>Resolved</p>
            <p className={s.outcomeDetail}>{outcome}</p>
          </div>
          <span className={s.outcomeStat} aria-label="Resolved in 2 minutes">
            2 min
          </span>
        </div>
      </div>
    </QuillChrome>
  );
}

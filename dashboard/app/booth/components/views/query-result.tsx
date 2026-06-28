"use client";

import { QuillChrome, hl as getHl } from "./QuillChrome";
import { cx } from "./utils";
import type { ViewProps } from "./types";
import s from "../AcmeDemoPanel.module.css";

// ─── Constants ────────────────────────────────────────────────────────────────

const DEFAULT_ANSWER =
  "You can upgrade anytime from Settings → Billing. The new plan takes effect immediately and we'll prorate the difference to your next invoice. No data or conversation history is lost during the switch.";

const DEFAULT_SOURCES = "Billing FAQ, Setup Guide, Pricing Page";

// ─── View ─────────────────────────────────────────────────────────────────────

export default function QueryResultView({ params, highlight }: ViewProps) {
  const hl = (id: string) => getHl(highlight, id);

  const question      = params?.question    ?? "How do I upgrade my subscription mid-cycle?";
  const answer        = params?.answer      ?? DEFAULT_ANSWER;
  const rawSources    = params?.sources     ?? DEFAULT_SOURCES;
  const firstResponse = params?.firstResponse ?? "3s";

  const sourceList  = rawSources.split(",").map((src) => src.trim()).filter(Boolean);
  const sourceCount = sourceList.length;

  return (
    <QuillChrome active="query-result" company={params?.company} highlight={highlight}>
      <p className={s.eyebrow}>LIVE ANSWER</p>
      <h2 className={s.heading}>Instant. Cited. On-brand.</h2>

      <div className={s.qAnswerWrap}>
        <div
          data-el="question"
          className={cx(s.qBubble, hl("question"))}
          role="article"
          aria-label="Customer question"
        >
          <p className={s.qBubbleLabel}>Customer</p>
          <p className={s.qBubbleText}>&ldquo;{question}&rdquo;</p>
        </div>

        <div
          data-el="answer"
          className={cx(s.qAnswerCard, hl("answer"))}
          role="article"
          aria-label="Quill's instant answer"
        >
          <div className={s.qAnswerLabel} aria-hidden="true">
            <span className={s.qAnswerDot} />
            Quill
          </div>
          <p className={s.qAnswerText}>{answer}</p>

          <div
            data-el="sources"
            className={cx(s.qSourcesRow, hl("sources"))}
            aria-label="Cited sources"
          >
            <span className={s.qSourcesLabel}>Sources:</span>
            {sourceList.map((src) => (
              <span key={src} className={s.qSourceChip}>{src}</span>
            ))}
          </div>
        </div>

        <div
          data-el="resolved-stat"
          className={cx(s.qResolvedStat, hl("resolved-stat"))}
          role="status"
          aria-label={`Resolved in ${firstResponse} using ${sourceCount} sources`}
        >
          <span className={s.qResolvedDot} aria-hidden="true" />
          <span className={s.qResolvedText}>
            Resolved in {firstResponse} · {sourceCount} source{sourceCount !== 1 ? "s" : ""} · Auto-closed
          </span>
        </div>
      </div>
    </QuillChrome>
  );
}

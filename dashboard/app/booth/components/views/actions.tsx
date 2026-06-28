"use client";

import { QuillChrome, hl as getHl } from "./QuillChrome";
import { cx } from "./utils";
import type { ViewProps } from "./types";
import s from "./actions.module.css";
import p from "../AcmeDemoPanel.module.css";

// ─── Static pipeline ──────────────────────────────────────────────────────────

const STEPS: ReadonlyArray<{ name: string; detail: string }> = [
  { name: "Verify identity",  detail: "Email + order match confirmed"    },
  { name: "Check order",      detail: "Item shipped · marked delivered"  },
  { name: "Apply policy",     detail: "Within 30-day return window"      },
  { name: "Issue refund",     detail: "Stripe refund API call succeeded" },
];

// ─── View ─────────────────────────────────────────────────────────────────────

export default function ActionsView({ params, highlight }: ViewProps) {
  const hl = (id: string) => getHl(highlight, id);

  const customer   = params?.customer   ?? "Sarah Chen";
  const orderRef   = params?.orderRef   ?? "#ORD-29451";
  const actionType = params?.actionType ?? "Refund Request";
  const outcome    = params?.outcome    ?? "Refund of $49.00 issued";
  const initials   = customer
    .split(" ")
    .map((n) => n[0] ?? "")
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <QuillChrome active="actions" company={params?.company} highlight={highlight}>
      {/* Header */}
      <div className={p.sectionRow}>
        <div>
          <p className={p.eyebrow}>ACTIONS</p>
          <h2 className={p.heading} style={{ marginBottom: 0 }}>
            Resolved — no agent needed.
          </h2>
        </div>
        <span
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: "0.68rem",
            fontWeight: 600,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            color: "var(--clay)",
            background: "rgba(204,120,92,0.10)",
            border: "1px solid rgba(204,120,92,0.25)",
            padding: "0.2rem 0.625rem",
            borderRadius: "999px",
          }}
        >
          {actionType}
        </span>
      </div>

      {/* Customer request */}
      <div
        data-el="request"
        className={cx(s.requestCard, hl("request"))}
        role="article"
        aria-label={`Customer request from ${customer}`}
      >
        <div className={s.requestAvatar} aria-hidden="true">
          {initials}
        </div>
        <div className={s.requestMeta}>
          <p className={s.requestFrom}>{customer} · Customer</p>
          <p className={s.requestText}>
            &ldquo;I need to return my order {orderRef} — the item doesn&apos;t
            fit and I&apos;d like a full refund, please.&rdquo;
          </p>
        </div>
        <span className={s.requestRef} aria-label={`Order reference ${orderRef}`}>
          {orderRef}
        </span>
      </div>

      {/* Action steps pipeline */}
      <p className={p.eyebrow} style={{ marginBottom: "0.5rem" }}>
        QUILL EXECUTING
      </p>
      <div
        data-el="action-steps"
        className={cx(s.pipeline, hl("action-steps"))}
        role="list"
        aria-label="Action steps executed by Quill"
      >
        {STEPS.map((step, i) => (
          <div
            key={step.name}
            role="listitem"
            className={s.stepRow}
            style={{ animationDelay: `${i * 80}ms` }}
          >
            <div className={s.stepNum} aria-hidden="true">
              ✓
            </div>
            <div className={s.stepInfo}>
              <p className={s.stepName}>{step.name}</p>
              <p className={s.stepDetail}>{step.detail}</p>
            </div>
            <span className={s.stepDone}>Done</span>
          </div>
        ))}
      </div>

      {/* Live API call */}
      <div
        data-el="api-call"
        className={cx(s.apiCallCard, hl("api-call"))}
        role="region"
        aria-label="Quill API call"
      >
        <div className={s.apiCallHeader}>
          <div>
            <span className={s.apiMethod}>POST</span>
            <span className={s.apiEndpoint}>/v1/refunds</span>
          </div>
          <span className={s.apiStatusOk}>200 OK · 142ms</span>
        </div>
        <pre className={s.apiBody}>{`{
  "charge":    "ch_3PkLm2Kz9...",
  "amount":    4900,
  "currency":  "usd",
  "reason":    "customer_returned",
  "order_ref": "${orderRef}"
}`}</pre>
      </div>

      {/* Confirmation */}
      <div
        data-el="confirmation"
        className={cx(s.confirmCard, hl("confirmation"))}
        role="status"
        aria-label={`Confirmed: ${outcome}`}
      >
        <div className={s.confirmIcon} aria-hidden="true">
          <svg
            width="16"
            height="16"
            viewBox="0 0 16 16"
            fill="none"
            aria-hidden="true"
          >
            <path
              d="M3 8.5L6.5 12L13 5"
              stroke="var(--success)"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
        <div className={s.confirmText}>
          <p className={s.confirmTitle}>{outcome}</p>
          <p className={s.confirmDetail}>
            Confirmation email sent to {customer}
          </p>
        </div>
        <span className={s.confirmTime}>just now</span>
      </div>
    </QuillChrome>
  );
}

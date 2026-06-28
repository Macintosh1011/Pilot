"use client";

import { QuillChrome, hl as getHl } from "./QuillChrome";
import { cx } from "./utils";
import type { ViewProps } from "./types";
import s from "../AcmeDemoPanel.module.css";
import cs from "./copilot.module.css";

// ─── Defaults ─────────────────────────────────────────────────────────────────

const DEFAULT_SUBJECT = "Refund not received after 7 days";
const DEFAULT_MESSAGE =
  "Hi, I submitted a return for order #8821 on June 3rd — it's been 7 days and I still haven't seen the refund on my card. Could you check on this?";
const DEFAULT_REPLY =
  "Hi Sarah, thanks for reaching out. I can see your return for order #8821 was received June 3rd and the refund of $47.50 was processed June 5th. It typically takes 5–7 business days to appear, so you should see it no later than June 12th. If it hasn't arrived by then, reply here and I'll escalate to our payments team right away.";
const DEFAULT_SOURCES = ["Refund Policy", "Returns FAQ", "Payments Guide"];

// ─── View ─────────────────────────────────────────────────────────────────────

export default function CopilotView({ params, highlight }: ViewProps) {
  const hl = (id: string) => getHl(highlight, id);

  const subject = params?.ticketSubject   ?? DEFAULT_SUBJECT;
  const message = params?.customerMessage ?? DEFAULT_MESSAGE;
  const reply   = params?.suggestedReply  ?? DEFAULT_REPLY;
  const company = params?.company;

  return (
    <QuillChrome active="copilot" company={company} highlight={highlight}>
      {/* ── Header ── */}
      <div className={s.sectionRow}>
        <div>
          <p className={s.eyebrow}>AGENT CO-PILOT</p>
          <h2 className={s.heading} style={{ marginBottom: 0 }}>Draft. Review. Send.</h2>
        </div>
        <div className={cs.confidenceChip} aria-label="Reply confidence 97%">
          <span className={cs.confDot} aria-hidden="true" />
          97% confidence
        </div>
      </div>

      {/* ── Ticket ── */}
      <div
        data-el="ticket"
        className={cx(cs.ticketCard, hl("ticket"))}
        role="article"
        aria-label="Support ticket"
      >
        <div className={cs.ticketMeta}>
          <span className={cs.ticketSubject}>{subject}</span>
          <div className={cs.ticketPills} aria-label="Ticket metadata">
            <span className={cs.metaPill}>Ticket #8821</span>
            <span className={cx(cs.metaPill, cs.metaPillHigh)}>High priority</span>
            <span className={cs.metaPill}>4 min ago</span>
          </div>
        </div>

        <div className={cs.ticketBody}>
          <span className={cs.ticketFrom}>Sarah K. — sarah@acmecorp.io</span>
          <p className={cs.ticketText}>&ldquo;{message}&rdquo;</p>
        </div>
      </div>

      {/* ── Suggested reply ── */}
      <div
        data-el="suggested-reply"
        className={cx(cs.replyCard, hl("suggested-reply"))}
        role="article"
        aria-label="Quill's suggested reply"
      >
        <div className={cs.replyHeader}>
          <div className={cs.replyLabel}>
            <span className={cs.replyDot} aria-hidden="true" />
            Quill — Suggested Reply
          </div>
          <span className={cs.editBtn} aria-label="Edit reply">Edit</span>
        </div>

        <p className={cs.replyText}>{reply}</p>

        {/* Sources */}
        <div
          data-el="sources"
          className={cx(cs.sourcesRow, hl("sources"))}
          aria-label="Cited sources"
        >
          <span className={cs.sourcesLabel}>Cited:</span>
          {DEFAULT_SOURCES.map((src) => (
            <span key={src} className={cs.sourceChip}>{src}</span>
          ))}
        </div>
      </div>

      {/* ── Insert action ── */}
      <div
        data-el="insert-reply"
        className={cx(cs.insertRow, hl("insert-reply"))}
      >
        <button className={cs.insertBtn} aria-label="Insert reply into ticket">
          Insert into ticket
        </button>
        <span className={cs.resolvedStat}>
          <span className={cs.resolvedDot} aria-hidden="true" />
          Ticket resolved · No agent needed
        </span>
      </div>
    </QuillChrome>
  );
}

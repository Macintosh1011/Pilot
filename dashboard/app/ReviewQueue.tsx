"use client";

import { api } from "@cvx/_generated/api";
import { useAction, useMutation, useQuery } from "convex/react";
import { FormEvent, useEffect, useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { Card } from "./components/Panel";
import type { Id, Session } from "./types";
import styles from "./ReviewQueue.module.css";

type DraftState = {
  subject: string;
  body: string;
};

function formatTime(ts?: number) {
  if (!ts) {
    return "not sent";
  }

  return new Intl.DateTimeFormat(undefined, {
    hour: "numeric",
    minute: "2-digit",
    month: "short",
    day: "numeric",
  }).format(ts);
}

function ReviewItem({ session }: { session: Session }) {
  const approve = useMutation(api.email.approve);
  const edit = useMutation(api.email.edit);
  const discard = useMutation(api.email.discard);
  const send = useAction(api.email.send);
  const [draft, setDraft] = useState<DraftState>({
    subject: session.emailDraft?.subject ?? "",
    body: session.emailDraft?.body ?? "",
  });
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    setDraft({
      subject: session.emailDraft?.subject ?? "",
      body: session.emailDraft?.body ?? "",
    });
  }, [session.emailDraft?.body, session.emailDraft?.subject]);

  const canSend =
    Boolean(session.email) &&
    (session.reviewStatus === "approved" || session.reviewStatus === "edited");

  function run(task: () => Promise<unknown>, success: string) {
    setMessage(null);
    startTransition(async () => {
      try {
        await task();
        setMessage(success);
      } catch (error) {
        setMessage(error instanceof Error ? error.message : "Something went wrong.");
      }
    });
  }

  function saveEdits(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    run(
      () =>
        edit({
          sessionId: session._id,
          subject: draft.subject,
          body: draft.body,
        }),
      "Edits saved. This draft is now send-enabled.",
    );
  }

  function approveDraft() {
    run(() => approve({ sessionId: session._id }), "Approved. Send is now available.");
  }

  function discardDraft() {
    run(() => discard({ sessionId: session._id }), "Discarded.");
  }

  function sendDraft() {
    setMessage(null);
    startTransition(async () => {
      try {
        const result = await send({ sessionId: session._id });
        setMessage(result.ok ? "Sent. Resend accepted the follow-up." : result.error ?? "Send failed.");
      } catch (error) {
        setMessage(error instanceof Error ? error.message : "Send failed.");
      }
    });
  }

  return (
    <Card padding="1.5rem" className={styles.draftCard}>
      {/* Visitor identity + status chips */}
      <div className={styles.draftHeader}>
        <div>
          <p className="eyebrow">To review</p>
          <h3 className={styles.visitorName}>{session.visitorName ?? "Unknown visitor"}</h3>
          <p className="muted">
            {session.role ?? "Role unknown"} · {session.company ?? "Company unknown"}
          </p>
        </div>
        <div className={styles.metricChips}>
          <span className="score-pill">{session.confidence ?? 0}% confidence</span>
          <span className={`urgency-pill ${session.urgency ?? "low"}`}>
            {session.urgency ?? "low"} urgency
          </span>
          {/* review-pill global classes carry the correct warning/success/clay colors */}
          <span className={`review-pill ${session.reviewStatus ?? "pending"}`}>
            {session.reviewStatus ?? "pending"}
          </span>
        </div>
      </div>

      <div className={styles.draftSep} role="separator" />

      {/* To: line — letter header feel */}
      <p className={styles.toLine}>
        <span className={styles.toLabel}>To</span>
        <strong>{session.email ?? "no contact email"}</strong>
      </p>

      {/* Editable draft — subject + body in serif; labels in mono via .draft-form */}
      <form className="draft-form" onSubmit={saveEdits}>
        <label>
          Subject
          <input
            value={draft.subject}
            onChange={(event) =>
              setDraft((current) => ({ ...current, subject: event.target.value }))
            }
            placeholder="Follow-up subject"
          />
        </label>
        <label>
          Body
          <textarea
            className={styles.letterBody}
            value={draft.body}
            onChange={(event) =>
              setDraft((current) => ({ ...current, body: event.target.value }))
            }
            placeholder="Draft body"
            rows={9}
          />
        </label>

        <div className="review-actions">
          {/* Approve: clay fill — inline style overrides the .review-actions button ink default */}
          <button
            type="button"
            onClick={approveDraft}
            disabled={isPending || !session.emailDraft}
            style={{ background: "var(--clay)", color: "var(--paper)" }}
          >
            Approve
          </button>
          <button type="submit" disabled={isPending || !draft.subject || !draft.body}>
            Save edits
          </button>
          <button
            type="button"
            className="ghost-button"
            onClick={discardDraft}
            disabled={isPending}
          >
            Discard
          </button>
          {/* Send: clay via .send-button global class */}
          <button
            type="button"
            className="send-button"
            onClick={sendDraft}
            disabled={isPending || !canSend}
          >
            Send
          </button>
        </div>
      </form>

      {!session.email && (
        <p className={`warning-copy ${styles.statusMsg}`}>
          Send is disabled because this lead has no email.
        </p>
      )}
      {session.sentAt ? (
        <p className={`success-copy ${styles.statusMsg}`}>Sent {formatTime(session.sentAt)}</p>
      ) : null}
      {message ? <p className={`status-copy ${styles.statusMsg}`}>{message}</p> : null}
    </Card>
  );
}

// Compact summary row used when embedded in the home-page right rail.
// No textareas, no action buttons — just identity, chips, subject, and a link.
function EmbeddedRow({ session }: { session: Session }) {
  return (
    <div className={styles.embeddedRow}>
      <div className={styles.embeddedTop}>
        <span className={styles.embeddedName}>
          {session.visitorName ?? "Unknown visitor"}
        </span>
        <div className={styles.embeddedChips}>
          <span className="score-pill">{session.confidence ?? 0}%</span>
          <span className={`urgency-pill ${session.urgency ?? "low"}`}>
            {session.urgency ?? "low"}
          </span>
        </div>
      </div>
      <div className={styles.embeddedBottom}>
        <span className={styles.embeddedSubject}>
          {session.emailDraft?.subject ?? "Draft pending"}
        </span>
        <Link href="/review" className="review-link">
          Review →
        </Link>
      </div>
    </div>
  );
}

export default function ReviewQueue({ embedded = false }: { embedded?: boolean }) {
  const queue = useQuery(api.sessions.reviewQueue, {}) as Session[] | undefined;
  const sortedQueue = useMemo(() => queue ?? [], [queue]);

  return (
    <section className={embedded ? "review-panel embedded" : "review-panel page-panel"}>
      <div className="section-heading">
        <div>
          <p className="eyebrow">Human review</p>
          <h2>Follow-up queue</h2>
        </div>
        <span className="queue-count">
          {queue === undefined ? "syncing" : `${queue.length} waiting`}
        </span>
      </div>

      {!embedded && (
        <p className={styles.guardrailNote}>
          No emails are sent automatically — approve or save edits first, then send.
        </p>
      )}

      {queue === undefined ? (
        <div className="skeleton-block">Loading review queue...</div>
      ) : sortedQueue.length === 0 ? (
        <div className="empty-card">No drafts need review right now.</div>
      ) : embedded ? (
        <div className={styles.embeddedList}>
          {sortedQueue.map((session) => (
            <EmbeddedRow key={session._id as Id<"sessions">} session={session} />
          ))}
        </div>
      ) : (
        <div className="review-list">
          {sortedQueue.map((session) => (
            <ReviewItem key={session._id as Id<"sessions">} session={session} />
          ))}
        </div>
      )}
    </section>
  );
}

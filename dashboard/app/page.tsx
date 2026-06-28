"use client";

import { api } from "@cvx/_generated/api";
import { useQuery } from "convex/react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { Panel } from "./components/Panel";
import { PaperBackground } from "./components/PaperBackground";
import { Spark } from "./components/Spark";
import { Wordmark } from "./components/Wordmark";
import ReviewQueue from "./ReviewQueue";
import type { AgentEvent, FiberMatch, Id, Session, Urgency } from "./types";
import styles from "./page.module.css";

const stepIcons: Record<AgentEvent["step"], string> = {
  identify: "ID",
  enrich: "FX",
  needs: "ND",
  demo: "DM",
  score: "SC",
  badge: "BG",
  email: "EM",
  hw: "HW",
};

function formatNumber(value?: number) {
  return typeof value === "number" ? value.toLocaleString() : "unknown";
}

function confidenceValue(session: Session) {
  return Math.max(0, Math.min(100, Math.round(session.confidence ?? 0)));
}

function statusLabel(session: Session) {
  return session.status ?? "active";
}

function initials(name?: string) {
  const parts = (name ?? "").trim().split(/\s+/).filter(Boolean);
  const text = parts.slice(0, 2).map((p) => p[0]).join("");
  return text ? text.toUpperCase() : "•";
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function FiberSection({ session }: { session: Session }) {
  const fiber = session.fiber;
  const match: FiberMatch | "none" = session.fiberMatch ?? "none";
  const claimed = session.company;
  const found = fiber?.company?.name;

  const matchChipClass =
    match === "verified"
      ? styles.chipVerified
      : match === "mismatch"
        ? styles.chipMismatch
        : styles.chipNeutral;

  const matchLabel =
    match === "verified" ? "Verified" : match === "mismatch" ? "Mismatch" : "Unverified";

  return (
    <Panel padding="0.85rem" radius="1.1rem" className={styles.fiberSection}>
      <div className={styles.fiberTopline}>
        <span className={matchChipClass}>{matchLabel}</span>
        {fiber?.source === "fallback" ? (
          <span className={styles.chipNeutral}>Demo data</span>
        ) : null}
      </div>
      <p className={styles.fiberMetaLine}>
        {fiber?.company?.industry ?? "Industry unknown"} ·{" "}
        {formatNumber(fiber?.company?.employeeCount)} emp ·{" "}
        {fiber?.company?.funding ?? "funding unknown"} ·{" "}
        {fiber?.company?.location ?? "location unknown"}
      </p>
      <p className={styles.fiberMetaLine}>
        {fiber?.person?.title ?? session.role ?? "Title unknown"} ·{" "}
        {fiber?.person?.headline ?? "No headline yet"}
      </p>
      {match === "mismatch" ? (
        <p className={styles.mismatchAlert}>
          Claimed {claimed ?? "unknown"}, found {found ?? "unknown"}.
        </p>
      ) : null}
    </Panel>
  );
}

function UrgencyStrip({ urgency, evidence }: { urgency?: Urgency; evidence?: string }) {
  const levelClass =
    urgency === "high"
      ? styles.urgencyHigh
      : urgency === "medium"
        ? styles.urgencyMedium
        : styles.urgencyLow;

  const chipClass =
    urgency === "high"
      ? styles.chipUrgencyHigh
      : urgency === "medium"
        ? styles.chipUrgencyMedium
        : styles.chipNeutral;

  return (
    <div className={`${styles.urgencyStrip} ${levelClass}`}>
      <span className={chipClass}>{urgency ?? "low"} urgency</span>
      {evidence ? (
        <em className={styles.urgencyEvidence}>"{evidence}"</em>
      ) : (
        <em className={styles.urgencyEvidence}>No urgency quote captured yet.</em>
      )}
    </div>
  );
}

function ConfidenceMeter({ session }: { session: Session }) {
  const value = confidenceValue(session);

  return (
    <Panel padding="0.85rem" radius="1.1rem" className={styles.confidenceSection}>
      <div className={styles.confidenceTopRow}>
        <div>
          <p className={styles.confidenceLabel}>Confidence</p>
          <span className={styles.scoreNumber}>{value}</span>
        </div>
        <span className="honesty-tag">internal only</span>
      </div>
      <div className="meter-track" aria-label={`Confidence ${value} out of 100`}>
        <div className="meter-fill" style={{ width: `${value}%` }} />
        <span className="meter-tick one" />
        <span className="meter-tick two" />
        <span className="meter-tick three" />
      </div>
      {session.confidenceReasons?.length ? (
        <ul className={styles.reasonList}>
          {session.confidenceReasons.map((reason) => (
            <li key={reason}>{reason}</li>
          ))}
        </ul>
      ) : (
        <p className={styles.reasonEmpty}>Awaiting scoring reasons.</p>
      )}
    </Panel>
  );
}

function BadgeChip({ session }: { session: Session }) {
  if (!session.badge) {
    return <span className="badge-chip muted-chip">Badge minting</span>;
  }

  return (
    <Link className="badge-chip" href={`/badge/${session._id}`}>
      <span>{session.badge.archetype}</span>
      <strong>{session.badge.discountCode}</strong>
    </Link>
  );
}

function LeadCard({
  session,
  selected,
  onSelect,
}: {
  session: Session;
  selected: boolean;
  onSelect: () => void;
}) {
  const status = statusLabel(session);

  return (
    <article
      className={`lead-card ${selected ? "selected" : ""}`}
      onClick={onSelect}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") onSelect();
      }}
      role="button"
      tabIndex={0}
    >
      {/* Identity — photo, serif name, mono role·company */}
      <div className={styles.cardHeader}>
        <div className={styles.identityRow}>
          {session.visitorPhotoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              className={styles.visitorAvatar}
              src={session.visitorPhotoUrl}
              alt={session.visitorName ?? "Visitor"}
            />
          ) : (
            <div className={styles.visitorAvatarFallback} aria-hidden="true">
              {initials(session.visitorName)}
            </div>
          )}
          <div className={styles.identityBlock}>
            <h3 className={styles.visitorName}>
              {session.visitorName ?? "Unknown visitor"}
            </h3>
            <span className={styles.visitorMeta}>
              {session.role ?? "Role unknown"} · {session.company ?? "Company unknown"}
            </span>
          </div>
        </div>
        <span className={`status-pill ${status}`}>{status}</span>
      </div>

      {/* Fiber enrichment — verified/mismatch/none as semantic chips */}
      <FiberSection session={session} />

      {/* Use case — serif body + problem chips */}
      <Panel padding="0.85rem" radius="1.1rem">
        <p className={styles.useCaseText}>
          {session.useCase ?? "Listening for the visitor's use case…"}
        </p>
        <div className={styles.chipsRow}>
          {(session.problems?.length ? session.problems : ["Needs not captured"]).map(
            (problem) => (
              <span key={problem} className="problem-chip">
                {problem}
              </span>
            ),
          )}
        </div>
      </Panel>

      {/* Best angle — internal sales coaching hint */}
      {session.bestAngle ? (
        <div className={styles.bestAngleSection}>
          <span className={styles.sectionLabel}>Best angle</span>
          <p className={styles.bestAngleText}>{session.bestAngle}</p>
        </div>
      ) : null}

      {/* Urgency — semantic chip + serif evidence quote */}
      <UrgencyStrip urgency={session.urgency} evidence={session.urgencyEvidence} />

      {/* Confidence — big serif score + clay meter + serif reasons */}
      <ConfidenceMeter session={session} />

      {/* Demo shown */}
      <div className={styles.demoSection}>
        <span className={styles.sectionLabel}>Demo shown</span>
        <div className={styles.chipsRow}>
          {(session.demoShown?.length ? session.demoShown : ["Waiting"]).map((view) => (
            <span key={view} className="view-chip">
              {view}
            </span>
          ))}
        </div>
      </div>

      {/* Footer — badge + review status */}
      <div className={styles.cardFooter}>
        <BadgeChip session={session} />
        <span className={`review-pill ${session.reviewStatus ?? "pending"}`}>
          {session.reviewStatus ?? "pending"}
        </span>
        {session.reviewStatus === "pending" || session.reviewStatus === "edited" ? (
          <Link
            className="review-link"
            href="/review"
            onClick={(event) => event.stopPropagation()}
          >
            Review →
          </Link>
        ) : null}
      </div>
    </article>
  );
}

function Timeline({ sessionId }: { sessionId?: Id<"sessions"> }) {
  const events = useQuery(
    api.events.bySession,
    sessionId ? { sessionId } : "skip",
  ) as AgentEvent[] | undefined;

  return (
    <aside className="timeline-panel">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Agent timeline</p>
          <h2>{sessionId ? "Thinking trail" : "Select a lead"}</h2>
        </div>
        {sessionId ? <span className="live-dot">live</span> : null}
      </div>

      {!sessionId ? (
        <p className="muted" style={{ marginTop: "0.75rem" }}>
          The live reasoning trail appears here as each agent step lands.
        </p>
      ) : events === undefined ? (
        <div className="skeleton-block">Loading events…</div>
      ) : events.length === 0 ? (
        <div className="empty-card">No agent events yet.</div>
      ) : (
        <ol className={styles.stepperList}>
          {events.map((event) => (
            <li key={event._id} className={styles.stepperRow}>
              <div className={styles.stepBadge} aria-hidden="true">
                {stepIcons[event.step]}
              </div>
              <div className={styles.stepContent}>
                <div className={styles.stepTopline}>
                  <span className={styles.stepLabel}>{event.label}</span>
                  {typeof event.ms === "number" ? (
                    <span className={styles.stepTiming}>{event.ms}ms</span>
                  ) : null}
                </div>
                {event.detail ? (
                  <p className={styles.stepDetail}>{event.detail}</p>
                ) : null}
              </div>
            </li>
          ))}
        </ol>
      )}
    </aside>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const sessions = useQuery(api.sessions.list, {}) as Session[] | undefined;
  const [selectedId, setSelectedId] = useState<Id<"sessions"> | null>(null);

  const activeSessionId = useMemo(() => {
    if (!sessions?.length) {
      return selectedId ?? undefined;
    }

    const selected =
      selectedId && sessions.some((session) => session._id === selectedId)
        ? selectedId
        : null;
    // Default to the first (highest-confidence) lead so the timeline renders
    // immediately on load rather than waiting for a manual click.
    return selected ?? sessions[0]._id;
  }, [selectedId, sessions]);

  const totals = useMemo(() => {
    const list = sessions ?? [];
    return {
      all: list.length,
      done: list.filter((session) => session.status === "done").length,
      review: list.filter(
        (session) =>
          session.reviewStatus === "pending" || session.reviewStatus === "edited",
      ).length,
    };
  }, [sessions]);

  return (
    <>
      <PaperBackground />
      <main className="dashboard-shell">
        <header className="hero-header">
          <div>
            <div className={styles.headerBrand}>
              <Spark size={20} color="var(--clay)" />
              <Wordmark size={13} />
            </div>
            <h1>Live company-facing brain</h1>
            <p>
              Every card below is reactive Convex state: identity, enrichment, needs,
              scoring, badge, and gated follow-up.
            </p>
          </div>
          <div className="header-stats">
            <span>
              <strong>{sessions === undefined ? "…" : totals.all}</strong>
              cards
            </span>
            <span>
              <strong>{sessions === undefined ? "…" : totals.done}</strong>
              done
            </span>
            <span>
              <strong>{sessions === undefined ? "…" : totals.review}</strong>
              in review
            </span>
          </div>
        </header>

        <div className="dashboard-grid">
          <section className="lead-section">
            <div className="section-heading">
              <div>
                <p className="eyebrow">CRM cards</p>
                <h2>Sorted by confidence</h2>
              </div>
              <span className="sync-pill">Convex reactive</span>
            </div>

            {sessions === undefined ? (
              <div className="card-grid">
                <div className="skeleton-card" />
                <div className="skeleton-card" />
              </div>
            ) : sessions.length === 0 ? (
              <div className="waiting-state">
                <div className="orb" />
                <h2>Waiting for the next visitor…</h2>
                <p>
                  Seed golden sessions or start an iPad session to watch this screen
                  fill in live.
                </p>
              </div>
            ) : (
              <div className="card-grid">
                {sessions.map((session) => (
                  <LeadCard
                    key={session._id}
                    session={session}
                    selected={session._id === activeSessionId}
                    onSelect={() => setSelectedId(session._id)}
                  />
                ))}
              </div>
            )}
          </section>

          <div className="side-stack">
            <Timeline sessionId={activeSessionId} />
            <ReviewQueue embedded />
          </div>
        </div>
      </main>
    </>
  );
}

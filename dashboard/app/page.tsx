"use client";

import { api } from "@cvx/_generated/api";
import { useQuery } from "convex/react";
import Link from "next/link";
import { useMemo, useState } from "react";
import ReviewQueue from "./ReviewQueue";
import type { AgentEvent, FiberMatch, Id, Session, Urgency } from "./types";

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

function FiberPanel({ session }: { session: Session }) {
  const fiber = session.fiber;
  const match = session.fiberMatch ?? "none";
  const claimed = session.company;
  const found = fiber?.company?.name;

  return (
    <div className="fiber-panel">
      <div className="fiber-header">
        <span className={`match-flag ${match}`}>
          {match === "verified" ? "Verified" : match === "mismatch" ? "Self-report ≠ fiber" : "No match"}
        </span>
        {fiber?.source === "fallback" ? <span className="honesty-tag">demo data</span> : null}
      </div>
      <p className="fiber-company">
        {fiber?.company?.industry ?? "Industry unknown"} · {formatNumber(fiber?.company?.employeeCount)} emp ·{" "}
        {fiber?.company?.funding ?? "funding unknown"} · {fiber?.company?.location ?? "location unknown"}
      </p>
      <p className="fiber-person">
        {fiber?.person?.title ?? session.role ?? "Title unknown"} · {fiber?.person?.headline ?? "No headline yet"}
      </p>
      {match === "mismatch" ? (
        <p className="mismatch-copy">
          Claimed {claimed ?? "unknown company"}, found {found ?? "unknown company"}.
        </p>
      ) : null}
    </div>
  );
}

function UrgencyChip({ urgency, evidence }: { urgency?: Urgency; evidence?: string }) {
  return (
    <div className={`urgency-box ${urgency ?? "low"}`}>
      <span>{urgency ?? "low"} urgency</span>
      {evidence ? <em>“{evidence}”</em> : <em>No urgency quote captured yet.</em>}
    </div>
  );
}

function ConfidenceMeter({ session }: { session: Session }) {
  const value = confidenceValue(session);

  return (
    <div className="confidence-meter">
      <div className="confidence-topline">
        <span className="honesty-tag">internal only</span>
        <strong>{value}</strong>
      </div>
      <div className="meter-track" aria-label={`Confidence ${value} out of 100`}>
        <div className="meter-fill" style={{ width: `${value}%` }} />
        <span className="meter-tick one" />
        <span className="meter-tick two" />
        <span className="meter-tick three" />
      </div>
      {session.confidenceReasons?.length ? (
        <ul className="reason-list">
          {session.confidenceReasons.map((reason) => (
            <li key={reason}>{reason}</li>
          ))}
        </ul>
      ) : (
        <p className="muted">Waiting for scoring reasons.</p>
      )}
    </div>
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
        if (event.key === "Enter" || event.key === " ") {
          onSelect();
        }
      }}
      role="button"
      tabIndex={0}
    >
      <div className="card-topline">
        <div>
          <h3>{session.visitorName ?? "Unknown visitor"}</h3>
          <p>
            {session.role ?? "Role unknown"} · {session.company ?? "Company unknown"}
          </p>
        </div>
        <span className={`status-pill ${status}`}>{status}</span>
      </div>

      <FiberPanel session={session} />

      <div className="use-case">
        <p>{session.useCase ?? "Listening for the visitor's use case..."}</p>
        <div className="chip-row">
          {(session.problems?.length ? session.problems : ["Needs not captured"]).map((problem) => (
            <span key={problem} className="problem-chip">
              {problem}
            </span>
          ))}
        </div>
      </div>

      <UrgencyChip urgency={session.urgency} evidence={session.urgencyEvidence} />
      <ConfidenceMeter session={session} />

      <div className="card-section">
        <p className="section-label">Demo shown</p>
        <div className="chip-row">
          {(session.demoShown?.length ? session.demoShown : ["Waiting"]).map((view) => (
            <span key={view} className="view-chip">
              {view}
            </span>
          ))}
        </div>
      </div>

      <div className="card-footer">
        <BadgeChip session={session} />
        <span className={`review-pill ${session.reviewStatus ?? "pending"}`}>
          {session.reviewStatus ?? "pending"}
        </span>
        {session.reviewStatus === "pending" || session.reviewStatus === "edited" ? (
          <Link className="review-link" href="/review" onClick={(event) => event.stopPropagation()}>
            Review →
          </Link>
        ) : null}
      </div>
    </article>
  );
}

function Timeline({ sessionId }: { sessionId?: Id<"sessions"> }) {
  const events = useQuery(api.events.bySession, sessionId ? { sessionId } : "skip") as AgentEvent[] | undefined;

  if (!sessionId) {
    return (
      <aside className="timeline-panel">
        <p className="eyebrow">Agent timeline</p>
        <h2>Select a lead</h2>
        <p className="muted">The live reasoning trail appears here as each agent step lands.</p>
      </aside>
    );
  }

  return (
    <aside className="timeline-panel">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Agent timeline</p>
          <h2>Thinking trail</h2>
        </div>
        <span className="live-dot">live</span>
      </div>

      {events === undefined ? (
        <div className="skeleton-block">Loading events...</div>
      ) : events.length === 0 ? (
        <div className="empty-card">No agent events yet.</div>
      ) : (
        <ol className="timeline-list">
          {events.map((event) => (
            <li key={event._id} className={`timeline-row ${event.step}`}>
              <span className="step-icon">{stepIcons[event.step]}</span>
              <div>
                <strong>{event.label}</strong>
                {event.detail ? <p>{event.detail}</p> : null}
              </div>
              {typeof event.ms === "number" ? <span className="ms-pill">{event.ms}ms</span> : null}
            </li>
          ))}
        </ol>
      )}
    </aside>
  );
}

export default function DashboardPage() {
  const sessions = useQuery(api.sessions.list, {}) as Session[] | undefined;
  const [selectedId, setSelectedId] = useState<Id<"sessions"> | null>(null);

  const activeSessionId = useMemo(() => {
    if (!sessions?.length) {
      return selectedId ?? undefined;
    }

    const selected = selectedId && sessions.some((session) => session._id === selectedId) ? selectedId : null;
    return selected ?? sessions.find((session) => session.status !== "done")?._id ?? sessions[0]._id;
  }, [selectedId, sessions]);

  const totals = useMemo(() => {
    const list = sessions ?? [];
    return {
      all: list.length,
      done: list.filter((session) => session.status === "done").length,
      review: list.filter(
        (session) => session.reviewStatus === "pending" || session.reviewStatus === "edited",
      ).length,
    };
  }, [sessions]);

  return (
    <main className="dashboard-shell">
      <header className="hero-header">
        <div>
          <p className="eyebrow">BoothPilot · Builder 2</p>
          <h1>Live company-facing brain</h1>
          <p>
            Every card below is reactive Convex state: identity, enrichment, needs, scoring, badge, and
            gated follow-up.
          </p>
        </div>
        <div className="header-stats">
          <span>
            <strong>{sessions === undefined ? "..." : totals.all}</strong>
            cards
          </span>
          <span>
            <strong>{sessions === undefined ? "..." : totals.done}</strong>
            done
          </span>
          <span>
            <strong>{sessions === undefined ? "..." : totals.review}</strong>
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
              <h2>Waiting for the next visitor...</h2>
              <p>Seed golden sessions or start an iPad session to watch this screen fill in live.</p>
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
  );
}

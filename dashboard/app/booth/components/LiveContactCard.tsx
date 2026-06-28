// Visitor-facing CRM contact card for the booth kiosk.
// Renders live as the AI converses: identity → enrichment → needs → urgency → confidence.
// Each section mounts only once its data exists and animates in with the rise keyframe.
// Server component — no hooks; parent (orchestration layer) feeds fresh props reactively.

import type { Session, Urgency } from "../../types";
import { Spark } from "../../components/Spark";
import { Panel } from "../../components/Panel";
import styles from "./LiveContactCard.module.css";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function initials(name?: string): string {
  const parts = (name ?? "").trim().split(/\s+/).filter(Boolean);
  const letters = parts
    .slice(0, 2)
    .map((p) => p[0])
    .join("");
  return letters ? letters.toUpperCase() : "?";
}

function formatEmployees(n?: number): string | null {
  if (typeof n !== "number") return null;
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M employees`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}k employees`;
  return `${n} employees`;
}

function confidenceValue(v?: number): number {
  return Math.max(0, Math.min(100, Math.round(v ?? 0)));
}

// ─── Camera placeholder ───────────────────────────────────────────────────────

function CameraPlaceholder() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      className={styles.cameraIcon}
    >
      <path
        d="M9 3H15L17 5H21C21.5523 5 22 5.44772 22 6V18C22 18.5523 21.5523 19 21 19H3C2.44772 19 2 18.5523 2 18V6C2 5.44772 2.44772 5 3 5H7L9 3Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="12" cy="12" r="3.5" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}

// ─── Listening / empty state ──────────────────────────────────────────────────

function ListeningState() {
  return (
    <div className={styles.listeningCard}>
      <Spark size={48} color="var(--clay)" />
      <p className={styles.listeningLabel}>Listening…</p>
      <p className={styles.listeningHint}>
        Identity and enrichment fill in here as the conversation unfolds.
      </p>
    </div>
  );
}

// ─── Section 1: Identity header ───────────────────────────────────────────────

function IdentityHeader({ session }: { session: Session }) {
  const matchChipClass =
    session.fiberMatch === "verified"
      ? styles.chipVerified
      : session.fiberMatch === "mismatch"
        ? styles.chipMismatch
        : null;

  const matchLabel =
    session.fiberMatch === "verified"
      ? "Verified"
      : session.fiberMatch === "mismatch"
        ? "Mismatch"
        : null;

  const roleMeta = [session.role, session.company].filter(Boolean).join(" · ");

  return (
    <div className={styles.identitySection}>
      {/* Photo frame — clay border, camera icon when no URL */}
      <div className={styles.photoFrame} aria-hidden="true">
        {session.visitorPhotoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            className={styles.photo}
            src={session.visitorPhotoUrl}
            alt={session.visitorName ?? "Visitor"}
          />
        ) : (
          <div className={styles.photoPlaceholder}>
            <CameraPlaceholder />
          </div>
        )}
      </div>

      {/* Identity text */}
      <div className={styles.identityText}>
        <h2 className={styles.visitorName}>
          {session.visitorName ?? "Visitor"}
        </h2>
        {roleMeta && (
          <span className={styles.visitorMeta}>{roleMeta}</span>
        )}
        <div className={styles.chipRow}>
          {matchChipClass && matchLabel && (
            <span className={matchChipClass}>{matchLabel}</span>
          )}
          {session.fiber?.source === "fallback" && (
            <span className={styles.chipNeutral}>Demo data</span>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Section 2: Fiber firmographics ──────────────────────────────────────────

function FiberPanel({ session }: { session: Session }) {
  const fiber = session.fiber;
  if (!fiber) return null;

  const co = fiber.company;
  const person = fiber.person;

  const companyMeta = [
    co?.industry,
    formatEmployees(co?.employeeCount),
    co?.funding,
    co?.location,
  ]
    .filter(Boolean)
    .join(" · ");

  const personMeta = [person?.title, person?.seniority]
    .filter(Boolean)
    .join(" · ");

  const claimed = session.company;
  const found = co?.name;

  return (
    <Panel padding="0.75rem" radius="1rem" className={styles.fiberPanel}>
      <p className={styles.eyebrow}>Enrichment</p>

      {/* Company meta row */}
      {companyMeta && (
        <p className={styles.fiberMetaLine}>{companyMeta}</p>
      )}

      {/* Person row + decision maker chip */}
      {(personMeta || person?.isDecisionMaker) && (
        <div className={styles.fiberPersonRow}>
          {personMeta && (
            <span className={styles.fiberPersonMeta}>{personMeta}</span>
          )}
          {person?.isDecisionMaker && (
            <span className={styles.chipDecisionMaker}>Decision maker</span>
          )}
        </div>
      )}

      {/* Mismatch alert */}
      {session.fiberMatch === "mismatch" && (
        <p className={styles.mismatchAlert}>
          Claimed {claimed ?? "unknown"}, found {found ?? "unknown"}.
        </p>
      )}
    </Panel>
  );
}

// ─── Section 3: Needs ────────────────────────────────────────────────────────

function NeedsPanel({ session }: { session: Session }) {
  return (
    <Panel padding="0.75rem" radius="1rem" className={styles.needsPanel}>
      <p className={styles.eyebrow}>Needs</p>
      {session.useCase && (
        <p className={styles.useCaseText}>{session.useCase}</p>
      )}
      {session.problems && session.problems.length > 0 && (
        <div className={styles.problemsRow}>
          {session.problems.map((p) => (
            <span key={p} className="problem-chip">
              {p}
            </span>
          ))}
        </div>
      )}
    </Panel>
  );
}

// ─── Section 4: Urgency strip ─────────────────────────────────────────────────

function UrgencyStrip({ session }: { session: Session }) {
  const urgency: Urgency = session.urgency ?? "low";

  const stripClass =
    urgency === "high"
      ? `${styles.urgencyStrip} ${styles.urgencyHigh}`
      : urgency === "medium"
        ? `${styles.urgencyStrip} ${styles.urgencyMedium}`
        : `${styles.urgencyStrip} ${styles.urgencyLow}`;

  const chipClass =
    urgency === "high"
      ? styles.urgencyChipHigh
      : urgency === "medium"
        ? styles.urgencyChipMedium
        : styles.urgencyChipLow;

  return (
    <div className={stripClass}>
      <span className={chipClass}>{urgency} urgency</span>
      {session.urgencyEvidence ? (
        <em className={styles.urgencyQuote}>"{session.urgencyEvidence}"</em>
      ) : null}
    </div>
  );
}

// ─── Section 5: Confidence meter ──────────────────────────────────────────────

function ConfidenceMeter({ session }: { session: Session }) {
  const value = confidenceValue(session.confidence);

  return (
    <div className={styles.confidenceSection}>
      <div className={styles.confidenceTopRow}>
        <div>
          <p className={styles.confidenceLabel}>Confidence</p>
          <span className={styles.scoreNumber}>{value}</span>
        </div>
        {/* Decorative spark at high confidence */}
        {value >= 70 && (
          <Spark size={28} color="var(--clay)" />
        )}
      </div>

      {/* Animated confidence bar */}
      <div
        className={styles.meterTrack}
        role="meter"
        aria-valuenow={value}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`Confidence score: ${value} out of 100`}
      >
        <div className={styles.meterFill} style={{ width: `${value}%` }} />
        <span className={styles.meterTick + " " + styles.meterTickQ1} />
        <span className={styles.meterTick + " " + styles.meterTickQ2} />
        <span className={styles.meterTick + " " + styles.meterTickQ3} />
      </div>

      {/* Reasons */}
      {session.confidenceReasons && session.confidenceReasons.length > 0 ? (
        <ul className={styles.reasonList}>
          {session.confidenceReasons.map((reason) => (
            <li key={reason} className={styles.reasonItem}>
              {reason}
            </li>
          ))}
        </ul>
      ) : (
        <p className={styles.reasonEmpty}>Awaiting scoring signals…</p>
      )}
    </div>
  );
}

// ─── Public export ────────────────────────────────────────────────────────────

export function LiveContactCard({ session }: { session: Session }) {
  const hasIdentity = !!(session.visitorName || session.role || session.company);
  const hasFiber = !!session.fiber;
  const hasNeeds = !!(
    session.useCase ||
    (session.problems && session.problems.length > 0)
  );
  const hasUrgency = !!session.urgency;
  const hasConfidence = typeof session.confidence === "number";

  const isEmpty =
    !hasIdentity && !hasFiber && !hasNeeds && !hasUrgency && !hasConfidence;

  if (isEmpty) {
    return (
      <div className={styles.card}>
        <ListeningState />
      </div>
    );
  }

  return (
    <article className={styles.card}>
      {hasIdentity && (
        <div className={styles.section}>
          <IdentityHeader session={session} />
        </div>
      )}

      {hasIdentity && hasFiber && <hr className={styles.divider} />}

      {hasFiber && (
        <div className={styles.section}>
          <FiberPanel session={session} />
        </div>
      )}

      {hasNeeds && (
        <div className={styles.section}>
          <NeedsPanel session={session} />
        </div>
      )}

      {hasUrgency && (
        <div className={styles.section}>
          <UrgencyStrip session={session} />
        </div>
      )}

      {hasConfidence && (
        <div className={styles.section}>
          <ConfidenceMeter session={session} />
        </div>
      )}
    </article>
  );
}

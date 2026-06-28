"use client";

import { api } from "@cvx/_generated/api";
import { useQuery } from "convex/react";
import Link from "next/link";
import type { Id } from "../../types";
import { PaperBackground } from "../../components/PaperBackground";
import { Wordmark } from "../../components/Wordmark";
import { Spark } from "../../components/Spark";
import { StatBar } from "../../components/StatBar";
import { Panel } from "../../components/Panel";
import styles from "./badge.module.css";

type BadgePublicData = {
  _id: Id<"sessions">;
  visitorName?: string;
  company?: string;
  visitorPhotoUrl?: string;
  badge?: {
    archetype: string;
    tagline: string;
    compliment: string;
    stats: { label: string; value: number }[];
    discountCode: string;
  };
} | null;

function shareUrl(sessionId: string): string {
  if (typeof window === "undefined") return "";
  return `${window.location.origin}/badge/${sessionId}`;
}

// Derives a stable 3-digit display number from the session ID.
function badgeNumber(id: string): string {
  const n = id.split("").reduce((acc, c) => (acc * 31 + c.charCodeAt(0)) & 0xffff, 0);
  return String((n % 900) + 100).padStart(3, "0");
}

export default function BadgePageClient({ sessionId }: { sessionId: Id<"sessions"> }) {
  const session = useQuery(api.sessions.badgePublic, { sessionId }) as BadgePublicData | undefined;
  const url = shareUrl(sessionId);
  const badge = session?.badge;

  if (session === undefined) {
    return (
      <main className="badge-page-shell">
        <PaperBackground />
        <div
          className={`badge-card shimmer ${styles.loadCard}`}
          role="status"
          aria-label="Loading badge"
        >
          <p className="eyebrow" style={{ margin: 0 }}>Minting Booth Badge</p>
        </div>
      </main>
    );
  }

  if (session === null) {
    return (
      <main className="badge-page-shell">
        <PaperBackground />
        <div className={`badge-card ${styles.loadCard}`}>
          <p className="eyebrow" style={{ margin: 0 }}>Badge not found</p>
          <h1 style={{ fontFamily: "var(--font-serif)", fontSize: "1.75rem", fontWeight: 500, margin: 0 }}>
            This Booth Badge is not available.
          </h1>
          <Link href="/" className="review-link">← Back to BoothPilot</Link>
        </div>
      </main>
    );
  }

  if (!badge) {
    return (
      <main className="badge-page-shell">
        <PaperBackground />
        <div
          className={`badge-card shimmer ${styles.loadCard}`}
          role="status"
          aria-label="Badge minting in progress"
        >
          <Spark size={56} />
          <p className="eyebrow" style={{ margin: 0 }}>Badge forge</p>
          <p style={{ color: "var(--muted)", fontStyle: "italic", margin: 0 }}>
            Your badge is being minted...
          </p>
        </div>
      </main>
    );
  }

  const visitorName = session.visitorName ?? "Booth visitor";
  const firstName = visitorName.split(" ")[0] ?? visitorName;
  const num = badgeNumber(sessionId);
  const shareText = encodeURIComponent(`${badge.archetype}: ${badge.tagline}`);
  const encodedUrl = encodeURIComponent(url);

  return (
    <main className="badge-page-shell">
      <PaperBackground />
      <div className={styles.layout}>

        {/* ── Bookplate card — letterpress editorial collectible ── */}
        <div className={styles.bookplate}>
          <div className={styles.inner}>

            {/* Top row: wordmark + badge number */}
            <div className={styles.bookplateHeader}>
              <Wordmark size={11} />
              <span className={styles.badgeNumber}>NO. {num}</span>
            </div>

            {/* Hero: photo (or spark) → archetype label → archetype name → compliment */}
            <div className={styles.hero}>
              {session.visitorPhotoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={session.visitorPhotoUrl}
                  alt={visitorName}
                  className={styles.heroPhoto}
                />
              ) : (
                <Spark size={80} className={styles.spark} />
              )}
              <p className={`eyebrow ${styles.archetypeEyebrow}`}>Your archetype</p>
              <h1 className={styles.archetype}>{badge.archetype}</h1>
              <p className={styles.compliment}>{badge.compliment}</p>
            </div>

            {/* Animated clay stat bars */}
            <div className={styles.statList}>
              {badge.stats.slice(0, 3).map((stat) => (
                <StatBar
                  key={stat.label}
                  label={stat.label}
                  value={Math.round(stat.value)}
                  pct={stat.value / 100}
                />
              ))}
            </div>

            {/* Footer: ISSUED TO + URL tag */}
            <div className={styles.bookplateFooter}>
              <div className={styles.issuedTo}>
                <span className={styles.issuedLabel}>Issued to</span>
                <span className={styles.visitorName}>{visitorName}</span>
              </div>
              <Link href="/" className={styles.urlTag} aria-label="BoothPilot home">
                boothpilot.dev
              </Link>
            </div>

          </div>
        </div>

        {/* ── Side panel: reward + share actions ── */}
        <div className={styles.side}>

          <div>
            <h2 className={styles.sideHeading}>
              That's a wrap,<br />{firstName}.
            </h2>
            <p className={styles.sideSub}>{badge.tagline}</p>
            <p className={styles.sideBody}>
              Your bookplate is ready to share. Flash the code at the booth for the founder rate.
            </p>
          </div>

          {/* Reward box: discount code + % off badge */}
          <Panel padding="1.5rem" radius="0.875rem">
            <span className={styles.rewardLabel}>Your reward</span>
            <div className={styles.rewardRow}>
              <span className={styles.discountCode}>{badge.discountCode}</span>
              <span className={styles.offBadge}>40% off pro</span>
            </div>
          </Panel>

          {/* Share CTAs */}
          <div className={styles.shareActions}>
            <a
              href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`}
              target="_blank"
              rel="noopener noreferrer"
              className={styles.shareLink}
            >
              Share on LinkedIn
            </a>
            <a
              href={`https://twitter.com/intent/tweet?text=${shareText}&url=${encodedUrl}`}
              target="_blank"
              rel="noopener noreferrer"
              className={styles.shareLink}
            >
              Share on X
            </a>
          </div>

          <p className={styles.softCta}>
            See what the booth says about your teammates.
          </p>
          <p className={styles.poweredBy}>
            Powered by OpenAI · Convex · Fiber.ai · Vapi
          </p>

        </div>
      </div>
    </main>
  );
}

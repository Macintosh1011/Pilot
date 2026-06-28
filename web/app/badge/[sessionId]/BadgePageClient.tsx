"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { CSSProperties, ReactNode } from "react";
import { useQuery } from "convex/react";
import Link from "next/link";
import { api } from "@/lib/convexApi";
import type { Badge, Id, Session } from "@/lib/types";
import Wordmark from "@/components/Wordmark";
import PaperBackground from "@/components/PaperBackground";
import QRCodeView from "@/components/QRCodeView";
import styles from "./badge.module.css";

/**
 * Public, shareable bookplate badge. Subscribes reactively to `sessions:get`
 * so the page lights up the moment the booth agent finalizes the badge.
 * Aesthetic ported from ios/BoothPilot/Screens/BadgeScreen.swift — cream stock,
 * ink + clay, a 13-ray spark, revealed in sequence.
 */

const RAY_COUNT = 13;

// A 13-ray starburst, evoking the booth's Spark mark without depending on the
// (separately-owned) animated Spark component.
function SparkMark({ className }: { className?: string }) {
  const rays = useMemo(
    () =>
      Array.from({ length: RAY_COUNT }, (_, i) => {
        const angle = (i / RAY_COUNT) * Math.PI * 2 - Math.PI / 2;
        const inner = 15;
        const outer = i % 2 === 0 ? 46 : 33;
        return {
          x1: 50 + Math.cos(angle) * inner,
          y1: 50 + Math.sin(angle) * inner,
          x2: 50 + Math.cos(angle) * outer,
          y2: 50 + Math.sin(angle) * outer,
        };
      }),
    [],
  );

  return (
    <svg className={className} viewBox="0 0 100 100" role="img" aria-label="BoothPilot spark">
      <g stroke="var(--clay)" strokeWidth={2.4} strokeLinecap="round">
        {rays.map((r, i) => (
          <line key={i} x1={r.x1} y1={r.y1} x2={r.x2} y2={r.y2} />
        ))}
      </g>
      <circle cx={50} cy={50} r={9} fill="var(--ink)" />
      <circle cx={50} cy={50} r={3.4} fill="var(--clay)" />
    </svg>
  );
}

function StateShell({ children }: { children: ReactNode }) {
  return (
    <main className={styles.page}>
      <PaperBackground />
      {children}
    </main>
  );
}

function firstNameOf(name: string | undefined): string {
  if (!name) return "friend";
  const trimmed = name.trim();
  if (!trimmed) return "friend";
  return trimmed.split(/\s+/)[0];
}

export default function BadgePageClient({ sessionId }: { sessionId: string }) {
  const session = useQuery(api.sessions.get, {
    sessionId: sessionId as Id<"sessions">,
  }) as Session | null | undefined;

  const [shareUrl, setShareUrl] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const base =
      process.env.NEXT_PUBLIC_BADGE_BASE_URL?.replace(/\/$/, "") ??
      (typeof window !== "undefined" ? window.location.origin : "");
    setShareUrl(base ? `${base}/badge/${sessionId}` : "");
  }, [sessionId]);

  const badge: Badge | undefined = session?.badge;

  const handleShare = useCallback(async () => {
    if (!shareUrl) return;
    const title = badge ? `${badge.archetype} · BoothPilot` : "BoothPilot Badge";
    const text = badge?.tagline ?? "My BoothPilot bookplate.";

    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({ title, text, url: shareUrl });
        return;
      } catch {
        // user dismissed / unsupported — fall through to clipboard
      }
    }

    if (typeof navigator !== "undefined" && navigator.clipboard) {
      try {
        await navigator.clipboard.writeText(shareUrl);
        setCopied(true);
        window.setTimeout(() => setCopied(false), 2000);
      } catch {
        // clipboard blocked — no-op, the URL is in the address bar
      }
    }
  }, [shareUrl, badge]);

  // ---- Loading ----------------------------------------------------------
  if (session === undefined) {
    return (
      <StateShell>
        <section className={`${styles.stateCard} ${styles.minting}`}>
          <SparkMark className={styles.spark} />
          <p className={styles.stateEyebrow}>Booth Badge</p>
          <h1 className={styles.stateTitle}>Pulling your collectible…</h1>
        </section>
      </StateShell>
    );
  }

  // ---- Not found --------------------------------------------------------
  if (session === null) {
    return (
      <StateShell>
        <section className={styles.stateCard}>
          <p className={styles.stateEyebrow}>Badge not found</p>
          <h1 className={styles.stateTitle}>This bookplate isn’t available.</h1>
          <p className={styles.stateBody}>
            The link may be mistyped, or the session has expired.
          </p>
          <Link className={styles.stateLink} href="/">
            Back to BoothPilot
          </Link>
        </section>
      </StateShell>
    );
  }

  // ---- Minting (session exists, badge not yet generated) ----------------
  if (!badge) {
    return (
      <StateShell>
        <section className={`${styles.stateCard} ${styles.minting}`}>
          <SparkMark className={styles.spark} />
          <p className={styles.stateEyebrow}>Badge forge</p>
          <h1 className={styles.stateTitle}>
            Minting {firstNameOf(session.visitorName)}’s bookplate…
          </h1>
          <p className={styles.stateBody}>
            The agent is finishing your archetype, compliment, and founder rate.
            This page updates the moment it’s ready.
          </p>
        </section>
      </StateShell>
    );
  }

  // ---- Finished badge ---------------------------------------------------
  const visitorName = session.visitorName ?? "Booth visitor";
  const firstName = firstNameOf(session.visitorName);
  const stats = badge.stats.slice(0, 3);

  return (
    <main className={styles.page}>
      <PaperBackground />
      <div className={styles.layout}>
        {/* Bookplate */}
        <section className={styles.bookplate} aria-label={`${badge.archetype} badge`}>
          <div className={styles.bookplateInner}>
            <header className={`${styles.plateHeader} ${styles.reveal} ${styles.d0}`}>
              <Wordmark size={12} tracking={3} />
              <span className={styles.plateNo}>NO. 047</span>
            </header>

            <div className={`${styles.plateCenter} ${styles.reveal} ${styles.d1}`}>
              <SparkMark className={styles.spark} />
              <p className={styles.eyebrow}>Your archetype</p>
              <h1 className={styles.archetype}>{badge.archetype}</h1>
              <p className={styles.compliment}>“{badge.compliment}”</p>
            </div>

            <div className={`${styles.stats} ${styles.reveal} ${styles.d3}`}>
              {stats.map((stat) => {
                const pct = Math.max(0, Math.min(100, stat.value));
                return (
                  <div className={styles.stat} key={stat.label}>
                    <div className={styles.statTop}>
                      <span className={styles.statLabel}>{stat.label}</span>
                      <span className={styles.statValue}>{Math.round(stat.value)}</span>
                    </div>
                    <div className={styles.meterTrack}>
                      <div
                        className={styles.meterFill}
                        style={{ "--pct": `${pct}%` } as CSSProperties}
                      />
                    </div>
                  </div>
                );
              })}
            </div>

            <footer className={`${styles.plateFooter} ${styles.reveal} ${styles.d4}`}>
              <div>
                <p className={styles.issuedLabel}>Issued to</p>
                <p className={styles.issuedName}>{visitorName}</p>
              </div>
              <div className={styles.qr}>
                {shareUrl ? <QRCodeView value={shareUrl} size={62} /> : <div style={{ width: 62, height: 62 }} />}
              </div>
            </footer>
          </div>
        </section>

        {/* Side panel */}
        <aside className={styles.sidePanel}>
          <div className={`${styles.reveal} ${styles.d1}`}>
            <h2 className={styles.wrapTitle}>{`That’s a wrap,\n${firstName}.`}</h2>
          </div>
          <p className={`${styles.wrapBody} ${styles.reveal} ${styles.d2}`}>
            {session.company
              ? `${session.company} was built for operators like you. Flash the code at our booth for the founder rate.`
              : "Your bookplate is ready to share. Flash the code at our booth for the founder rate."}
          </p>

          <div className={`${styles.reward} ${styles.reveal} ${styles.d3}`}>
            <p className={styles.rewardLabel}>Your reward</p>
            <div className={styles.rewardRow}>
              <span className={styles.rewardCode}>{badge.discountCode}</span>
              <span className={styles.rewardPill}>40% OFF PRO</span>
            </div>
          </div>

          <div className={`${styles.actions} ${styles.reveal} ${styles.d4}`}>
            <button type="button" className={styles.shareBtn} onClick={handleShare}>
              {copied ? "LINK COPIED" : "SHARE BADGE"}
            </button>
            <a
              className={styles.ghostBtn}
              href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Share on LinkedIn"
            >
              IN
            </a>
          </div>

          <p className={`${styles.poweredBy} ${styles.reveal} ${styles.d5}`}>
            Powered by OpenAI · Convex · Fiber.ai · ElevenLabs
          </p>
        </aside>
      </div>
    </main>
  );
}

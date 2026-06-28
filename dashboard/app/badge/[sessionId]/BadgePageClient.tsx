"use client";

import { api } from "@cvx/_generated/api";
import { useQuery } from "convex/react";
import Link from "next/link";
import type { Id, Session } from "../../types";

function shareUrl(sessionId: string) {
  if (typeof window === "undefined") {
    return "";
  }

  return `${window.location.origin}/badge/${sessionId}`;
}

export default function BadgePageClient({ sessionId }: { sessionId: Id<"sessions"> }) {
  const session = useQuery(api.sessions.get, { sessionId }) as Session | null | undefined;
  const url = shareUrl(sessionId);
  const badge = session?.badge;

  if (session === undefined) {
    return (
      <main className="badge-page-shell">
        <div className="badge-card shimmer">
          <p className="eyebrow">Minting Booth Badge</p>
          <h1>Loading your collectible...</h1>
        </div>
      </main>
    );
  }

  if (session === null) {
    return (
      <main className="badge-page-shell">
        <div className="badge-card">
          <p className="eyebrow">Badge not found</p>
          <h1>This Booth Badge is not available.</h1>
          <Link href="/">Back to BoothPilot</Link>
        </div>
      </main>
    );
  }

  if (!badge) {
    return (
      <main className="badge-page-shell">
        <div className="badge-card shimmer">
          <p className="eyebrow">Badge forge</p>
          <h1>Your badge is being minted...</h1>
          <p>The agent is finishing your score, compliment, and discount code.</p>
        </div>
      </main>
    );
  }

  const shareText = encodeURIComponent(`${badge.archetype}: ${badge.tagline}`);
  const encodedUrl = encodeURIComponent(url);

  return (
    <main className="badge-page-shell">
      <section className="badge-card collectible">
        <p className="eyebrow">BoothPilot collectible</p>
        <h1>{badge.archetype}</h1>
        <p className="tagline">{badge.tagline}</p>

        <blockquote>“{badge.compliment}”</blockquote>

        <div className="badge-owner">
          <span>{session.visitorName ?? "Booth visitor"}</span>
          <strong>{session.company ?? "Company unknown"}</strong>
        </div>

        <div className="stat-bars">
          {badge.stats.map((stat) => (
            <div key={stat.label} className="stat-bar">
              <div>
                <span>{stat.label}</span>
                <strong>{Math.round(stat.value)}</strong>
              </div>
              <div className="meter-track">
                <div className="meter-fill" style={{ width: `${Math.max(0, Math.min(100, stat.value))}%` }} />
              </div>
            </div>
          ))}
        </div>

        <div className="discount-pill">
          <span>{badge.discountCode}</span>
          <strong>25% off</strong>
        </div>

        <div className="share-actions">
          <a href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`} target="_blank">
            Share on LinkedIn
          </a>
          <a href={`https://twitter.com/intent/tweet?text=${shareText}&url=${encodedUrl}`} target="_blank">
            Share on X
          </a>
        </div>
        <p className="soft-cta">See what the booth says about your teammates.</p>
      </section>
    </main>
  );
}

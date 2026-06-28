"use client";

import { useEffect, useState } from "react";
import QRCode from "qrcode";
import type { Session } from "../types";
import { PaperBackground } from "../components/PaperBackground";
import { Wordmark } from "../components/Wordmark";
import { Spark } from "../components/Spark";
import { StatBar } from "../components/StatBar";
import { Panel } from "../components/Panel";
import badge from "../badge/[sessionId]/badge.module.css";
import styles from "./BoothFinale.module.css";

// Same stable 3-digit display number the public badge page uses.
function badgeNumber(id: string): string {
  const n = id.split("").reduce((acc, c) => (acc * 31 + c.charCodeAt(0)) & 0xffff, 0);
  return String((n % 900) + 100).padStart(3, "0");
}

// Small, frameless ink-on-transparent QR that tucks into the bookplate footer.
function MiniQR({ url }: { url: string }) {
  const [dataUrl, setDataUrl] = useState<string | null>(null);
  useEffect(() => {
    QRCode.toDataURL(url, {
      width: 168,
      margin: 0,
      color: { dark: "#141413", light: "#ffffff00" },
      errorCorrectionLevel: "M",
    })
      .then(setDataUrl)
      .catch(() => {});
  }, [url]);
  if (!dataUrl) return <div className={styles.footQr} aria-hidden />;
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={dataUrl} alt="Scan to open your badge" className={styles.footQrImg} />;
}

export function BoothFinale({
  session,
  sessionId,
  badgeUrl,
  onRestart,
}: {
  session: Session;
  sessionId: string;
  badgeUrl: string;
  onRestart: () => void;
}) {
  const b = session.badge;
  const visitorName = session.visitorName ?? "Booth visitor";
  const firstName = visitorName.split(" ")[0] || visitorName;
  const num = badgeNumber(sessionId);

  const handleShare = () => {
    if (typeof navigator !== "undefined" && navigator.share) {
      navigator
        .share({ title: "My BoothPilot badge", url: badgeUrl })
        .catch(() => {});
    } else if (typeof window !== "undefined") {
      window.open(badgeUrl, "_blank", "noopener");
    }
  };

  return (
    <main className="badge-page-shell">
      <PaperBackground />
      <div className={badge.layout}>
        {/* ── Bookplate ── */}
        <div className={badge.bookplate}>
          <div className={badge.inner}>
            <div className={badge.bookplateHeader}>
              <Wordmark size={11} />
              <span className={badge.badgeNumber}>NO. {num}</span>
            </div>

            <div className={badge.hero}>
              {session.visitorPhotoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={session.visitorPhotoUrl} alt={visitorName} className={badge.heroPhoto} />
              ) : (
                <Spark size={80} className={badge.spark} />
              )}
              <p className={`eyebrow ${badge.archetypeEyebrow}`}>Your archetype</p>
              <h1 className={badge.archetype}>{b?.archetype ?? "The Booth Visitor"}</h1>
              {b?.compliment && <p className={badge.compliment}>{b.compliment}</p>}
            </div>

            {b && (
              <div className={badge.statList}>
                {b.stats.slice(0, 3).map((stat) => (
                  <StatBar
                    key={stat.label}
                    label={stat.label}
                    value={Math.round(stat.value)}
                    pct={stat.value / 100}
                  />
                ))}
              </div>
            )}

            <div className={badge.bookplateFooter}>
              <div className={badge.issuedTo}>
                <span className={badge.issuedLabel}>Issued to</span>
                <span className={badge.visitorName}>{visitorName}</span>
              </div>
              <MiniQR url={badgeUrl} />
            </div>
          </div>
        </div>

        {/* ── Side: wrap + reward + actions ── */}
        <div className={badge.side}>
          <div>
            <h2 className={badge.sideHeading}>
              That&apos;s a wrap,
              <br />
              {firstName}.
            </h2>
            <p className={badge.sideBody}>
              Your bookplate is ready to share. Flash the code at our booth for the founder rate.
            </p>
          </div>

          {b && (
            <Panel padding="1.5rem" radius="0.875rem">
              <span className={badge.rewardLabel}>Your reward</span>
              <div className={badge.rewardRow}>
                <span className={badge.discountCode}>{b.discountCode}</span>
                <span className={badge.offBadge}>40% off pro</span>
              </div>
            </Panel>
          )}

          <div className={styles.actions}>
            <button type="button" className={styles.shareBtn} onClick={handleShare}>
              Share badge
            </button>
            <button
              type="button"
              className={styles.restartCircle}
              onClick={onRestart}
              aria-label="Next visitor"
              title="Next visitor"
            >
              ↻
            </button>
          </div>

          <p className={badge.poweredBy}>Powered by OpenAI · Convex · Fiber.ai · ElevenLabs</p>
        </div>
      </div>
    </main>
  );
}

"use client";

import { useEffect, useState, type CSSProperties } from "react";

import { Mono, PoweredBy } from "@/components/BoothUI";
import QRCodeView from "@/components/QRCodeView";
import Spark from "@/components/Spark";
import TypeText from "@/components/Typewriter";
import Wordmark from "@/components/Wordmark";
import { useDirector } from "@/lib/director";
import type { Badge } from "@/lib/types";

/*
 * 5 · BADGE (finale) — an editorial collectible like a letterpress bookplate.
 * Cream stock, ink + clay, the spark. Reveals in sequence. Ported from
 * ios/BoothPilot/Screens/BadgeScreen.swift; live data comes from the Director
 * (session.badge / visitorName), with the same scripted fallbacks as iOS.
 */

type Stat = { label: string; value: string; pct: number };

const DEFAULT_STATS: Stat[] = [
  { label: "GROWTH IQ", value: "94", pct: 0.94 },
  { label: "VISION", value: "91", pct: 0.91 },
  { label: "VELOCITY", value: "88", pct: 0.88 },
];

function statsFor(badge: Badge | undefined): Stat[] {
  if (badge?.stats && badge.stats.length > 0) {
    return badge.stats.slice(0, 3).map((s) => ({
      label: s.label,
      value: `${Math.round(s.value)}`,
      pct: s.value / 100,
    }));
  }
  return DEFAULT_STATS;
}

const serif = "var(--font-serif)";

export default function BadgeScreen() {
  const { badge, visitorName, badgeURL, restart } = useDirector();

  const name = visitorName ?? "Alex Rivera";
  const firstName = name.split(" ")[0] || name;
  const archetype = badge?.archetype ?? "The Churn Slayer";
  const compliment =
    badge?.compliment ??
    "You spot the leak before the ship even lists — Acme was built for operators like you.";
  const discountCode = badge?.discountCode ?? "ACME-CHURN40";
  const stats = statsFor(badge);

  // The stat bars grow in after the typed reveal settles (≈1.9s), matching the
  // SwiftUI `.onAppear { withAnimation(.delay(1.9)) { grow = true } }`. Under
  // reduced motion we show them filled immediately with no sweep.
  const [grow, setGrow] = useState(false);
  const [animate, setAnimate] = useState(true);
  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) {
      setAnimate(false);
      setGrow(true);
      return;
    }
    setAnimate(true);
    setGrow(false);
    const t = setTimeout(() => setGrow(true), 1900);
    return () => clearTimeout(t);
  }, []);

  const onShare = () => {
    void (async () => {
      try {
        if (typeof navigator !== "undefined" && navigator.share) {
          await navigator.share({ title: "My BoothPilot bookplate", url: badgeURL });
          return;
        }
      } catch {
        // user cancelled or share unavailable — fall through to clipboard
      }
      try {
        await navigator.clipboard?.writeText(badgeURL);
      } catch {
        // clipboard blocked; nothing else to do
      }
    })();
  };

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 58,
        padding: 56,
      }}
    >
      {/* Bookplate card */}
      <div
        style={{
          flex: "0 0 auto",
          width: 476,
          height: 686,
          borderRadius: 10,
          background: "var(--paper)",
          border: "1px solid rgba(20, 20, 19, 0.5)",
          boxShadow: "0 40px 45px rgba(20, 20, 19, 0.4)",
          padding: 14,
        }}
      >
        <div
          style={{
            height: "100%",
            borderRadius: 5,
            border: "1px solid rgba(20, 20, 19, 0.28)",
            padding: "30px 32px",
            display: "flex",
            flexDirection: "column",
          }}
        >
          {/* top row */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <Wordmark size={12} tracking={3} />
            <Mono size={11} weight={500} tracking={2} color="var(--muted)">
              NO. 047
            </Mono>
          </div>

          {/* middle */}
          <div
            style={{
              flex: 1,
              minHeight: 0,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <div style={{ marginBottom: 18 }}>
              <Spark mode="speaking" size={128} />
            </div>
            <Mono size={12} weight={600} tracking={4} color="var(--clay)" style={{ marginBottom: 14 }}>
              YOUR ARCHETYPE
            </Mono>
            <div style={{ textAlign: "center", fontWeight: 500, letterSpacing: -1, lineHeight: 1.05 }}>
              <TypeText key={archetype} text={archetype} size={50} speed={72} />
            </div>
            <div
              style={{
                maxWidth: 330,
                marginTop: 18,
                textAlign: "center",
                fontStyle: "italic",
                lineHeight: 1.33,
              }}
            >
              <TypeText
                key={compliment}
                text={compliment}
                size={21}
                color="var(--muted)"
                speed={24}
                startDelay={1500}
              />
            </div>
          </div>

          {/* stat bars */}
          <div style={{ display: "flex", flexDirection: "column", gap: 14, paddingBottom: 22 }}>
            {stats.map((s) => (
              <StatBar key={s.label} stat={s} grow={grow} animate={animate} />
            ))}
          </div>

          {/* issued-to + QR */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              paddingTop: 18,
              borderTop: "1px solid rgba(20, 20, 19, 0.18)",
            }}
          >
            <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
              <Mono size={10} weight={500} tracking={2} color="var(--muted)">
                ISSUED TO
              </Mono>
              <span style={{ fontFamily: serif, fontSize: 20, fontWeight: 500, color: "var(--ink)" }}>
                {name}
              </span>
            </div>
            <QRCodeView value={badgeURL} size={62} />
          </div>
        </div>
      </div>

      {/* Side panel */}
      <div style={{ flex: "0 0 380px", width: 380, display: "flex", flexDirection: "column", gap: 26 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <h1
            style={{
              fontFamily: serif,
              fontSize: 44,
              fontWeight: 500,
              letterSpacing: -1,
              lineHeight: 1.05,
              color: "var(--ink)",
              whiteSpace: "pre-line",
            }}
          >
            {`That’s a wrap,\n${firstName}.`}
          </h1>
          <p style={{ fontFamily: serif, fontSize: 21, lineHeight: 1.32, color: "var(--muted)" }}>
            Your bookplate is ready to share. Flash the code at our booth for the founder rate.
          </p>
        </div>

        {/* reward */}
        <div
          style={{
            padding: "22px 24px",
            borderRadius: 14,
            background: "var(--panel)",
            border: "1px solid rgba(20, 20, 19, 0.1)",
            display: "flex",
            flexDirection: "column",
            gap: 12,
          }}
        >
          <Mono size={11} weight={500} tracking={2} color="var(--muted)">
            YOUR REWARD
          </Mono>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <Mono size={23} weight={600} tracking={1} color="var(--ink)">
              {discountCode}
            </Mono>
            <span
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: 12,
                fontWeight: 500,
                letterSpacing: 1,
                color: "var(--paper)",
                background: "var(--clay)",
                borderRadius: 999,
                padding: "7px 13px",
                whiteSpace: "nowrap",
              }}
            >
              40% OFF PRO
            </span>
          </div>
        </div>

        {/* actions */}
        <div style={{ display: "flex", gap: 14 }}>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onShare();
            }}
            style={{
              ...buttonReset,
              flex: 1,
              padding: "19px 0",
              borderRadius: 999,
              background: "var(--ink)",
              color: "var(--paper)",
              fontFamily: "var(--font-mono)",
              fontSize: 15,
              fontWeight: 500,
              letterSpacing: 1,
            }}
          >
            SHARE BADGE
          </button>
          <button
            type="button"
            aria-label="Start over"
            onClick={(e) => {
              e.stopPropagation();
              restart();
            }}
            style={{
              ...buttonReset,
              width: 62,
              padding: "16px 0",
              borderRadius: 999,
              border: "1px solid rgba(20, 20, 19, 0.25)",
              color: "var(--ink)",
              fontSize: 22,
              lineHeight: 1,
            }}
          >
            ↻
          </button>
        </div>

        <PoweredBy
          size={11}
          tracking={2.5}
          opacity={0.65}
          style={{ alignSelf: "center", textAlign: "center" }}
        />
      </div>
    </div>
  );
}

function StatBar({ stat, grow, animate }: { stat: Stat; grow: boolean; animate: boolean }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between" }}>
        <Mono size={12} weight={500} tracking={1.5} color="var(--muted)">
          {stat.label}
        </Mono>
        <span style={{ fontFamily: serif, fontSize: 20, fontWeight: 500, color: "var(--ink)" }}>
          {stat.value}
        </span>
      </div>
      <div
        style={{
          position: "relative",
          height: 3,
          background: "rgba(20, 20, 19, 0.12)",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            position: "absolute",
            inset: 0,
            transformOrigin: "left center",
            transform: `scaleX(${grow ? stat.pct : 0})`,
            background: "var(--clay)",
            transition: animate ? "transform 0.9s ease-out" : "none",
          }}
        />
      </div>
    </div>
  );
}

const buttonReset: CSSProperties = {
  appearance: "none",
  border: "none",
  background: "none",
  cursor: "pointer",
  font: "inherit",
};

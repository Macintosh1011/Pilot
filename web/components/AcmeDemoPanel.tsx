"use client";

import { useId, type CSSProperties } from "react";
import { colors } from "@/lib/theme";

/*
 * AcmeDemoPanel — the live "Acme Analytics" demo, reskinned in cream/ink/clay.
 * A faithful web port of ios/BoothPilot/Demo/AcmeDemoPanel.swift. Everything is
 * a pure function of `stage` (0…3) so the panel changes calmly as the
 * conversation advances; `highlight` adds a subtle emphasis ring to a section.
 *
 * Stage map (mirrors Demo.visibleCount + the Swift booleans):
 *   0 — empty placeholder, MRR at risk $0, churn normal, alerts off
 *   1 — churn card gets a clay tint, 2 accounts shown
 *   2 — ChurnChart reveals the projected clay branch, 4 accounts, $22.6k at risk
 *   3 — churn shows "forecast ↓" in clay, smart-alerts toggle ON
 */

type AcmeDemoPanelProps = {
  /** 0…3 — how much of the demo is revealed (see Demo.stage(forView:)). */
  stage: number;
  /** Optional element id to emphasize, e.g. "at-risk-accounts". */
  highlight?: string;
};

type Account = {
  name: string;
  initials: string;
  mrr: string;
  signal: string;
  risk: number;
};

// Ported one-for-one from Demo.accounts in ios/BoothPilot/Demo/DemoData.swift.
// The four risks/MRRs sum to the $22.6k "MRR at risk" figure at stage ≥ 2.
const ACCOUNTS: Account[] = [
  { name: "Northwind Trading", initials: "NT", mrr: "$4.2k", signal: "Usage down 64% MoM", risk: 92 },
  { name: "Globex Corp", initials: "GX", mrr: "$8.9k", signal: "No admin login in 12 days", risk: 87 },
  { name: "Initech", initials: "IN", mrr: "$3.1k", signal: "Support tickets spiking", risk: 81 },
  { name: "Soylent Inc", initials: "SY", mrr: "$6.4k", signal: "Seats down 40% this quarter", risk: 76 },
];

/** rust ≥ 88, clay ≥ 80, else tan — matches Demo.riskColor. */
function riskColor(r: number): string {
  return r >= 88 ? "var(--rust)" : r >= 80 ? "var(--clay)" : "var(--tan)";
}

/** Demo.visibleCount: 0 → none, 1 → 2 accounts, ≥2 → 4 accounts. */
function visibleCount(stage: number): number {
  return stage <= 0 ? 0 : stage === 1 ? 2 : 4;
}

/** rgba() from a canonical hex token, for the many ink/clay/rust opacities. */
function withAlpha(hex: string, alpha: number): string {
  const h = hex.replace("#", "");
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

const serif = "var(--font-serif)";
const mono = "var(--font-mono)";

export default function AcmeDemoPanel({ stage, highlight }: AcmeDemoPanelProps) {
  const churnHi = stage >= 1;
  const chartActive = stage >= 2;
  const alertsOn = stage >= 3;
  const count = visibleCount(stage);
  const accountsHighlighted = highlight === "at-risk-accounts";

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        width: "100%",
        height: "100%",
        borderRadius: 22,
        background: "var(--card)",
        border: `1px solid ${withAlpha(colors.ink, 0.1)}`,
        boxShadow: `0 24px 30px ${withAlpha(colors.ink, 0.22)}`,
        overflow: "hidden",
        fontFamily: serif,
      }}
    >
      <style>{KEYFRAMES}</style>

      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "18px 24px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div
            style={{
              width: 28,
              height: 28,
              borderRadius: 8,
              background: "var(--clay)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <div
              style={{
                width: 13,
                height: 13,
                borderRadius: 4,
                border: `1.6px solid var(--paper)`,
              }}
            />
          </div>
          <span
            style={{
              fontFamily: serif,
              fontSize: 20,
              fontWeight: 600,
              letterSpacing: -0.3,
              color: "var(--ink)",
            }}
          >
            Acme Analytics
          </span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
          <span style={mono11(2, "var(--muted)")}>RETENTION</span>
          <span
            style={{
              width: 7,
              height: 7,
              borderRadius: "50%",
              background: "var(--clay)",
            }}
          />
        </div>
      </div>

      <div style={{ height: 1, background: withAlpha(colors.ink, 0.08) }} />

      {/* Body */}
      <div
        style={{
          flex: 1,
          minHeight: 0,
          display: "flex",
          flexDirection: "column",
          alignItems: "stretch",
          padding: "26px 28px",
        }}
      >
        <div style={{ ...mono11(2, "var(--muted)"), marginBottom: 6 }}>
          CUSTOMER HEALTH
        </div>
        <div
          style={{
            fontFamily: serif,
            fontSize: 30,
            fontWeight: 500,
            letterSpacing: -0.6,
            color: "var(--ink)",
            marginBottom: 22,
          }}
        >
          At-Risk Accounts
        </div>

        {/* Stat row: NET MRR · CHURN RATE · MRR AT RISK */}
        <div style={{ display: "flex", gap: 16, marginBottom: 22 }}>
          <StatCard label="NET MRR" value="$148.2k" valueColor="var(--ink)" />
          <ChurnCard churnHi={churnHi} stage={stage} />
          <StatCard
            label="MRR AT RISK"
            value={count === 0 ? "$0" : "$22.6k"}
            valueColor={count === 0 ? "var(--ink)" : "var(--rust)"}
            animateValue
          />
        </div>

        {/* Churn signal chart */}
        <div
          style={{
            marginBottom: 22,
            padding: "18px 20px 12px",
            borderRadius: 15,
            background: "var(--panel2)",
            border: `1px solid ${withAlpha(colors.ink, 0.06)}`,
            transition: "background 0.5s ease-in-out, border-color 0.5s ease-in-out",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: 8,
            }}
          >
            <span style={mono11(1.5, "var(--muted)")}>CHURN SIGNAL · 8 WEEKS</span>
            {chartActive && (
              <span
                style={{
                  ...mono11(1, "var(--clay)"),
                  animation: "acmeFadeIn 0.5s ease both",
                }}
              >
                PROJECTED WITH ALERTS ↓
              </span>
            )}
          </div>
          <ChurnChart active={chartActive} />
        </div>

        {/* Smart alerts row */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 12,
          }}
        >
          <span style={mono11(1.5, "var(--muted)")}>FLAGGED THIS WEEK</span>
          <div style={{ display: "flex", alignItems: "center", gap: 11 }}>
            <span
              style={{
                ...mono11(1, alertsOn ? "var(--clay)" : withAlpha(colors.muted, 0.7)),
                transition: "color 0.35s ease-in-out",
              }}
            >
              SMART CHURN ALERTS
            </span>
            <AlertsToggle on={alertsOn} />
          </div>
        </div>

        {/* Accounts list (or empty placeholder) */}
        <div
          style={{
            margin: accountsHighlighted ? -12 : 0,
            padding: accountsHighlighted ? 12 : 0,
            borderRadius: 16,
            background: accountsHighlighted ? withAlpha(colors.clay, 0.07) : "transparent",
            boxShadow: accountsHighlighted
              ? `0 0 0 1.5px ${withAlpha(colors.clay, 0.5)}`
              : "0 0 0 0 transparent",
            transition: "background 0.4s ease-in-out, box-shadow 0.4s ease-in-out",
          }}
        >
          {count === 0 ? (
            <div
              style={{
                ...mono12(1.5, withAlpha(colors.muted, 0.7)),
                textAlign: "center",
                padding: 28,
                borderRadius: 13,
                border: `1px dashed ${withAlpha(colors.ink, 0.14)}`,
              }}
            >
              LISTENING FOR YOUR USE CASE…
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {ACCOUNTS.slice(0, count).map((account, i) => (
                <AccountRow key={account.name} account={account} index={i} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  valueColor,
  animateValue = false,
}: {
  label: string;
  value: string;
  valueColor: string;
  animateValue?: boolean;
}) {
  return (
    <div style={panelCard}>
      <div style={mono11(1.5, "var(--muted)")}>{label}</div>
      <div
        // Re-key on the value so the figure gently eases in when it changes
        // (e.g. $0 → $22.6k as stage advances).
        key={animateValue ? value : undefined}
        style={{
          fontFamily: serif,
          fontSize: 30,
          fontWeight: 500,
          letterSpacing: -0.5,
          color: valueColor,
          transition: "color 0.4s ease-in-out",
          animation: animateValue ? "acmeRiseIn 0.45s ease both" : undefined,
        }}
      >
        {value}
      </div>
    </div>
  );
}

function ChurnCard({ churnHi, stage }: { churnHi: boolean; stage: number }) {
  return (
    <div
      style={{
        ...panelCard,
        background: churnHi ? withAlpha(colors.clay, 0.12) : "var(--panel)",
        border: `1px solid ${churnHi ? withAlpha(colors.clay, 0.5) : withAlpha(colors.ink, 0.06)}`,
        transition: "background 0.4s ease-in-out, border-color 0.4s ease-in-out",
      }}
    >
      <div style={mono11(1.5, "var(--muted)")}>CHURN RATE</div>
      <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
        <span
          style={{
            fontFamily: serif,
            fontSize: 30,
            fontWeight: 500,
            letterSpacing: -0.5,
            color: churnHi ? "var(--rust)" : "var(--ink)",
            transition: "color 0.4s ease-in-out",
          }}
        >
          5.8%
        </span>
        <span
          style={{
            fontFamily: mono,
            fontSize: 12,
            color: stage >= 3 ? "var(--clay)" : "var(--rust)",
            transition: "color 0.4s ease-in-out",
          }}
        >
          {stage >= 3 ? "forecast ↓" : "↑ 1.4pt"}
        </span>
      </div>
    </div>
  );
}

function AlertsToggle({ on }: { on: boolean }) {
  return (
    <div
      style={{
        position: "relative",
        width: 50,
        height: 28,
        borderRadius: 14,
        background: on ? "var(--ink)" : withAlpha(colors.ink, 0.16),
        transition: "background 0.35s ease-in-out",
        flex: "0 0 auto",
      }}
    >
      <div
        style={{
          position: "absolute",
          top: 3,
          left: on ? 25 : 3,
          width: 22,
          height: 22,
          borderRadius: "50%",
          background: "var(--paper)",
          transition: "left 0.35s ease-in-out",
        }}
      />
    </div>
  );
}

function AccountRow({ account, index }: { account: Account; index: number }) {
  const rc = riskColor(account.risk);
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 16,
        padding: "14px 18px",
        borderRadius: 13,
        background: "var(--panel2)",
        border: `1px solid ${withAlpha(colors.ink, 0.07)}`,
        animation: `acmeRowIn 0.4s ease both`,
        animationDelay: `${index * 0.06}s`,
      }}
    >
      <div
        style={{
          flex: "0 0 auto",
          width: 38,
          height: 38,
          borderRadius: 10,
          background: "var(--chip)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: mono,
          fontSize: 13,
          fontWeight: 600,
          color: "var(--ink)",
        }}
      >
        {account.initials}
      </div>

      <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 1 }}>
        <div
          style={{
            fontFamily: serif,
            fontSize: 19,
            fontWeight: 500,
            color: "var(--ink)",
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          {account.name}
        </div>
        <div
          style={{
            fontFamily: mono,
            fontSize: 11,
            letterSpacing: 0.5,
            color: "var(--muted)",
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          {account.signal}
        </div>
      </div>

      <div
        style={{
          flex: "0 0 auto",
          width: 60,
          textAlign: "right",
          fontFamily: serif,
          fontSize: 18,
          fontWeight: 500,
          color: "var(--ink)",
        }}
      >
        {account.mrr}
      </div>

      <div style={{ flex: "0 0 auto", width: 120, display: "flex", flexDirection: "column", gap: 5 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <span style={{ fontFamily: mono, fontSize: 10, letterSpacing: 1, color: "var(--muted)" }}>
            RISK
          </span>
          <span style={{ fontFamily: mono, fontSize: 12, fontWeight: 600, color: rc }}>
            {account.risk}%
          </span>
        </div>
        <div
          style={{
            position: "relative",
            height: 6,
            borderRadius: 3,
            background: withAlpha(colors.ink, 0.08),
            overflow: "hidden",
          }}
        >
          <div
            style={{
              position: "absolute",
              left: 0,
              top: 0,
              bottom: 0,
              width: `${account.risk}%`,
              borderRadius: 3,
              background: rc,
              transition: "width 0.5s ease-in-out",
            }}
          />
        </div>
      </div>
    </div>
  );
}

/**
 * ChurnChart — the 8-week churn signal area chart. Main rust line + gradient
 * fill, plus an optional dashed clay "projected with alerts" branch from week 5
 * (with a clay dot endpoint) once `active`. Authored in a 760×150 coordinate
 * space and stretched to fill the block, exactly like the SwiftUI Canvas map().
 */
function ChurnChart({ active }: { active: boolean }) {
  const uid = useId().replace(/:/g, "");
  const mainFill = `acmeMainFill-${uid}`;
  const projFill = `acmeProjFill-${uid}`;

  const main: Array<[number, number]> = [
    [0, 98], [95, 90], [190, 96], [285, 74], [380, 80],
    [475, 58], [570, 64], [665, 44], [760, 40],
  ];
  const proj: Array<[number, number]> = [
    [475, 58], [570, 72], [665, 92], [760, 110],
  ];

  const linePath = (pts: Array<[number, number]>) =>
    pts.map(([x, y], i) => `${i === 0 ? "M" : "L"} ${x} ${y}`).join(" ");

  const mainArea = `${linePath(main)} L 760 150 L 0 150 Z`;
  const projArea = `${linePath(proj)} L 760 150 L 475 150 Z`;

  const projEnd = proj[proj.length - 1];

  return (
    <div style={{ position: "relative", width: "100%", height: 116, overflow: "visible" }}>
      <svg
        width="100%"
        height={116}
        viewBox="0 0 760 150"
        preserveAspectRatio="none"
        style={{ display: "block", overflow: "visible" }}
        aria-hidden
      >
        <defs>
          <linearGradient id={mainFill} gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="0" y2="150">
            <stop offset="0" stopColor="var(--rust)" stopOpacity={0.18} />
            <stop offset="1" stopColor="var(--rust)" stopOpacity={0} />
          </linearGradient>
          <linearGradient id={projFill} gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="0" y2="150">
            <stop offset="0" stopColor="var(--clay)" stopOpacity={0.2} />
            <stop offset="1" stopColor="var(--clay)" stopOpacity={0} />
          </linearGradient>
        </defs>

        <path d={mainArea} fill={`url(#${mainFill})`} />
        <path
          d={linePath(main)}
          fill="none"
          stroke="var(--rust)"
          strokeWidth={2.5}
          strokeLinejoin="round"
          strokeLinecap="round"
          vectorEffect="non-scaling-stroke"
        />

        {active && (
          <g style={{ animation: "acmeFadeIn 0.5s ease both" }}>
            <path d={projArea} fill={`url(#${projFill})`} />
            <path
              d={linePath(proj)}
              fill="none"
              stroke="var(--clay)"
              strokeWidth={2.5}
              strokeDasharray="6 5"
              strokeLinejoin="round"
              strokeLinecap="round"
              vectorEffect="non-scaling-stroke"
            />
          </g>
        )}
      </svg>

      {/* Clay endpoint dot — a true circle (kept out of the non-uniformly
          scaled SVG so it never distorts into an ellipse). */}
      {active && (
        <div
          style={{
            position: "absolute",
            left: `${(projEnd[0] / 760) * 100}%`,
            top: `${(projEnd[1] / 150) * 100}%`,
            width: 9,
            height: 9,
            marginLeft: -4.5,
            marginTop: -4.5,
            borderRadius: "50%",
            background: "var(--clay)",
            animation: "acmeFadeIn 0.5s ease both",
          }}
        />
      )}
    </div>
  );
}

const panelCard: CSSProperties = {
  flex: 1,
  minWidth: 0,
  display: "flex",
  flexDirection: "column",
  gap: 9,
  padding: "18px 20px",
  borderRadius: 15,
  background: "var(--panel)",
  border: `1px solid ${withAlpha(colors.ink, 0.06)}`,
};

function mono11(tracking: number, color: string): CSSProperties {
  return { fontFamily: mono, fontSize: 11, letterSpacing: tracking, color };
}

function mono12(tracking: number, color: string): CSSProperties {
  return { fontFamily: mono, fontSize: 12, letterSpacing: tracking, color };
}

const KEYFRAMES = `
@keyframes acmeFadeIn { from { opacity: 0; } to { opacity: 1; } }
@keyframes acmeRowIn { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }
@keyframes acmeRiseIn { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }
`;

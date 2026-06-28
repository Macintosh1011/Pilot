"use client";

import { QuillChrome, hl as getHl } from "./QuillChrome";
import { cx } from "./utils";
import type { ViewProps } from "./types";
import s from "../AcmeDemoPanel.module.css";

// ─── Default data ──────────────────────────────────────────────────────────────

const DEFAULT_AUDIT_ROWS: {
  ts: string;
  action: string;
  actor: string;
  status: "redacted" | "logged" | "approved";
}[] = [
  { ts: "2024-06-28 14:32:07", action: "PII field auto-redacted",   actor: "quill-ai",        status: "redacted" },
  { ts: "2024-06-28 14:32:06", action: "Ticket message accessed",   actor: "agent@support.io", status: "logged"   },
  { ts: "2024-06-28 14:31:54", action: "Ticket created",            actor: "customer",         status: "logged"   },
  { ts: "2024-06-28 09:14:22", action: "Data export requested",     actor: "admin@corp.io",    status: "approved" },
];

const BADGES: { label: string }[] = [
  { label: "SOC 2 Type II" },
  { label: "GDPR"          },
  { label: "ISO 27001"     },
  { label: "HIPAA Ready"   },
  { label: "CCPA"          },
  { label: "PCI DSS"       },
];

// Fake message broken into normal + redacted segments
type MsgPart = { text: string; type: "normal" | "redacted" };
const MSG_PARTS: MsgPart[] = [
  { text: "Hi, I need help with my account. My email is ",                  type: "normal"   },
  { text: "j***@***ample.com",                                              type: "redacted" },
  { text: " and my last charge hit card ",                                   type: "normal"   },
  { text: "**** **** **** 4242",                                             type: "redacted" },
  { text: ". My SSN on file is ",                                            type: "normal"   },
  { text: "***-**-6789",                                                    type: "redacted" },
  { text: ". Please confirm you can access my subscription details.",        type: "normal"   },
];

const REDACTED_TAGS: { label: string; isHigh: boolean }[] = [
  { label: "EMAIL",       isHigh: false },
  { label: "CARD NUMBER", isHigh: false },
  { label: "SSN",         isHigh: true  },
];

// ─── Status chip style ─────────────────────────────────────────────────────────

function statusChipStyle(status: "redacted" | "logged" | "approved"): React.CSSProperties {
  if (status === "redacted") {
    return {
      background: "rgba(204,120,92,0.12)", border: "1px solid rgba(204,120,92,0.28)",
      color: "var(--clay)",
    };
  }
  if (status === "approved") {
    return {
      background: "rgba(90,122,88,0.10)", border: "1px solid rgba(90,122,88,0.22)",
      color: "var(--success)",
    };
  }
  return {
    background: "rgba(20,20,19,0.06)", border: "1px solid rgba(20,20,19,0.12)",
    color: "var(--muted)",
  };
}

// ─── View ──────────────────────────────────────────────────────────────────────

export default function ComplianceView({ params, highlight }: ViewProps) {
  const hl = (id: string) => getHl(highlight, id);
  const region = params?.region ?? "US & EU";

  return (
    <QuillChrome active="compliance" company={params?.company} highlight={highlight}>

      {/* ── Section header ── */}
      <div className={s.sectionRow}>
        <div>
          <p className={s.eyebrow}>Security & Compliance</p>
          <h2 className={s.heading} style={{ marginBottom: 0 }}>
            Enterprise-grade trust.
          </h2>
        </div>
        <span style={{
          fontFamily: "var(--font-mono)", fontSize: "0.68rem", fontWeight: 600,
          letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--muted)",
        }}>
          QUILL · {region.toUpperCase()}
        </span>
      </div>

      {/* ── PII Redaction demo ── */}
      <p className={s.eyebrow} style={{ marginBottom: "0.5rem" }}>Live PII Detection</p>
      <div
        data-el="pii-redaction"
        className={cx(s.chartBlock, hl("pii-redaction"))}
        style={{ marginBottom: "1rem" }}
      >
        <div className={s.chartHeader}>
          <span className={s.chartLabel}>INCOMING CUSTOMER MESSAGE</span>
          {/* scanning pulse chip */}
          <span style={{
            display: "flex", alignItems: "center", gap: "0.375rem",
            fontFamily: "var(--font-mono)", fontSize: "0.62rem", fontWeight: 700,
            letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--clay)",
          }}>
            <span style={{
              width: "0.4375rem", height: "0.4375rem", borderRadius: "50%",
              background: "var(--clay)", flexShrink: 0,
              animation: "qDotPulse 2s ease-in-out infinite",
            }} aria-hidden="true" />
            QUILL SCANNING
          </span>
        </div>

        {/* Message with inline redacted tokens */}
        <p style={{
          fontFamily: "var(--font-serif)", fontSize: "0.9375rem", color: "var(--ink)",
          lineHeight: 1.65, margin: "0.75rem 0 0.625rem",
        }}>
          {MSG_PARTS.map((part, i) =>
            part.type === "redacted" ? (
              <span key={i} style={{
                display: "inline-block",
                background: "rgba(204,120,92,0.14)",
                border: "1px solid rgba(204,120,92,0.32)",
                borderRadius: "0.25rem",
                padding: "0.05rem 0.3rem",
                fontFamily: "var(--font-mono)", fontSize: "0.8rem",
                fontWeight: 700, color: "var(--clay)", letterSpacing: "0.04em",
                verticalAlign: "baseline",
              }}>
                {part.text}
              </span>
            ) : (
              <span key={i}>{part.text}</span>
            )
          )}
        </p>

        {/* Redacted-field tags */}
        <div style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap" }}>
          {REDACTED_TAGS.map((tag) => (
            <span key={tag.label} style={{
              fontFamily: "var(--font-mono)", fontSize: "0.6rem", fontWeight: 700,
              letterSpacing: "0.1em", textTransform: "uppercase",
              padding: "0.15rem 0.5rem", borderRadius: "999px",
              background: tag.isHigh ? "rgba(176,87,48,0.10)" : "rgba(204,120,92,0.10)",
              border: `1px solid ${tag.isHigh ? "rgba(176,87,48,0.28)" : "rgba(204,120,92,0.28)"}`,
              color: tag.isHigh ? "var(--rust)" : "var(--clay)",
            }}>
              {tag.label} REDACTED
            </span>
          ))}
        </div>
      </div>

      {/* ── Audit Log ── */}
      <p className={s.eyebrow} style={{ marginBottom: "0.5rem" }}>Audit Log</p>
      <div
        data-el="audit-log"
        className={cx(s.chartBlock, hl("audit-log"))}
        style={{ padding: 0, marginBottom: "1rem", overflow: "hidden" }}
      >
        <table style={{ width: "100%", borderCollapse: "collapse" }} aria-label="Compliance audit log">
          <thead>
            <tr>
              {(["Timestamp", "Action", "Actor", "Status"] as const).map((h) => (
                <th key={h} scope="col" style={{
                  textAlign: "left", padding: "0.5rem 0.875rem",
                  fontFamily: "var(--font-mono)", fontSize: "0.6rem", fontWeight: 600,
                  letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--muted)",
                  background: "var(--panel)", borderBottom: "1px solid var(--border)",
                }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {DEFAULT_AUDIT_ROWS.map((row, i) => {
              const isLast = i === DEFAULT_AUDIT_ROWS.length - 1;
              const cellBorder = isLast ? "none" : "1px solid rgba(20,20,19,0.05)";
              return (
                <tr key={i}>
                  <td style={{
                    padding: "0.5625rem 0.875rem", fontFamily: "var(--font-mono)",
                    fontSize: "0.66rem", color: "var(--muted)", borderBottom: cellBorder,
                  }}>
                    {row.ts}
                  </td>
                  <td style={{
                    padding: "0.5625rem 0.875rem", fontFamily: "var(--font-serif)",
                    fontSize: "0.875rem", color: "var(--ink)", borderBottom: cellBorder,
                  }}>
                    {row.action}
                  </td>
                  <td style={{
                    padding: "0.5625rem 0.875rem", fontFamily: "var(--font-mono)",
                    fontSize: "0.7rem", color: "var(--muted)", borderBottom: cellBorder,
                  }}>
                    {row.actor}
                  </td>
                  <td style={{ padding: "0.5625rem 0.875rem", borderBottom: cellBorder }}>
                    <span style={{
                      fontFamily: "var(--font-mono)", fontSize: "0.6rem", fontWeight: 700,
                      letterSpacing: "0.08em", textTransform: "uppercase",
                      padding: "0.15rem 0.45rem", borderRadius: "999px",
                      ...statusChipStyle(row.status),
                    }}>
                      {row.status}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* ── Compliance badges ── */}
      <p className={s.eyebrow} style={{ marginBottom: "0.5rem" }}>Certifications</p>
      <div
        data-el="compliance-badges"
        className={hl("compliance-badges")}
        style={{
          display: "grid", gridTemplateColumns: "repeat(3, 1fr)",
          gap: "0.625rem", marginBottom: "1rem",
          borderRadius: "0.75rem",
        }}
      >
        {BADGES.map((b) => (
          <div key={b.label} style={{
            display: "flex", alignItems: "center", gap: "0.5rem",
            padding: "0.625rem 0.875rem",
            background: "var(--panel)", border: "1px solid var(--border)",
            borderRadius: "0.75rem",
          }}>
            <span style={{
              width: "1.25rem", height: "1.25rem", borderRadius: "50%",
              background: "rgba(90,122,88,0.12)", border: "1px solid rgba(90,122,88,0.28)",
              display: "grid", placeItems: "center", flexShrink: 0,
              fontFamily: "var(--font-mono)", fontSize: "0.65rem", fontWeight: 700,
              color: "var(--success)",
            }} aria-hidden="true">
              ✓
            </span>
            <span style={{
              fontFamily: "var(--font-mono)", fontSize: "0.63rem", fontWeight: 600,
              letterSpacing: "0.05em", textTransform: "uppercase", color: "var(--ink)",
            }}>
              {b.label}
            </span>
          </div>
        ))}
      </div>

      {/* ── Data residency ── */}
      <div
        data-el="data-residency"
        className={cx(s.statCard, hl("data-residency"))}
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr 1fr",
          gap: "0.75rem",
          alignItems: "center",
        }}
      >
        <div>
          <span className={s.statLabel}>Data Residency</span>
          <p style={{
            fontFamily: "var(--font-serif)", fontSize: "1.25rem", fontWeight: 500,
            color: "var(--ink)", margin: 0, letterSpacing: "-0.02em",
          }}>
            {region}
          </p>
        </div>
        <div style={{ borderLeft: "1px solid var(--border)", paddingLeft: "0.75rem" }}>
          <span className={s.statLabel}>Encryption</span>
          <p style={{
            fontFamily: "var(--font-mono)", fontSize: "0.75rem", fontWeight: 600,
            color: "var(--clay)", margin: 0,
          }}>
            AES-256 · TLS 1.3
          </p>
        </div>
        <div style={{ borderLeft: "1px solid var(--border)", paddingLeft: "0.75rem" }}>
          <span className={s.statLabel}>Data Deletion SLA</span>
          <p style={{
            fontFamily: "var(--font-mono)", fontSize: "0.75rem", fontWeight: 600,
            color: "var(--success)", margin: 0,
          }}>
            30-day guarantee
          </p>
        </div>
      </div>

    </QuillChrome>
  );
}

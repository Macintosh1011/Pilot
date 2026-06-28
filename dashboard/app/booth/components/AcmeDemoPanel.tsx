"use client";

// AcmeDemoPanel — the Quill AI customer-support co-presenter rendered in the booth.
// Pure function of props; the orchestration layer feeds all data.
// 'use client' required: count-up hooks, draw-on SVG animation, and scroll effects need browser APIs.

import { useEffect, useId, useRef, useState } from "react";
import s from "./AcmeDemoPanel.module.css";

// ─── Types ────────────────────────────────────────────────────────────────────

export type DemoView =
  | "home"
  | "churn"
  | "alerts"
  | "pricing"
  | "integrations"
  | "query-result";

export type DemoParams = {
  company?: string;
  question?: string;
  answer?: string;
  sources?: string;
  ticketVolume?: string;
  deflectionRate?: string;
  firstResponse?: string;
  csat?: string;
  hoursSaved?: string;
  /** CSV of weekly deflection %, oldest → newest, e.g. "41,49,55,63" */
  series?: string;
  topTopics?: { topic: string; share: string; trend: string }[];
  severity?: string;
  escalations?: { question: string; reason: string }[];
  tools?: string;
  plan?: string;
  agents?: string;
  role?: string;
};

// ─── Constants ────────────────────────────────────────────────────────────────

const DEFAULT_ESCALATIONS: { question: string; reason: string }[] = [
  { question: "Can I get a refund for the annual plan?",      reason: "Billing dispute — policy edge case"  },
  { question: "My SSO integration broke after the update.",   reason: "Technical — requires engineering"    },
  { question: "We need a custom contract with net-60 terms.", reason: "Legal / enterprise procurement"      },
  { question: "Why did my API rate limit drop overnight?",    reason: "Account change — needs investigation" },
];

const DEFAULT_TOPICS: { topic: string; share: string; trend: string }[] = [
  { topic: "Billing & Invoices", share: "38%", trend: "up"     },
  { topic: "API & Webhooks",     share: "22%", trend: "stable" },
  { topic: "Account Settings",   share: "18%", trend: "down"   },
  { topic: "Password Reset",     share: "14%", trend: "up"     },
  { topic: "Integrations",       share: "8%",  trend: "stable" },
];

const DEFAULT_ANSWER =
  "You can upgrade anytime from Settings → Billing. The new plan takes effect immediately and we'll prorate the difference to your next invoice. No data or conversation history is lost during the switch.";

const DEFAULT_SOURCES = "Billing FAQ, Setup Guide, Pricing Page";

// Default 8-week deflection trend (760 × 150 viewBox). Lower y = higher on screen = higher deflection %.
const DEFAULT_DEFLECT_PTS: ReadonlyArray<{ x: number; y: number }> = [
  { x: 0,   y: 138 }, { x: 95,  y: 118 }, { x: 190, y: 103 }, { x: 285, y: 86 },
  { x: 380, y: 70 },  { x: 475, y: 52 },  { x: 570, y: 38 },  { x: 665, y: 26 },
  { x: 760, y: 20 },
];

const QUILL_INTEGRATIONS = [
  { id: "int-helpcenter" as const, name: "Help Center", abbr: "HC", defaultOn: false },
  { id: "int-zendesk"    as const, name: "Zendesk",     abbr: "ZD", defaultOn: true  },
  { id: "int-intercom"   as const, name: "Intercom",    abbr: "IC", defaultOn: false },
  { id: "int-slack"      as const, name: "Slack",       abbr: "SL", defaultOn: true  },
  { id: "int-notion"     as const, name: "Notion",      abbr: "NT", defaultOn: false },
] as const;

const QUILL_PLANS = [
  {
    id:      "plan-starter" as const,
    slug:    "starter"      as const,
    name:    "Starter",
    price:   "$0.85",
    unit:    "/resolution",
    popular: false,
    maxAgents: 5,
    features: [
      "Up to 500 resolutions/mo",
      "Help center connection",
      "Email + chat channels",
      "Basic deflection analytics",
    ],
  },
  {
    id:      "plan-growth" as const,
    slug:    "growth"      as const,
    name:    "Growth",
    price:   "$0.55",
    unit:    "/resolution",
    popular: true,
    maxAgents: 20,
    features: [
      "Up to 5,000 resolutions/mo",
      "All channels + Slack",
      "Brand voice tuning",
      "Escalation rules & routing",
      "Priority support",
    ],
  },
  {
    id:      "plan-scale" as const,
    slug:    "scale"       as const,
    name:    "Scale",
    price:   "Custom",
    unit:    "",
    popular: false,
    maxAgents: Infinity,
    features: [
      "Unlimited resolutions",
      "Custom integrations",
      "Dedicated success manager",
      "SLA guarantee",
      "SSO + audit logs",
    ],
  },
] as const;

// Safe overestimate of any line's total length in the 760 × 150 viewBox.
const LINE_LENGTH = 1000;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function cx(...cls: (string | false | undefined | null)[]): string {
  return cls.filter(Boolean).join(" ");
}

function severityColor(sev: string): string {
  switch (sev.toLowerCase()) {
    case "high":   return "var(--rust)";
    case "medium": return "var(--tan)";
    default:       return "var(--muted)";
  }
}

/** Map visitor-supplied CSV series to SVG coordinate space (760 × 150). Higher value → lower y (top of chart). */
function parseSeriesCsv(csv: string | undefined): { x: number; y: number }[] | null {
  if (!csv) return null;
  const vals = csv.split(",").map(v => parseFloat(v.trim())).filter(v => !isNaN(v));
  if (vals.length < 2) return null;
  const lo   = Math.min(...vals);
  const hi   = Math.max(...vals);
  const span = Math.max(hi - lo, 0.0001);
  const yTop = 16, yBot = 140;
  return vals.map((v, i) => ({
    x: (i / (vals.length - 1)) * 760,
    y: yBot - ((v - lo) / span) * (yBot - yTop),
  }));
}

function svgLinePath(pts: ReadonlyArray<{ x: number; y: number }>): string {
  return pts.map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");
}

function svgAreaPath(pts: ReadonlyArray<{ x: number; y: number }>, bottom: number): string {
  if (pts.length === 0) return "";
  const last  = pts[pts.length - 1] ?? { x: 760, y: 150 };
  const first = pts[0]              ?? { x: 0,   y: 150 };
  return `${svgLinePath(pts)} L${last.x.toFixed(1)},${bottom} L${first.x.toFixed(1)},${bottom} Z`;
}

// ─── Count-up hook ────────────────────────────────────────────────────────────

type ParsedStat = { prefix: string; value: number; suffix: string; decimals: number };

function parseStatValue(raw: string): ParsedStat | null {
  const m = raw.match(/^([^0-9]*)([0-9]+(?:\.[0-9]+)?)(.*?)$/);
  if (!m) return null;
  const value = parseFloat(m[2]);
  if (isNaN(value)) return null;
  const decimals = (m[2].split(".")[1] ?? "").length;
  return { prefix: m[1], value, suffix: m[3], decimals };
}

function fmtStat(val: number, p: ParsedStat): string {
  return `${p.prefix}${val.toFixed(p.decimals)}${p.suffix}`;
}

function useCountUp(target: string, duration = 570): string {
  const parsed = parseStatValue(target);
  const [display, setDisplay] = useState(() =>
    parsed ? fmtStat(0, parsed) : target
  );

  useEffect(() => {
    if (!parsed) { setDisplay(target); return; }
    const start = performance.now();
    let frameId: number;
    const tick = (now: number) => {
      const t     = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - t, 3);
      setDisplay(fmtStat(parsed.value * eased, parsed));
      if (t < 1) frameId = requestAnimationFrame(tick);
    };
    frameId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frameId);
    // duration is a compile-time constant — safe to exclude
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target]);

  return display;
}

function CountUpStat({ value, className }: { value: string; className?: string }) {
  const display = useCountUp(value);
  return <span className={className}>{display}</span>;
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function AcmeDemoPanel({
  view,
  params,
  highlight,
}: {
  view: DemoView;
  params?: DemoParams;
  highlight?: string;
}) {
  const rawId = useId();
  const svgId = "g" + rawId.replace(/[^a-zA-Z0-9]/g, "");

  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!highlight || !scrollRef.current) return;
    const el = scrollRef.current.querySelector(
      `[data-el="${highlight.replace(/"/g, '\\"')}"]`
    ) as HTMLElement | null;
    if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [highlight]);

  const hl = (elId: string) => (highlight === elId ? s.highlighted : "");
  const liveCompany = params?.company;

  return (
    <div className={s.shell}>
      <PanelHeader liveCompany={liveCompany} />
      <div key={view} ref={scrollRef} className={s.viewWrap}>
        {view === "home"         && <HomeView         params={params} hl={hl} />}
        {view === "churn"        && <ImpactView       params={params} hl={hl} svgId={svgId} />}
        {view === "alerts"       && <EscalationsView  params={params} hl={hl} />}
        {view === "pricing"      && <PricingView      params={params} hl={hl} />}
        {view === "integrations" && <IntegrationsView params={params} hl={hl} />}
        {view === "query-result" && <QueryResultView  params={params} hl={hl} />}
      </div>
    </div>
  );
}

// ─── Panel Header ─────────────────────────────────────────────────────────────

function PanelHeader({ liveCompany }: { liveCompany?: string }) {
  return (
    <header className={s.header} aria-label="Quill">
      <div className={s.logo}>
        <div className={s.logoMark} aria-hidden="true">
          <div className={s.logoInner} />
        </div>
        <span className={s.logoName}>Quill</span>
      </div>
      <div className={s.headerRight}>
        {liveCompany && (
          <span className={s.liveChip} aria-label={`Live demo tailored for ${liveCompany}`}>
            LIVE · {liveCompany.toUpperCase()}
          </span>
        )}
        <div className={s.retentionBadge} aria-label="AI support product">
          <span>SUPPORT AI</span>
          <span className={s.retentionDot} aria-hidden="true" />
        </div>
      </div>
    </header>
  );
}

// ─── HOME VIEW ────────────────────────────────────────────────────────────────

function HomeView({ params, hl }: { params?: DemoParams; hl: (id: string) => string }) {
  const deflectionRate = params?.deflectionRate ?? "63%";
  const firstResponse  = params?.firstResponse  ?? "3s";
  const csat           = params?.csat           ?? "4.8/5";
  const company        = params?.company;
  const role           = params?.role;

  return (
    <div>
      <nav className={s.homeNav} aria-label="Product sections">
        <button data-el="nav-impact"       className={cx(s.homeNavItem, hl("nav-impact"))}>       Impact       </button>
        <button data-el="nav-escalations"  className={cx(s.homeNavItem, hl("nav-escalations"))}>  Escalations  </button>
        <button data-el="nav-pricing"      className={cx(s.homeNavItem, hl("nav-pricing"))}>      Pricing      </button>
        <button data-el="nav-integrations" className={cx(s.homeNavItem, hl("nav-integrations"))}> Integrations </button>
      </nav>

      <div data-el="hero" className={cx(s.homeHero, hl("hero"))}>
        <p className={s.homeEyebrow}>
          {company ? `FOR ${company.toUpperCase()}` : "AI CUSTOMER SUPPORT"}
        </p>
        <h1 className={s.homeHeadline}>
          The answer,<br />written instantly.
        </h1>
        <p className={s.homeSubtext}>
          {role
            ? `For ${role}s — Quill connects to your docs and answers customers in seconds, in your brand voice. No queue. No wait.`
            : "Quill connects to your help center, product docs, and past tickets, then answers customers instantly with cited sources. Deflect 50–70% of tickets. Free your team for the hard ones."
          }
        </p>
      </div>

      <div className={s.homeCtas}>
        <button
          data-el="cta"
          className={cx(s.homeCta, s.primary, hl("cta"))}
          aria-label="See Quill answer live"
        >
          See it answer live →
        </button>
        <button className={cx(s.homeCta, s.ghost)} aria-label="How Quill works">
          How it works
        </button>
      </div>

      <div className={s.homeStats} aria-label="Key metrics">
        <div className={s.homeStat}>
          <strong className={s.homeStatValue}><CountUpStat value={deflectionRate} /></strong>
          <span className={s.homeStatLabel}>Tickets deflected</span>
        </div>
        <div className={s.homeStat}>
          <strong className={s.homeStatValue}><CountUpStat value={firstResponse} /></strong>
          <span className={s.homeStatLabel}>First response</span>
        </div>
        <div className={s.homeStat}>
          <strong className={s.homeStatValue}><CountUpStat value={csat} /></strong>
          <span className={s.homeStatLabel}>Customer CSAT</span>
        </div>
      </div>
    </div>
  );
}

// ─── IMPACT VIEW (view key: churn) ───────────────────────────────────────────

function ImpactView({
  params,
  hl,
  svgId,
}: {
  params?: DemoParams;
  hl: (id: string) => string;
  svgId: string;
}) {
  const deflectionRate = params?.deflectionRate ?? "63%";
  const firstResponse  = params?.firstResponse  ?? "8s";
  const csat           = params?.csat           ?? "4.7/5";
  const hoursSaved     = params?.hoursSaved     ?? "120 hrs/mo";

  // Derive deflected count from volume × rate when both are present.
  const deflectedCount = (() => {
    const vol  = parseInt((params?.ticketVolume ?? "").replace(/[^0-9]/g, ""), 10);
    const rate = parseFloat((params?.deflectionRate ?? "").replace(/[^0-9.]/g, "")) / 100;
    if (!isNaN(vol) && !isNaN(rate) && vol > 0) {
      return `${Math.round(vol * rate).toLocaleString()}/mo`;
    }
    return "1,512/mo";
  })();

  const endLabel = (() => {
    const csv = params?.series;
    if (!csv) return "63%";
    const last = csv.split(",").map(v => parseFloat(v.trim())).filter(v => !isNaN(v)).pop();
    return last != null ? `${last.toFixed(0)}%` : "63%";
  })();

  const topics = (params?.topTopics && params.topTopics.length > 0)
    ? params.topTopics.slice(0, 5)
    : DEFAULT_TOPICS;

  return (
    <div>
      <div className={s.sectionRow}>
        <div>
          <p className={s.eyebrow}>IMPACT DASHBOARD</p>
          <h2 className={s.heading} style={{ marginBottom: 0 }}>Support deflected.</h2>
        </div>
        <span style={{
          fontFamily: "var(--font-mono)", fontSize: "0.68rem", fontWeight: 600,
          letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--muted)",
        }}>
          QUILL · THIS MONTH
        </span>
      </div>

      {/* Primary stat row */}
      <div className={s.statCards}>
        <div data-el="deflection-rate" className={cx(s.statCard, s.churnActive, hl("deflection-rate"))}>
          <span className={s.statLabel}>Deflection Rate</span>
          <CountUpStat value={deflectionRate} className={cx(s.statNumber, s.good)} />
        </div>
        <div data-el="deflected-count" className={cx(s.statCard, hl("deflected-count"))}>
          <span className={s.statLabel}>Deflected</span>
          <CountUpStat value={deflectedCount} className={s.statNumber} />
        </div>
        <div data-el="response-time" className={cx(s.statCard, hl("response-time"))}>
          <span className={s.statLabel}>First Response</span>
          <CountUpStat value={firstResponse} className={s.statNumber} />
        </div>
      </div>

      {/* Secondary stat row */}
      <div className={s.statCards} style={{ gridTemplateColumns: "1fr 2fr" }}>
        <div data-el="csat" className={cx(s.statCard, hl("csat"))}>
          <span className={s.statLabel}>CSAT Score</span>
          <CountUpStat value={csat} className={s.statNumber} />
        </div>
        <div className={s.statCard}>
          <span className={s.statLabel}>Hours Saved</span>
          <CountUpStat value={hoursSaved} className={cx(s.statNumber, s.good)} />
        </div>
      </div>

      {/* Deflection trend chart */}
      <div data-el="deflection-trend" className={cx(s.chartBlock, hl("deflection-trend"))}>
        <div className={s.chartHeader}>
          <span className={s.chartLabel}>DEFLECTION TREND · 8 WEEKS</span>
          <span className={s.chartProjLabel}>{endLabel} now</span>
        </div>
        <div className={s.chartSvgWrap}>
          <TrendChart series={params?.series} svgId={svgId} endLabel={endLabel} />
        </div>
      </div>

      {/* Top topics */}
      <p className={s.eyebrow} style={{ marginBottom: "0.625rem" }}>TOP DEFLECTED TOPICS</p>
      <div
        data-el="top-topics"
        className={cx(s.topicList, hl("top-topics"))}
        role="list"
        aria-label="Most-deflected support topics"
      >
        {topics.map((t, i) => (
          <TopicRow key={t.topic} topic={t} index={i} />
        ))}
      </div>
    </div>
  );
}

function TopicRow({
  topic,
  index,
}: {
  topic: { topic: string; share: string; trend: string };
  index: number;
}) {
  const glyph = topic.trend === "up" ? "↑" : topic.trend === "down" ? "↓" : "–";
  const color = topic.trend === "up" ? "var(--success)" : "var(--muted)";
  return (
    <div className={s.topicRow} role="listitem" style={{ animationDelay: `${index * 60}ms` }}>
      <span className={s.topicName}>{topic.topic}</span>
      <span className={s.topicShare}>{topic.share}</span>
      <span className={s.topicTrend} style={{ color }}>{glyph}</span>
    </div>
  );
}

// ─── ESCALATIONS VIEW (view key: alerts) ─────────────────────────────────────

function EscalationsView({ params, hl }: { params?: DemoParams; hl: (id: string) => string }) {
  const escalations = (params?.escalations && params.escalations.length > 0)
    ? params.escalations
    : DEFAULT_ESCALATIONS;

  const sev      = params?.severity?.toLowerCase() ?? "medium";
  const sevColor = severityColor(sev);
  const sevLabel = sev === "high" ? "HIGH" : sev === "medium" ? "MED" : "LOW";

  return (
    <div>
      <div className={s.sectionRow}>
        <div>
          <p className={s.eyebrow}>ESCALATIONS</p>
          <h2 className={s.heading} style={{ marginBottom: 0 }}>Handed to a human.</h2>
        </div>
      </div>

      {/* Escalation list */}
      <div
        data-el="escalation-list"
        className={cx(s.alertList, hl("escalation-list"))}
        role="list"
        aria-label="Escalated support tickets"
      >
        {escalations.slice(0, 4).map((e, i) => (
          <div
            key={e.question}
            className={s.alertItem}
            role="listitem"
            style={{ animationDelay: `${i * 70}ms` }}
          >
            <div className={s.alertDot} aria-hidden="true" style={{ background: sevColor }} />
            <div className={s.alertInfo}>
              <p className={s.alertName}>{e.question}</p>
              <p className={s.alertSignal}>{e.reason}</p>
            </div>
            <span
              className={s.alertSeverity}
              style={{ color: sevColor, borderColor: `${sevColor}55`, background: `${sevColor}18` }}
            >
              {sevLabel}
            </span>
          </div>
        ))}
      </div>

      {/* Doc gap */}
      <div
        data-el="doc-gap"
        className={cx(s.docGapCard, hl("doc-gap"))}
        aria-label="Documentation gap detected"
      >
        <div className={s.docGapHeader}>
          <span className={s.docGapTitle}>DOC GAP DETECTED</span>
        </div>
        <p className={s.docGapTopic}>API Rate Limits</p>
        <p className={s.docGapSuggestion}>No article covers this — Quill escalated 12 tickets this week.</p>
        <button className={s.docGapAction} aria-label="Draft a rate limits article">
          Draft article →
        </button>
      </div>

      {/* Escalation rules */}
      <div
        data-el="escalation-rules"
        className={cx(s.thresholdPanel, hl("escalation-rules"))}
        aria-label="Escalation rule configuration"
      >
        <div className={s.thresholdTopRow}>
          <span className={s.thresholdTitle}>Confidence Threshold</span>
          <span className={s.thresholdValue}>70%</span>
        </div>
        <div
          className={s.thresholdTrack}
          role="slider"
          aria-valuenow={70}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label="Escalation confidence threshold"
        >
          <div className={s.thresholdFill} style={{ width: "70%" }} />
          <div className={s.thresholdHandle} style={{ left: "70%" }} aria-hidden="true" />
        </div>
        <div className={s.notifyRow}>
          <span className={s.notifyLabel}>Escalate via</span>
          <NotifyChip label="Slack" active />
          <NotifyChip label="Email" active />
          <NotifyChip label="Jira"  active={false} />
        </div>
      </div>
    </div>
  );
}

function NotifyChip({ label, active }: { label: string; active: boolean }) {
  return (
    <span style={{
      fontFamily: "var(--font-mono)", fontSize: "0.65rem", fontWeight: 600,
      letterSpacing: "0.06em", textTransform: "uppercase",
      padding: "0.2rem 0.55rem", borderRadius: "999px",
      border: `1px solid ${active ? "rgba(90,122,88,0.25)" : "var(--border)"}`,
      background: active ? "rgba(90,122,88,0.1)" : "var(--chip)",
      color: active ? "var(--success)" : "var(--muted)",
    }}>
      {label}
    </span>
  );
}

// ─── PRICING VIEW ─────────────────────────────────────────────────────────────

function PricingView({ params, hl }: { params?: DemoParams; hl: (id: string) => string }) {
  const recommendedSlug = params?.plan?.toLowerCase();

  const agentCount = params?.agents != null ? parseInt(params.agents, 10) : null;
  const sizePlan = agentCount == null || isNaN(agentCount) ? null
    : agentCount <= 5  ? "starter"
    : agentCount <= 20 ? "growth"
    : "scale";

  const matchedSlug        = recommendedSlug ?? sizePlan;
  const hasRecommendation  = !!(recommendedSlug || (agentCount != null && !isNaN(agentCount)));

  return (
    <div>
      <p className={s.eyebrow}>PRICING</p>
      <h2 className={s.heading}>Pay per resolution, not per seat.</h2>

      <div className={s.pricingGrid}>
        {QUILL_PLANS.map((plan, i) => {
          const isMatch  = hasRecommendation && matchedSlug === plan.slug;
          const sizeNote = isMatch && agentCount != null && !isNaN(agentCount)
            ? `Sized for ${agentCount}-agent teams`
            : null;

          return (
            <div
              key={plan.id}
              data-el={plan.id}
              className={cx(
                s.planCard,
                plan.popular ? s.popular    : undefined,
                isMatch      ? s.recommended : undefined,
                hl(plan.id),
              )}
              style={{ animationDelay: `${i * 85}ms` }}
            >
              {isMatch && <span className={s.recommendedBadge}>Recommended for you</span>}
              {plan.popular && !isMatch && <span className={s.popularBadge}>Most popular</span>}
              <p className={s.planName}>{plan.name}</p>
              <div>
                <span className={s.planPriceNum}>{plan.price}</span>
                {plan.unit && <span className={s.planPricePer}>{plan.unit}</span>}
              </div>
              {sizeNote && <p className={s.recommendedNote}>{sizeNote}</p>}
              <ul className={s.planFeatures} aria-label={`${plan.name} plan features`}>
                {plan.features.map(f => (
                  <li key={f} className={s.planFeature}>{f}</li>
                ))}
              </ul>
              <button
                className={cx(s.planCta, plan.popular || isMatch ? s.ink : undefined)}
                aria-label={`Choose ${plan.name} plan`}
              >
                {plan.id === "plan-scale" ? "Contact sales" : "Get started"}
              </button>
            </div>
          );
        })}
      </div>

      <div
        data-el="cta-contact-sales"
        className={cx(s.contactSales, hl("cta-contact-sales"))}
        role="region"
        aria-label="Contact sales for volume pricing"
      >
        <span>Volume or custom contract?</span>
        <span style={{ color: "var(--clay)", fontWeight: 600 }}>Talk to sales →</span>
      </div>
    </div>
  );
}

// ─── INTEGRATIONS VIEW ────────────────────────────────────────────────────────

function IntegrationsView({ params, hl }: { params?: DemoParams; hl: (id: string) => string }) {
  const toolItems: string[] = (() => {
    if (!params?.tools) return [];
    return params.tools.split(",").map(t => t.trim().toLowerCase()).filter(Boolean);
  })();

  const hasTools = toolItems.length > 0;

  const inTools = (name: string): boolean =>
    toolItems.some(item =>
      name.toLowerCase().includes(item) || item.includes(name.toLowerCase())
    );

  const sorted = [...QUILL_INTEGRATIONS].sort((a, b) => {
    const aM = inTools(a.name), bM = inTools(b.name);
    if (aM && !bM) return -1;
    if (!aM && bM) return 1;
    return 0;
  });

  return (
    <div>
      <p className={s.eyebrow}>INTEGRATIONS</p>
      <h2 className={s.heading}>Connect your support stack.</h2>

      <div className={s.intGrid}>
        {sorted.map((int, i) => {
          const connected = int.defaultOn;
          const detected  = hasTools && inTools(int.name);
          const dimmed    = hasTools && !inTools(int.name);

          return (
            <div
              key={int.id}
              data-el={int.id}
              className={cx(
                s.intCard,
                detected ? s.inStack : undefined,
                dimmed   ? s.dimmed  : undefined,
                hl(int.id),
              )}
              style={{ animationDelay: `${i * 60}ms` }}
            >
              <div className={s.intIcon} aria-hidden="true">{int.abbr}</div>
              <p className={s.intName}>{int.name}</p>
              {detected && (
                <span className={s.stackBadge} aria-label="Detected in your support stack">
                  In your stack
                </span>
              )}
              <span className={cx(s.intStatus, connected || detected ? s.connected : s.available)}>
                {connected || detected ? "Connected" : "Available"}
              </span>
            </div>
          );
        })}
      </div>

      <button
        data-el="connect-button"
        className={cx(s.connectBtn, hl("connect-button"))}
        aria-label="Connect a support integration"
      >
        Connect a source →
      </button>
    </div>
  );
}

// ─── QUERY RESULT VIEW — THE LIVE ANSWER CENTERPIECE ─────────────────────────

function QueryResultView({ params, hl }: { params?: DemoParams; hl: (id: string) => string }) {
  const question      = params?.question    ?? "How do I upgrade my subscription mid-cycle?";
  const answer        = params?.answer      ?? DEFAULT_ANSWER;
  const rawSources    = params?.sources     ?? DEFAULT_SOURCES;
  const firstResponse = params?.firstResponse ?? "3s";

  const sourceList  = rawSources.split(",").map(src => src.trim()).filter(Boolean);
  const sourceCount = sourceList.length;

  return (
    <div>
      <p className={s.eyebrow}>LIVE ANSWER</p>
      <h2 className={s.heading}>Instant. Cited. On-brand.</h2>

      <div className={s.qAnswerWrap}>
        {/* Customer question */}
        <div
          data-el="question"
          className={cx(s.qBubble, hl("question"))}
          role="article"
          aria-label="Customer question"
        >
          <p className={s.qBubbleLabel}>Customer</p>
          <p className={s.qBubbleText}>&ldquo;{question}&rdquo;</p>
        </div>

        {/* Quill's answer */}
        <div
          data-el="answer"
          className={cx(s.qAnswerCard, hl("answer"))}
          role="article"
          aria-label="Quill's instant answer"
        >
          <div className={s.qAnswerLabel} aria-hidden="true">
            <span className={s.qAnswerDot} />
            Quill
          </div>
          <p className={s.qAnswerText}>{answer}</p>

          {/* Sources */}
          <div
            data-el="sources"
            className={cx(s.qSourcesRow, hl("sources"))}
            aria-label="Cited sources"
          >
            <span className={s.qSourcesLabel}>Sources:</span>
            {sourceList.map(src => (
              <span key={src} className={s.qSourceChip}>{src}</span>
            ))}
          </div>
        </div>

        {/* Resolved stat */}
        <div
          data-el="resolved-stat"
          className={cx(s.qResolvedStat, hl("resolved-stat"))}
          role="status"
          aria-label={`Resolved in ${firstResponse} using ${sourceCount} sources`}
        >
          <span className={s.qResolvedDot} aria-hidden="true" />
          <span className={s.qResolvedText}>
            Resolved in {firstResponse} · {sourceCount} source{sourceCount !== 1 ? "s" : ""} · Auto-closed
          </span>
        </div>
      </div>
    </div>
  );
}

// ─── Deflection Trend Chart (SVG) ────────────────────────────────────────────

function TrendChart({
  series,
  svgId,
  endLabel,
}: {
  series: string | undefined;
  svgId: string;
  endLabel: string;
}) {
  const customPts = parseSeriesCsv(series);
  const mainPts   = customPts ?? DEFAULT_DEFLECT_PTS;

  const [drawn, setDrawn] = useState(false);
  useEffect(() => {
    const raf = requestAnimationFrame(() => setDrawn(true));
    return () => cancelAnimationFrame(raf);
  }, []);

  const lastPt    = mainPts[mainPts.length - 1] ?? { x: 760, y: 20 };
  const clayGradId = `${svgId}-clay`;

  return (
    <svg
      viewBox="0 0 760 150"
      preserveAspectRatio="none"
      width="100%"
      height="100%"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id={clayGradId} x1="0" y1="0" x2="0" y2="150" gradientUnits="userSpaceOnUse">
          <stop offset="0%"   stopColor="var(--clay)" stopOpacity={0.22} />
          <stop offset="100%" stopColor="var(--clay)" stopOpacity={0}    />
        </linearGradient>
      </defs>

      {([38, 76, 114] as const).map(y => (
        <line key={y} x1={0} y1={y} x2={760} y2={y}
          stroke="rgba(20,20,19,0.055)" strokeWidth={1} />
      ))}
      <line x1={0} y1={148} x2={760} y2={148}
        stroke="rgba(20,20,19,0.10)" strokeWidth={1} />

      <path d={svgAreaPath(mainPts, 150)} fill={`url(#${clayGradId})`} />

      <path
        d={svgLinePath(mainPts)}
        fill="none"
        stroke="var(--clay)"
        strokeWidth={2.5}
        strokeLinejoin="round"
        style={{
          strokeDasharray: LINE_LENGTH,
          strokeDashoffset: drawn ? 0 : LINE_LENGTH,
          transition: "stroke-dashoffset 650ms cubic-bezier(0.4,0,0.2,1)",
        }}
      />

      <circle
        cx={lastPt.x} cy={lastPt.y} r={4.5}
        fill="var(--clay)"
        style={{ opacity: drawn ? 1 : 0, transition: "opacity 220ms ease 600ms" }}
      />
      <text
        x={lastPt.x - 8} y={lastPt.y - 10}
        fontFamily="var(--font-mono)" fontSize={10} fontWeight={700}
        fill="var(--clay)" textAnchor="end"
        style={{ opacity: drawn ? 1 : 0, transition: "opacity 220ms ease 660ms" }}
      >
        {endLabel}
      </text>
    </svg>
  );
}

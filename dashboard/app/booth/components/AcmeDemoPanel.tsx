"use client";

// AcmeDemoPanel — the live "Acme Analytics" co-presenter rendered in the booth.
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
  netMrr?: string;
  churnRate?: string;
  mrrAtRisk?: string;
  /** CSV of weekly churn %, oldest → newest, e.g. "4.2,4.8,5.1,5.6" */
  series?: string;
  headline?: string;
  accounts?: { name: string; mrr: string; signal: string; risk: string | number }[];
  period?: string;
  cohort?: string;
  severity?: string;
  plan?: string;
  provider?: string;
  query?: string;
  /** Visitor's tech stack — array or comma-separated string, e.g. ["Salesforce","Segment"] */
  techStack?: string | string[];
  /** Visitor's headcount — used to recommend the right pricing tier */
  employeeCount?: string | number;
  /** Visitor's company name — shown in the LIVE chip */
  company?: string;
  /** Visitor's role, e.g. "VP of Customer Success" */
  role?: string;
  /** Signal accuracy override; omitted → show product default "6 wks" lead time */
  accuracy?: string;
};

// ─── Constants ────────────────────────────────────────────────────────────────

const DEFAULT_ACCOUNTS: { name: string; mrr: string; signal: string; risk: number }[] = [
  { name: "Northwind Trading", mrr: "$4.2k", signal: "Usage down 64% MoM",         risk: 92 },
  { name: "Globex Corp",       mrr: "$8.9k", signal: "No admin login in 12 days",   risk: 87 },
  { name: "Initech",           mrr: "$3.1k", signal: "Support tickets spiking",     risk: 81 },
  { name: "Soylent Inc",       mrr: "$6.4k", signal: "Seats down 40% this quarter", risk: 76 },
];

// Default 8-week churn signal points (760 × 150 coordinate space, y=0 is top).
const DEFAULT_SERIES_PTS: ReadonlyArray<{ x: number; y: number }> = [
  { x: 0,   y: 98 }, { x: 95,  y: 90 }, { x: 190, y: 96 }, { x: 285, y: 74 },
  { x: 380, y: 80 }, { x: 475, y: 58 }, { x: 570, y: 64 }, { x: 665, y: 44 },
  { x: 760, y: 40 },
];

// Projected branch with alerts enabled — diverges downward (churn improving).
const PROJ_PTS: ReadonlyArray<{ x: number; y: number }> = [
  { x: 475, y: 58 }, { x: 570, y: 72 }, { x: 665, y: 92 }, { x: 760, y: 110 },
];

const INTEGRATIONS = [
  { id: "int-salesforce" as const, name: "Salesforce", abbr: "SF", connected: true  },
  { id: "int-segment"    as const, name: "Segment",    abbr: "SG", connected: true  },
  { id: "int-snowflake"  as const, name: "Snowflake",  abbr: "SN", connected: false },
  { id: "int-slack"      as const, name: "Slack",      abbr: "SL", connected: true  },
  { id: "int-hubspot"    as const, name: "HubSpot",    abbr: "HS", connected: false },
  { id: "int-intercom"   as const, name: "Intercom",   abbr: "IC", connected: false },
] as const;

const PLANS = [
  {
    id: "plan-starter"    as const,
    slug: "starter"       as const,
    name: "Starter",
    price: "$99",
    popular: false,
    maxEmp: 50,
    features: ["Up to 500 accounts", "7-week churn signal", "Email alerts", "Slack integration"],
  },
  {
    id: "plan-growth"     as const,
    slug: "growth"        as const,
    name: "Growth",
    price: "$299",
    popular: true,
    maxEmp: 500,
    features: ["Up to 2,500 accounts", "Real-time signals", "Smart alert routing", "All integrations", "Priority support"],
  },
  {
    id: "plan-enterprise" as const,
    slug: "enterprise"    as const,
    name: "Enterprise",
    price: "Custom",
    popular: false,
    maxEmp: Infinity,
    features: ["Unlimited accounts", "Custom models", "Dedicated CSM", "SLA guarantee", "On-prem option"],
  },
] as const;

// Safe overestimate of any line's total length in the 760×150 viewBox.
const LINE_LENGTH = 1000;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function cx(...cls: (string | false | undefined | null)[]): string {
  return cls.filter(Boolean).join(" ");
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).slice(0, 2);
  const inits = parts.map(p => p[0] ?? "").join("");
  return inits ? inits.toUpperCase() : "•";
}

function riskNum(r: string | number): number {
  if (typeof r === "number") return r;
  const n = parseFloat(r.replace(/[^0-9.]/g, ""));
  return isNaN(n) ? 0 : n;
}

function riskColor(r: number): string {
  if (r >= 88) return "var(--rust)";
  if (r >= 80) return "var(--clay)";
  return "var(--tan)";
}

/** Map visitor-supplied CSV series to SVG coordinate space (760 × 150). */
function parseSeriesCsv(csv: string | undefined): { x: number; y: number }[] | null {
  if (!csv) return null;
  const vals = csv.split(",").map(v => parseFloat(v.trim())).filter(v => !isNaN(v));
  if (vals.length < 2) return null;
  const lo = Math.min(...vals);
  const hi = Math.max(...vals);
  const span = Math.max(hi - lo, 0.0001);
  const yTop = 16, yBot = 140;
  // Higher churn → higher y position (inverted screen coords)
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
  const last = pts[pts.length - 1];
  const first = pts[0];
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
      const t = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - t, 3); // ease-out cubic
      setDisplay(fmtStat(parsed.value * eased, parsed));
      if (t < 1) frameId = requestAnimationFrame(tick);
    };
    frameId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frameId);
    // duration is a compile-time constant — excluding from deps is intentional
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
  // Sanitise useId output for valid SVG NCName usage
  const svgId = "g" + rawId.replace(/[^a-zA-Z0-9]/g, "");

  const scrollRef = useRef<HTMLDivElement>(null);

  // Scroll the highlighted element into view within the panel's scroll container.
  // Uses the data-el attribute to locate the element, same as the hl() ring system.
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
        {view === "churn"        && <ChurnView        params={params} hl={hl} svgId={svgId} />}
        {view === "alerts"       && <AlertsView       params={params} hl={hl} svgId={svgId} />}
        {view === "pricing"      && <PricingView      params={params} hl={hl} />}
        {view === "integrations" && <IntegrationsView params={params} hl={hl} />}
        {view === "query-result" && <QueryResultView  params={params} hl={hl} />}
      </div>
    </div>
  );
}

// ─── Panel Header (always visible) ───────────────────────────────────────────

function PanelHeader({ liveCompany }: { liveCompany?: string }) {
  return (
    <header className={s.header} aria-label="Acme Analytics">
      <div className={s.logo}>
        <div className={s.logoMark} aria-hidden="true">
          <div className={s.logoInner} />
        </div>
        <span className={s.logoName}>Acme Analytics</span>
      </div>
      <div className={s.headerRight}>
        {liveCompany && (
          <span className={s.liveChip} aria-label={`Live demo tailored for ${liveCompany}`}>
            LIVE · {liveCompany.toUpperCase()}
          </span>
        )}
        <div className={s.retentionBadge} aria-label="Retention product">
          <span>RETENTION</span>
          <span className={s.retentionDot} aria-hidden="true" />
        </div>
      </div>
    </header>
  );
}

// ─── HOME VIEW ────────────────────────────────────────────────────────────────

function HomeView({
  params,
  hl,
}: {
  params?: DemoParams;
  hl: (id: string) => string;
}) {
  const netMrr    = params?.netMrr    ?? "$148.2k";
  const churnRate = params?.churnRate ?? "5.8%";
  const company   = params?.company;
  const role      = params?.role;
  const accuracy  = params?.accuracy;

  return (
    <div>
      {/* Nav rail */}
      <nav className={s.homeNav} aria-label="Product sections">
        <button data-el="nav-churn"        className={cx(s.homeNavItem, hl("nav-churn"))}>        Retention    </button>
        <button data-el="nav-alerts"       className={cx(s.homeNavItem, hl("nav-alerts"))}>       Alerts       </button>
        <button data-el="nav-pricing"      className={cx(s.homeNavItem, hl("nav-pricing"))}>      Pricing      </button>
        <button data-el="nav-integrations" className={cx(s.homeNavItem, hl("nav-integrations"))}> Integrations </button>
      </nav>

      {/* Hero */}
      <div data-el="hero" className={cx(s.homeHero, hl("hero"))}>
        <p className={s.homeEyebrow}>
          {company ? `FOR ${company.toUpperCase()}` : "CUSTOMER INTELLIGENCE"}
        </p>
        <h1 className={s.homeHeadline}>
          Know when customers<br />are about to leave.
        </h1>
        <p className={s.homeSubtext}>
          {role
            ? `Built for ${role}s — spots churn signals 6 weeks out so your team saves accounts before they cancel.`
            : "Acme Analytics spots churn signals 6 weeks before customers cancel — so your team saves the account before it’s too late."
          }
        </p>
      </div>

      {/* CTAs */}
      <div className={s.homeCtas}>
        <button
          data-el="cta"
          className={cx(s.homeCta, s.primary, hl("cta"))}
          aria-label="Get started free"
        >
          Get started free →
        </button>
        <button className={cx(s.homeCta, s.ghost)} aria-label="Watch demo">
          Watch the demo
        </button>
      </div>

      {/* Stats strip — no hardcoded accuracy; derive lead time or use provided accuracy */}
      <div className={s.homeStats} aria-label="Key metrics">
        <div className={s.homeStat}>
          <strong className={s.homeStatValue}>
            <CountUpStat value={netMrr} />
          </strong>
          <span className={s.homeStatLabel}>Net MRR protected</span>
        </div>
        <div className={s.homeStat}>
          <strong className={s.homeStatValue}>
            <CountUpStat value={churnRate} />
          </strong>
          <span className={s.homeStatLabel}>Churn rate tracked</span>
        </div>
        <div className={s.homeStat}>
          <strong className={s.homeStatValue}>
            <CountUpStat value={accuracy ?? "6 wks"} />
          </strong>
          <span className={s.homeStatLabel}>
            {accuracy ? "Signal accuracy" : "Avg. lead time"}
          </span>
        </div>
      </div>
    </div>
  );
}

// ─── CHURN VIEW ───────────────────────────────────────────────────────────────

function ChurnView({
  params,
  hl,
  svgId,
}: {
  params?: DemoParams;
  hl: (id: string) => string;
  svgId: string;
}) {
  const headline  = params?.headline  ?? "At-Risk Accounts";
  const netMrr    = params?.netMrr    ?? "$148.2k";
  const churnRate = params?.churnRate ?? "5.8%";
  const mrrAtRisk = params?.mrrAtRisk ?? "$22.6k";
  const period    = params?.period    ?? "Last 30 days";

  const displayAccounts = (params?.accounts && params.accounts.length > 0)
    ? params.accounts
    : DEFAULT_ACCOUNTS;

  const hasLiveData = !!(params?.mrrAtRisk || params?.accounts?.length);

  return (
    <div>
      <div className={s.sectionRow}>
        <div>
          <p className={s.eyebrow}>CUSTOMER HEALTH</p>
          <h2 className={s.heading} style={{ marginBottom: 0 }}>{headline}</h2>
        </div>
        <span style={{
          fontFamily: "var(--font-mono)", fontSize: "0.68rem", fontWeight: 600,
          letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--muted)",
        }}>
          CHURN · {period.toUpperCase()}
        </span>
      </div>

      {/* Stat cards — numbers count up on entry */}
      <div className={s.statCards}>
        <div data-el="churn-rate" className={cx(s.statCard, s.churnActive, hl("churn-rate"))}>
          <span className={s.statLabel}>Churn Rate</span>
          <div style={{ display: "flex", alignItems: "baseline" }}>
            <CountUpStat value={churnRate} className={cx(s.statNumber, s.danger)} />
            <span className={s.statMeta}>↑ 1.4pt</span>
          </div>
        </div>

        <div className={s.statCard}>
          <span className={s.statLabel}>Net MRR</span>
          <CountUpStat value={netMrr} className={s.statNumber} />
        </div>

        <div className={s.statCard}>
          <span className={s.statLabel}>MRR at Risk</span>
          <CountUpStat
            value={mrrAtRisk}
            className={cx(s.statNumber, hasLiveData ? s.atRisk : undefined)}
          />
        </div>
      </div>

      {/* Churn line chart — draw-on animation + gridlines */}
      <div data-el="cohort-chart" className={cx(s.chartBlock, hl("cohort-chart"))}>
        <div className={s.chartHeader}>
          <span className={s.chartLabel}>
            {params?.cohort ? `COHORT · ${params.cohort.toUpperCase()}` : "CHURN SIGNAL · 8 WEEKS"}
          </span>
        </div>
        <div className={s.chartSvgWrap}>
          <ChurnChart series={params?.series} showProjection={false} svgId={svgId} />
        </div>
      </div>

      {/* Toggle row */}
      <div className={s.toggleRow}>
        <span className={s.eyebrow}>FLAGGED THIS WEEK</span>
        <div className={s.toggleGroup}>
          <span className={s.toggleLabel}>SMART CHURN ALERTS</span>
          <div className={s.toggle} aria-label="Alerts enabled" role="switch" aria-checked="false">
            <div className={s.toggleThumb} />
          </div>
        </div>
      </div>

      {/* At-risk accounts — staggered rise-in */}
      <div data-el="at-risk-accounts" className={cx(s.accountsSection, hl("at-risk-accounts"))}>
        <p className={s.accountsLabel}>AT-RISK ACCOUNTS</p>
        {displayAccounts.slice(0, 4).map((a, i) => (
          <AccountRow key={String(a.name)} account={a} index={i} />
        ))}
      </div>

      <button
        data-el="save-action"
        className={cx(s.saveAction, hl("save-action"))}
        aria-label="Set up churn alerts"
      >
        Set up churn alerts →
      </button>
    </div>
  );
}

function AccountRow({
  account,
  index,
}: {
  account: { name: string; mrr: string; signal: string; risk: string | number };
  index: number;
}) {
  const risk = riskNum(account.risk);
  const color = riskColor(risk);
  return (
    <div className={s.accountRow} style={{ animationDelay: `${index * 70}ms` }}>
      <div className={s.accountAvatar} aria-hidden="true">
        {initials(account.name)}
      </div>
      <div className={s.accountInfo}>
        <p className={s.accountName}>{account.name}</p>
        <p className={s.accountSignal}>{account.signal}</p>
      </div>
      <span className={s.accountMrr}>{account.mrr}</span>
      <div className={s.riskBlock}>
        <div className={s.riskHeader}>
          <span className={s.riskLabel}>RISK</span>
          <span className={s.riskPct} style={{ color }}>{risk}%</span>
        </div>
        <div className={s.riskTrack} role="meter" aria-valuenow={risk} aria-valuemin={0} aria-valuemax={100}>
          <div className={s.riskBar} style={{ width: `${risk}%`, background: color }} />
        </div>
      </div>
    </div>
  );
}

// ─── ALERTS VIEW ──────────────────────────────────────────────────────────────

function AlertsView({
  params,
  hl,
  svgId,
}: {
  params?: DemoParams;
  hl: (id: string) => string;
  svgId: string;
}) {
  const displayAccounts = (params?.accounts && params.accounts.length > 0)
    ? params.accounts
    : DEFAULT_ACCOUNTS;

  const sev = params?.severity?.toLowerCase();

  // Severity filter — was previously broken (returned "HIGH" on both ternary branches).
  // Now correctly yields HIGH / MED / LOW labels and filters by tier.
  const alertAccounts = (() => {
    if (sev === "high")   return displayAccounts.filter(a => riskNum(a.risk) >= 80);
    if (sev === "medium") return displayAccounts.filter(a => { const r = riskNum(a.risk); return r >= 60 && r < 80; });
    if (sev === "low")    return displayAccounts.filter(a => riskNum(a.risk) < 60);
    return displayAccounts;
  })();

  return (
    <div>
      <div className={s.sectionRow}>
        <div>
          <p className={s.eyebrow}>CHURN PREVENTION</p>
          <h2 className={s.heading} style={{ marginBottom: 0 }}>Smart Alerts</h2>
        </div>
        {/* Mini chart showing projected improvement */}
        <div style={{ height: "3.5rem", width: "9rem", flexShrink: 0 }}>
          <ChurnChart series={params?.series} showProjection svgId={`${svgId}-a`} />
        </div>
      </div>

      <button
        data-el="new-alert"
        className={cx(s.newAlertBtn, hl("new-alert"))}
        aria-label="Create a new alert rule"
      >
        + New alert rule
      </button>

      <div
        data-el="alert-list"
        className={cx(s.alertList, hl("alert-list"))}
        role="list"
        aria-label="At-risk account alerts"
      >
        {alertAccounts.length === 0 ? (
          // Empty state when filter yields no results — don't render a blank list
          <div className={s.alertEmptyState} role="status">
            No {sev ?? ""} severity alerts match the current filter.
          </div>
        ) : (
          alertAccounts.slice(0, 4).map((a, i) => {
            const risk = riskNum(a.risk);
            const color = riskColor(risk);
            // BUG FIX: original ternary returned "HIGH" on both branches (risk >= 88 and risk >= 80).
            const severity = risk >= 88 ? "HIGH" : risk >= 80 ? "MED" : "LOW";
            return (
              <div
                key={a.name}
                className={s.alertItem}
                role="listitem"
                style={{ animationDelay: `${i * 70}ms` }}
              >
                <div className={s.alertDot} aria-hidden="true" style={{ background: color }} />
                <div className={s.alertInfo}>
                  <p className={s.alertName}>{a.name}</p>
                  <p className={s.alertSignal}>{a.signal}</p>
                </div>
                <span className={s.alertMrr}>{a.mrr}</span>
                <span
                  className={s.alertSeverity}
                  style={{ color, borderColor: `${color}55`, background: `${color}18` }}
                >
                  {severity}
                </span>
              </div>
            );
          })
        )}
      </div>

      <div
        data-el="threshold-config"
        className={cx(s.thresholdPanel, hl("threshold-config"))}
        aria-label="Alert threshold configuration"
      >
        <div className={s.thresholdTopRow}>
          <span className={s.thresholdTitle}>Alert Threshold</span>
          <span className={s.thresholdValue}>80%</span>
        </div>
        <div className={s.thresholdTrack} role="slider" aria-valuenow={80} aria-valuemin={0} aria-valuemax={100}>
          <div className={s.thresholdFill} />
          <div className={s.thresholdHandle} aria-hidden="true" />
        </div>
        <div className={s.notifyRow}>
          <span className={s.notifyLabel}>Notify via</span>
          <NotifyChip label="Slack" active />
          <NotifyChip label="Email" active />
          <NotifyChip label="PagerDuty" active={false} />
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

function PricingView({
  params,
  hl,
}: {
  params?: DemoParams;
  hl: (id: string) => string;
}) {
  const recommendedSlug = params?.plan?.toLowerCase();

  const empCount = params?.employeeCount != null
    ? (typeof params.employeeCount === "number"
        ? params.employeeCount
        : parseInt(String(params.employeeCount), 10))
    : null;

  // Derive tier from headcount when explicit plan is not set
  const sizePlan = empCount == null || isNaN(empCount) ? null
    : empCount <= 50  ? "starter"
    : empCount <= 500 ? "growth"
    : "enterprise";

  const matchedSlug = recommendedSlug ?? sizePlan;
  const hasRecommendation = !!(recommendedSlug || (empCount != null && !isNaN(empCount)));

  return (
    <div>
      <p className={s.eyebrow}>PRICING</p>
      <h2 className={s.heading}>Simple, transparent pricing.</h2>

      <div className={s.pricingGrid}>
        {PLANS.map((plan, i) => {
          const isMatch = hasRecommendation && matchedSlug === plan.slug;
          const sizeNote = isMatch && empCount != null && !isNaN(empCount)
            ? `Right for ~${empCount}-person teams`
            : null;

          return (
            <div
              key={plan.id}
              data-el={plan.id}
              className={cx(
                s.planCard,
                plan.popular ? s.popular : undefined,
                isMatch ? s.recommended : undefined,
                hl(plan.id),
              )}
              style={{ animationDelay: `${i * 85}ms` }}
            >
              {isMatch && (
                <span className={s.recommendedBadge}>Recommended for you</span>
              )}
              {plan.popular && !isMatch && (
                <span className={s.popularBadge}>Most popular</span>
              )}
              <p className={s.planName}>{plan.name}</p>
              <div>
                <span className={s.planPriceNum}>{plan.price}</span>
                {plan.price !== "Custom" && (
                  <span className={s.planPricePer}>/mo</span>
                )}
              </div>
              {sizeNote && <p className={s.recommendedNote}>{sizeNote}</p>}
              <ul className={s.planFeatures} aria-label={`${plan.name} plan features`}>
                {plan.features.map(f => (
                  <li key={f} className={s.planFeature}>{f}</li>
                ))}
              </ul>
              <button
                className={cx(
                  s.planCta,
                  plan.id === "plan-growth" || isMatch ? s.ink : undefined,
                )}
                aria-label={`Choose ${plan.name} plan`}
              >
                {plan.id === "plan-enterprise" ? "Contact sales" : "Get started"}
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
        <span>Volume or multi-year?</span>
        <span style={{ color: "var(--clay)", fontWeight: 600 }}>Talk to sales →</span>
      </div>
    </div>
  );
}

// ─── INTEGRATIONS VIEW ────────────────────────────────────────────────────────

function IntegrationsView({
  params,
  hl,
}: {
  params?: DemoParams;
  hl: (id: string) => string;
}) {
  const activeProvider = params?.provider?.toLowerCase();

  // Parse techStack into a normalised list for matching
  const stackItems: string[] = (() => {
    if (!params?.techStack) return [];
    const raw = Array.isArray(params.techStack)
      ? params.techStack
      : params.techStack.split(",").map(t => t.trim()).filter(Boolean);
    return raw.map(t => t.toLowerCase());
  })();

  const hasStack = stackItems.length > 0;

  const inStack = (name: string): boolean =>
    stackItems.some(item =>
      name.toLowerCase().includes(item) || item.includes(name.toLowerCase())
    );

  // Stack matches float to the top; original ordering preserved within each group
  const sorted = [...INTEGRATIONS].sort((a, b) => {
    const aM = inStack(a.name), bM = inStack(b.name);
    if (aM && !bM) return -1;
    if (!aM && bM) return 1;
    return 0;
  });

  return (
    <div>
      <p className={s.eyebrow}>INTEGRATIONS</p>
      <h2 className={s.heading}>Connect your stack in minutes.</h2>

      <div className={s.intGrid}>
        {sorted.map((int, i) => {
          const connected = int.connected || activeProvider === int.name.toLowerCase();
          const detected  = hasStack && inStack(int.name);
          const dimmed    = hasStack && !inStack(int.name);
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
                <span className={s.stackBadge} aria-label="Detected in your tech stack">
                  Detected in your stack
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
        aria-label="Connect an integration"
      >
        Connect an integration →
      </button>
    </div>
  );
}

// ─── QUERY RESULT VIEW ────────────────────────────────────────────────────────

const LAST_ACTIVITY = ["3 days ago", "12 days ago", "2 days ago", "1 week ago"];

function QueryResultView({
  params,
  hl,
}: {
  params?: DemoParams;
  hl: (id: string) => string;
}) {
  // Use the visitor's actual question if provided
  const query = params?.query ?? "Show me accounts at risk of churning this month";
  const displayAccounts = (params?.accounts && params.accounts.length > 0)
    ? params.accounts
    : DEFAULT_ACCOUNTS;

  return (
    <div>
      <p className={s.eyebrow}>QUERY ASSISTANT</p>
      <h2 className={s.heading}>Ask your data anything.</h2>

      <div
        data-el="query-input"
        className={cx(s.queryInputWrap, hl("query-input"))}
        role="searchbox"
        aria-label="Natural language query"
      >
        <span className={s.queryGlyph} aria-hidden="true">⌘</span>
        <span className={s.queryText}>&ldquo;{query}&rdquo;</span>
      </div>

      <div data-el="result-table" className={cx(s.resultTableWrap, hl("result-table"))}>
        <table className={s.resultTable} aria-label="Query results">
          <thead>
            <tr>
              <th scope="col">Account</th>
              <th scope="col">Risk</th>
              <th scope="col">MRR</th>
              <th scope="col">Last active</th>
            </tr>
          </thead>
          <tbody>
            {displayAccounts.slice(0, 4).map((a, i) => {
              const risk = riskNum(a.risk);
              return (
                <tr
                  key={a.name}
                  className={s.resultRow}
                  style={{ animationDelay: `${i * 60}ms` }}
                >
                  <td>{a.name}</td>
                  <td className={s.mono} style={{ color: riskColor(risk) }}>{risk}%</td>
                  <td className={s.mono}>{a.mrr}</td>
                  <td style={{ color: "var(--muted)", fontFamily: "var(--font-mono)", fontSize: "0.78rem" }}>
                    {LAST_ACTIVITY[i] ?? "—"}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div
        data-el="result-chart"
        className={cx(s.resultChartWrap, hl("result-chart"))}
        aria-label="Risk score chart"
      >
        <p className={s.resultChartLabel}>CHURN RISK BY ACCOUNT</p>
        <ResultBarChart accounts={displayAccounts.slice(0, 4)} />
      </div>
    </div>
  );
}

function ResultBarChart({
  accounts,
}: {
  accounts: { name: string; mrr: string; signal: string; risk: string | number }[];
}) {
  // Start bars at zero, animate to real widths after mount
  const [filled, setFilled] = useState(false);
  useEffect(() => {
    const raf = requestAnimationFrame(() => setFilled(true));
    return () => cancelAnimationFrame(raf);
  }, []);

  const barH = 16;
  const gap = 10;
  const rows = accounts.length;
  const totalH = rows * barH + (rows - 1) * gap;
  const labelW = 28;
  const pctLabelW = 36;
  const trackW = 500 - labelW - pctLabelW - 8;

  return (
    <svg
      viewBox={`0 0 500 ${totalH}`}
      width="100%"
      height={totalH}
      aria-hidden="true"
    >
      {accounts.map((a, i) => {
        const risk = riskNum(a.risk);
        const color = riskColor(risk);
        const y = i * (barH + gap);
        const filledW = Math.max(0, Math.min(1, risk / 100)) * trackW;
        return (
          <g key={a.name} transform={`translate(0,${y})`}>
            <text
              x={0} y={barH - 3}
              fontFamily="var(--font-mono)" fontSize={10} fontWeight={700}
              fill="var(--muted)"
            >
              {initials(a.name)}
            </text>
            {/* Track */}
            <rect x={labelW} y={0} width={trackW} height={barH} rx={4} fill="rgba(20,20,19,0.07)" />
            {/* Animated fill — width transitions from 0 to target */}
            <rect
              x={labelW} y={0} height={barH} rx={4} fill={color}
              style={{
                width: filled ? filledW : 0,
                transition: `width 500ms cubic-bezier(0.4,0,0.2,1) ${i * 80}ms`,
              }}
            />
            {/* Percent label fades in after bar fills */}
            <text
              x={labelW + trackW + 8} y={barH - 3}
              fontFamily="var(--font-mono)" fontSize={10} fontWeight={700}
              fill={color}
              style={{
                opacity: filled ? 1 : 0,
                transition: `opacity 200ms ease ${i * 80 + 420}ms`,
              }}
            >
              {risk}%
            </text>
          </g>
        );
      })}
    </svg>
  );
}

// ─── Churn Line Chart (SVG) ───────────────────────────────────────────────────

function ChurnChart({
  series,
  showProjection,
  svgId,
}: {
  series: string | undefined;
  showProjection: boolean;
  svgId: string;
}) {
  const customPts = parseSeriesCsv(series);
  const mainPts   = customPts ?? DEFAULT_SERIES_PTS;
  const isCustom  = customPts !== null;

  // Draw-on: start with line invisible (dashoffset = LINE_LENGTH), animate to 0 after mount
  const [drawn, setDrawn] = useState(false);
  useEffect(() => {
    const raf = requestAnimationFrame(() => setDrawn(true));
    return () => cancelAnimationFrame(raf);
  }, []);

  // End-point label — use actual last value if series CSV is available
  const lastSeriesVal = series
    ? series.split(",").map(v => parseFloat(v.trim())).filter(v => !isNaN(v)).pop()
    : null;
  const endLabel = lastSeriesVal != null ? `${lastSeriesVal.toFixed(1)}%` : "7.3%";

  const lastPt = mainPts[mainPts.length - 1];

  const rustGradId = `${svgId}-rust`;
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
        <linearGradient id={rustGradId} x1="0" y1="0" x2="0" y2="150" gradientUnits="userSpaceOnUse">
          <stop offset="0%"   stopColor="var(--rust)" stopOpacity={0.18} />
          <stop offset="100%" stopColor="var(--rust)" stopOpacity={0}    />
        </linearGradient>
        <linearGradient id={clayGradId} x1="0" y1="0" x2="0" y2="150" gradientUnits="userSpaceOnUse">
          <stop offset="0%"   stopColor="var(--clay)" stopOpacity={0.20} />
          <stop offset="100%" stopColor="var(--clay)" stopOpacity={0}    />
        </linearGradient>
      </defs>

      {/* Faint gridlines — three horizontal bands + baseline */}
      {([38, 76, 114] as const).map(y => (
        <line key={y} x1={0} y1={y} x2={760} y2={y}
          stroke="rgba(20,20,19,0.055)" strokeWidth={1} />
      ))}
      <line x1={0} y1={148} x2={760} y2={148}
        stroke="rgba(20,20,19,0.10)" strokeWidth={1} />

      {/* Main area fill */}
      <path d={svgAreaPath(mainPts, 150)} fill={`url(#${rustGradId})`} />

      {/* Main line — draw-on via dashoffset transition */}
      <path
        d={svgLinePath(mainPts)}
        fill="none"
        stroke="var(--rust)"
        strokeWidth={2.5}
        strokeLinejoin="round"
        style={{
          strokeDasharray: LINE_LENGTH,
          strokeDashoffset: drawn ? 0 : LINE_LENGTH,
          transition: "stroke-dashoffset 650ms cubic-bezier(0.4,0,0.2,1)",
        }}
      />

      {/* End-point dot + value label — fade in after line finishes drawing */}
      <circle
        cx={lastPt.x} cy={lastPt.y} r={4.5}
        fill="var(--rust)"
        style={{
          opacity: drawn ? 1 : 0,
          transition: "opacity 220ms ease 600ms",
        }}
      />
      <text
        x={lastPt.x - 8} y={lastPt.y - 10}
        fontFamily="var(--font-mono)" fontSize={10} fontWeight={700}
        fill="var(--rust)" textAnchor="end"
        style={{
          opacity: drawn ? 1 : 0,
          transition: "opacity 220ms ease 660ms",
        }}
      >
        {endLabel}
      </text>

      {/* Projected branch — only in alerts view with no custom series */}
      {showProjection && !isCustom && (
        <>
          <path d={svgAreaPath(PROJ_PTS, 150)} fill={`url(#${clayGradId})`} />
          <path
            d={svgLinePath(PROJ_PTS)}
            fill="none"
            stroke="var(--clay)"
            strokeWidth={2.5}
            strokeLinejoin="round"
            strokeDasharray="6 5"
          />
          <circle
            cx={PROJ_PTS[PROJ_PTS.length - 1].x}
            cy={PROJ_PTS[PROJ_PTS.length - 1].y}
            r={4.5}
            fill="var(--clay)"
          />
        </>
      )}
    </svg>
  );
}

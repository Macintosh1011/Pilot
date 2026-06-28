"use client";

// AcmeDemoPanel — the live "Acme Analytics" co-presenter rendered in the booth.
// Pure function of props; the orchestration layer feeds all data.
// 'use client' required: view transitions re-trigger CSS animations via key change.

import { useId } from "react";
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
};

// ─── Constants ────────────────────────────────────────────────────────────────

const DEFAULT_ACCOUNTS: { name: string; mrr: string; signal: string; risk: number }[] = [
  { name: "Northwind Trading", mrr: "$4.2k", signal: "Usage down 64% MoM",         risk: 92 },
  { name: "Globex Corp",       mrr: "$8.9k", signal: "No admin login in 12 days",   risk: 87 },
  { name: "Initech",           mrr: "$3.1k", signal: "Support tickets spiking",     risk: 81 },
  { name: "Soylent Inc",       mrr: "$6.4k", signal: "Seats down 40% this quarter", risk: 76 },
];

// Default 8-week churn signal points (760 × 150 coordinate space, y=0 is top).
// Higher y = lower on screen = lower churn value. The line trends upward (worsening churn).
const DEFAULT_SERIES_PTS: ReadonlyArray<{ x: number; y: number }> = [
  { x: 0,   y: 98 }, { x: 95,  y: 90 }, { x: 190, y: 96 }, { x: 285, y: 74 },
  { x: 380, y: 80 }, { x: 475, y: 58 }, { x: 570, y: 64 }, { x: 665, y: 44 },
  { x: 760, y: 40 },
];

// Projected branch with alerts enabled — diverges downward (churn improving).
const PROJ_PTS: ReadonlyArray<{ x: number; y: number }> = [
  { x: 475, y: 58 }, { x: 570, y: 72 }, { x: 665, y: 92 }, { x: 760, y: 110 },
];

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
  // Higher churn → lower y (higher position) to mirror a conventional y-up chart
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

  // Returns the highlight class when this element id is active
  const hl = (elId: string) => (highlight === elId ? s.highlighted : "");

  return (
    <div className={s.shell}>
      <PanelHeader />
      <div key={view} className={s.viewWrap}>
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

function PanelHeader() {
  return (
    <header className={s.header} aria-label="Acme Analytics">
      <div className={s.logo}>
        <div className={s.logoMark} aria-hidden="true">
          <div className={s.logoInner} />
        </div>
        <span className={s.logoName}>Acme Analytics</span>
      </div>
      <div className={s.retentionBadge} aria-label="Retention product">
        <span>RETENTION</span>
        <span className={s.retentionDot} aria-hidden="true" />
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
  return (
    <div>
      {/* Nav rail */}
      <nav className={s.homeNav} aria-label="Product sections">
        <button data-el="nav-churn"        className={cx(s.homeNavItem, hl("nav-churn"))}>        Retention </button>
        <button data-el="nav-alerts"       className={cx(s.homeNavItem, hl("nav-alerts"))}>       Alerts    </button>
        <button data-el="nav-pricing"      className={cx(s.homeNavItem, hl("nav-pricing"))}>      Pricing   </button>
        <button data-el="nav-integrations" className={cx(s.homeNavItem, hl("nav-integrations"))}> Integrations </button>
      </nav>

      {/* Hero */}
      <div data-el="hero" className={cx(s.homeHero, hl("hero"))}>
        <p className={s.homeEyebrow}>CUSTOMER INTELLIGENCE</p>
        <h1 className={s.homeHeadline}>
          Know when customers<br />are about to leave.
        </h1>
        <p className={s.homeSubtext}>
          Acme Analytics spots churn signals 6 weeks before customers cancel
          — so your team saves the account before it&rsquo;s too late.
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

      {/* Stats strip */}
      <div className={s.homeStats} aria-label="Key metrics">
        <div className={s.homeStat}>
          <strong className={s.homeStatValue}>{params?.netMrr ?? "$148.2k"}</strong>
          <span className={s.homeStatLabel}>Net MRR protected</span>
        </div>
        <div className={s.homeStat}>
          <strong className={s.homeStatValue}>{params?.churnRate ?? "5.8%"}</strong>
          <span className={s.homeStatLabel}>Churn rate tracked</span>
        </div>
        <div className={s.homeStat}>
          <strong className={s.homeStatValue}>92%</strong>
          <span className={s.homeStatLabel}>Signal accuracy</span>
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
  const headline   = params?.headline   ?? "At-Risk Accounts";
  const netMrr     = params?.netMrr     ?? "$148.2k";
  const churnRate  = params?.churnRate  ?? "5.8%";
  const mrrAtRisk  = params?.mrrAtRisk  ?? "$22.6k";
  const period     = params?.period     ?? "Last 30 days";
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

      {/* Stat cards */}
      <div className={s.statCards}>
        {/* Churn rate — always highlighted as the problem */}
        <div
          data-el="churn-rate"
          className={cx(s.statCard, s.churnActive, hl("churn-rate"))}
        >
          <span className={s.statLabel}>Churn Rate</span>
          <div style={{ display: "flex", alignItems: "baseline" }}>
            <span className={cx(s.statNumber, s.danger)}>{churnRate}</span>
            <span className={s.statMeta}>↑ 1.4pt</span>
          </div>
        </div>

        <div className={s.statCard}>
          <span className={s.statLabel}>Net MRR</span>
          <span className={s.statNumber}>{netMrr}</span>
        </div>

        <div className={s.statCard}>
          <span className={s.statLabel}>MRR at Risk</span>
          <span className={cx(s.statNumber, hasLiveData ? s.atRisk : undefined)}>
            {mrrAtRisk}
          </span>
        </div>
      </div>

      {/* Churn line chart */}
      <div
        data-el="cohort-chart"
        className={cx(s.chartBlock, hl("cohort-chart"))}
      >
        <div className={s.chartHeader}>
          <span className={s.chartLabel}>
            {params?.cohort ? `COHORT · ${params.cohort.toUpperCase()}` : "CHURN SIGNAL · 8 WEEKS"}
          </span>
        </div>
        <div className={s.chartSvgWrap}>
          <ChurnChart series={params?.series} showProjection={false} svgId={svgId} />
        </div>
      </div>

      {/* Toggle row (always on in churn view) */}
      <div className={s.toggleRow}>
        <span className={s.eyebrow}>FLAGGED THIS WEEK</span>
        <div className={s.toggleGroup}>
          <span className={s.toggleLabel}>SMART CHURN ALERTS</span>
          <div className={s.toggle} aria-label="Alerts enabled" role="switch" aria-checked="false">
            <div className={s.toggleThumb} />
          </div>
        </div>
      </div>

      {/* At-risk accounts */}
      <div
        data-el="at-risk-accounts"
        className={cx(s.accountsSection, hl("at-risk-accounts"))}
      >
        <p className={s.accountsLabel}>AT-RISK ACCOUNTS</p>
        {displayAccounts.slice(0, 4).map(a => (
          <AccountRow key={typeof a.name === "string" ? a.name : String(a.name)} account={a} />
        ))}
      </div>

      {/* Save action */}
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
}: {
  account: { name: string; mrr: string; signal: string; risk: string | number };
}) {
  const risk = riskNum(account.risk);
  const color = riskColor(risk);
  return (
    <div className={s.accountRow}>
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
          <div
            className={s.riskBar}
            style={{ width: `${risk}%`, background: color }}
          />
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

  const alertAccounts = params?.severity === "high"
    ? displayAccounts.filter(a => riskNum(a.risk) >= 80)
    : displayAccounts;

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

      {/* New alert button */}
      <button
        data-el="new-alert"
        className={cx(s.newAlertBtn, hl("new-alert"))}
        aria-label="Create a new alert rule"
      >
        + New alert rule
      </button>

      {/* Alert list */}
      <div
        data-el="alert-list"
        className={cx(s.alertList, hl("alert-list"))}
        role="list"
        aria-label="At-risk account alerts"
      >
        {alertAccounts.slice(0, 4).map(a => {
          const risk = riskNum(a.risk);
          const color = riskColor(risk);
          const severity = risk >= 88 ? "HIGH" : risk >= 80 ? "HIGH" : "MED";
          return (
            <div key={a.name} className={s.alertItem} role="listitem">
              <div
                className={s.alertDot}
                aria-hidden="true"
                style={{ background: color }}
              />
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
        })}
      </div>

      {/* Threshold config */}
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

const PLANS = [
  {
    id: "plan-starter"    as const,
    name: "Starter",
    price: "$99",
    popular: false,
    features: ["Up to 500 accounts", "7-week churn signal", "Email alerts", "Slack integration"],
  },
  {
    id: "plan-growth"     as const,
    name: "Growth",
    price: "$299",
    popular: true,
    features: ["Up to 2,500 accounts", "Real-time signals", "Smart alert routing", "All integrations", "Priority support"],
  },
  {
    id: "plan-enterprise" as const,
    name: "Enterprise",
    price: "Custom",
    popular: false,
    features: ["Unlimited accounts", "Custom models", "Dedicated CSM", "SLA guarantee", "On-prem option"],
  },
] as const;

function PricingView({
  params,
  hl,
}: {
  params?: DemoParams;
  hl: (id: string) => string;
}) {
  return (
    <div>
      <p className={s.eyebrow}>PRICING</p>
      <h2 className={s.heading}>Simple, transparent pricing.</h2>

      <div className={s.pricingGrid}>
        {PLANS.map(plan => (
          <div
            key={plan.id}
            data-el={plan.id}
            className={cx(
              s.planCard,
              plan.popular ? s.popular : undefined,
              hl(plan.id),
            )}
          >
            {plan.popular && <span className={s.popularBadge}>Most popular</span>}
            <p className={s.planName}>{plan.name}</p>
            <div>
              <span className={s.planPriceNum}>{plan.price}</span>
              {plan.price !== "Custom" && (
                <span className={s.planPricePer}>/mo</span>
              )}
            </div>
            <ul className={s.planFeatures} aria-label={`${plan.name} plan features`}>
              {plan.features.map(f => (
                <li key={f} className={s.planFeature}>{f}</li>
              ))}
            </ul>
            <button
              className={cx(
                s.planCta,
                plan.id === "plan-growth" ? s.ink : undefined,
              )}
              aria-label={`Choose ${plan.name} plan`}
            >
              {plan.id === "plan-enterprise" ? "Contact sales" : "Get started"}
            </button>
          </div>
        ))}
      </div>

      {/* Contact sales CTA */}
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

const INTEGRATIONS = [
  { id: "int-salesforce" as const, name: "Salesforce", abbr: "SF", connected: true  },
  { id: "int-segment"    as const, name: "Segment",    abbr: "SG", connected: true  },
  { id: "int-snowflake"  as const, name: "Snowflake",  abbr: "SN", connected: false },
  { id: "int-slack"      as const, name: "Slack",      abbr: "SL", connected: true  },
  { id: "int-hubspot"    as const, name: "HubSpot",    abbr: "HS", connected: false },
] as const;

function IntegrationsView({
  params,
  hl,
}: {
  params?: DemoParams;
  hl: (id: string) => string;
}) {
  // If a specific provider is highlighted via params, mark it connected
  const activeProvider = params?.provider?.toLowerCase();

  return (
    <div>
      <p className={s.eyebrow}>INTEGRATIONS</p>
      <h2 className={s.heading}>Connect your stack in minutes.</h2>

      <div className={s.intGrid}>
        {INTEGRATIONS.map(int => {
          const connected = int.connected || activeProvider === int.name.toLowerCase();
          return (
            <div
              key={int.id}
              data-el={int.id}
              className={cx(s.intCard, hl(int.id))}
            >
              <div className={s.intIcon} aria-hidden="true">{int.abbr}</div>
              <p className={s.intName}>{int.name}</p>
              <span className={cx(s.intStatus, connected ? s.connected : s.available)}>
                {connected ? "Connected" : "Available"}
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
  const query = params?.query ?? "Show me accounts at risk of churning this month";
  const displayAccounts = (params?.accounts && params.accounts.length > 0)
    ? params.accounts
    : DEFAULT_ACCOUNTS;

  return (
    <div>
      <p className={s.eyebrow}>QUERY ASSISTANT</p>
      <h2 className={s.heading}>Ask your data anything.</h2>

      {/* Query input */}
      <div
        data-el="query-input"
        className={cx(s.queryInputWrap, hl("query-input"))}
        role="searchbox"
        aria-label="Natural language query"
      >
        <span className={s.queryGlyph} aria-hidden="true">⌘</span>
        <span className={s.queryText}>&ldquo;{query}&rdquo;</span>
      </div>

      {/* Result table */}
      <div
        data-el="result-table"
        className={cx(s.resultTableWrap, hl("result-table"))}
      >
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
                <tr key={a.name}>
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

      {/* Result chart */}
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
            <rect
              x={labelW} y={0} width={trackW} height={barH}
              rx={4} fill="rgba(20,20,19,0.07)"
            />
            {/* Fill */}
            <rect
              x={labelW} y={0} width={filledW} height={barH}
              rx={4} fill={color}
            />
            {/* Pct label */}
            <text
              x={labelW + trackW + 8} y={barH - 3}
              fontFamily="var(--font-mono)" fontSize={10} fontWeight={700}
              fill={color}
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
  const mainPts = customPts ?? DEFAULT_SERIES_PTS;
  const isCustom = customPts !== null;

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
        {/* Gradient from y=0 to y=150 in userSpace — fills the area below each line */}
        <linearGradient
          id={rustGradId}
          x1="0" y1="0" x2="0" y2="150"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0%"   stopColor="var(--rust)" stopOpacity={0.18} />
          <stop offset="100%" stopColor="var(--rust)" stopOpacity={0}    />
        </linearGradient>
        <linearGradient
          id={clayGradId}
          x1="0" y1="0" x2="0" y2="150"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0%"   stopColor="var(--clay)" stopOpacity={0.20} />
          <stop offset="100%" stopColor="var(--clay)" stopOpacity={0}    />
        </linearGradient>
      </defs>

      {/* Main area fill */}
      <path d={svgAreaPath(mainPts, 150)} fill={`url(#${rustGradId})`} />
      {/* Main line */}
      <path
        d={svgLinePath(mainPts)}
        fill="none"
        stroke="var(--rust)"
        strokeWidth={2.5}
        strokeLinejoin="round"
      />

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
          {/* Terminal dot on projected end */}
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

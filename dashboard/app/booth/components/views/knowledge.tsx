"use client";

import { QuillChrome, hl as getHl } from "./QuillChrome";
import { cx, CountUpStat } from "./utils";
import type { ViewProps } from "./types";
import s from "../AcmeDemoPanel.module.css";
import k from "./knowledge.module.css";

// ─── Defaults ─────────────────────────────────────────────────────────────────

type Source = { name: string; icon: string; articles: number; coverage: number };

const DEFAULT_SOURCES: Source[] = [
  { name: "Help Center",   icon: "HC", articles: 324, coverage:  94 },
  { name: "Product Docs",  icon: "PD", articles: 142, coverage:  89 },
  { name: "Changelog",     icon: "CL", articles:  91, coverage: 100 },
  { name: "Onboarding",    icon: "OB", articles:  48, coverage:  76 },
];

const DEFAULT_GAP_TOPIC = "Custom webhook retry policy";

const DEFAULT_ARTICLE_TITLE = "Setting Up Custom Webhook Retry Policies";

const DEFAULT_ARTICLE_BODY =
  "When a webhook delivery fails, Quill retries automatically with exponential backoff " +
  "(1 min → 5 min → 30 min). You can customize the schedule, set failure thresholds, and " +
  "configure alert channels from Developer Settings → Webhooks. Max retries defaults to 5; " +
  "payloads are retained for 72 hours before expiry.";

const ARTICLE_DATE = "Jun 28, 2026";

// ─── Source row ───────────────────────────────────────────────────────────────

function SourceRow({ src, delay }: { src: Source; delay: number }) {
  const pct = Math.min(100, Math.max(0, src.coverage));
  return (
    <div className={k.sourceRow} style={{ animationDelay: `${delay}ms` }} role="listitem">
      <div className={k.sourceIcon} aria-hidden="true">{src.icon}</div>
      <span className={k.sourceName}>{src.name}</span>
      <span className={k.sourceMeta}>{src.articles} articles</span>
      <div className={k.sourceCovBlock}>
        <div className={k.sourceCovHeader}>
          <span className={k.sourceCovLabel}>COV</span>
          <span className={k.sourceCovPct}>{pct}%</span>
        </div>
        <div className={k.covTrack} aria-hidden="true">
          <div className={k.covBar} style={{ width: `${pct}%` }} />
        </div>
      </div>
    </div>
  );
}

// ─── View ─────────────────────────────────────────────────────────────────────

export default function KnowledgeView({ params, highlight }: ViewProps) {
  const hl = (id: string) => getHl(highlight, id);

  // Coverage — accept number or string like "91" or "91%"
  const coverageRaw = params?.coverage;
  const coverageNum =
    coverageRaw != null
      ? parseFloat(`${coverageRaw}`.replace(/[^0-9.]/g, ""))
      : 91;
  const coverageDisplay = `${isNaN(coverageNum) ? 91 : Math.round(coverageNum)}%`;

  const gapTopic = params?.gapTopic ?? DEFAULT_GAP_TOPIC;

  // Parse CSV sources string or use defaults
  const customNames = params?.sources
    ?.split(",")
    .map((n) => n.trim())
    .filter(Boolean);

  const FALLBACK_ARTICLES = [324, 142, 91, 48];
  const FALLBACK_COVERAGE = [94, 89, 100, 76];

  const sources: Source[] =
    customNames && customNames.length > 0
      ? customNames.map((name, i) => ({
          name,
          icon: name.slice(0, 2).toUpperCase(),
          articles: FALLBACK_ARTICLES[i % FALLBACK_ARTICLES.length] ?? 80,
          coverage: FALLBACK_COVERAGE[i % FALLBACK_COVERAGE.length] ?? 88,
        }))
      : DEFAULT_SOURCES;

  const totalArticles = sources.reduce((sum, src) => sum + src.articles, 0);

  // Article title: use gap topic to title-case if custom, else use the default
  const articleTitle =
    gapTopic === DEFAULT_GAP_TOPIC
      ? DEFAULT_ARTICLE_TITLE
      : gapTopic.replace(/\b\w/g, (c) => c.toUpperCase());

  // Article body: generic template when a custom gap topic is provided
  const articleBody =
    gapTopic === DEFAULT_GAP_TOPIC
      ? DEFAULT_ARTICLE_BODY
      : `This article covers everything you need to know about ${gapTopic.toLowerCase()}. ` +
        "Below you'll find step-by-step setup instructions, configuration options, and " +
        "troubleshooting tips to help you get up and running quickly. " +
        "If you run into any issues, our support team is always available to help.";

  return (
    <QuillChrome active="knowledge" company={params?.company} highlight={highlight}>
      {/* ── Header ── */}
      <div className={s.sectionRow}>
        <div>
          <p className={s.eyebrow}>KNOWLEDGE BASE</p>
          <h2 className={s.heading} style={{ marginBottom: 0 }}>Always accurate.</h2>
        </div>
        <span
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: "0.68rem",
            fontWeight: 600,
            letterSpacing: "0.08em",
            textTransform: "uppercase" as const,
            color: "var(--muted)",
          }}
        >
          QUILL · LIVE SYNC
        </span>
      </div>

      {/* ── KPI row ── */}
      <div className={s.statCards}>
        <div
          data-el="coverage"
          className={cx(s.statCard, s.churnActive, k.coverageKpi, hl("coverage"))}
        >
          <span className={s.statLabel}>Coverage</span>
          <CountUpStat value={coverageDisplay} className={cx(s.statNumber, s.good)} />
        </div>
        <div className={s.statCard}>
          <span className={s.statLabel}>Sources</span>
          <CountUpStat value={`${sources.length}`} className={s.statNumber} />
        </div>
        <div className={s.statCard}>
          <span className={s.statLabel}>Articles</span>
          <CountUpStat value={`${totalArticles}`} className={s.statNumber} />
        </div>
      </div>

      {/* ── Connected sources ── */}
      <div className={s.sectionRow} style={{ marginBottom: "0.5rem" }}>
        <p className={s.eyebrow} style={{ margin: 0 }}>CONNECTED SOURCES</p>
        <span
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: "0.6rem",
            fontWeight: 700,
            letterSpacing: "0.08em",
            textTransform: "uppercase" as const,
            padding: "0.18rem 0.5rem",
            background: "rgba(90,122,88,0.10)",
            border: "1px solid rgba(90,122,88,0.22)",
            borderRadius: "999px",
            color: "var(--success)",
          }}
        >
          SYNCED
        </span>
      </div>
      <div
        data-el="sources"
        className={hl("sources")}
        role="list"
        aria-label="Connected knowledge sources"
        style={{ marginBottom: "1.125rem" }}
      >
        {sources.map((src, i) => (
          <SourceRow key={src.name} src={src} delay={i * 55} />
        ))}
      </div>

      {/* ── Gap detected ── */}
      <div
        data-el="gap-detected"
        className={cx(k.gapCard, hl("gap-detected"))}
        role="alert"
        aria-label="Knowledge gap detected"
      >
        <div className={k.gapHeader}>
          <span className={k.gapEyebrow}>GAP DETECTED</span>
          <span className={k.gapBadge}>NO DOC FOUND</span>
        </div>
        <p className={k.gapTopicText}>{gapTopic}</p>
        <p className={k.gapDesc}>
          12 tickets left unanswered in the last 7 days — no article covers this topic.
          Quill drafted one automatically.
        </p>
        <span className={k.gapAction}>↓ Draft ready to review</span>
      </div>

      {/* ── Drafted article ── */}
      <div
        data-el="drafted-article"
        className={cx(k.articleCard, hl("drafted-article"))}
        aria-label="Auto-drafted article ready to publish"
      >
        <div className={k.articleHeader}>
          <span className={k.articleEyebrow}>
            <span className={k.articleDot} aria-hidden="true" />
            AUTO-DRAFTED BY QUILL
          </span>
          <span className={k.publishBadge}>READY TO PUBLISH</span>
        </div>
        <h3 className={k.articleTitle}>{articleTitle}</h3>
        <p className={k.articleBody}>{articleBody}</p>
        <div className={k.articleFooter}>
          <span className={k.articleMeta}>
            Draft · {ARTICLE_DATE} · 1 min read
          </span>
          <button
            className={k.publishBtn}
            type="button"
            aria-label="Publish this article to your help center"
          >
            Publish Article →
          </button>
        </div>
      </div>
    </QuillChrome>
  );
}

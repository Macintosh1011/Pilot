"use client";

import { QuillChrome, hl as getHl } from "./QuillChrome";
import { cx, CountUpStat } from "./utils";
import type { ViewProps } from "./types";
import s from "../AcmeDemoPanel.module.css";

export default function HomeView({ params, highlight }: ViewProps) {
  const hl = (id: string) => getHl(highlight, id);

  const deflectionRate = params?.deflectionRate ?? "63%";
  const firstResponse  = params?.firstResponse  ?? "3s";
  const csat           = params?.csat           ?? "4.8/5";
  const company        = params?.company;
  const role           = params?.role;

  return (
    <QuillChrome active="home" company={company} highlight={highlight}>
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
    </QuillChrome>
  );
}

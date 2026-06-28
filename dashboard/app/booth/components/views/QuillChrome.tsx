"use client";

import React, { useEffect, useRef } from "react";
import type { DemoView } from "./types";
import s from "./QuillChrome.module.css";

// ─── Nav rail config ──────────────────────────────────────────────────────────

const NAV_ITEMS: { key: DemoView; label: string }[] = [
  { key: "home",         label: "Home"         },
  { key: "query-result", label: "Live Answer"  },
  { key: "churn",        label: "Impact"       },
  { key: "alerts",       label: "Escalations"  },
  { key: "integrations", label: "Integrations" },
  { key: "pricing",      label: "Pricing"      },
  // divider after pricing
  { key: "actions",      label: "Actions"      },
  { key: "voice",        label: "Voice"        },
  { key: "proactive",    label: "Proactive"    },
  { key: "sentiment",    label: "Sentiment"    },
  { key: "channels",     label: "Channels"     },
  { key: "languages",    label: "Languages"    },
  { key: "brand-voice",  label: "Brand Voice"  },
  { key: "knowledge",    label: "Knowledge"    },
  { key: "compliance",   label: "Compliance"   },
  { key: "insights",     label: "Insights"     },
  { key: "copilot",      label: "Co-pilot"     },
  { key: "experiments",  label: "A/B Tests"    },
];

const DIVIDER_AFTER: DemoView = "pricing";

// ─── QuillChrome ─────────────────────────────────────────────────────────────

/**
 * Shared Quill app shell: header (wordmark + LIVE chip) + left nav rail + body.
 * Every view renders its content as children inside this shell.
 *
 * Props:
 *   company  — visitor's company for the LIVE chip (omit → chip hidden)
 *   active   — which nav item to light up
 *   highlight — elementId to scroll into view (data-el attribute)
 *   children — the view's own content
 */
export function QuillChrome({
  company,
  active,
  highlight,
  children,
}: {
  company?: string;
  active?: DemoView;
  highlight?: string;
  children: React.ReactNode;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!highlight || !scrollRef.current) return;
    const el = scrollRef.current.querySelector(
      `[data-el="${highlight.replace(/"/g, '\\"')}"]`,
    ) as HTMLElement | null;
    if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [highlight]);

  return (
    <div className={s.shell}>
      {/* ── Top bar ── */}
      <header className={s.header} aria-label="Quill">
        <div className={s.logo}>
          <div className={s.logoMark} aria-hidden="true">
            <div className={s.logoInner} />
          </div>
          <span className={s.logoName}>Quill</span>
        </div>
        <div className={s.headerRight}>
          {company && (
            <span
              className={s.liveChip}
              aria-label={`Live demo tailored for ${company}`}
            >
              LIVE · {company.toUpperCase()}
            </span>
          )}
          <span className={s.supportBadge} aria-label="AI support product">
            SUPPORT AI
            <span className={s.supportDot} aria-hidden="true" />
          </span>
        </div>
      </header>

      {/* ── Body (nav rail + content) ── */}
      <div className={s.body}>
        <nav className={s.navRail} aria-label="Product sections">
          {NAV_ITEMS.map((item) => (
            <React.Fragment key={item.key}>
              <div
                className={`${s.navItem}${active === item.key ? ` ${s.active}` : ""}`}
                aria-current={active === item.key ? "page" : undefined}
              >
                {item.label}
              </div>
              {item.key === DIVIDER_AFTER && (
                <div className={s.navDivider} aria-hidden="true" />
              )}
            </React.Fragment>
          ))}
        </nav>

        <div ref={scrollRef} className={s.viewWrap}>
          {children}
        </div>
      </div>
    </div>
  );
}

// ─── Highlight helper ─────────────────────────────────────────────────────────

/**
 * Returns the CSS class that triggers the clay glow/pulse when highlight === elId.
 * Apply to any element's className via: className={`${myClass} ${hl(highlight, "my-el-id")}`}
 *
 * The class name is the hashed CSS module token from QuillChrome.module.css, valid
 * globally — any element that receives it gets the animation regardless of component.
 */
export function hl(highlight: string | undefined, elId: string): string {
  return highlight === elId ? s.highlighted : "";
}

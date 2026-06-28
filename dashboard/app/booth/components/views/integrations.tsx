"use client";

import { QuillChrome, hl as getHl } from "./QuillChrome";
import { cx } from "./utils";
import type { ViewProps } from "./types";
import s from "../AcmeDemoPanel.module.css";

// ─── Constants ────────────────────────────────────────────────────────────────

const QUILL_INTEGRATIONS = [
  { id: "int-helpcenter" as const, name: "Help Center", abbr: "HC", defaultOn: false },
  { id: "int-zendesk"    as const, name: "Zendesk",     abbr: "ZD", defaultOn: true  },
  { id: "int-intercom"   as const, name: "Intercom",    abbr: "IC", defaultOn: false },
  { id: "int-slack"      as const, name: "Slack",       abbr: "SL", defaultOn: true  },
  { id: "int-notion"     as const, name: "Notion",      abbr: "NT", defaultOn: false },
] as const;

// ─── View ─────────────────────────────────────────────────────────────────────

export default function IntegrationsView({ params, highlight }: ViewProps) {
  const hl = (id: string) => getHl(highlight, id);

  const toolItems: string[] = (() => {
    if (!params?.tools) return [];
    return params.tools.split(",").map((t) => t.trim().toLowerCase()).filter(Boolean);
  })();

  const hasTools = toolItems.length > 0;

  const inTools = (name: string): boolean =>
    toolItems.some(
      (item) => name.toLowerCase().includes(item) || item.includes(name.toLowerCase()),
    );

  const sorted = [...QUILL_INTEGRATIONS].sort((a, b) => {
    const aM = inTools(a.name), bM = inTools(b.name);
    if (aM && !bM) return -1;
    if (!aM && bM) return 1;
    return 0;
  });

  return (
    <QuillChrome active="integrations" company={params?.company} highlight={highlight}>
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
    </QuillChrome>
  );
}

"use client";

import { QuillChrome, hl as getHl } from "./QuillChrome";
import { cx } from "./utils";
import type { ViewProps } from "./types";
import s from "../AcmeDemoPanel.module.css";
import cs from "./channels.module.css";

// ─── Defaults ────────────────────────────────────────────────────────────────

type ChannelId = "email" | "chat" | "slack" | "whatsapp" | "sms" | "inapp";

interface Thread {
  id: ChannelId;
  from: string;
  preview: string;
  time: string;
  resolved: boolean;
}

const DEFAULT_THREADS: Thread[] = [
  { id: "email",     from: "sarah.kim@acme.co",  preview: "Can I change my billing cycle to annual?",   time: "2m ago",  resolved: true  },
  { id: "chat",      from: "Marcus (live chat)",  preview: "My dashboard isn't loading — tried incognito", time: "4m ago",  resolved: true  },
  { id: "slack",     from: "#support-channel",    preview: "Hey team, SSO config question for staging",  time: "7m ago",  resolved: true  },
  { id: "whatsapp",  from: "+1 (555) 204-8813",   preview: "How do I export my data as CSV?",            time: "11m ago", resolved: false },
  { id: "sms",       from: "+1 (555) 091-3345",   preview: "Reset password link expired, need new one",  time: "14m ago", resolved: true  },
  { id: "inapp",     from: "Free trial user",      preview: "What's the difference between Starter and Pro?", time: "18m ago", resolved: true  },
];

const DEFAULT_VOLUME: Record<ChannelId, number> = {
  email:    42,
  chat:     31,
  slack:    12,
  whatsapp: 8,
  sms:      4,
  inapp:    3,
};

const CHANNEL_META: Record<ChannelId, { label: string; color: string; icon: React.ReactNode }> = {
  email:    { label: "Email",     color: "#4A90D9", icon: <EmailIcon /> },
  chat:     { label: "Live Chat", color: "var(--clay)", icon: <ChatIcon /> },
  slack:    { label: "Slack",     color: "#6B3FAE", icon: <SlackIcon /> },
  whatsapp: { label: "WhatsApp",  color: "#3CAB66", icon: <WAIcon /> },
  sms:      { label: "SMS",       color: "var(--tan)", icon: <SmsIcon /> },
  inapp:    { label: "In-app",    color: "var(--muted)", icon: <InAppIcon /> },
};

// ─── Channel icons (inline SVG, small 14×14) ─────────────────────────────────

function EmailIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
      <rect x="1" y="3" width="12" height="8" rx="1.5" stroke="currentColor" strokeWidth="1.3"/>
      <path d="M1.5 4l5.5 4 5.5-4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
    </svg>
  );
}
function ChatIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
      <path d="M2 2h10a1 1 0 011 1v6a1 1 0 01-1 1H4.5L2 12.5V3a1 1 0 011-1z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round"/>
    </svg>
  );
}
function SlackIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
      <circle cx="5" cy="3.5" r="1.25" fill="currentColor"/>
      <rect x="4" y="5.5" width="2" height="5" rx="1" fill="currentColor"/>
      <circle cx="9" cy="10.5" r="1.25" fill="currentColor"/>
      <rect x="8" y="3.5" width="2" height="5" rx="1" fill="currentColor"/>
    </svg>
  );
}
function WAIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
      <circle cx="7" cy="7" r="5.5" stroke="currentColor" strokeWidth="1.3"/>
      <path d="M4.5 9.5c.7-1 2.5-3.5 5-4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
    </svg>
  );
}
function SmsIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
      <rect x="2" y="2" width="10" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.3"/>
      <path d="M4 12l2-3h4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}
function InAppIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
      <rect x="2" y="1.5" width="10" height="11" rx="1.5" stroke="currentColor" strokeWidth="1.3"/>
      <path d="M4.5 5h5M4.5 7.5h3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
    </svg>
  );
}

// ─── Thread row ───────────────────────────────────────────────────────────────

function ThreadRow({
  thread,
  index,
  dataEl,
  hlClass,
}: {
  thread: Thread;
  index: number;
  dataEl: string;
  hlClass: string;
}) {
  const meta = CHANNEL_META[thread.id];
  return (
    <div
      data-el={dataEl}
      className={cx(cs.threadRow, hlClass)}
      style={{ animationDelay: `${index * 55}ms` }}
      role="listitem"
    >
      <div className={cs.channelIcon} style={{ color: meta.color }}>
        {meta.icon}
      </div>
      <div className={cs.threadInfo}>
        <div className={cs.threadFrom}>{thread.from}</div>
        <div className={cs.threadPreview}>{thread.preview}</div>
      </div>
      <div className={cs.threadMeta}>
        <span className={cs.threadTime}>{thread.time}</span>
        {thread.resolved ? (
          <span className={cs.resolvedPill}>resolved</span>
        ) : (
          <span className={cs.pendingPill}>active</span>
        )}
      </div>
    </div>
  );
}

// ─── Volume bar ───────────────────────────────────────────────────────────────

function VolumeBar({ id, pct }: { id: ChannelId; pct: number }) {
  const meta = CHANNEL_META[id];
  return (
    <div className={cs.volRow}>
      <span className={cs.volLabel}>{meta.label}</span>
      <div className={cs.volTrack}>
        <div
          className={cs.volFill}
          style={{ width: `${pct}%`, background: meta.color }}
        />
      </div>
      <span className={cs.volPct}>{pct}%</span>
    </div>
  );
}

// ─── View ─────────────────────────────────────────────────────────────────────

export default function ChannelsView({ params, highlight }: ViewProps) {
  const hl = (id: string) => getHl(highlight, id);

  // Normalise the volume map (sum → 100)
  const rawVol = params?.volumeByChannel;
  const volumeMap: Record<ChannelId, number> = (() => {
    if (!rawVol) return DEFAULT_VOLUME;
    const ids: ChannelId[] = ["email", "chat", "slack", "whatsapp", "sms", "inapp"];
    const mapped = Object.fromEntries(
      ids.map((id) => [id, Number(rawVol[id] ?? 0)])
    ) as Record<ChannelId, number>;
    const total = ids.reduce((sum, id) => sum + mapped[id], 0);
    if (total === 0) return DEFAULT_VOLUME;
    return Object.fromEntries(
      ids.map((id) => [id, Math.round((mapped[id] / total) * 100)])
    ) as Record<ChannelId, number>;
  })();

  const company = params?.company;
  const totalHandled = 2847;

  // Which channels are active — all 6 by default
  const activeChannelIds: ChannelId[] = ["email", "chat", "slack", "whatsapp", "sms", "inapp"];

  return (
    <QuillChrome active="channels" company={company} highlight={highlight}>

      {/* ── Header ── */}
      <div className={s.sectionRow}>
        <div>
          <p className={s.eyebrow}>OMNICHANNEL INBOX</p>
          <h2 className={s.heading} style={{ marginBottom: 0 }}>One inbox. Every channel.</h2>
        </div>
        <div className={cs.totalChip}>
          <span className={cs.totalNum}>{totalHandled.toLocaleString()}</span>
          <span className={cs.totalLabel}>handled by Quill today</span>
        </div>
      </div>

      {/* ── Channel pills ── */}
      <div className={cs.channelPills}>
        {activeChannelIds.map((id) => {
          const meta = CHANNEL_META[id];
          return (
            <span
              key={id}
              data-el={`channel-${id}`}
              className={cx(cs.channelPill, hl(`channel-${id}`))}
              style={{ ["--ch-color" as string]: meta.color }}
            >
              <span className={cs.pillIcon} style={{ color: meta.color }}>
                {meta.icon}
              </span>
              {meta.label}
            </span>
          );
        })}
      </div>

      {/* ── Unified inbox ── */}
      <div
        data-el="inbox"
        className={cx(cs.inbox, hl("inbox"))}
        role="list"
        aria-label="Unified inbox"
      >
        {DEFAULT_THREADS.map((thread, i) => (
          <ThreadRow
            key={thread.id}
            thread={thread}
            index={i}
            dataEl={`channel-${thread.id}`}
            hlClass={hl(`channel-${thread.id}`)}
          />
        ))}
      </div>

      {/* ── Volume breakdown ── */}
      <div className={cs.volumeSection}>
        <p className={s.eyebrow} style={{ marginBottom: "0.75rem" }}>VOLUME BY CHANNEL · TODAY</p>
        <div className={cs.volList}>
          {activeChannelIds.map((id) => (
            <VolumeBar key={id} id={id} pct={volumeMap[id]} />
          ))}
        </div>
      </div>

    </QuillChrome>
  );
}

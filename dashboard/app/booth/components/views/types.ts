/**
 * Shared types for all demo view components.
 * Import from here — do not re-declare in individual view files.
 */

export type DemoView =
  | "home"
  | "query-result"
  | "churn"
  | "alerts"
  | "integrations"
  | "pricing"
  | "actions"
  | "voice"
  | "proactive"
  | "sentiment"
  | "channels"
  | "languages"
  | "brand-voice"
  | "knowledge"
  | "compliance"
  | "insights"
  | "copilot"
  | "experiments";

export type DemoParams = {
  // ── existing fields ──────────────────────────────────────────────────────
  company?: string;
  question?: string;
  answer?: string;
  sources?: string;
  ticketVolume?: string;
  deflectionRate?: string;
  firstResponse?: string;
  csat?: string;
  hoursSaved?: string;
  /** CSV of weekly deflection %, oldest→newest e.g. "41,49,55,63" */
  series?: string;
  headline?: string;
  topTopics?: { topic: string; share: string; trend: string }[];
  severity?: string;
  escalations?: { question: string; reason: string }[];
  tools?: string;
  plan?: string;
  agents?: string;
  role?: string;

  // ── actions view ─────────────────────────────────────────────────────────
  actionType?: string;
  orderRef?: string;
  outcome?: string;
  customer?: string;

  // ── voice view ───────────────────────────────────────────────────────────
  caller?: string;
  callDuration?: string;

  // ── proactive view ───────────────────────────────────────────────────────
  signal?: string;
  message?: string;
  channel?: string;

  // ── sentiment view ───────────────────────────────────────────────────────
  sentiment?: string;
  tier?: string;
  routedTo?: string;

  // ── channels view ────────────────────────────────────────────────────────
  channels?: string[];
  volumeByChannel?: Record<string, string | number>;

  // ── languages view ───────────────────────────────────────────────────────
  languages?: { lang: string; answer: string }[];

  // ── brand-voice view ─────────────────────────────────────────────────────
  tone?: string;
  sampleQuestion?: string;

  // ── knowledge view ───────────────────────────────────────────────────────
  coverage?: string | number;
  gapTopic?: string;

  // ── compliance view ──────────────────────────────────────────────────────
  region?: string;

  // ── insights view ────────────────────────────────────────────────────────
  clusters?: { topic: string; share: string | number; trend: string }[];
  risingTopic?: string;

  // ── copilot view ─────────────────────────────────────────────────────────
  ticketSubject?: string;
  customerMessage?: string;
  suggestedReply?: string;

  // ── experiments view ─────────────────────────────────────────────────────
  variantA?: string;
  variantB?: string;
};

export type ViewProps = {
  params?: DemoParams;
  highlight?: string;
};

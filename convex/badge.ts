import { internalAction } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";
import { structured } from "./llm";
import type { Qualify } from "./scoring";

export type Badge = {
  archetype: string;
  tagline: string;
  compliment: string;
  stats: { label: string; value: number }[];
  discountCode: string;
};

const ARCHETYPES = [
  ["The Ticket Tamer", "Turns the queue into a quiet hum.", "TT"],
  ["The Docs Whisperer", "Every answer already lived in your docs.", "DW"],
  ["The Deflection Champion", "Half the tickets never reach a human.", "DC"],
  ["The First-Response Hero", "Replies before the coffee cools.", "FR"],
  ["The Escalation Closer", "Hands humans only the hard ones.", "EC"],
  ["The Self-Serve Architect", "Customers who answer themselves.", "SS"],
  ["The Knowledge Keeper", "One source of truth, finally.", "KK"],
  ["The Queue Whisperer", "Calm in the busiest inbox.", "QW"],
  ["The Auto-Resolver", "Resolved before it's even assigned.", "AR"],
  ["The CSAT Guardian", "Happy customers at 2am.", "CG"],
  ["The Backlog Slayer", "The backlog never stood a chance.", "BS"],
  ["The Macro Maestro", "Right answer, every channel.", "MM"],
  ["The Always-On Concierge", "Support that never sleeps.", "AO"],
  ["The Resolution Engineer", "Turns chaos into closed tickets.", "RE"],
  ["The Support Strategist", "Sees the question behind the question.", "ST"],
] as const;

const BADGE_JSON_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["archetype", "tagline", "compliment", "stats", "discountCode"],
  properties: {
    archetype: { type: "string" },
    tagline: { type: "string" },
    compliment: { type: "string" },
    stats: {
      type: "array",
      minItems: 2,
      maxItems: 3,
      items: {
        type: "object",
        additionalProperties: false,
        required: ["label", "value"],
        properties: {
          label: { type: "string" },
          value: { type: "number", minimum: 0, maximum: 100 },
        },
      },
    },
    discountCode: { type: "string" },
  },
};

const BADGE_SYSTEM = `Create a public Booth Badge for a Quill booth visitor.
Quill is an AI customer-support agent that deflects tickets, answers customers from their docs, and escalates the hard cases to humans.
Pick exactly one archetype from the supplied curated list. Do not invent archetypes.
The compliment MUST quote or closely paraphrase a real thing the visitor said in the transcript.
Make it witty, niche, specific, and B2B-insider. Never be saccharine, never be backhanded.
Stats should be flattering public mirrors of the internal score. Output ONLY the structured object.`;

export const generate = internalAction({
  args: { sessionId: v.id("sessions"), qualify: v.any() },
  handler: async (ctx, { sessionId, qualify }): Promise<Badge> => {
    const session = await ctx.runQuery(internal.sessions.getInternal, {
      sessionId,
    });
    const transcript = await ctx.runQuery(internal.messages.transcriptInternal, {
      sessionId,
    });
    const q = qualify as Qualify;
    const fallback = fallbackBadge(sessionId, session, transcript, q);
    const badge = await structured<Badge>({
      model: process.env.OPENAI_REASON_MODEL ?? "gpt-5.5",
      system: BADGE_SYSTEM,
      user: JSON.stringify({
        archetypes: ARCHETYPES.map(([archetype, tagline]) => ({
          archetype,
          tagline,
        })),
        session,
        transcript,
        qualify: q,
      }),
      schema: BADGE_JSON_SCHEMA,
      name: "badge",
      fallback,
      validate: (value) =>
        validateBadge(value, sessionId, transcript, q) ?? fallback,
    });
    return badge;
  },
});

export function fallbackBadge(
  sessionId: string,
  session: any,
  transcript: { role: string; text: string }[],
  q: Qualify,
): Badge {
  const archetype = pickArchetype(session);
  const tagline = archetypeMeta(archetype).tagline;
  const problem =
    session?.problems?.[0] ??
    session?.useCase ??
    visitorText(transcript)[0] ??
    "your support volume problem";
  const badge: Badge = {
    archetype,
    tagline,
    compliment: `Loved how clearly you framed "${problem}" — that's exactly what Quill is built to solve.`,
    stats: defaultStats(archetype, q),
    discountCode: "",
  };
  badge.discountCode = discountCode(sessionId, archetype);
  return badge;
}

function validateBadge(
  value: unknown,
  sessionId: string,
  transcript: { role: string; text: string }[],
  q: Qualify,
): Badge | null {
  const raw = value as any;
  if (!raw || typeof raw !== "object") return null;
  if (!ARCHETYPES.some(([name]) => name === raw.archetype)) return null;
  if (
    typeof raw.tagline !== "string" ||
    typeof raw.compliment !== "string" ||
    !hasGrounding(raw.compliment, transcript)
  ) {
    return null;
  }
  const stats = Array.isArray(raw.stats)
    ? raw.stats
        .filter((s: any) => typeof s?.label === "string")
        .slice(0, 3)
        .map((s: any) => ({ label: s.label, value: 0 }))
    : [];
  while (stats.length < 2) {
    stats.push(...defaultStats(raw.archetype, q).slice(stats.length, 2));
  }
  const mirrored = mirrorStats(stats, q);
  return {
    archetype: raw.archetype,
    tagline: raw.tagline,
    compliment: raw.compliment,
    stats: mirrored,
    discountCode: discountCode(sessionId, raw.archetype),
  };
}

function pickArchetype(session: any) {
  const text = [
    ...(session?.problems ?? []),
    session?.useCase,
    ...(session?.demoShown ?? []),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  if (/deflect|deflection|volume|ticket count/.test(text)) return "The Deflection Champion";
  if (/doc|knowledge base|source of truth|help center/.test(text)) return "The Docs Whisperer";
  if (/escalat/.test(text)) return "The Escalation Closer";
  if (/response time|first response|sla|speed/.test(text)) return "The First-Response Hero";
  if (/csat|satisfaction|happy customer/.test(text)) return "The CSAT Guardian";
  if (/backlog|queue|overload|overwhelm/.test(text)) return "The Backlog Slayer";
  return "The Support Strategist";
}

function defaultStats(archetype: string, q: Qualify) {
  const first =
    archetype === "The Deflection Champion"
      ? "Deflection IQ"
      : archetype === "The Docs Whisperer"
        ? "Doc Coverage"
        : archetype === "The First-Response Hero"
          ? "Speed Score"
          : archetype === "The CSAT Guardian"
            ? "CSAT Drive"
            : "Support Vision";
  return mirrorStats(
    [
      { label: first, value: 0 },
      { label: "Automation Readiness", value: 0 },
      { label: "Resolution Strength", value: 0 },
    ],
    q,
  );
}

function mirrorStats(stats: { label: string; value: number }[], q: Qualify) {
  const factors = [
    q.factors.icpFit / 30,
    q.factors.intent / 25,
    q.factors.engagement / 20,
  ];
  return stats.slice(0, 3).map((stat, index) => ({
    label: stat.label,
    value: mirror(factors[index] * 100),
  }));
}

function mirror(value: number) {
  return Math.round(Math.min(99, Math.max(72, value)));
}

function hasGrounding(compliment: string, transcript: { role: string; text: string }[]) {
  const words = new Set(
    visitorText(transcript)
      .join(" ")
      .toLowerCase()
      .split(/[^a-z0-9]+/)
      .filter((word) => word.length >= 4 && !STOPWORDS.has(word)),
  );
  return compliment
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .some((word) => words.has(word));
}

function visitorText(transcript: { role: string; text: string }[]) {
  return transcript.filter((m) => m.role === "visitor").map((m) => m.text);
}

function discountCode(sessionId: string, archetype: string) {
  const { tag } = archetypeMeta(archetype);
  return `QUILL-${tag}-${base32Hash(sessionId).slice(0, 4)}`;
}

function archetypeMeta(archetype: string) {
  const found = ARCHETYPES.find(([name]) => name === archetype) ?? ARCHETYPES[3];
  return { tagline: found[1], tag: found[2] };
}

function base32Hash(input: string) {
  let hash = 2166136261;
  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  let value = hash >>> 0;
  let out = "";
  do {
    out += alphabet[value & 31];
    value >>>= 5;
  } while (value > 0);
  return out.padEnd(4, "A");
}

const STOPWORDS = new Set([
  "that",
  "this",
  "with",
  "from",
  "they",
  "your",
  "have",
  "were",
  "what",
  "when",
  "where",
  "there",
  "about",
  "would",
  "could",
  "should",
]);

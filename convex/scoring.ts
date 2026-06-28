import { internalAction } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";
import { structured } from "./llm";

type Urgency = "low" | "medium" | "high";

export type Qualify = {
  factors: {
    icpFit: number;
    intent: number;
    engagement: number;
    authority: number;
    demoDepth: number;
  };
  confidence: number;
  confidenceReasons: string[];
  urgency: Urgency;
  urgencyEvidence: string;
  bestAngle: string;
};

export const QUALIFY_JSON_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: [
    "factors",
    "confidence",
    "confidenceReasons",
    "urgency",
    "urgencyEvidence",
    "bestAngle",
  ],
  properties: {
    factors: {
      type: "object",
      additionalProperties: false,
      required: ["icpFit", "intent", "engagement", "authority", "demoDepth"],
      properties: {
        icpFit: { type: "number", minimum: 0, maximum: 30 },
        intent: { type: "number", minimum: 0, maximum: 25 },
        engagement: { type: "number", minimum: 0, maximum: 20 },
        authority: { type: "number", minimum: 0, maximum: 15 },
        demoDepth: { type: "number", minimum: 0, maximum: 10 },
      },
    },
    confidence: { type: "number", minimum: 0, maximum: 100 },
    confidenceReasons: {
      type: "array",
      minItems: 2,
      maxItems: 4,
      items: { type: "string" },
    },
    urgency: { type: "string", enum: ["low", "medium", "high"] },
    urgencyEvidence: { type: "string" },
    bestAngle: { type: "string" },
  },
};

const SCORING_SYSTEM = `You are a B2B sales qualification analyst for Quill. Quill's ICP: seed-to-Series-B
B2B SaaS companies (roughly 10-300 employees) with a support or CX function — support leads,
CX directors, and founders who are drowning in repetitive tickets and want to deflect volume,
cut first-response time, and keep CSAT high without growing headcount. Score this booth conversation.

Rubric (max points): icpFit 30, intent 25, engagement 20, authority 15, demoDepth 10.
- icpFit: how well the company (from fiber: industry, size, stage) matches the ICP. If
  fiberMatch is "mismatch", cap icpFit at 15 and note the discrepancy. If "none", judge
  from the transcript and cap at 20.
- intent: explicit buying/evaluation language ("we're evaluating", "budget approved",
  "switching off X") scores high; idle curiosity scores low.
- engagement: number of substantive visitor turns and follow-up questions.
- authority: decision power from role/seniority (founder/VP/Head/Support Lead high; IC/student low).
- demoDepth: how many demo views they engaged with and how specific they got.
Set confidence to the exact sum of the five factors. Give 2-4 short, plain-English
reasons, each tied to a factor and citing a concrete detail (prefix with the factor, e.g.
"ICP fit 28/30: Series B B2B SaaS, support team of 8, dead-center target."). Pick urgency from transcript
cues and quote the strongest evidence. bestAngle = the single sharpest angle a human rep
should lead with in follow-up (e.g. the specific support pain: deflection, response time, doc gaps, CSAT). Output ONLY the structured object.`;

export const qualify = internalAction({
  args: { sessionId: v.id("sessions") },
  handler: async (ctx, { sessionId }): Promise<Qualify> => {
    const session = await ctx.runQuery(internal.sessions.getInternal, {
      sessionId,
    });
    const transcript = await ctx.runQuery(internal.messages.transcriptInternal, {
      sessionId,
    });
    const fallback = fallbackQualify(session, transcript);
    return await structured<Qualify>({
      model: process.env.OPENAI_REASON_MODEL ?? "gpt-5.5",
      system: SCORING_SYSTEM,
      user: JSON.stringify({ session, transcript }),
      schema: QUALIFY_JSON_SCHEMA,
      name: "qualify",
      fallback,
      validate: validateQualify,
    });
  },
});

export function fallbackQualify(
  s: any,
  transcript: { role: string; text: string }[],
): Qualify {
  const session = s ?? {};
  const visitorText = transcript
    .filter((m) => m.role === "visitor")
    .map((m) => m.text);
  const joined = visitorText.join(" ").toLowerCase();
  const has = (...words: string[]) => words.some((word) => joined.includes(word));

  const icpFit =
    session.fiberMatch === "verified"
      ? 26
      : session.fiberMatch === "mismatch"
        ? 12
        : 18;
  const intent = has(
    "evaluat",
    "budget",
    "switch",
    "replace",
    "pricing",
    "buy",
    "roll out",
  )
    ? 20
    : has("looking", "interested", "exploring")
      ? 12
      : 7;
  const engagement = Math.min(20, visitorText.length * 3);
  const authority = /founder|ceo|cto|vp|head|director|lead/i.test(
    session.role ?? "",
  )
    ? 13
    : /manager|owner|principal/i.test(session.role ?? "")
      ? 9
      : 5;
  const demoDepth = Math.min(10, (session.demoShown?.length ?? 0) * 4);
  const factors = { icpFit, intent, engagement, authority, demoDepth };
  const confidence = recomputeConfidence(factors);
  const urgency: Urgency = has("asap", "this quarter", "urgent", "now", "deadline")
    ? "high"
    : has("soon", "next quarter", "evaluat")
      ? "medium"
      : "low";

  return {
    factors,
    confidence,
    confidenceReasons: [
      `ICP fit ${icpFit}/30: ${session.company ?? "company"} ${
        session.fiberMatch === "verified" ? "verified against fiber" : "unverified"
      }.`,
      `Intent ${intent}/25 and engagement ${engagement}/20 from the conversation.`,
    ],
    urgency,
    urgencyEvidence:
      visitorText.find((t) =>
        /asap|quarter|urgent|now|deadline|soon/i.test(t),
      ) ?? "",
    bestAngle: `Lead with ${
      session.problems?.[0] ?? "their stated support pain"
    } and the ${session.demoShown?.[0] ?? "deflection"} view they saw.`,
  };
}

export function validateQualify(value: unknown): Qualify | null {
  const raw = value as any;
  if (!raw || typeof raw !== "object") return null;
  const factors = raw.factors;
  if (!factors || typeof factors !== "object") return null;

  const q: Qualify = {
    factors: {
      icpFit: boundedNumber(factors.icpFit, 0, 30),
      intent: boundedNumber(factors.intent, 0, 25),
      engagement: boundedNumber(factors.engagement, 0, 20),
      authority: boundedNumber(factors.authority, 0, 15),
      demoDepth: boundedNumber(factors.demoDepth, 0, 10),
    },
    confidence: 0,
    confidenceReasons: Array.isArray(raw.confidenceReasons)
      ? raw.confidenceReasons.filter((r: unknown) => typeof r === "string")
      : [],
    urgency:
      raw.urgency === "high" || raw.urgency === "medium" || raw.urgency === "low"
        ? raw.urgency
        : "low",
    urgencyEvidence:
      typeof raw.urgencyEvidence === "string" ? raw.urgencyEvidence : "",
    bestAngle:
      typeof raw.bestAngle === "string"
        ? raw.bestAngle
        : "Lead with the visitor's stated problem and the demo view they saw.",
  };

  q.confidence = recomputeConfidence(q.factors);
  q.confidenceReasons = normalizeReasons(q);
  return q;
}

export function recomputeConfidence(factors: Qualify["factors"]) {
  const sum =
    factors.icpFit +
    factors.intent +
    factors.engagement +
    factors.authority +
    factors.demoDepth;
  return Math.round(Math.min(100, Math.max(0, sum)));
}

function normalizeReasons(q: Qualify) {
  const reasons = q.confidenceReasons.slice(0, 4);
  while (reasons.length < 2) {
    reasons.push(
      `Confidence ${q.confidence}/100 from ICP fit, intent, engagement, authority, and demo depth.`,
    );
  }
  return reasons;
}

function boundedNumber(value: unknown, min: number, max: number) {
  const n = typeof value === "number" && Number.isFinite(value) ? value : min;
  return Math.min(max, Math.max(min, n));
}

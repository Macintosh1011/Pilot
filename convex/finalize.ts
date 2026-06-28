import { action, internalAction, internalMutation, internalQuery } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";
import { fallbackQualify, validateQualify, type Qualify } from "./scoring";
import { fallbackBadge } from "./badge";
import { fallbackEmail } from "./email";
import { structured } from "./llm";

type FinalizeSource = "codex" | "fallback" | "openai";
type FinalizeResult = {
  qualify: Qualify;
  badge: {
    archetype: string;
    tagline: string;
    compliment: string;
    stats: { label: string; value: number }[];
    discountCode: string;
  };
  emailDraft: { subject: string; body: string };
};
type FinalizeStructuredResult = FinalizeResult & { source?: FinalizeSource };

export const finalize = action({
  args: { sessionId: v.id("sessions") },
  handler: async (ctx, { sessionId }) => {
    await ctx.runMutation(internal.sessions.setStatus, {
      sessionId,
      status: "finalizing",
    });

    let session = await ctx.runQuery(internal.sessions.getInternal, {
      sessionId,
    });
    const transcript = await ctx.runQuery(internal.messages.transcriptInternal, {
      sessionId,
    });

    try {
      if (!session?.fiber || !session?.email) {
        await ctx.runAction(internal.fiber.lookupVisitorInternal, {
          sessionId,
          name: session?.visitorName,
          company: session?.company,
          linkedinUrl: session?.linkedinUrl,
          reveal: true,
        });
        session = await ctx.runQuery(internal.sessions.getInternal, {
          sessionId,
        });
      }
    } catch {
      // Enrichment has its own fallback; scoring can still proceed without it.
    }

    session = await ctx.runQuery(internal.sessions.getInternal, {
      sessionId,
    });
    const input = {
      session,
      transcript,
      fiber: session?.fiber,
      fiberMatch: session?.fiberMatch,
      problems: session?.problems ?? [],
      useCase: session?.useCase,
      demoShown: session?.demoShown ?? [],
    };
    const jobId = await ctx.runMutation(internal.finalize.createFinalizeJob, {
      sessionId,
      input,
    });

    await ctx.scheduler.runAfter(60_000, internal.finalize.fallbackFinalize, {
      sessionId,
      jobId,
    });
    await ctx.scheduler.runAfter(0, internal.finalize.openaiFinalize, {
      sessionId,
      jobId,
    });

    const previewQualify = fallbackQualify(session, transcript);
    const previewBadge = fallbackBadge(sessionId, session, transcript, previewQualify);
    return {
      ok: true,
      confidence: previewQualify.confidence,
      badge: previewBadge,
      hasEmailDraft: false,
    };
  },
});

export const createFinalizeJob = internalMutation({
  args: {
    sessionId: v.id("sessions"),
    input: v.any(),
  },
  handler: async (ctx, { sessionId, input }) => {
    const jobId = await ctx.db.insert("llmJobs", {
      sessionId,
      kind: "finalize",
      status: "pending",
      input,
      attempts: 0,
      createdAt: Date.now(),
    });
    await ctx.db.insert("events", {
      sessionId,
      step: "score",
      label: "Queued finalization job",
      detail: `job ${jobId}`,
      ts: Date.now(),
    });
    return jobId;
  },
});

export const fetchFinalizeJobInput = internalQuery({
  args: {
    sessionId: v.id("sessions"),
    jobId: v.id("llmJobs"),
  },
  returns: v.union(v.object({ input: v.any() }), v.null()),
  handler: async (ctx, { sessionId, jobId }) => {
    const job = await ctx.db.get(jobId);
    if (!job || job.sessionId !== sessionId || job.status === "done") return null;
    return { input: job.input };
  },
});

export const openaiFinalize = internalAction({
  args: {
    sessionId: v.id("sessions"),
    jobId: v.id("llmJobs"),
  },
  handler: async (ctx, { sessionId, jobId }) => {
    const job = await ctx.runQuery(internal.finalize.fetchFinalizeJobInput, {
      sessionId,
      jobId,
    });
    if (!job) return null;

    const fallback = buildFallbackFinalizeResult(sessionId, job.input);
    const result = await structured<FinalizeStructuredResult>({
      model: process.env.OPENAI_REASON_MODEL ?? "gpt-5.4",
      system: buildFinalizeSystemPrompt(),
      user: buildFinalizeUserPrompt(job.input),
      schema: FINALIZE_SCHEMA,
      name: "finalize",
      fallback,
      validate: (value) => validateFinalizeResult(value),
    });

    await ctx.runMutation(internal.finalize.completeOpenaiFinalize, {
      sessionId,
      jobId,
      result,
      source: result.source === "fallback" ? "fallback" : "openai",
    });
    return null;
  },
});

export const completeOpenaiFinalize = internalMutation({
  args: {
    sessionId: v.id("sessions"),
    jobId: v.id("llmJobs"),
    result: v.any(),
    source: v.union(v.literal("openai"), v.literal("fallback")),
  },
  handler: async (ctx, { sessionId, jobId, result, source }) => {
    return await applyFinalizeJobResult(ctx, {
      jobId,
      sessionId,
      result,
      source,
    });
  },
});

export const fallbackFinalize = internalMutation({
  args: {
    sessionId: v.id("sessions"),
    jobId: v.id("llmJobs"),
  },
  handler: async (ctx, { sessionId, jobId }) => {
    const job = await ctx.db.get(jobId);
    if (!job || job.sessionId !== sessionId || job.status === "done") return null;
    await applyFinalizeJobResult(ctx, {
      jobId,
      sessionId,
      result: null,
      source: "fallback",
      error: job.error,
    });
    return null;
  },
});

export async function applyFinalizeJobResult(
  ctx: any,
  {
    jobId,
    sessionId,
    result,
    source,
    error,
  }: {
    jobId: string;
    sessionId: string;
    result: unknown;
    source: FinalizeSource;
    error?: string;
  },
) {
  const job = await ctx.db.get(jobId);
  if (!job || job.sessionId !== sessionId) return { ok: false, skipped: "missing-job" };
  if (job.status === "done" && source === "fallback") {
    return { ok: true, skipped: "already-done" };
  }

  const session = await ctx.db.get(sessionId);
  if (!session) {
    await ctx.db.patch(jobId, {
      status: "error",
      error: "session missing",
      finishedAt: Date.now(),
    });
    return { ok: false, error: "session missing" };
  }

  const transcript = await ctx.db
    .query("messages")
    .withIndex("by_session", (q: any) => q.eq("sessionId", sessionId))
    .collect();
  const normalizedTranscript = transcript
    .sort((a: any, b: any) => a.ts - b.ts)
    .map((m: any) => ({ role: m.role, text: m.text }));

  const parsed = validateFinalizeResult(result);
  const usedFallback = source === "fallback" || parsed === null;
  const resultSource = usedFallback ? "fallback" : source;
  const qualify = parsed?.qualify ?? fallbackQualify(session, normalizedTranscript);
  const badge =
    parsed?.badge ?? fallbackBadge(sessionId, session, normalizedTranscript, qualify);
  const emailDraft = parsed?.emailDraft ?? fallbackEmail({ ...session, badge });
  const startedAt = job.claimedAt ?? job.createdAt;
  const ms = Math.max(0, Date.now() - startedAt);

  await ctx.db.insert("events", {
    sessionId,
    step: "score",
    label: `Confidence ${qualify.confidence}`,
    detail: usedFallback
      ? `deterministic fallback${error ? ` · ${error.slice(0, 80)}` : ""}`
      : `source=${resultSource} · icp ${qualify.factors.icpFit} · intent ${qualify.factors.intent} · eng ${qualify.factors.engagement} · auth ${qualify.factors.authority} · demo ${qualify.factors.demoDepth}`,
    ms,
    ts: Date.now(),
  });
  await ctx.db.insert("events", {
    sessionId,
    step: "badge",
    label: badge.archetype,
    detail: badge.discountCode,
    ms,
    ts: Date.now(),
  });
  await ctx.db.insert("events", {
    sessionId,
    step: "email",
    label: "Draft ready for review",
    detail: emailDraft.subject.slice(0, 120),
    ms,
    ts: Date.now(),
  });

  await ctx.db.patch(sessionId, {
    confidence: qualify.confidence,
    confidenceReasons: qualify.confidenceReasons,
    urgency: qualify.urgency,
    urgencyEvidence: qualify.urgencyEvidence,
    bestAngle: qualify.bestAngle,
    badge,
    emailDraft,
    reviewStatus: "pending",
    status: "done",
  });
  await ctx.db.patch(jobId, {
    status: "done",
    result: { source: resultSource, qualify, badge, emailDraft },
    ...(error ? { error } : {}),
    finishedAt: Date.now(),
  });

  return { ok: true, usedFallback };
}

function validateFinalizeResult(result: unknown): FinalizeResult | null {
  const raw = result as any;
  if (!raw || typeof raw !== "object") return null;

  const qualify = validateQualify(raw.qualify ?? raw);
  const badge = normalizeBadge(raw.badge);
  const emailDraft = normalizeEmailDraft(raw.emailDraft);
  if (!qualify || !badge || !emailDraft) return null;
  return { qualify, badge, emailDraft };
}

function normalizeBadge(value: unknown) {
  const raw = value as any;
  if (
    !raw ||
    typeof raw.archetype !== "string" ||
    typeof raw.tagline !== "string" ||
    typeof raw.compliment !== "string" ||
    typeof raw.discountCode !== "string" ||
    !Array.isArray(raw.stats)
  ) {
    return null;
  }
  const stats = raw.stats
    .filter((stat: any) => typeof stat?.label === "string" && typeof stat?.value === "number")
    .slice(0, 3)
    .map((stat: any) => ({
      label: stat.label.slice(0, 48),
      value: Math.round(Math.min(100, Math.max(0, stat.value))),
    }));
  if (stats.length < 2) return null;
  return {
    archetype: raw.archetype.slice(0, 80),
    tagline: raw.tagline.slice(0, 160),
    compliment: raw.compliment.slice(0, 360),
    stats,
    discountCode: raw.discountCode.slice(0, 32),
  };
}

function normalizeEmailDraft(value: unknown) {
  const raw = value as any;
  if (!raw || typeof raw.subject !== "string" || typeof raw.body !== "string") {
    return null;
  }
  return { subject: raw.subject.slice(0, 160), body: raw.body };
}

function buildFallbackFinalizeResult(
  sessionId: string,
  input: any,
): FinalizeStructuredResult {
  const session = input?.session ?? null;
  const transcript = Array.isArray(input?.transcript) ? input.transcript : [];
  const qualify = fallbackQualify(session, transcript);
  const badge = fallbackBadge(sessionId, session, transcript, qualify);
  const emailDraft = fallbackEmail({ ...session, badge });
  return { source: "fallback", qualify, badge, emailDraft };
}

function buildFinalizeSystemPrompt() {
  return `You are the BoothPilot finalization brain for Acme Analytics.

Use the booth concierge system context below, but do not continue the conversation. Your only task is to analyze the completed session and return exactly one JSON object matching the provided schema.

SYSTEM CONTEXT:
You are the booth concierge for Acme Analytics at a startup conference. Acme Analytics is a product-analytics platform that helps B2B SaaS teams see why users churn, get alerts when key metrics move, explore data with plain-English queries, and connect their existing stack. The confidence score is internal and never shown to the visitor. Follow-up email drafts are human-in-the-loop and must never auto-send.

SCORING RUBRIC:
- factors.icpFit max 30: ICP / fiber firmographic fit. If fiberMatch is "mismatch", cap at 15. If "none", cap at 20.
- factors.intent max 25: buying/evaluation language and urgency in the transcript.
- factors.engagement max 20: substantive visitor turns and follow-up questions.
- factors.authority max 15: decision power from role/seniority.
- factors.demoDepth max 10: depth and specificity of demo views shown.
- confidence must equal the rounded sum of all factors.
- confidenceReasons must contain 2-4 concrete, plain-English reasons tied to factors.
- urgency is "low", "medium", or "high"; urgencyEvidence is the strongest transcript quote or close paraphrase.
- bestAngle is one sentence for the human rep's follow-up.

BADGE RULES:
Pick one archetype from: The Churn Whisperer, The Retention Renegade, The Activation Architect, The North-Star Navigator, The Cohort Cartographer, The Funnel Mechanic, The Signal Hunter, The Attribution Alchemist, The Revenue Archaeologist, The Onboarding Sherpa, The Data Custodian, The Pipeline Plumber, The Dashboard Dragon, The Zero-to-One Operator, The Self-Serve Sommelier.
The badge is public, flattering, witty, and grounded. The compliment must quote or closely paraphrase a real visitor detail. Stats must be 2-3 flattering bars with values 72-99. Generate a discount code shaped like ACME-XX-1234.

EMAIL RULES:
Draft a short, warm post-booth follow-up from the Acme Analytics team. Reference the exact demo view and specific problem in the visitor's words. One soft next step. 90-150 words. Plain, human, no emoji, no hype, no fake stats. Sign off as "— The Acme Analytics team".

The session input will be provided as JSON in the user message. Return only the JSON object.`;
}

function buildFinalizeUserPrompt(input: unknown) {
  return `SESSION INPUT:
${JSON.stringify(input, null, 2)}

Return only the JSON object.`;
}

const FINALIZE_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["qualify", "badge", "emailDraft"],
  properties: {
    qualify: {
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
    },
    badge: {
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
    },
    emailDraft: {
      type: "object",
      additionalProperties: false,
      required: ["subject", "body"],
      properties: {
        subject: { type: "string" },
        body: { type: "string" },
      },
    },
  },
};

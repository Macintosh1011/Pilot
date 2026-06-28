import { action, internalMutation } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";
import { fallbackQualify, validateQualify, type Qualify } from "./scoring";
import { fallbackBadge } from "./badge";
import { fallbackEmail } from "./email";

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

    await ctx.scheduler.runAfter(25_000, internal.finalize.fallbackFinalize, {
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
      label: "Queued local Codex finalization",
      detail: `job ${jobId}`,
      ts: Date.now(),
    });
    return jobId;
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
    source: "codex" | "fallback";
    error?: string;
  },
) {
  const job = await ctx.db.get(jobId);
  if (!job || job.sessionId !== sessionId) return { ok: false, skipped: "missing-job" };
  if (job.status === "done") return { ok: true, skipped: "already-done" };

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
      : `icp ${qualify.factors.icpFit} · intent ${qualify.factors.intent} · eng ${qualify.factors.engagement} · auth ${qualify.factors.authority} · demo ${qualify.factors.demoDepth}`,
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
    result: usedFallback
      ? { source: "fallback", qualify, badge, emailDraft }
      : { source: "codex", ...(result as any) },
    ...(error ? { error } : {}),
    finishedAt: Date.now(),
  });

  return { ok: true, usedFallback };
}

function validateFinalizeResult(result: unknown): {
  qualify: Qualify;
  badge: { archetype: string; tagline: string; compliment: string; stats: { label: string; value: number }[]; discountCode: string };
  emailDraft: { subject: string; body: string };
} | null {
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

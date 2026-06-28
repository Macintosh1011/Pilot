import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { applyFinalizeJobResult } from "./finalize";

function assertWorkerToken(token?: string) {
  const expected = process.env.WORKER_TOKEN;
  if (expected && token !== expected) {
    throw new Error("unauthorized worker");
  }
}

export const claimNext = mutation({
  args: { token: v.optional(v.string()) },
  handler: async (ctx, { token }) => {
    assertWorkerToken(token);
    const pending = await ctx.db
      .query("llmJobs")
      .withIndex("by_status", (q) => q.eq("status", "pending"))
      .collect();
    const job = pending.sort((a, b) => a.createdAt - b.createdAt)[0];
    if (!job) return null;

    const attempts = (job.attempts ?? 0) + 1;
    await ctx.db.patch(job._id, {
      status: "claimed",
      claimedAt: Date.now(),
      attempts,
      error: undefined,
    });
    await ctx.db.insert("events", {
      sessionId: job.sessionId,
      step: "score",
      label: "Local Codex worker claimed job",
      detail: `attempt ${attempts}`,
      ts: Date.now(),
    });
    return {
      jobId: job._id,
      sessionId: job.sessionId,
      input: job.input,
    };
  },
});

export const complete = mutation({
  args: {
    token: v.optional(v.string()),
    jobId: v.id("llmJobs"),
    result: v.any(),
  },
  handler: async (ctx, { token, jobId, result }) => {
    assertWorkerToken(token);
    const job = await ctx.db.get(jobId);
    if (!job) return { ok: false, error: "job missing" };
    const applied = await applyFinalizeJobResult(ctx, {
      jobId,
      sessionId: job.sessionId,
      result,
      source: "codex",
    });
    return applied;
  },
});

export const fail = mutation({
  args: {
    token: v.optional(v.string()),
    jobId: v.id("llmJobs"),
    error: v.string(),
  },
  handler: async (ctx, { token, jobId, error }) => {
    assertWorkerToken(token);
    const job = await ctx.db.get(jobId);
    if (!job || job.status === "done") return { ok: true };
    const attempts = job.attempts ?? 0;
    const retry = attempts < 2;
    await ctx.db.patch(jobId, {
      status: retry ? "pending" : "error",
      error: error.slice(0, 1_000),
      ...(retry ? {} : { finishedAt: Date.now() }),
    });
    await ctx.db.insert("events", {
      sessionId: job.sessionId,
      step: "score",
      label: retry ? "Codex worker retry queued" : "Codex worker failed",
      detail: error.slice(0, 160),
      ts: Date.now(),
    });
    return { ok: true, retry };
  },
});

export const pending = query({
  args: { token: v.optional(v.string()) },
  handler: async (ctx, { token }) => {
    assertWorkerToken(token);
    const rows = await ctx.db
      .query("llmJobs")
      .withIndex("by_status", (q) => q.eq("status", "pending"))
      .collect();
    return {
      count: rows.length,
      jobs: rows
        .sort((a, b) => a.createdAt - b.createdAt)
        .slice(0, 20)
        .map((job) => ({
          jobId: job._id,
          sessionId: job.sessionId,
          kind: job.kind,
          attempts: job.attempts ?? 0,
          createdAt: job.createdAt,
        })),
    };
  },
});

export const bySession = query({
  args: { sessionId: v.id("sessions"), token: v.optional(v.string()) },
  handler: async (ctx, { sessionId, token }) => {
    assertWorkerToken(token);
    const rows = await ctx.db.query("llmJobs").collect();
    return rows
      .filter((job) => job.sessionId === sessionId)
      .sort((a, b) => b.createdAt - a.createdAt)
      .map((job) => ({
        jobId: job._id,
        status: job.status,
        attempts: job.attempts ?? 0,
        source: (job.result as any)?.source,
        result: job.result,
        error: job.error,
        createdAt: job.createdAt,
        claimedAt: job.claimedAt,
        finishedAt: job.finishedAt,
      }));
  },
});

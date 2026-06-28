import { query, internalMutation } from "./_generated/server";
import { v } from "convex/values";

/**
 * The "agent thinking" timeline. Every pipeline step writes one row here so the
 * dashboard can render what the agent did and how long it took.
 */
export const bySession = query({
  args: { sessionId: v.id("sessions") },
  handler: async (ctx, { sessionId }) => {
    const rows = await ctx.db
      .query("events")
      .withIndex("by_session", (q) => q.eq("sessionId", sessionId))
      .collect();
    return rows.sort((a, b) => a.ts - b.ts);
  },
});

export const log = internalMutation({
  args: {
    sessionId: v.id("sessions"),
    step: v.string(),
    label: v.string(),
    detail: v.optional(v.string()),
    ms: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("events", {
      sessionId: args.sessionId,
      step: args.step,
      label: args.label,
      ...(args.detail !== undefined ? { detail: args.detail } : {}),
      ...(args.ms !== undefined ? { ms: args.ms } : {}),
      ts: Date.now(),
    });
  },
});

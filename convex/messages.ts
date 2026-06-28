import { mutation, query, internalQuery } from "./_generated/server";
import { v } from "convex/values";

/**
 * Conversation transcript. B1 writes each turn; scoring/badge/email read it.
 */
export const add = mutation({
  args: {
    sessionId: v.id("sessions"),
    role: v.string(), // visitor | assistant | system | tool
    text: v.string(),
  },
  returns: v.id("messages"),
  handler: async (ctx, { sessionId, role, text }) => {
    return await ctx.db.insert("messages", {
      sessionId,
      role,
      text,
      ts: Date.now(),
    });
  },
});

export const bySession = query({
  args: { sessionId: v.id("sessions") },
  handler: async (ctx, { sessionId }) => {
    const rows = await ctx.db
      .query("messages")
      .withIndex("by_session", (q) => q.eq("sessionId", sessionId))
      .collect();
    return rows.sort((a, b) => a.ts - b.ts);
  },
});

// internal: transcript as plain text for the LLM steps
export const transcriptInternal = internalQuery({
  args: { sessionId: v.id("sessions") },
  handler: async (ctx, { sessionId }) => {
    const rows = await ctx.db
      .query("messages")
      .withIndex("by_session", (q) => q.eq("sessionId", sessionId))
      .collect();
    return rows
      .sort((a, b) => a.ts - b.ts)
      .map((m) => ({ role: m.role, text: m.text }));
  },
});

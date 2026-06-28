import {
  mutation,
  query,
  internalMutation,
  internalQuery,
} from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";

/**
 * sessions = the CRM contact card. This module owns the card lifecycle and the
 * write-paths the GPT tools use (setNeeds, captureContact). See INTERFACES.md.
 */

// ---- B1-facing (the iPad) ----

export const create = mutation({
  args: {
    deviceId: v.string(),
    referrerSessionId: v.optional(v.id("sessions")),
  },
  returns: v.id("sessions"),
  handler: async (ctx, { deviceId, referrerSessionId }) => {
    const sessionId = await ctx.db.insert("sessions", {
      deviceId,
      status: "active",
      ...(referrerSessionId ? { referrerSessionId } : {}),
      createdAt: Date.now(),
    });
    await ctx.runMutation(internal.events.log, {
      sessionId,
      step: "identify",
      label: "Session started",
      detail: `device ${deviceId}`,
    });
    return sessionId;
  },
});

export const get = query({
  args: { sessionId: v.id("sessions") },
  handler: async (ctx, { sessionId }) => {
    return await ctx.db.get(sessionId);
  },
});

// GPT tool: set_needs -> writes problems / useCase / urgency onto the card
export const setNeeds = mutation({
  args: {
    sessionId: v.id("sessions"),
    problems: v.optional(v.array(v.string())),
    useCase: v.optional(v.string()),
    urgency: v.optional(v.string()),
    urgencyEvidence: v.optional(v.string()),
  },
  handler: async (ctx, { sessionId, ...rest }) => {
    const patch: Record<string, unknown> = {};
    for (const [k, val] of Object.entries(rest)) {
      if (val !== undefined) patch[k] = val;
    }
    await ctx.db.patch(sessionId, patch);
    await ctx.runMutation(internal.events.log, {
      sessionId,
      step: "needs",
      label: "Scoped needs",
      detail: [rest.useCase, ...(rest.problems ?? [])]
        .filter(Boolean)
        .join(" · ")
        .slice(0, 200),
    });
    return null;
  },
});

// GPT tool: capture_contact -> writes contact info onto the card
export const captureContact = mutation({
  args: {
    sessionId: v.id("sessions"),
    email: v.optional(v.string()),
    phone: v.optional(v.string()),
    linkedinUrl: v.optional(v.string()),
  },
  handler: async (ctx, { sessionId, ...rest }) => {
    const patch: Record<string, unknown> = {};
    for (const [k, val] of Object.entries(rest)) {
      if (val !== undefined) patch[k] = val;
    }
    await ctx.db.patch(sessionId, patch);
    await ctx.runMutation(internal.events.log, {
      sessionId,
      step: "identify",
      label: "Captured contact",
      detail: rest.email ?? rest.linkedinUrl ?? rest.phone ?? "",
    });
    return null;
  },
});

// ---- Dashboard-facing (Builder 2) ----

// All cards, sorted by confidence desc (then most recent first).
export const list = query({
  args: {},
  handler: async (ctx) => {
    const all = await ctx.db.query("sessions").withIndex("by_created").collect();
    return all.sort((a, b) => {
      const ca = a.confidence ?? -1;
      const cb = b.confidence ?? -1;
      if (cb !== ca) return cb - ca;
      return b.createdAt - a.createdAt;
    });
  },
});

// Drafts awaiting human review (pending or edited but not yet sent/discarded).
export const reviewQueue = query({
  args: {},
  handler: async (ctx) => {
    const all = await ctx.db.query("sessions").withIndex("by_created").collect();
    return all
      .filter(
        (s) =>
          s.emailDraft &&
          (s.reviewStatus === "pending" || s.reviewStatus === "edited"),
      )
      .sort((a, b) => (b.confidence ?? 0) - (a.confidence ?? 0));
  },
});

// ---- internal (used by actions) ----

export const getInternal = internalQuery({
  args: { sessionId: v.id("sessions") },
  handler: async (ctx, { sessionId }) => {
    return await ctx.db.get(sessionId);
  },
});

export const patchCard = internalMutation({
  args: { sessionId: v.id("sessions"), patch: v.any() },
  handler: async (ctx, { sessionId, patch }) => {
    await ctx.db.patch(sessionId, patch);
  },
});

export const setStatus = internalMutation({
  args: { sessionId: v.id("sessions"), status: v.string() },
  handler: async (ctx, { sessionId, status }) => {
    await ctx.db.patch(sessionId, { status });
  },
});

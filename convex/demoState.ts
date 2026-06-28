import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";

/**
 * The live demo is shared state, NOT browser automation. GPT's show_view tool
 * writes here; Builder 1's iPad demo view re-renders from it.
 *
 * View contract (co-owned with B1) for the Quill demo:
 *   view: one of VALID_VIEWS (18 total)
 *   params: view-specific (see views/types.ts)
 *   highlight: optional elementId to pulse/focus
 */
const VALID_VIEWS = [
  // core (original 6)
  "home",
  "query-result",
  "churn",
  "alerts",
  "integrations",
  "pricing",
  // add-on / feature views (12 new)
  "actions",
  "voice",
  "proactive",
  "sentiment",
  "channels",
  "languages",
  "brand-voice",
  "knowledge",
  "compliance",
  "insights",
  "copilot",
  "experiments",
];

export const setDemoState = mutation({
  args: {
    sessionId: v.id("sessions"),
    view: v.string(),
    params: v.optional(v.any()),
    highlight: v.optional(v.string()),
  },
  handler: async (ctx, { sessionId, view, params, highlight }) => {
    const safeView = VALID_VIEWS.includes(view) ? view : "home";
    const existing = await ctx.db
      .query("demoState")
      .withIndex("by_session", (q) => q.eq("sessionId", sessionId))
      .unique();

    if (existing) {
      await ctx.db.patch(existing._id, {
        view: safeView,
        params,
        highlight,
        updatedAt: Date.now(),
      });
    } else {
      await ctx.db.insert("demoState", {
        sessionId,
        view: safeView,
        ...(params !== undefined ? { params } : {}),
        ...(highlight !== undefined ? { highlight } : {}),
        updatedAt: Date.now(),
      });
    }

    // track which views were demoed (feeds the "demo depth" score factor)
    const session = await ctx.db.get(sessionId);
    if (session) {
      const shown = new Set(session.demoShown ?? []);
      shown.add(safeView);
      await ctx.db.patch(sessionId, { demoShown: [...shown], status: "demoing" });
    }

    await ctx.runMutation(internal.events.log, {
      sessionId,
      step: "demo",
      label: `Demo → ${safeView}`,
      detail: highlight ? `highlight ${highlight}` : undefined,
    });
    return null;
  },
});

export const setHighlight = mutation({
  args: {
    sessionId: v.id("sessions"),
    elementId: v.string(),
  },
  handler: async (ctx, { sessionId, elementId }) => {
    const existing = await ctx.db
      .query("demoState")
      .withIndex("by_session", (q) => q.eq("sessionId", sessionId))
      .unique();

    if (existing) {
      await ctx.db.patch(existing._id, {
        highlight: elementId,
        updatedAt: Date.now(),
      });
    } else {
      await ctx.db.insert("demoState", {
        sessionId,
        view: "home",
        highlight: elementId,
        updatedAt: Date.now(),
      });
    }

    await ctx.runMutation(internal.events.log, {
      sessionId,
      step: "demo",
      label: `Highlight ${elementId}`,
    });
    return null;
  },
});

export const bySession = query({
  args: { sessionId: v.id("sessions") },
  handler: async (ctx, { sessionId }) => {
    return await ctx.db
      .query("demoState")
      .withIndex("by_session", (q) => q.eq("sessionId", sessionId))
      .unique();
  },
});

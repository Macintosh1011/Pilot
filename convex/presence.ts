import { query, internalMutation } from "./_generated/server";
import { v } from "convex/values";

/**
 * Presence pings posted by the Pi (Builder 3) via POST /hw/presence.
 * Builder 1's iPad subscribes to `latest` and greets on "approach".
 */
export const latest = query({
  args: { deviceId: v.optional(v.string()) },
  handler: async (ctx, { deviceId }) => {
    if (deviceId) {
      return await ctx.db
        .query("presence")
        .withIndex("by_device", (q) => q.eq("deviceId", deviceId))
        .order("desc")
        .first();
    }
    return await ctx.db.query("presence").order("desc").first();
  },
});

export const record = internalMutation({
  args: { deviceId: v.string(), event: v.string() },
  handler: async (ctx, { deviceId, event }) => {
    await ctx.db.insert("presence", { deviceId, event, ts: Date.now() });
  },
});

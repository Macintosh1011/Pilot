import { internalMutation, internalQuery } from "./_generated/server";
import { v } from "convex/values";

export const enqueue = internalMutation({
  args: {
    deviceId: v.string(),
    kind: v.string(),
    payload: v.any(),
  },
  handler: async (ctx, { deviceId, kind, payload }) => {
    const commandId = await ctx.db.insert("hwCommands", {
      deviceId,
      kind,
      payload,
      acked: false,
      createdAt: Date.now(),
    });
    return commandId;
  },
});

export const listUnacked = internalQuery({
  args: { deviceId: v.string() },
  handler: async (ctx, { deviceId }) => {
    if (!deviceId.trim()) return [];
    const rows = await ctx.db
      .query("hwCommands")
      .withIndex("by_device_unacked", (q) =>
        q.eq("deviceId", deviceId).eq("acked", false),
      )
      .collect();
    return rows
      .sort((a, b) => a.createdAt - b.createdAt)
      .map((row) => ({
        commandId: row._id,
        kind: row.kind,
        payload: row.payload,
        createdAt: row.createdAt,
      }));
  },
});

export const ack = internalMutation({
  args: {
    deviceId: v.string(),
    commandId: v.string(),
  },
  handler: async (ctx, { deviceId, commandId }) => {
    const id = ctx.db.normalizeId("hwCommands", commandId);
    if (!id) return null;
    const row = await ctx.db.get(id);
    if (!row || row.deviceId !== deviceId || row.acked) return null;
    await ctx.db.patch(id, { acked: true });
    return null;
  },
});

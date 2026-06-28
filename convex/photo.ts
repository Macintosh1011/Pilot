import { mutation } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";

/**
 * Booth photo — the "funny pose" snapshot that lands on the CRM card and the printed badge.
 * Flow: the agent calls capture_photo (→ requestPhoto sets photoRequestedAt); the iPad sees that
 * on its session subscription, grabs a front-camera frame, uploads it to Convex storage via
 * generateUploadUrl, then calls attachPhoto with the resulting storageId.
 */

// iPad asks for a short-lived upload URL, then POSTs the JPEG straight to storage.
export const generateUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    return await ctx.storage.generateUploadUrl();
  },
});

// iPad reports the stored image; we resolve a public URL and pin it to the card.
export const attachPhoto = mutation({
  args: { sessionId: v.id("sessions"), storageId: v.id("_storage") },
  handler: async (ctx, { sessionId, storageId }) => {
    const url = await ctx.storage.getUrl(storageId);
    await ctx.db.patch(sessionId, {
      visitorPhotoId: storageId,
      visitorPhotoUrl: url ?? undefined,
      photoRequestedAt: undefined,
    });
    await ctx.runMutation(internal.events.log, {
      sessionId,
      step: "identify",
      label: "Booth photo captured",
    });
    return null;
  },
});

// GPT tool: capture_photo -> signal the iPad to snap the visitor's pose.
export const requestPhoto = mutation({
  args: { sessionId: v.id("sessions") },
  handler: async (ctx, { sessionId }) => {
    await ctx.db.patch(sessionId, { photoRequestedAt: Date.now() });
    return null;
  },
});

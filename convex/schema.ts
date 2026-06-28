import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

/**
 * BoothPilot data model (the spine, owned by Builder 2).
 * Tables: sessions (the CRM card), messages, demoState, events, hwCommands,
 * presence, plus a fiberCache for cost discipline.
 *
 * Lock note: these shapes are the integration contract. See INTERFACES.md.
 * `referrerSessionId` is intentionally present-but-optional so the LeadLens
 * viral referral loop can attach later with no migration.
 */
export default defineSchema({
  // = the CRM contact card
  sessions: defineTable({
    deviceId: v.string(),
    status: v.string(), // active | enriching | demoing | finalizing | done
    // identity
    visitorName: v.optional(v.string()),
    company: v.optional(v.string()),
    role: v.optional(v.string()),
    linkedinUrl: v.optional(v.string()),
    email: v.optional(v.string()), // from fiber reveal or asked
    phone: v.optional(v.string()),
    // booth photo (the "funny pose" for the CRM card + printed badge)
    visitorPhotoId: v.optional(v.id("_storage")),
    visitorPhotoUrl: v.optional(v.string()), // resolved storage URL, for the dashboard + badge
    photoRequestedAt: v.optional(v.number()), // agent asks for a pose → iPad snaps + uploads
    // fiber enrichment
    fiber: v.optional(v.any()), // firmographics + person payload (normalized)
    fiberMatch: v.optional(v.string()), // "verified" | "mismatch" | "none"
    // needs + scoring
    problems: v.optional(v.array(v.string())),
    useCase: v.optional(v.string()),
    urgency: v.optional(v.string()), // low | medium | high
    urgencyEvidence: v.optional(v.string()), // a quote from the transcript
    confidence: v.optional(v.number()), // 0..100 (never shown to the visitor)
    confidenceReasons: v.optional(v.array(v.string())),
    bestAngle: v.optional(v.string()),
    demoShown: v.optional(v.array(v.string())), // views demoed
    // shareable Booth Badge (public, flattering)
    badge: v.optional(
      v.object({
        archetype: v.string(), // e.g. "The Churn Slayer"
        tagline: v.string(),
        compliment: v.string(), // grounded in a real transcript detail
        stats: v.array(
          v.object({ label: v.string(), value: v.number() }),
        ), // public mirror of the score
        discountCode: v.string(),
        ogImageId: v.optional(v.id("_storage")),
      }),
    ),
    // follow-up (human-in-the-loop)
    emailDraft: v.optional(
      v.object({ subject: v.string(), body: v.string() }),
    ),
    reviewStatus: v.optional(v.string()), // pending | approved | edited | sent | discarded
    sentAt: v.optional(v.number()),
    // stateful voice: OpenAI Responses API conversation chain id (server-side state)
    lastResponseId: v.optional(v.string()),
    // viral-loop hook (unused in baseline, here to avoid a later migration)
    referrerSessionId: v.optional(v.id("sessions")),
    createdAt: v.number(),
  })
    .index("by_device", ["deviceId"])
    .index("by_created", ["createdAt"])
    .index("by_review", ["reviewStatus"]),

  messages: defineTable({
    sessionId: v.id("sessions"),
    role: v.string(), // visitor | assistant | system | tool
    text: v.string(),
    ts: v.number(),
  }).index("by_session", ["sessionId"]),

  llmJobs: defineTable({
    sessionId: v.id("sessions"),
    kind: v.string(),
    status: v.string(), // pending | claimed | done | error
    input: v.any(),
    result: v.optional(v.any()),
    error: v.optional(v.string()),
    attempts: v.optional(v.number()),
    createdAt: v.number(),
    claimedAt: v.optional(v.number()),
    finishedAt: v.optional(v.number()),
  }).index("by_status", ["status"]),

  // drives the iPad demo view (shared state, not browser automation)
  demoState: defineTable({
    sessionId: v.id("sessions"),
    view: v.string(), // home | churn | alerts | pricing | integrations | query-result
    params: v.optional(v.any()),
    highlight: v.optional(v.string()),
    updatedAt: v.number(),
  }).index("by_session", ["sessionId"]),

  // the "agent thinking" timeline shown on the dashboard
  events: defineTable({
    sessionId: v.id("sessions"),
    step: v.string(), // identify | enrich | needs | demo | score | badge | email | hw
    label: v.string(),
    detail: v.optional(v.string()),
    ms: v.optional(v.number()), // step duration
    ts: v.number(),
  }).index("by_session", ["sessionId"]),

  // commands the Pi polls for (future actuators); kept for B3's poll/ack loop
  hwCommands: defineTable({
    deviceId: v.string(),
    kind: v.string(), // led | print | ...
    payload: v.any(),
    acked: v.boolean(),
    createdAt: v.number(),
  }).index("by_device_unacked", ["deviceId", "acked"]),

  // presence pings from the Pi -> the iPad subscribes and greets
  presence: defineTable({
    deviceId: v.string(),
    event: v.string(), // approach | leave
    ts: v.number(),
  }).index("by_device", ["deviceId"]),

  // cost discipline: cache fiber enrichment by company domain
  fiberCache: defineTable({
    key: v.string(), // company domain or linkedin url
    payload: v.any(),
    createdAt: v.number(),
  }).index("by_key", ["key"]),
});

import { action, internalAction, internalMutation, mutation } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";
import { structured } from "./llm";

type EmailDraft = { subject: string; body: string };

const EMAIL_JSON_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["subject", "body"],
  properties: {
    subject: { type: "string" },
    body: { type: "string" },
  },
};

const EMAIL_SYSTEM = `Draft a short, warm post-booth follow-up email from the Acme Analytics team to a visitor.
Reference (a) the exact demo view they saw and (b) the specific problem they described, in
their words. One clear, soft next step (a quick call or a sandbox), never pushy. 90-150
words. Plain, human, founder-to-operator tone. No emoji, no hype, no fake stats. Sign off
as "— The Acme Analytics team". You may include their discount code once, naturally.`;

const DEFAULT_RESEND_FROM = "Acme Analytics <onboarding@resend.dev>";

const sendResultValidator = v.union(
  v.object({ ok: v.literal(true), error: v.optional(v.string()) }),
  v.object({ ok: v.literal(false), error: v.string() }),
);

export const approve = mutation({
  args: { sessionId: v.id("sessions") },
  returns: v.null(),
  handler: async (ctx, { sessionId }) => {
    await ctx.db.patch(sessionId, { reviewStatus: "approved" });
    return null;
  },
});

export const edit = mutation({
  args: {
    sessionId: v.id("sessions"),
    subject: v.string(),
    body: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, { sessionId, subject, body }) => {
    await ctx.db.patch(sessionId, {
      emailDraft: { subject, body },
      reviewStatus: "edited",
    });
    return null;
  },
});

export const discard = mutation({
  args: { sessionId: v.id("sessions") },
  returns: v.null(),
  handler: async (ctx, { sessionId }) => {
    await ctx.db.patch(sessionId, { reviewStatus: "discarded" });
    return null;
  },
});

export const send = action({
  args: { sessionId: v.id("sessions") },
  returns: sendResultValidator,
  handler: async (ctx, { sessionId }): Promise<{ ok: boolean; error?: string }> => {
    const session = await ctx.runQuery(internal.sessions.getInternal, {
      sessionId,
    });
    if (!session?.emailDraft) {
      return { ok: false, error: "no email draft" };
    }
    if (!session.email) {
      return { ok: false, error: "no recipient email" };
    }
    if (
      session.reviewStatus !== "approved" &&
      session.reviewStatus !== "edited"
    ) {
      return { ok: false, error: "email not approved" };
    }

    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) return { ok: false, error: "no resend key" };

    try {
      const from = process.env.RESEND_FROM?.trim() || DEFAULT_RESEND_FROM;
      const response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          authorization: `Bearer ${apiKey}`,
          "content-type": "application/json",
        },
        body: JSON.stringify({
          from,
          to: session.email,
          subject: session.emailDraft.subject,
          text: session.emailDraft.body,
          reply_to: from,
        }),
      });
      if (!response.ok) {
        const bodyText = (await response.text()).trim().slice(0, 200);
        return {
          ok: false,
          error: `resend ${response.status}: ${bodyText}`,
        };
      }
      await ctx.runMutation(internal.email.markSent, { sessionId });
      return { ok: true };
    } catch (error) {
      const message = error instanceof Error ? error.message : "unknown error";
      return { ok: false, error: `resend failed: ${message.slice(0, 200)}` };
    }
  },
});

export const draft = internalAction({
  args: { sessionId: v.id("sessions"), qualify: v.any() },
  handler: async (ctx, { sessionId, qualify }): Promise<EmailDraft> => {
    const session = await ctx.runQuery(internal.sessions.getInternal, {
      sessionId,
    });
    const fallback = fallbackEmail(session);
    return await structured<EmailDraft>({
      model: process.env.OPENAI_REASON_MODEL ?? "gpt-5.5",
      system: EMAIL_SYSTEM,
      user: JSON.stringify({ session, qualify }),
      schema: EMAIL_JSON_SCHEMA,
      name: "email_draft",
      fallback,
      validate: validateEmailDraft,
    });
  },
});

export const markSent = internalMutation({
  args: { sessionId: v.id("sessions") },
  handler: async (ctx, { sessionId }) => {
    await ctx.db.patch(sessionId, {
      reviewStatus: "sent",
      sentAt: Date.now(),
    });
  },
});

function validateEmailDraft(value: unknown): EmailDraft | null {
  const raw = value as any;
  if (
    !raw ||
    typeof raw.subject !== "string" ||
    typeof raw.body !== "string"
  ) {
    return null;
  }
  return {
    subject: raw.subject.slice(0, 160),
    body: raw.body,
  };
}

export function fallbackEmail(session: any): EmailDraft {
  const name = session?.visitorName ? ` ${session.visitorName}` : "";
  const problem = session?.problems?.[0] ?? session?.useCase ?? "your product analytics goals";
  const view = session?.demoShown?.[0] ?? "churn";
  const code = session?.badge?.discountCode ?? "ACME-DEMO";
  return {
    subject: `Your ${view} demo in Acme — quick follow-up from the booth`,
    body: `Hi${name},

Great talking at the booth about ${problem}. The ${view} view you saw is built to make that problem easier to spot, explain, and act on without waiting on another dashboard cycle.

Worth a quick look with your own data, or should we send over a sandbox? Your booth code ${code} takes 25% off year one.

— The Acme Analytics team`,
  };
}

"use client";

import { tool } from "@openai/agents/realtime";
import { z } from "zod";
import type { ConvexReactClient } from "convex/react";
import { api } from "@cvx/_generated/api";
import type { Id } from "@cvx/_generated/dataModel";
import type { Session } from "../types";
import type { WebcamHandle } from "./components/WebcamCapture";

/**
 * The booth concierge's tools. Each `execute` runs in the browser, calls a Convex
 * mutation/action, and Convex's reactive subscriptions re-render the demo + CRM
 * card on screen — the shared-state pattern, no browser automation. Tool errors
 * never throw to the model; they return a calm string so the agent stays natural.
 */
export type BoothToolContext = {
  convex: ConvexReactClient;
  sessionId: Id<"sessions">;
  webcamRef: { current: WebcamHandle | null };
  onThinking: (on: boolean) => void;
  onPhotoFlash: () => void;
};

const topicSchema = z.object({
  topic: z.string(),
  share: z.string(),
  trend: z.string(),
});

const escalationSchema = z.object({
  question: z.string(),
  reason: z.string(),
});

const viewParamsSchema = z.object({
  // Universal — powers the "LIVE · {company}" chip on every view
  company: z.string().nullable().optional(),
  // query-result view — the hero demo: a real customer question answered instantly
  question: z.string().nullable().optional(),
  answer: z.string().nullable().optional(),
  sources: z.string().nullable().optional(),
  // churn / impact view — deflection metrics
  ticketVolume: z.string().nullable().optional(),
  deflectionRate: z.string().nullable().optional(),
  firstResponse: z.string().nullable().optional(),
  csat: z.string().nullable().optional(),
  hoursSaved: z.string().nullable().optional(),
  series: z.string().nullable().optional(),
  topTopics: z.array(topicSchema).nullable().optional(),
  // alerts view — escalations and doc gaps
  severity: z.string().nullable().optional(),
  escalations: z.array(escalationSchema).nullable().optional(),
  // integrations view
  tools: z.string().nullable().optional(),
  // pricing view
  plan: z.string().nullable().optional(),
  agents: z.string().nullable().optional(),
  // home view
  role: z.string().nullable().optional(),
});

// Turn the enriched card into a short briefing the agent can weave in (never read aloud raw).
export function summarizeEnrichment(session: Session | null): string {
  const f = session?.fiber;
  if (!f || (!f.company && !f.person)) {
    return "No enrichment found. Ask them about their company and role yourself; stay warm.";
  }
  const c = f.company ?? {};
  const p = f.person ?? {};
  const facts = [
    p.fullName && `name ${p.fullName}`,
    p.title && `role ${p.title}`,
    c.name && `company ${c.name}`,
    c.industry && `industry ${c.industry}`,
    c.employeeCount && `~${c.employeeCount} employees`,
    c.funding && `funding ${c.funding}`,
    c.location && `based ${c.location}`,
    Array.isArray(c.techStack) && c.techStack.length ? `stack ${c.techStack.slice(0, 4).join(", ")}` : null,
    p.isDecisionMaker ? "likely a decision maker" : null,
  ].filter(Boolean);
  const flag = f.source === "fallback" ? " (low-confidence guess — verify gently, don't assert)" : "";
  return `VERIFIED VISITOR${flag}: ${facts.join("; ")}. Weave one detail in to show you did your homework; never read raw fields aloud.`;
}

export function buildBoothTools(ctx: BoothToolContext) {
  const { convex, sessionId, webcamRef, onThinking, onPhotoFlash } = ctx;

  // Wrap an execute so the orb shows "thinking" and errors degrade gracefully.
  const guard =
    <A,>(fn: (args: A) => Promise<string>) =>
    async (args: A): Promise<string> => {
      onThinking(true);
      try {
        return await fn(args);
      } catch (err) {
        console.error("[booth tool]", err);
        return "That didn't go through, but keep the conversation natural — don't mention it.";
      } finally {
        onThinking(false);
      }
    };

  const lookupVisitor = tool({
    name: "lookup_visitor",
    description:
      "Research the visitor live via enrichment when they share a name, company, or LinkedIn. Call as soon as you have any one of them. Returns a short briefing to weave in. Only set reveal=true once they're clearly engaged and you still need their work email.",
    parameters: z.object({
      name: z.string().nullable().optional(),
      company: z.string().nullable().optional(),
      linkedinUrl: z.string().nullable().optional(),
      reveal: z.boolean().nullable().optional(),
    }),
    execute: guard(async ({ name, company, linkedinUrl, reveal }) => {
      await convex.action(api.fiber.lookupVisitor, {
        sessionId,
        ...(name ? { name } : {}),
        ...(company ? { company } : {}),
        ...(linkedinUrl ? { linkedinUrl } : {}),
        reveal: reveal ?? false,
      });
      const session = (await convex.query(api.sessions.get, { sessionId })) as Session | null;
      return summarizeEnrichment(session);
    }),
  });

  const setNeeds = tool({
    name: "set_needs",
    description:
      "Record the visitor's problems, use case, and urgency as you learn them, plus your running internal read of fit. Call whenever you learn something material. confidence is 0-100 and is NEVER spoken to the visitor.",
    parameters: z.object({
      problems: z.array(z.string()),
      useCase: z.string().nullable().optional(),
      urgency: z.enum(["low", "medium", "high"]).nullable().optional(),
      urgencyEvidence: z.string().nullable().optional(),
      confidence: z.number().nullable().optional(),
      confidenceReasons: z.array(z.string()).nullable().optional(),
      bestAngle: z.string().nullable().optional(),
    }),
    execute: guard(async (a) => {
      await convex.mutation(api.sessions.setNeeds, {
        sessionId,
        problems: a.problems,
        ...(a.useCase ? { useCase: a.useCase } : {}),
        ...(a.urgency ? { urgency: a.urgency } : {}),
        ...(a.urgencyEvidence ? { urgencyEvidence: a.urgencyEvidence } : {}),
        ...(a.confidence != null ? { confidence: a.confidence } : {}),
        ...(a.confidenceReasons ? { confidenceReasons: a.confidenceReasons } : {}),
        ...(a.bestAngle ? { bestAngle: a.bestAngle } : {}),
      });
      return "Noted.";
    }),
  });

  const showView = tool({
    name: "show_view",
    description:
      "Drive the on-screen Quill demo to the view that best matches the visitor's stated problem. Pass their OWN support numbers as display strings in params to make the dashboard theirs. Views: query-result = hero live-answer demo (a real customer question answered instantly with cited sources); churn = IMPACT dashboard (deflection rate, ticket volume, response time, CSAT); alerts = escalations and doc gaps; integrations = connect their support sources; pricing = plans; home = greeting or recap.",
    parameters: z.object({
      view: z.enum(["home", "churn", "alerts", "pricing", "integrations", "query-result"]),
      params: viewParamsSchema.nullable().optional(),
    }),
    execute: guard(async ({ view, params }) => {
      const clean = params
        ? Object.fromEntries(Object.entries(params).filter(([, v]) => v != null))
        : undefined;
      await convex.mutation(api.demoState.setDemoState, {
        sessionId,
        view,
        ...(clean && Object.keys(clean).length ? { params: clean } : {}),
      });
      return "On screen.";
    }),
  });

  const highlight = tool({
    name: "highlight",
    description:
      "Pulse/focus a single element id in the current demo view to draw the visitor's eye while you talk.",
    parameters: z.object({ elementId: z.string() }),
    execute: guard(async ({ elementId }) => {
      await convex.mutation(api.demoState.setHighlight, { sessionId, elementId });
      return "Highlighted.";
    }),
  });

  const captureContact = tool({
    name: "capture_contact",
    description:
      "Save the visitor's contact info once they share it. Prefer LinkedIn or work email.",
    parameters: z.object({
      email: z.string().nullable().optional(),
      phone: z.string().nullable().optional(),
      linkedinUrl: z.string().nullable().optional(),
    }),
    execute: guard(async (a) => {
      await convex.mutation(api.sessions.captureContact, {
        sessionId,
        ...(a.email ? { email: a.email } : {}),
        ...(a.phone ? { phone: a.phone } : {}),
        ...(a.linkedinUrl ? { linkedinUrl: a.linkedinUrl } : {}),
      });
      return "Saved their contact.";
    }),
  });

  const capturePhoto = tool({
    name: "capture_photo",
    description:
      "Snap a fun photo of the visitor for their Booth Badge. Call exactly once, mid-conversation, right after you ask them to strike a pose.",
    parameters: z.object({}),
    execute: guard(async () => {
      const blob = await webcamRef.current?.capture();
      if (!blob) return "No camera available — continue warmly without a photo, don't mention it.";
      onPhotoFlash();
      const uploadUrl = await convex.mutation(api.photo.generateUploadUrl, {});
      const res = await fetch(uploadUrl, {
        method: "POST",
        headers: { "Content-Type": blob.type || "image/jpeg" },
        body: blob,
      });
      const { storageId } = (await res.json()) as { storageId: Id<"_storage"> };
      await convex.mutation(api.photo.attachPhoto, { sessionId, storageId });
      return "Got the photo for their badge.";
    }),
  });

  const finalizeSession = tool({
    name: "finalize_session",
    description:
      "Wrap up: score the lead, generate their Booth Badge, and draft a follow-up email for human review (never sent on the spot). Call once, near the end, after the demo and contact capture.",
    parameters: z.object({}),
    execute: guard(async () => {
      await convex.action(api.finalize.finalize, { sessionId });
      return "Their badge is printing and a draft follow-up is queued for the team.";
    }),
  });

  return [
    lookupVisitor,
    setNeeds,
    showView,
    highlight,
    captureContact,
    capturePhoto,
    finalizeSession,
  ];
}

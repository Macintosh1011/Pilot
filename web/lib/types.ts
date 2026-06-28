import type { Id } from "@cvx/_generated/dataModel";

export type { Id };

export type SessionStatus = "active" | "enriching" | "demoing" | "finalizing" | "done";
export type FiberMatch = "verified" | "mismatch" | "none";
export type Urgency = "low" | "medium" | "high";
export type ReviewStatus = "pending" | "approved" | "edited" | "sent" | "discarded";

export type Badge = {
  archetype: string;
  tagline: string;
  compliment: string;
  stats: { label: string; value: number }[];
  discountCode: string;
  ogImageId?: Id<"_storage">;
};

export type Session = {
  _id: Id<"sessions">;
  _creationTime: number;
  deviceId: string;
  status: SessionStatus;
  visitorName?: string;
  company?: string;
  role?: string;
  linkedinUrl?: string;
  email?: string;
  phone?: string;
  fiberMatch?: FiberMatch;
  problems?: string[];
  useCase?: string;
  urgency?: Urgency;
  urgencyEvidence?: string;
  confidence?: number;
  confidenceReasons?: string[];
  bestAngle?: string;
  demoShown?: string[];
  badge?: Badge;
  emailDraft?: { subject: string; body: string };
  reviewStatus?: ReviewStatus;
  sentAt?: number;
  referrerSessionId?: Id<"sessions">;
  createdAt: number;
};

export type DemoState = {
  _id: Id<"demoState">;
  sessionId: Id<"sessions">;
  view: string;
  params?: unknown;
  highlight?: string;
  updatedAt: number;
};

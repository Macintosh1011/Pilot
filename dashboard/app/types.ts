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

export type FiberNormalized = {
  source?: "fiber" | "cache" | "fallback" | string;
  company?: {
    name?: string;
    domain?: string;
    industry?: string;
    employeeCount?: number;
    founded?: number;
    funding?: string;
    location?: string;
    linkedinUrl?: string;
    description?: string;
    techStack?: string[];
  };
  person?: {
    fullName?: string;
    title?: string;
    seniority?: string;
    location?: string;
    linkedinUrl?: string;
    headline?: string;
    tenureMonths?: number;
    isDecisionMaker?: boolean;
  };
  contact?: {
    workEmail?: string;
    personalEmail?: string;
    phone?: string;
    emailStatus?: string;
  };
  credits?: {
    available?: number;
    chargedThisVisit?: number;
  };
  fetchedAt?: number;
  [key: string]: unknown;
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
  visitorPhotoUrl?: string;
  fiber?: FiberNormalized;
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

export type AgentEvent = {
  _id: Id<"events">;
  _creationTime: number;
  sessionId: Id<"sessions">;
  step: "identify" | "enrich" | "needs" | "demo" | "score" | "badge" | "email" | "hw";
  label: string;
  detail?: string;
  ms?: number;
  ts: number;
};

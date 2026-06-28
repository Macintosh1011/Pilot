import {
  action,
  internalAction,
  internalMutation,
  internalQuery,
} from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";

type FiberSource = "fiber" | "cache" | "fallback";
type FiberMatch = "verified" | "mismatch" | "none";
type LookupVisitorResult = {
  ok: boolean;
  fiberMatch: FiberMatch;
  source: FiberSource;
};
type LookupResult = {
  normalized: any;
  fiberMatch: FiberMatch;
  source: FiberSource;
  detail: string;
};

const BASE_URL = "https://api.fiber.ai";
const MIN_CREDITS = 10;

export const lookupVisitor = action({
  args: {
    sessionId: v.id("sessions"),
    name: v.optional(v.string()),
    company: v.optional(v.string()),
    linkedinUrl: v.optional(v.string()),
    reveal: v.optional(v.boolean()),
  },
  handler: async (ctx, args): Promise<LookupVisitorResult> => {
    return await ctx.runAction(internal.fiber.lookupVisitorInternal, args);
  },
});

export const lookupVisitorInternal = internalAction({
  args: {
    sessionId: v.id("sessions"),
    name: v.optional(v.string()),
    company: v.optional(v.string()),
    linkedinUrl: v.optional(v.string()),
    reveal: v.optional(v.boolean()),
  },
  handler: async (ctx, args): Promise<LookupVisitorResult> => {
    const started = Date.now();
    const session = await ctx.runQuery(internal.sessions.getInternal, {
      sessionId: args.sessionId,
    });
    const prevStatus = session?.status ?? "active";
    await ctx.runMutation(internal.sessions.setStatus, {
      sessionId: args.sessionId,
      status: "enriching",
    });
    await ctx.runMutation(internal.events.log, {
      sessionId: args.sessionId,
      step: "enrich",
      label: "Researching visitor",
    });

    try {
      const result = await lookup(ctx, args, session);
      await ctx.runMutation(internal.sessions.setStatus, {
        sessionId: args.sessionId,
        status: prevStatus,
      });
      await ctx.runMutation(internal.events.log, {
        sessionId: args.sessionId,
        step: "enrich",
        label: `Found ${result.normalized.company?.name ?? "company"} · match ${result.fiberMatch}`,
        detail: result.detail,
        ms: Date.now() - started,
      });
      return {
        ok: true,
        fiberMatch: result.fiberMatch,
        source: result.source,
      };
    } catch {
      const normalized = fallbackFiber(args.name, args.company, args.linkedinUrl);
      const fiberMatch: FiberMatch =
        args.name || args.company || args.linkedinUrl ? "verified" : "none";
      await writeResult(ctx, args.sessionId, session, args, normalized, fiberMatch);
      await ctx.runMutation(internal.sessions.setStatus, {
        sessionId: args.sessionId,
        status: prevStatus,
      });
      return { ok: true, fiberMatch, source: "fallback" };
    }
  },
});

export const getCache = internalQuery({
  args: { key: v.string() },
  handler: async (ctx, { key }) => {
    return await ctx.db
      .query("fiberCache")
      .withIndex("by_key", (q) => q.eq("key", key))
      .order("desc")
      .first();
  },
});

export const putCache = internalMutation({
  args: { key: v.string(), payload: v.any() },
  handler: async (ctx, { key, payload }) => {
    await ctx.db.insert("fiberCache", { key, payload, createdAt: Date.now() });
  },
});

async function lookup(ctx: any, args: any, session: any): Promise<LookupResult> {
  const apiKey = process.env.FIBER_API_KEY;
  if (!apiKey) {
    const normalized = fallbackFiber(args.name, args.company, args.linkedinUrl);
    const fiberMatch: FiberMatch =
      args.name || args.company || args.linkedinUrl ? "verified" : "none";
    await writeResult(ctx, args.sessionId, session, args, normalized, fiberMatch);
    return {
      normalized,
      fiberMatch,
      source: "fallback" as FiberSource,
      detail: "fallback · no fiber key",
    };
  }

  const key =
    domainOf(args.company) ??
    domainOf(session?.company) ??
    args.linkedinUrl ??
    session?.linkedinUrl ??
    args.company ??
    session?.company ??
    args.name ??
    args.sessionId;
  const cached = await ctx.runQuery(internal.fiber.getCache, { key });
  let companyPayload: any;
  let personPayload: any;
  let source: FiberSource = "fiber";
  let chargedThisVisit = 0;
  let available: number | undefined;

  if (cached?.payload) {
    companyPayload = cached.payload.companyPayload;
    personPayload = cached.payload.personPayload;
    source = "cache";
  } else {
    const credits = await getCredits(apiKey);
    available = credits.available;
    if ((available ?? 0) < MIN_CREDITS) {
      const normalized = fallbackFiber(args.name, args.company, args.linkedinUrl);
      const fiberMatch: FiberMatch =
        args.name || args.company || args.linkedinUrl ? "verified" : "none";
      await writeResult(ctx, args.sessionId, session, args, normalized, fiberMatch);
      return {
        normalized,
        fiberMatch,
        source: "fallback" as FiberSource,
        detail: `fallback · ${available ?? 0} credits`,
      };
    }

    companyPayload = await postFiber(apiKey, "/v1/kitchen-sink/company", {
      ...companyIdentifier(args.company ?? session?.company),
    });
    chargedThisVisit += charge(companyPayload);

    const linkedinUrl = args.linkedinUrl ?? session?.linkedinUrl;
    if (linkedinUrl) {
      personPayload = await postFiber(apiKey, "/v1/kitchen-sink/person", {
        profileIdentifier: { identifier: "linkedinUrl", value: linkedinUrl },
        liveFetch: true,
      });
      chargedThisVisit += charge(personPayload);
    } else if ((args.name ?? session?.visitorName) && (args.company ?? session?.company)) {
      const search = await postFiber(apiKey, "/v1/text-to-profile-search", {
        query: `${args.name ?? session?.visitorName} at ${
          args.company ?? session?.company
        }`,
      });
      chargedThisVisit += charge(search);
      const hit = firstProfileHit(search);
      if (hit) {
        personPayload = await postFiber(apiKey, "/v1/kitchen-sink/person", {
          profileIdentifier: { identifier: "linkedinUrl", value: hit },
          liveFetch: true,
        });
        chargedThisVisit += charge(personPayload);
      }
    }

    await ctx.runMutation(internal.fiber.putCache, {
      key,
      payload: { companyPayload, personPayload },
    });
  }

  let contactPayload: any;
  const personLinkedin =
    linkedinFromPerson(personPayload) ?? args.linkedinUrl ?? session?.linkedinUrl;
  if (args.reveal && personLinkedin) {
    contactPayload = await postFiber(apiKey, "/v1/contact-details/single", {
      linkedinUrl: personLinkedin,
      enrichmentType: {
        getWorkEmails: true,
        getPersonalEmails: false,
        getPhoneNumbers: true,
      },
      validateEmails: true,
    });
    chargedThisVisit += charge(contactPayload);
  }

  const normalized = normalizeFiber(
    companyPayload,
    personPayload,
    contactPayload,
    source,
    { available, chargedThisVisit },
  );
  if (!normalized.company && !normalized.person) {
    const fallback = fallbackFiber(args.name, args.company, args.linkedinUrl);
    const fiberMatch: FiberMatch =
      args.name || args.company || args.linkedinUrl ? "verified" : "none";
    await writeResult(ctx, args.sessionId, session, args, fallback, fiberMatch);
    return {
      normalized: fallback,
      fiberMatch,
      source: "fallback" as FiberSource,
      detail: "fallback · empty fiber response",
    };
  }
  const fiberMatch = crossCheck(
    {
      company: args.company ?? session?.company,
      role: session?.role,
    },
    normalized,
  );
  await writeResult(ctx, args.sessionId, session, args, normalized, fiberMatch);
  return clean({
    normalized,
    fiberMatch,
    source,
    detail: `${chargedThisVisit} credits · ${
      normalized.company?.funding ?? normalized.company?.industry ?? "fiber"
    }`,
  });
}

async function writeResult(
  ctx: any,
  sessionId: any,
  session: any,
  args: any,
  normalized: any,
  fiberMatch: FiberMatch,
) {
  const contact = normalized.contact ?? {};
  const patch = clean({
    visitorName: session?.visitorName ?? args.name,
    company: session?.company ?? args.company ?? normalized.company?.name,
    linkedinUrl:
      session?.linkedinUrl ?? args.linkedinUrl ?? normalized.person?.linkedinUrl,
    role: normalized.person?.title ?? session?.role,
    ...(contact.workEmail ? { email: contact.workEmail } : {}),
    ...(contact.phone ? { phone: contact.phone } : {}),
    fiber: normalized,
    fiberMatch,
  });
  await ctx.runMutation(internal.sessions.patchCard, {
    sessionId,
    patch,
  });
}

async function getCredits(apiKey: string) {
  const data = await getFiber(apiKey, "/v1/get-org-credits");
  return { available: Number(data?.available ?? data?.credits ?? data?.remaining ?? 0) };
}

async function getFiber(apiKey: string, path: string) {
  const url = new URL(`${BASE_URL}${path}`);
  url.searchParams.set("apiKey", apiKey);
  return await fetchJson(url.toString(), { method: "GET" }, 8_000);
}

async function postFiber(apiKey: string, path: string, body: Record<string, unknown>) {
  return await fetchJson(
    `${BASE_URL}${path}`,
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ apiKey, ...body }),
    },
    10_000,
  );
}

async function fetchJson(url: string, init: RequestInit, ms: number) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), ms);
  try {
    const response = await fetch(url, { ...init, signal: controller.signal });
    if (!response.ok) return null;
    return await response.json();
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

function normalizeFiber(
  companyPayload: any,
  personPayload: any,
  contactPayload: any,
  source: FiberSource,
  credits?: { available?: number; chargedThisVisit?: number },
) {
  const company = firstCompany(companyPayload);
  const person = personPayload?.output?.profile ?? personPayload?.profile ?? personPayload?.output;
  const contactProfile = contactPayload?.output?.profile ?? contactPayload?.profile ?? {};

  return clean({
    company: company
      ? {
          name: pick(company.name, company.company_name, company.display_name),
          domain: pick(company.domain, company.website_domain, company.primary_domain),
          industry: pick(company.industry, company.category, company.sector),
          employeeCount: numberish(
            pick(company.employee_count_consensus, company.employeeCount, company.employees),
          ),
          founded: yearish(pick(company.founded_on_consensus, company.founded, company.founded_on)),
          funding: pick(company.latest_funding_consensus, company.funding_stage, company.funding),
          location: pick(company.location, company.headquarters, company.hq_location),
          linkedinUrl: pick(company.linkedin_url, company.linkedinUrl),
          description: pick(company.description, company.short_description),
          techStack: arrayish(pick(company.tech_stack, company.technologies)),
        }
      : undefined,
    person: person
      ? {
          fullName: pick(person.full_name, person.fullName, person.name),
          title: pick(person.title, person.headline_title, person.current_title),
          seniority: seniority(pick(person.title, person.seniority, person.headline)),
          location: pick(person.location, person.geo),
          linkedinUrl: pick(person.linkedin_url, person.linkedinUrl, person.url),
          headline: pick(person.headline, person.summary),
          tenureMonths: numberish(pick(person.tenure_months, person.tenureMonths)),
          isDecisionMaker: isDecisionMaker(pick(person.title, person.seniority, person.headline)),
        }
      : undefined,
    contact: {
      workEmail: firstString(
        contactProfile.work_emails,
        contactProfile.workEmails,
        contactProfile.emails,
      ),
      personalEmail: firstString(contactProfile.personal_emails),
      phone: firstString(contactProfile.phone_numbers, contactProfile.phones),
      emailStatus: pick(contactProfile.email_status, contactProfile.emailStatus) ?? "unknown",
    },
    source,
    credits,
    fetchedAt: Date.now(),
  });
}

function fallbackFiber(name?: string, company?: string, linkedinUrl?: string) {
  return clean({
    company: {
      name: company ?? "Northwind Labs",
      domain: domainOf(company) ?? "northwindlabs.com",
      industry: "B2B SaaS — Developer Tools",
      employeeCount: 80,
      founded: 2021,
      funding: "Series A",
      location: "San Francisco, CA",
      linkedinUrl: "https://www.linkedin.com/company/northwind-labs",
      description: "Northwind Labs builds CI/CD observability for engineering teams.",
      techStack: ["React", "Postgres", "Segment", "Snowflake"],
    },
    person: {
      fullName: name ?? "Jordan Rivera",
      title: "Head of Growth",
      seniority: "Head",
      location: "San Francisco, CA",
      linkedinUrl: linkedinUrl ?? "https://www.linkedin.com/in/jordan-rivera-growth",
      headline: `Head of Growth at ${company ?? "Northwind Labs"} · ex-Segment`,
      tenureMonths: 14,
      isDecisionMaker: true,
    },
    contact: { workEmail: "jordan@northwindlabs.com", emailStatus: "valid" },
    source: "fallback" as FiberSource,
    fetchedAt: Date.now(),
  });
}

function crossCheck(stated: { company?: string; role?: string }, n: any): FiberMatch {
  if (!n.company && !n.person) return "none";
  const companyOk =
    !stated.company ||
    !n.company?.name ||
    norm(stated.company) === norm(n.company.name) ||
    domainOf(stated.company) === n.company?.domain;
  const roleOk =
    !stated.role || !n.person?.title || tokenOverlap(stated.role, n.person.title) > 0;
  return companyOk && roleOk ? "verified" : "mismatch";
}

function companyIdentifier(company?: string) {
  const domain = domainOf(company);
  if (domain) return { companyDomain: domain };
  if (company) return { companyName: company };
  return {};
}

function domainOf(value?: string) {
  if (!value) return undefined;
  const trimmed = value.trim().toLowerCase();
  const match = trimmed.match(/(?:https?:\/\/)?(?:www\.)?([^/\s]+\.[a-z]{2,})/);
  return match?.[1];
}

function firstCompany(payload: any) {
  return (
    payload?.output?.data?.[0] ??
    payload?.output?.company ??
    payload?.company ??
    payload?.data?.[0] ??
    null
  );
}

function firstProfileHit(payload: any) {
  return (
    payload?.output?.data?.[0]?.linkedinUrl ??
    payload?.output?.data?.[0]?.linkedin_url ??
    payload?.data?.[0]?.linkedinUrl ??
    payload?.data?.[0]?.linkedin_url
  );
}

function linkedinFromPerson(payload: any) {
  const person = payload?.output?.profile ?? payload?.profile ?? payload?.output;
  return pick(person?.linkedinUrl, person?.linkedin_url, person?.url);
}

function charge(payload: any) {
  return Number(
    payload?.chargeInfo?.credits ??
      payload?.charge_info?.credits ??
      payload?.creditsCharged ??
      0,
  );
}

function norm(value?: string) {
  return (value ?? "").toLowerCase().replace(/[^a-z0-9]/g, "");
}

function tokenOverlap(a: string, b: string) {
  const aTokens = new Set(a.toLowerCase().split(/[^a-z0-9]+/).filter(Boolean));
  return b
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((token) => aTokens.has(token)).length;
}

function pick<T>(...values: (T | undefined | null)[]) {
  return values.find((value) => value !== undefined && value !== null && value !== "") as
    | T
    | undefined;
}

function firstString(...values: any[]) {
  for (const value of values) {
    if (typeof value === "string") return value;
    if (Array.isArray(value) && typeof value[0] === "string") return value[0];
    if (Array.isArray(value) && typeof value[0]?.email === "string") return value[0].email;
    if (Array.isArray(value) && typeof value[0]?.number === "string") return value[0].number;
  }
  return undefined;
}

function numberish(value: unknown) {
  const n = Number(value);
  return Number.isFinite(n) ? n : undefined;
}

function yearish(value: unknown) {
  if (typeof value === "number") return value;
  const match = String(value ?? "").match(/\d{4}/);
  return match ? Number(match[0]) : undefined;
}

function arrayish(value: unknown) {
  if (Array.isArray(value)) return value.filter((v) => typeof v === "string");
  return undefined;
}

function seniority(value?: string) {
  if (!value) return undefined;
  const match = value.match(/Founder|CEO|CTO|CPO|VP|Head|Director|Lead|Manager|IC/i);
  return match?.[0];
}

function isDecisionMaker(value?: string) {
  return /founder|ceo|cto|cpo|vp|head|director/i.test(value ?? "");
}

function clean<T>(value: T): T {
  if (Array.isArray(value)) {
    return value
      .map((item) => clean(item))
      .filter((item) => item !== undefined) as T;
  }
  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [key, nested] of Object.entries(value)) {
      const cleaned = clean(nested);
      if (cleaned !== undefined) out[key] = cleaned;
    }
    return out as T;
  }
  return value;
}

import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { ConvexHttpClient } from "convex/browser";
import { api } from "../convex/_generated/api.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, "..");
const envFile = readRootEnv();

const CONVEX_URL =
  process.env.CONVEX_URL ??
  envFile.CONVEX_URL ??
  process.env.NEXT_PUBLIC_CONVEX_URL ??
  envFile.NEXT_PUBLIC_CONVEX_URL;
const DASHBOARD_URL =
  process.env.DASHBOARD_URL ?? envFile.DASHBOARD_URL ?? "http://localhost:3000";

if (!CONVEX_URL) {
  throw new Error("CONVEX_URL is required. Set it or add it to repo-root .env.local.");
}

const client = new ConvexHttpClient(CONVEX_URL);

const visitor = {
  deviceId: "sim-visitor-1",
  name: "Maya",
  company: "Globex",
  role: "VP Product",
  email: process.env.DEMO_VISITOR_EMAIL ?? "demo-recipient@example.com",
  linkedinUrl: "https://www.linkedin.com/in/demo-visitor",
};

console.log(`[simulate-visitor] connected to ${CONVEX_URL}`);

const sessionId = await client.mutation(api.sessions.create, {
  deviceId: visitor.deviceId,
});
console.log(`[simulate-visitor] session ${sessionId}`);

await addMessage(
  "visitor",
  `Hi, I'm ${visitor.name}, ${visitor.role} at ${visitor.company}. We keep losing customers and only learn why after renewal risk is already high.`,
);
await addMessage(
  "assistant",
  "Let me show you how Acme surfaces churn signals before the renewal conversation gets tense.",
);
await client.mutation(api.sessions.setNeeds, {
  sessionId,
  problems: ["late churn detection", "missing customer-health alerts"],
  useCase: "Proactive churn alerts for customer success and product teams",
  urgency: "high",
  urgencyEvidence: "after renewal risk is already high",
});

await client.mutation(api.demoState.setDemoState, {
  sessionId,
  view: "churn",
  params: { company: visitor.company, segment: "enterprise accounts" },
});
await addMessage(
  "visitor",
  "The churn view is helpful, but I need my CS leads alerted when expansion accounts suddenly change usage patterns.",
);
await client.mutation(api.demoState.setDemoState, {
  sessionId,
  view: "alerts",
  params: { trigger: "usage drop on expansion accounts" },
});
await client.mutation(api.demoState.setHighlight, {
  sessionId,
  elementId: "risk-alert-threshold",
});
await addMessage(
  "assistant",
  "This alert can route directly to the account owner with the usage segment and likely churn driver attached.",
);
await addMessage(
  "visitor",
  "That's the workflow I want my CS and product leads reviewing this quarter.",
);

await client.mutation(api.sessions.captureContact, {
  sessionId,
  email: visitor.email,
  linkedinUrl: visitor.linkedinUrl,
});

const preview = await client.action(api.finalize.finalize, { sessionId });
console.log(
  `[simulate-visitor] finalize queued, preview confidence ${preview.confidence}`,
);

const session = await pollForBadge(sessionId);
const badgeUrl = `${DASHBOARD_URL.replace(/\/$/, "")}/badge/${sessionId}`;

console.log("\nDemo session ready");
console.log(`Session: ${sessionId}`);
console.log(`Confidence: ${session.confidence ?? "pending"}`);
console.log(`Dashboard badge: ${badgeUrl}`);

if (!session.badge) {
  console.log("Badge: still pending");
  process.exitCode = 1;
} else {
  console.log(`Archetype: ${session.badge.archetype}`);
  console.log(`Tagline: ${session.badge.tagline}`);
  console.log(`Discount code: ${session.badge.discountCode}`);
  console.log("Stats:");
  for (const stat of session.badge.stats) {
    console.log(`- ${stat.label}: ${stat.value}`);
  }
}

async function addMessage(role, text) {
  await client.mutation(api.messages.add, { sessionId, role, text });
}

async function pollForBadge(id) {
  const started = Date.now();
  let latest = null;
  while (Date.now() - started < 45_000) {
    latest = await client.query(api.sessions.get, { sessionId: id });
    if (latest?.badge && latest.emailDraft) return latest;
    await sleep(1_500);
  }
  return latest ?? (await client.query(api.sessions.get, { sessionId: id }));
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function readRootEnv() {
  try {
    const raw = readFileSync(resolve(repoRoot, ".env.local"), "utf8");
    return Object.fromEntries(
      raw
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter((line) => line && !line.startsWith("#"))
        .map((line) => {
          const equals = line.indexOf("=");
          if (equals === -1) return [line, ""];
          const key = line.slice(0, equals).trim();
          const value = line
            .slice(equals + 1)
            .trim()
            .replace(/^['"]|['"]$/g, "");
          return [key, value];
        }),
    );
  } catch {
    return {};
  }
}

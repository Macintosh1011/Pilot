import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { ConvexHttpClient } from "convex/browser";
import { api } from "../convex/_generated/api.js";
import { Codex } from "@openai/codex-sdk";

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, "..");
const envFile = readRootEnv();
const CONVEX_URL = process.env.CONVEX_URL ?? envFile.CONVEX_URL;
const WORKER_TOKEN = process.env.WORKER_TOKEN ?? envFile.WORKER_TOKEN;

if (!CONVEX_URL) {
  throw new Error("CONVEX_URL is required. Set it or add it to the repo root .env.local.");
}

const client = new ConvexHttpClient(CONVEX_URL);
const codex = new Codex();
let shuttingDown = false;

process.on("SIGINT", () => {
  shuttingDown = true;
});
process.on("SIGTERM", () => {
  shuttingDown = true;
});

console.log(`[llm-worker] connected to ${CONVEX_URL}`);

while (!shuttingDown) {
  try {
    const job = await client.mutation(api.llmJobs.claimNext, {
      token: WORKER_TOKEN || undefined,
    });
    if (!job) {
      await sleep(1_500);
      continue;
    }

    console.log(`[llm-worker] claimed ${job.jobId} for session ${job.sessionId}`);
    try {
      const result = await runCodexFinalize(job.input);
      await client.mutation(api.llmJobs.complete, {
        token: WORKER_TOKEN || undefined,
        jobId: job.jobId,
        result,
      });
      console.log(`[llm-worker] completed ${job.jobId}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      await client.mutation(api.llmJobs.fail, {
        token: WORKER_TOKEN || undefined,
        jobId: job.jobId,
        error: message,
      });
      console.error(`[llm-worker] failed ${job.jobId}: ${message}`);
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`[llm-worker] loop error: ${message}`);
    await sleep(1_500);
  }
}

console.log("[llm-worker] stopped");

async function runCodexFinalize(input) {
  const thread = codex.startThread({
    workingDirectory: repoRoot,
    sandboxMode: "read-only",
    approvalPolicy: "never",
    networkAccessEnabled: false,
  });
  const turn = await thread.run(buildPrompt(input), { outputSchema: FINALIZE_SCHEMA });
  const parsed = parseJsonObject(turn.finalResponse);
  const validated = validateFinalize(parsed);
  if (!validated) {
    throw new Error("Codex returned malformed finalize JSON");
  }
  return validated;
}

function buildPrompt(input) {
  return `You are the BoothPilot finalization brain for Acme Analytics.

Use the booth concierge system context below, but do not continue the conversation. Your only task is to analyze the completed session and return exactly one JSON object matching the provided schema.

SYSTEM CONTEXT:
You are the booth concierge for Acme Analytics at a startup conference. Acme Analytics is a product-analytics platform that helps B2B SaaS teams see why users churn, get alerts when key metrics move, explore data with plain-English queries, and connect their existing stack. The confidence score is internal and never shown to the visitor. Follow-up email drafts are human-in-the-loop and must never auto-send.

SCORING RUBRIC:
- factors.icpFit max 30: ICP / fiber firmographic fit. If fiberMatch is "mismatch", cap at 15. If "none", cap at 20.
- factors.intent max 25: buying/evaluation language and urgency in the transcript.
- factors.engagement max 20: substantive visitor turns and follow-up questions.
- factors.authority max 15: decision power from role/seniority.
- factors.demoDepth max 10: depth and specificity of demo views shown.
- confidence must equal the rounded sum of all factors.
- confidenceReasons must contain 2-4 concrete, plain-English reasons tied to factors.
- urgency is "low", "medium", or "high"; urgencyEvidence is the strongest transcript quote or close paraphrase.
- bestAngle is one sentence for the human rep's follow-up.

BADGE RULES:
Pick one archetype from: The Churn Whisperer, The Retention Renegade, The Activation Architect, The North-Star Navigator, The Cohort Cartographer, The Funnel Mechanic, The Signal Hunter, The Attribution Alchemist, The Revenue Archaeologist, The Onboarding Sherpa, The Data Custodian, The Pipeline Plumber, The Dashboard Dragon, The Zero-to-One Operator, The Self-Serve Sommelier.
The badge is public, flattering, witty, and grounded. The compliment must quote or closely paraphrase a real visitor detail. Stats must be 2-3 flattering bars with values 72-99. Generate a discount code shaped like ACME-XX-1234.

EMAIL RULES:
Draft a short, warm post-booth follow-up from the Acme Analytics team. Reference the exact demo view and specific problem in the visitor's words. One soft next step. 90-150 words. Plain, human, no emoji, no hype, no fake stats. Sign off as "— The Acme Analytics team".

SESSION INPUT:
${JSON.stringify(input, null, 2)}

Return only the JSON object.`;
}

function parseJsonObject(text) {
  const stripped = String(text ?? "")
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "");
  try {
    return JSON.parse(stripped);
  } catch {
    const start = stripped.indexOf("{");
    const end = stripped.lastIndexOf("}");
    if (start >= 0 && end > start) {
      return JSON.parse(stripped.slice(start, end + 1));
    }
    throw new Error("No JSON object found in Codex response");
  }
}

function validateFinalize(value) {
  if (!value || typeof value !== "object") return null;
  const qualify = validateQualify(value.qualify ?? value);
  const badge = validateBadge(value.badge);
  const emailDraft = validateEmailDraft(value.emailDraft);
  if (!qualify || !badge || !emailDraft) return null;
  return { qualify, badge, emailDraft };
}

function validateQualify(value) {
  if (!value || typeof value !== "object" || !value.factors) return null;
  const factors = {
    icpFit: clampNumber(value.factors.icpFit, 0, 30),
    intent: clampNumber(value.factors.intent, 0, 25),
    engagement: clampNumber(value.factors.engagement, 0, 20),
    authority: clampNumber(value.factors.authority, 0, 15),
    demoDepth: clampNumber(value.factors.demoDepth, 0, 10),
  };
  const confidence = Math.round(
    factors.icpFit + factors.intent + factors.engagement + factors.authority + factors.demoDepth,
  );
  const confidenceReasons = Array.isArray(value.confidenceReasons)
    ? value.confidenceReasons.filter((reason) => typeof reason === "string").slice(0, 4)
    : [];
  while (confidenceReasons.length < 2) {
    confidenceReasons.push(
      `Confidence ${confidence}/100 from ICP fit, intent, engagement, authority, and demo depth.`,
    );
  }
  return {
    factors,
    confidence,
    confidenceReasons,
    urgency: ["low", "medium", "high"].includes(value.urgency) ? value.urgency : "low",
    urgencyEvidence: typeof value.urgencyEvidence === "string" ? value.urgencyEvidence : "",
    bestAngle:
      typeof value.bestAngle === "string"
        ? value.bestAngle
        : "Lead with the visitor's stated problem and the demo view they saw.",
  };
}

function validateBadge(value) {
  if (
    !value ||
    typeof value.archetype !== "string" ||
    typeof value.tagline !== "string" ||
    typeof value.compliment !== "string" ||
    typeof value.discountCode !== "string" ||
    !Array.isArray(value.stats)
  ) {
    return null;
  }
  const stats = value.stats
    .filter((stat) => stat && typeof stat.label === "string" && typeof stat.value === "number")
    .slice(0, 3)
    .map((stat) => ({
      label: stat.label.slice(0, 48),
      value: Math.round(Math.min(100, Math.max(0, stat.value))),
    }));
  if (stats.length < 2) return null;
  return {
    archetype: value.archetype.slice(0, 80),
    tagline: value.tagline.slice(0, 160),
    compliment: value.compliment.slice(0, 360),
    stats,
    discountCode: value.discountCode.slice(0, 32),
  };
}

function validateEmailDraft(value) {
  if (!value || typeof value.subject !== "string" || typeof value.body !== "string") {
    return null;
  }
  return { subject: value.subject.slice(0, 160), body: value.body };
}

function clampNumber(value, min, max) {
  const number = typeof value === "number" && Number.isFinite(value) ? value : min;
  return Math.min(max, Math.max(min, number));
}

function readRootEnv() {
  const file = resolve(repoRoot, ".env.local");
  try {
    return Object.fromEntries(
      readFileSync(file, "utf8")
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter((line) => line && !line.startsWith("#") && line.includes("="))
        .map((line) => {
          const index = line.indexOf("=");
          const key = line.slice(0, index).trim();
          const value = line.slice(index + 1).trim().replace(/^['"]|['"]$/g, "");
          return [key, value];
        }),
    );
  } catch {
    return {};
  }
}

function sleep(ms) {
  return new Promise((resolveSleep) => setTimeout(resolveSleep, ms));
}

const FINALIZE_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["qualify", "badge", "emailDraft"],
  properties: {
    qualify: {
      type: "object",
      additionalProperties: false,
      required: [
        "factors",
        "confidence",
        "confidenceReasons",
        "urgency",
        "urgencyEvidence",
        "bestAngle",
      ],
      properties: {
        factors: {
          type: "object",
          additionalProperties: false,
          required: ["icpFit", "intent", "engagement", "authority", "demoDepth"],
          properties: {
            icpFit: { type: "number", minimum: 0, maximum: 30 },
            intent: { type: "number", minimum: 0, maximum: 25 },
            engagement: { type: "number", minimum: 0, maximum: 20 },
            authority: { type: "number", minimum: 0, maximum: 15 },
            demoDepth: { type: "number", minimum: 0, maximum: 10 },
          },
        },
        confidence: { type: "number", minimum: 0, maximum: 100 },
        confidenceReasons: {
          type: "array",
          minItems: 2,
          maxItems: 4,
          items: { type: "string" },
        },
        urgency: { type: "string", enum: ["low", "medium", "high"] },
        urgencyEvidence: { type: "string" },
        bestAngle: { type: "string" },
      },
    },
    badge: {
      type: "object",
      additionalProperties: false,
      required: ["archetype", "tagline", "compliment", "stats", "discountCode"],
      properties: {
        archetype: { type: "string" },
        tagline: { type: "string" },
        compliment: { type: "string" },
        stats: {
          type: "array",
          minItems: 2,
          maxItems: 3,
          items: {
            type: "object",
            additionalProperties: false,
            required: ["label", "value"],
            properties: {
              label: { type: "string" },
              value: { type: "number", minimum: 0, maximum: 100 },
            },
          },
        },
        discountCode: { type: "string" },
      },
    },
    emailDraft: {
      type: "object",
      additionalProperties: false,
      required: ["subject", "body"],
      properties: {
        subject: { type: "string" },
        body: { type: "string" },
      },
    },
  },
};

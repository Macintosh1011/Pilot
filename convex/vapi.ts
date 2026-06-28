import { action, httpAction } from "./_generated/server";
import type { ActionCtx } from "./_generated/server";
import { api, internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import { v } from "convex/values";
import { BOOTH_SYSTEM_PROMPT, BOOTH_TOOLS } from "./agent";

type JsonRecord = Record<string, unknown>;
type ChatRole = "system" | "user" | "assistant" | "tool";
type ChatMessage = {
  role: ChatRole;
  content: unknown;
  tool_call_id?: string;
  tool_calls?: OpenAIToolCall[];
};
type OpenAIToolCall = {
  id: string;
  type: "function";
  function: {
    name: string;
    arguments: string;
  };
};
type AssistantMessage = {
  content: string;
  rawContent: unknown;
  toolCalls: OpenAIToolCall[];
};

const FALLBACK_LINE =
  "Thanks for stopping by the Acme Analytics booth! Tell me a bit about what your team is working on.";
const MAX_TOOL_ITERATIONS = 4;

export const vapiChat = httpAction(async (ctx, request) => {
  const expectedSecret = process.env.VAPI_SERVER_SECRET;
  const requestUrl = new URL(request.url);
  const querySecret = requestUrl.searchParams.get("secret");
  const headerSecret = request.headers.get("x-vapi-secret");

  if (!expectedSecret || (querySecret !== expectedSecret && headerSecret !== expectedSecret)) {
    return json({ error: "Unauthorized" }, 401);
  }

  const body = await safeJson(request);
  const sessionId = extractSessionId(body);
  const model = process.env.OPENAI_REASON_MODEL ?? "gpt-5.4";

  const incomingMessages = extractIncomingMessages(body);
  const lastMessage = extractLastBodyMessage(body);
  if (sessionId && lastMessage?.role === "user") {
    await persistMessage(ctx, sessionId, "visitor", contentToText(lastMessage.content));
  }

  let content = FALLBACK_LINE;
  try {
    content = await produceAssistantContent(ctx, sessionId, incomingMessages, model);
  } catch {
    content = FALLBACK_LINE;
  }

  if (sessionId) {
    await persistMessage(ctx, sessionId, "assistant", content);
  }
  return chatCompletion(content, model);
});

export const startConfig = action({
  args: {
    sessionId: v.string(),
    deviceId: v.optional(v.string()),
  },
  returns: v.object({
    transcriber: v.object({
      provider: v.string(),
      model: v.string(),
      language: v.string(),
    }),
    model: v.object({
      provider: v.string(),
      url: v.string(),
      model: v.string(),
      headers: v.record(v.string(), v.string()),
    }),
    voice: v.object({
      provider: v.string(),
      voiceId: v.string(),
    }),
    firstMessage: v.string(),
    metadata: v.object({
      sessionId: v.string(),
      deviceId: v.string(),
    }),
  }),
  handler: async (_ctx, { sessionId, deviceId }) => {
    return {
      transcriber: { provider: "deepgram", model: "nova-2", language: "en" },
      model: {
        provider: "custom-llm",
        url: `${process.env.CONVEX_SITE_URL}/vapi/chat/completions?secret=${process.env.VAPI_SERVER_SECRET}`,
        model: process.env.OPENAI_REASON_MODEL ?? "gpt-5.4",
        // Vapi does NOT reliably forward the ?secret= query param to the custom-LLM, which caused
        // pipeline-error-custom-llm-401-unauthorized on every turn. Send it as a header instead —
        // the handler accepts x-vapi-secret, and Vapi's custom-llm `headers` property forwards it.
        headers: { "x-vapi-secret": process.env.VAPI_SERVER_SECRET ?? "" },
      },
      voice: { provider: "vapi", voiceId: "Elliot" },
      firstMessage:
        "Hey there — to get started, hold your LinkedIn QR up to the camera and I'll pull up your world.",
      metadata: { sessionId, deviceId: deviceId ?? "ipad-1" },
    };
  },
});

async function produceAssistantContent(
  ctx: ActionCtx,
  sessionId: Id<"sessions"> | null,
  incomingMessages: ChatMessage[],
  model: string,
) {
  const messages: ChatMessage[] = [
    { role: "system", content: BOOTH_SYSTEM_PROMPT },
    ...incomingMessages,
  ];

  // Inject verified identity (post-LinkedIn-scan) so the agent greets by name every turn.
  if (sessionId) {
    const session = await ctx.runQuery(internal.sessions.getInternal, { sessionId });
    const identityNote = buildIdentityNote(session);
    if (identityNote) {
      // Insert after the system prompt so it's always the freshest context before any history.
      messages.splice(1, 0, { role: "system", content: identityNote });
    }
  }

  for (let iteration = 0; iteration < MAX_TOOL_ITERATIONS; iteration += 1) {
    const assistant = await callOpenAI(messages, model, sessionId !== null);
    if (assistant.toolCalls.length === 0) {
      return assistant.content.trim() || FALLBACK_LINE;
    }

    if (!sessionId) {
      return assistant.content.trim() || FALLBACK_LINE;
    }

    messages.push({
      role: "assistant",
      content: assistant.rawContent ?? null,
      tool_calls: assistant.toolCalls,
    });

    for (const toolCall of assistant.toolCalls) {
      const result = await runToolSafely(ctx, sessionId, toolCall);
      messages.push({
        role: "tool",
        tool_call_id: toolCall.id,
        content: shortJson(result),
      });
    }
  }

  // The model used every tool iteration without ever emitting a spoken line (common on a rich
  // first turn where it fires lookup_visitor → set_needs → show_view → highlight back to back).
  // Force one final completion with tools disabled so the visitor always hears a real, context-
  // aware reply grounded in the tool results — never the generic fallback.
  const closing = await callOpenAI(messages, model, false);
  return closing.content.trim() || FALLBACK_LINE;
}

async function callOpenAI(
  messages: ChatMessage[],
  model: string,
  enableTools: boolean,
): Promise<AssistantMessage> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("Missing OPENAI_API_KEY");

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model,
      messages,
      ...(enableTools ? { tools: BOOTH_TOOLS, tool_choice: "auto" } : {}),
      stream: false,
    }),
  });

  if (!response.ok) {
    throw new Error("OpenAI chat completion failed");
  }

  return parseAssistantMessage(await response.json());
}

async function runToolSafely(
  ctx: ActionCtx,
  sessionId: Id<"sessions">,
  toolCall: OpenAIToolCall,
) {
  try {
    const result = await runTool(ctx, sessionId, toolCall);
    return result ?? { ok: true };
  } catch {
    return { ok: false };
  }
}

async function runTool(
  ctx: ActionCtx,
  sessionId: Id<"sessions">,
  toolCall: OpenAIToolCall,
) {
  const args = parseJsonRecord(toolCall.function.arguments);

  switch (toolCall.function.name) {
    case "lookup_visitor":
      return await ctx.runAction(internal.fiber.lookupVisitorInternal, {
        sessionId,
        name: optionalString(args.name),
        company: optionalString(args.company),
        linkedinUrl: optionalString(args.linkedinUrl),
        reveal: optionalBoolean(args.reveal),
      });
    case "set_needs":
      await ctx.runMutation(api.sessions.setNeeds, {
        sessionId,
        problems: optionalStringArray(args.problems),
        useCase: optionalString(args.useCase),
        urgency: optionalString(args.urgency),
        urgencyEvidence: optionalString(args.urgencyEvidence),
      });
      return { ok: true };
    case "show_view": {
      const view = optionalString(args.view);
      if (!view) return { ok: false };
      await ctx.runMutation(api.demoState.setDemoState, {
        sessionId,
        view,
        params: args.params,
      });
      return { ok: true };
    }
    case "highlight": {
      const elementId = optionalString(args.elementId);
      if (!elementId) return { ok: false };
      await ctx.runMutation(api.demoState.setHighlight, {
        sessionId,
        elementId,
      });
      return { ok: true };
    }
    case "capture_contact":
      await ctx.runMutation(api.sessions.captureContact, {
        sessionId,
        email: optionalString(args.email),
        phone: optionalString(args.phone),
        linkedinUrl: optionalString(args.linkedinUrl),
      });
      return { ok: true };
    case "capture_photo":
      await ctx.runMutation(api.photo.requestPhoto, { sessionId });
      return { ok: true };
    case "finalize_session":
      return await ctx.runAction(api.finalize.finalize, { sessionId });
    default:
      return { ok: false };
  }
}

async function persistMessage(
  ctx: ActionCtx,
  sessionId: Id<"sessions">,
  role: "visitor" | "assistant",
  text: string,
) {
  const trimmed = text.trim();
  if (!trimmed) return;
  try {
    const transcript = await ctx.runQuery(internal.messages.transcriptInternal, {
      sessionId,
    });
    const last = Array.isArray(transcript)
      ? transcript[transcript.length - 1]
      : null;
    if (isRecord(last) && last.role === role && last.text === trimmed) {
      return;
    }
    await ctx.runMutation(api.messages.add, { sessionId, role, text: trimmed });
  } catch {
    // Transcript persistence should never block the voice response.
  }
}

async function safeJson(request: Request): Promise<JsonRecord> {
  try {
    const parsed = await request.json();
    return isRecord(parsed) ? parsed : {};
  } catch {
    return {};
  }
}

function extractSessionId(body: JsonRecord): Id<"sessions"> | null {
  const sessionId =
    stringAt(body, ["metadata", "sessionId"]) ??
    stringAt(body, [
      "call",
      "assistantOverrides",
      "variableValues",
      "sessionId",
    ]) ??
    stringAt(body, ["call", "metadata", "sessionId"]);
  return sessionId ? (sessionId as Id<"sessions">) : null;
}

function extractIncomingMessages(body: JsonRecord): ChatMessage[] {
  const rawMessages = Array.isArray(body.messages) ? body.messages : [];
  return rawMessages.flatMap((rawMessage) => {
    if (!isRecord(rawMessage)) return [];
    const role = normalizeRole(rawMessage.role);
    if (!role || role === "system") return [];

    const message: ChatMessage = {
      role,
      content: "content" in rawMessage ? rawMessage.content : "",
    };
    const toolCallId = optionalString(rawMessage.tool_call_id);
    if (toolCallId) message.tool_call_id = toolCallId;
    const toolCalls = normalizeToolCalls(rawMessage.tool_calls);
    if (toolCalls.length > 0) message.tool_calls = toolCalls;
    return [message];
  });
}

function extractLastBodyMessage(body: JsonRecord): ChatMessage | null {
  const rawMessages = Array.isArray(body.messages) ? body.messages : [];
  const rawMessage = rawMessages[rawMessages.length - 1];
  if (!isRecord(rawMessage)) return null;
  const role = normalizeRole(rawMessage.role);
  if (!role) return null;
  return {
    role,
    content: "content" in rawMessage ? rawMessage.content : "",
  };
}

function parseAssistantMessage(data: unknown): AssistantMessage {
  const message = firstChoiceMessage(data);
  const rawContent = "content" in message ? message.content : "";
  return {
    content: contentToText(rawContent),
    rawContent,
    toolCalls: normalizeToolCalls(message.tool_calls),
  };
}

function firstChoiceMessage(data: unknown): JsonRecord {
  if (!isRecord(data) || !Array.isArray(data.choices)) return {};
  const [choice] = data.choices;
  if (!isRecord(choice) || !isRecord(choice.message)) return {};
  return choice.message;
}

function normalizeToolCalls(value: unknown): OpenAIToolCall[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item, index) => {
    if (!isRecord(item) || !isRecord(item.function)) return [];
    const name = optionalString(item.function.name);
    if (!name) return [];
    return [
      {
        id: optionalString(item.id) ?? `tool_${index}`,
        type: "function",
        function: {
          name,
          arguments: normalizeArguments(item.function.arguments),
        },
      },
    ];
  });
}

function normalizeArguments(value: unknown) {
  if (typeof value === "string") return value;
  if (value === undefined) return "{}";
  try {
    return JSON.stringify(value);
  } catch {
    return "{}";
  }
}

function contentToText(content: unknown): string {
  if (typeof content === "string") return content;
  if (content === null || content === undefined) return "";
  if (Array.isArray(content)) {
    return content
      .map((item) => {
        if (typeof item === "string") return item;
        if (isRecord(item) && typeof item.text === "string") return item.text;
        return "";
      })
      .filter(Boolean)
      .join(" ");
  }
  try {
    return JSON.stringify(content);
  } catch {
    return "";
  }
}

// Vapi's custom-llm transport reads an OpenAI-style streaming SSE response, not a single JSON
// body. We've already computed the full reply (tools run server-side), so emit it as one content
// delta + a stop chunk + the [DONE] sentinel. A plain JSON body makes Vapi error and end the call.
function chatCompletion(content: string, model: string) {
  const base = {
    id: `chatcmpl_${Date.now()}`,
    object: "chat.completion.chunk",
    created: Math.floor(Date.now() / 1000),
    model,
  };
  const chunks = [
    { ...base, choices: [{ index: 0, delta: { role: "assistant", content }, finish_reason: null }] },
    { ...base, choices: [{ index: 0, delta: {}, finish_reason: "stop" }] },
  ];
  const body = chunks.map((c) => `data: ${JSON.stringify(c)}\n\n`).join("") + "data: [DONE]\n\n";
  return new Response(body, {
    status: 200,
    headers: {
      "content-type": "text/event-stream",
      "cache-control": "no-cache",
      connection: "keep-alive",
    },
  });
}

function buildIdentityNote(session: any): string | null {
  if (!session) return null;
  const name = session.visitorName ?? session.fiber?.person?.fullName;
  const company = session.fiber?.company?.name ?? session.company;
  if (!name && !company) return null;

  const role = session.role ?? session.fiber?.person?.title;
  const who = [name, role && company ? `${role} at ${company}` : role ?? (company ? `at ${company}` : undefined)]
    .filter(Boolean)
    .join(", ");

  const details: string[] = [];
  const industry = session.fiber?.company?.industry;
  const employeeCount = session.fiber?.company?.employeeCount;
  const funding = session.fiber?.company?.funding;
  if (industry) details.push(industry);
  if (employeeCount) details.push(`~${employeeCount} employees`);
  if (funding) details.push(funding);

  return (
    `VERIFIED VISITOR (from their scanned LinkedIn): ${who}.` +
    (details.length ? ` ${details.join(", ")}.` : "") +
    ` Right away, greet them by name and say their name, role, and company back to them in one warm sentence, then continue naturally. Don't re-ask for anything in this note.`
  );
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

function parseJsonRecord(value: string): JsonRecord {
  try {
    const parsed = JSON.parse(value);
    return isRecord(parsed) ? parsed : {};
  } catch {
    return {};
  }
}

function shortJson(value: unknown) {
  let raw: string;
  try {
    raw = JSON.stringify(value);
  } catch {
    raw = JSON.stringify({ ok: false });
  }
  return raw.length > 1200 ? `${raw.slice(0, 1197)}...` : raw;
}

function stringAt(value: unknown, path: string[]) {
  let current: unknown = value;
  for (const key of path) {
    if (!isRecord(current)) return undefined;
    current = current[key];
  }
  return optionalString(current);
}

function optionalString(value: unknown) {
  return typeof value === "string" && value.trim() ? value : undefined;
}

function optionalBoolean(value: unknown) {
  return typeof value === "boolean" ? value : undefined;
}

function optionalStringArray(value: unknown) {
  if (!Array.isArray(value)) return undefined;
  const strings = value.filter((item): item is string => typeof item === "string");
  return strings.length > 0 ? strings : undefined;
}

function normalizeRole(value: unknown): ChatRole | null {
  return value === "system" ||
    value === "user" ||
    value === "assistant" ||
    value === "tool"
    ? value
    : null;
}

function isRecord(value: unknown): value is JsonRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

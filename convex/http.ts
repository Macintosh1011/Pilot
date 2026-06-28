import { httpAction } from "./_generated/server";
import { httpRouter } from "convex/server";
import { internal } from "./_generated/api";
import { vapiChat } from "./vapi";

const http = httpRouter();

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

async function safeJson(request: Request) {
  try {
    return await request.json();
  } catch {
    return {};
  }
}

http.route({
  path: "/hw/poll",
  method: "GET",
  handler: httpAction(async (ctx, request) => {
    const { searchParams } = new URL(request.url);
    const deviceId = searchParams.get("deviceId") ?? "";
    if (!deviceId.trim()) return json({ commands: [] });

    const commands = await ctx.runQuery(internal.hwCommands.listUnacked, {
      deviceId,
    });
    return json({ commands });
  }),
});

http.route({
  path: "/hw/ack",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const body = await safeJson(request);
    const deviceId = typeof body.deviceId === "string" ? body.deviceId : "";
    const commandId =
      typeof body.commandId === "string" ? body.commandId : "";

    if (deviceId.trim() && commandId.trim()) {
      await ctx.runMutation(internal.hwCommands.ack, { deviceId, commandId });
    }
    return json({ ok: true });
  }),
});

http.route({
  path: "/hw/presence",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const body = await safeJson(request);
    const deviceId = typeof body.deviceId === "string" ? body.deviceId : "";
    const event = body.event === "leave" ? "leave" : "approach";

    if (deviceId.trim()) {
      await ctx.runMutation(internal.presence.record, { deviceId, event });
    }
    return json({ ok: true });
  }),
});

http.route({
  path: "/vapi/chat/completions",
  method: "POST",
  handler: vapiChat,
});

export default http;

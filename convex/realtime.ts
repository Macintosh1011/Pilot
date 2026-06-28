import { action } from "./_generated/server";
import { v } from "convex/values";

/**
 * Mints a short-lived (≈60s) ephemeral client secret for an OpenAI Realtime
 * session so the browser can open a WebRTC voice connection without ever holding
 * the real OPENAI_API_KEY. The key lives only in Convex env (same place as the
 * rest of the brain). Returns { value: null } when no key is set so the kiosk can
 * fall back to a scripted demo — fallback-first, like the rest of the system.
 *
 * Docs: POST https://api.openai.com/v1/realtime/client_secrets -> { value }.
 */
const REALTIME_MODEL = process.env.OPENAI_REALTIME_MODEL ?? "gpt-realtime-2";
const REALTIME_VOICE = process.env.OPENAI_REALTIME_VOICE ?? "marin";

export const mintToken = action({
  args: {},
  returns: v.object({
    value: v.union(v.string(), v.null()),
    model: v.string(),
    voice: v.string(),
  }),
  handler: async () => {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return { value: null, model: REALTIME_MODEL, voice: REALTIME_VOICE };
    }

    const res = await fetch("https://api.openai.com/v1/realtime/client_secrets", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        session: {
          type: "realtime",
          model: REALTIME_MODEL,
          audio: { output: { voice: REALTIME_VOICE } },
        },
      }),
    });

    if (!res.ok) {
      const detail = (await res.text()).slice(0, 300);
      throw new Error(`realtime token ${res.status}: ${detail}`);
    }

    const data = (await res.json()) as {
      value?: string;
      client_secret?: { value?: string };
    };
    return {
      value: data.value ?? data.client_secret?.value ?? null,
      model: REALTIME_MODEL,
      voice: REALTIME_VOICE,
    };
  },
});

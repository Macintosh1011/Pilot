"use client";

import { useCallback, useRef, useState } from "react";
import { RealtimeAgent, RealtimeSession } from "@openai/agents/realtime";
import type { ConvexReactClient } from "convex/react";
import { api } from "@cvx/_generated/api";
import type { Id } from "@cvx/_generated/dataModel";
import { BOOTH_WEB_PROMPT } from "./prompt";
import { buildBoothTools } from "./tools";
import type { WebcamHandle } from "./components/WebcamCapture";
import type { Turn } from "./components/Transcript";
import type { VoiceState } from "./components/VoiceOrb";

export type BoothStatus =
  | "idle"
  | "connecting"
  | "live"
  | "ended"
  | "error"
  | "no-key"
  | "no-mic";

// Sent once after connect so the agent speaks first; filtered out of the visible transcript.
const KICKOFF =
  "(A visitor just walked up to the booth. Greet them warmly and ask them to hold their LinkedIn QR code up to the camera so you can pull up their world.)";

// Loose mirror of the SDK history item shape so we can map without fighting generics.
type HistoryItem = {
  itemId?: string;
  type?: string;
  role?: string;
  status?: string;
  content?: Array<{ type?: string; text?: string; transcript?: string }>;
};

function itemText(item: HistoryItem): string {
  return (item.content ?? [])
    .map((c) => c.transcript ?? c.text ?? "")
    .join(" ")
    .trim();
}

export function useBoothAgent(opts: {
  convex: ConvexReactClient;
  sessionId: Id<"sessions"> | null;
  webcamRef: { current: WebcamHandle | null };
}) {
  const { convex, sessionId, webcamRef } = opts;

  const [status, setStatus] = useState<BoothStatus>("idle");
  const [turns, setTurns] = useState<Turn[]>([]);
  const [voiceState, setVoiceState] = useState<VoiceState>("idle");
  const [photoFlash, setPhotoFlash] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sessionRef = useRef<RealtimeSession | null>(null);
  const speakingRef = useRef(false);
  const busyRef = useRef(false);
  const persistedRef = useRef<Set<string>>(new Set());

  const recomputeVoice = useCallback(() => {
    setVoiceState(
      busyRef.current ? "thinking" : speakingRef.current ? "speaking" : "listening",
    );
  }, []);

  const onThinking = useCallback(
    (on: boolean) => {
      busyRef.current = on;
      recomputeVoice();
    },
    [recomputeVoice],
  );

  const onPhotoFlash = useCallback(() => {
    setPhotoFlash(true);
    setTimeout(() => setPhotoFlash(false), 480);
  }, []);

  const handleHistory = useCallback(
    (history: HistoryItem[]) => {
      const next: Turn[] = [];
      for (const item of history) {
        if (item.type && item.type !== "message") continue;
        if (item.role === "system") continue;
        const role = item.role === "assistant" ? "assistant" : "visitor";
        const text = itemText(item);
        // Skip empty turns and our own injected stage-directions (parenthesized notes).
        if (!text) continue;
        if (role === "visitor" && text.startsWith("(")) continue;
        const id = item.itemId ?? `${role}-${next.length}`;
        const partial = item.status != null && item.status !== "completed";
        next.push({ id, role, text, partial });

        // persist each completed turn to Convex once (transcript = ground truth)
        if (sessionId && !partial && !persistedRef.current.has(id)) {
          persistedRef.current.add(id);
          void convex
            .mutation(api.messages.add, { sessionId, role, text })
            .catch(() => persistedRef.current.delete(id));
        }
      }
      setTurns(next);
    },
    [convex, sessionId],
  );

  // Inject a stage-direction into the live session (e.g. the VERIFIED VISITOR note after a
  // QR scan). sendMessage triggers the agent's next spoken turn; the note is filtered from
  // the visible transcript by the parenthesis rule in handleHistory.
  const sendContext = useCallback((text: string) => {
    try {
      sessionRef.current?.sendMessage(text);
    } catch (e) {
      console.error("[booth context]", e);
    }
  }, []);

  const stop = useCallback(() => {
    try {
      sessionRef.current?.close();
    } catch {
      /* already closed */
    }
    sessionRef.current = null;
    speakingRef.current = false;
    busyRef.current = false;
    setVoiceState("idle");
    setStatus("ended");
  }, []);

  const connect = useCallback(async () => {
    if (!sessionId || status === "connecting" || status === "live") return;
    setError(null);
    setStatus("connecting");

    // Mic must be granted before WebRTC adds the track.
    try {
      const probe = await navigator.mediaDevices.getUserMedia({ audio: true });
      probe.getTracks().forEach((t) => t.stop());
    } catch {
      setStatus("no-mic");
      return;
    }

    let token: { value: string | null; model: string; voice: string };
    try {
      token = await convex.action(api.realtime.mintToken, {});
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setStatus("error");
      return;
    }
    if (!token.value) {
      setStatus("no-key");
      return;
    }

    const tools = buildBoothTools({ convex, sessionId, webcamRef, onThinking, onPhotoFlash });
    const agent = new RealtimeAgent({
      name: "BoothPilot",
      instructions: BOOTH_WEB_PROMPT,
      tools,
      voice: token.voice,
    });
    const session = new RealtimeSession(agent, {
      model: token.model,
      config: {
        audio: {
          input: {
            transcription: { model: "whisper-1" },
            // Noisy booth: energy-gated VAD with a high threshold ignores quieter/distant
            // chatter, a longer silence window waits for a real pause, and
            // interruptResponse:false stops bystanders from cutting the agent off mid-sentence.
            turnDetection: {
              type: "server_vad",
              threshold: 0.65,
              prefixPaddingMs: 300,
              silenceDurationMs: 700,
              interruptResponse: false,
            },
            noiseReduction: { type: "near_field" },
          },
        },
        reasoning: { effort: "low" },
      },
    });
    sessionRef.current = session;

    session.on("history_updated", (history) =>
      handleHistory(history as unknown as HistoryItem[]),
    );
    session.on("audio_start", () => {
      speakingRef.current = true;
      recomputeVoice();
    });
    session.on("audio_stopped", () => {
      speakingRef.current = false;
      recomputeVoice();
    });
    session.on("audio_interrupted", () => {
      speakingRef.current = false;
      recomputeVoice();
    });
    session.on("error", (e) => {
      console.error("[booth realtime]", e);
    });

    try {
      await session.connect({ apiKey: token.value, model: token.model });
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setStatus("error");
      return;
    }

    setStatus("live");
    setVoiceState("listening");

    // The agent speaks first: nudge it that a visitor just walked up.
    try {
      session.sendMessage(KICKOFF);
    } catch (e) {
      console.error("[booth greeting]", e);
    }
  }, [
    sessionId,
    status,
    convex,
    webcamRef,
    onThinking,
    onPhotoFlash,
    handleHistory,
    recomputeVoice,
  ]);

  return { status, turns, voiceState, photoFlash, error, connect, stop, sendContext };
}

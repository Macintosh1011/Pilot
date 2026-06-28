"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Vapi from "@vapi-ai/web";
import { BoothConfig } from "@/lib/boothConfig";
import { useStartConfig } from "@/lib/useBooth";
import type { Id } from "@/lib/types";
import type { SparkMode } from "@/lib/sparkMode";

/**
 * Live voice loop for the web booth — the browser analogue of
 * `ios/BoothPilot/Live/VapiVoice.swift`.
 *
 * Vapi owns audio I/O (STT/TTS); Convex provides a transient custom-LLM
 * assistant config via `vapi:startConfig` (fetched through `useStartConfig`).
 * All conversation logic stays server-side: the assistant config points Vapi's
 * `custom-llm` at Convex's `/vapi/chat/completions`, so the browser only maps
 * call/speech/transcript events to the on-screen spark + caption + speaker.
 *
 * The Director treats a missing `NEXT_PUBLIC_VAPI_PUBLIC_KEY` as scripted mode:
 * with no key, `start()` is a no-op and the hook stays inactive.
 */

/** Minimal shape of the Vapi `message` event payload we consume. */
type VapiTranscriptMessage = {
  type?: string;
  role?: string;
  transcriptType?: string;
  transcript?: string;
  text?: string;
  content?: string;
};

/**
 * The `Vapi.start()` argument tuple, derived straight from the SDK so we never
 * deep-import its internal `./api` types (which are not re-exported from the
 * package root). `[0]` is `CreateAssistantDTO | string | undefined`, `[1]` is
 * `AssistantOverrides | undefined`.
 */
type StartArgs = Parameters<Vapi["start"]>;

/** The reactive state + controls returned by {@link useVapiVoice}. */
export type UseVapiVoice = {
  /** Latest transcript line (partial or final), drives the caption. */
  transcript: string;
  /** Who is currently talking: "VISITOR" or "BOOTHPILOT" (the default). */
  speaker: string;
  /** Current spark animation state. */
  spark: SparkMode;
  /** True once the call has ended (Director advances to the badge). */
  finalized: boolean;
  /** True while a live Vapi call is running. */
  active: boolean;
  /** Begin a live call for the given session. No-op without a Vapi key. */
  start: (sessionId: string) => Promise<void>;
  /** End the live call and reset the spark to idle. */
  stop: () => void;
};

function normalizeRole(role: string | undefined): string {
  return (role ?? "").trim().toLowerCase();
}

export function useVapiVoice(backendDeviceId?: string): UseVapiVoice {
  const [transcript, setTranscript] = useState("");
  const [speaker, setSpeaker] = useState("BOOTHPILOT");
  const [spark, setSpark] = useState<SparkMode>("idle");
  const [finalized, setFinalized] = useState(false);
  const [active, setActive] = useState(false);

  const startConfig = useStartConfig();

  const vapiRef = useRef<Vapi | null>(null);
  const startedRef = useRef(false);

  // ---- event handlers (stable; only touch the stable setState setters) ----

  const onCallStart = useCallback(() => {
    setSpark("thinking");
  }, []);

  const onCallEnd = useCallback(() => {
    startedRef.current = false;
    setActive(false);
    setFinalized(true);
    setSpark("idle");
  }, []);

  const onSpeechStart = useCallback(() => {
    setSpeaker("BOOTHPILOT");
    setSpark("speaking");
  }, []);

  const onSpeechEnd = useCallback(() => {
    setSpark("listening");
  }, []);

  const onMessage = useCallback((raw: unknown) => {
    const msg = raw as VapiTranscriptMessage;
    if (msg?.type !== "transcript") return;

    const text = (msg.transcript ?? msg.text ?? msg.content ?? "").trim();
    if (!text) return;
    setTranscript(text);

    const kind = (msg.transcriptType ?? "").toLowerCase();
    const isFinal = kind === "final" || kind === "stopped";
    switch (normalizeRole(msg.role)) {
      case "user":
      case "customer":
        setSpeaker("VISITOR");
        setSpark(isFinal ? "thinking" : "listening");
        break;
      case "assistant":
      case "bot":
        setSpeaker("BOOTHPILOT");
        setSpark(isFinal ? "listening" : "speaking");
        break;
      default:
        break;
    }
  }, []);

  const onError = useCallback((err: unknown) => {
    console.error("[Vapi] event error:", err);
    startedRef.current = false;
    setActive(false);
    setSpark("idle");
  }, []);

  // Lazily build (and memoize) the browser-only Vapi client + listeners.
  const buildVapi = useCallback((): Vapi | null => {
    if (typeof window === "undefined") return null;
    const key = BoothConfig.vapiPublicKey;
    if (!key) return null;
    if (vapiRef.current) return vapiRef.current;

    const vapi = new Vapi(key);
    vapi.on("call-start", onCallStart);
    vapi.on("call-end", onCallEnd);
    vapi.on("speech-start", onSpeechStart);
    vapi.on("speech-end", onSpeechEnd);
    vapi.on("message", onMessage);
    vapi.on("error", onError);
    vapiRef.current = vapi;
    return vapi;
  }, [onCallStart, onCallEnd, onSpeechStart, onSpeechEnd, onMessage, onError]);

  // Tear down listeners (and any live call) on unmount.
  useEffect(() => {
    return () => {
      const vapi = vapiRef.current;
      if (vapi) {
        vapi.removeListener("call-start", onCallStart);
        vapi.removeListener("call-end", onCallEnd);
        vapi.removeListener("speech-start", onSpeechStart);
        vapi.removeListener("speech-end", onSpeechEnd);
        vapi.removeListener("message", onMessage);
        vapi.removeListener("error", onError);
        try {
          void vapi.stop();
        } catch {
          // best-effort: unmount must never throw
        }
      }
      vapiRef.current = null;
      startedRef.current = false;
    };
  }, [onCallStart, onCallEnd, onSpeechStart, onSpeechEnd, onMessage, onError]);

  const start = useCallback(
    async (sessionId: string): Promise<void> => {
      if (startedRef.current) return; // guard double-start

      const vapi = buildVapi();
      // No key (or SSR): scripted mode — stay inactive, never throw.
      if (!vapi || !sessionId) return;

      startedRef.current = true;
      setFinalized(false);
      setTranscript("");
      setSpeaker("BOOTHPILOT");
      setSpark("thinking");
      setActive(true);

      try {
        const config = await startConfig(
          sessionId as Id<"sessions">,
          backendDeviceId ?? BoothConfig.deviceId,
        );
        // The config already carries metadata; also pass it through
        // assistantOverrides so metadata.sessionId reaches the custom-llm
        // endpoint regardless of how the SDK threads it.
        await vapi.start(config as unknown as StartArgs[0], {
          metadata: config.metadata,
        } as StartArgs[1]);
      } catch (err) {
        console.error("[Vapi] start failed:", err);
        startedRef.current = false;
        setActive(false);
        setSpark("idle");
      }
    },
    [buildVapi, startConfig, backendDeviceId],
  );

  const stop = useCallback((): void => {
    const vapi = vapiRef.current;
    startedRef.current = false;
    setActive(false);
    setSpark("idle");
    if (vapi) {
      try {
        void vapi.stop();
      } catch (err) {
        console.error("[Vapi] stop failed:", err);
      }
    }
  }, []);

  return { transcript, speaker, spark, finalized, active, start, stop };
}

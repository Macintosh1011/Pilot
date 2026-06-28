"use client";

import { useCallback } from "react";
import { useAction, useMutation, useQuery } from "convex/react";
import { api } from "./convexApi";
import { BoothConfig } from "./boothConfig";
import type { DemoState, Id, Session, Urgency } from "./types";

/**
 * Typed React hooks over the shared Convex backend, mirroring the iOS
 * `BoothBackend` surface (INTERFACES.md §1). The underlying client is the
 * untyped `anyApi` (see lib/convexApi.ts), so every result is cast to the
 * shapes in lib/types.ts — that is where web-side type-safety lives.
 *
 * Subscriptions pass the `"skip"` sentinel when their id is null so the hooks
 * are safe to mount before a session exists. Mutation/action callbacks that the
 * scripted director drives are fire-and-forget tolerant: a slow/offline Convex
 * degrades to the local script with no stalls (callers may ignore the promise).
 */

// ---- web-local shapes not in lib/types.ts ----

/** A transcript turn (`messages` row). `role` stays a string per the contract. */
export type Message = {
  _id?: Id<"messages">;
  _creationTime?: number;
  sessionId?: Id<"sessions">;
  role: string; // "visitor" | "assistant" | "system" | "tool"
  text: string;
  ts: number;
};

/** A presence ping (`presence` row) posted by a device. */
export type PresencePing = {
  _id?: Id<"presence">;
  _creationTime?: number;
  deviceId: string;
  event: string; // "approach" | "leave"
  ts: number;
};

/** The demo views GPT can drive via show_view (INTERFACES.md §5). */
export type DemoView =
  | "home"
  | "churn"
  | "alerts"
  | "pricing"
  | "integrations"
  | "query-result";

/** The transient Vapi assistant config returned by `vapi.startConfig`. */
export type VapiAssistantConfig = {
  transcriber: { provider: string; model: string; language: string };
  model: { provider: string; url: string; model: string };
  voice: { provider: string; voiceId: string };
  firstMessage: string;
  metadata: { sessionId: string; deviceId: string };
};

// ---- subscriptions (reactive queries) ----

/** Reactive CRM card. `undefined` while loading, `null` when the id is unknown. */
export function useSession(
  sessionId: Id<"sessions"> | null,
): Session | null | undefined {
  const result = useQuery(
    api.sessions.get,
    sessionId ? { sessionId } : "skip",
  );
  return result as Session | null | undefined;
}

/** Reactive demo view state for the session (drives the on-screen demo panel). */
export function useDemoState(
  sessionId: Id<"sessions"> | null,
): DemoState | null | undefined {
  const result = useQuery(
    api.demoState.bySession,
    sessionId ? { sessionId } : "skip",
  );
  return result as DemoState | null | undefined;
}

/** Reactive transcript (ascending ts). `undefined` while loading. */
export function useMessages(
  sessionId: Id<"sessions"> | null,
): Message[] | undefined {
  const result = useQuery(
    api.messages.bySession,
    sessionId ? { sessionId } : "skip",
  );
  return result as Message[] | undefined;
}

/**
 * Latest presence ping for a device (defaults to this booth's deviceId).
 * Optional in the browser flow — the web uses a "tap to begin" gesture instead.
 */
export function usePresence(
  deviceId?: string,
): PresencePing | null | undefined {
  const result = useQuery(api.presence.latest, {
    deviceId: deviceId ?? BoothConfig.deviceId,
  });
  return result as PresencePing | null | undefined;
}

// ---- session lifecycle + voice (callers await the result) ----

/** Returns a callback that creates a session and resolves its new id. */
export function useCreateSession(): (
  deviceId?: string,
) => Promise<Id<"sessions">> {
  const create = useMutation(api.sessions.create);
  return useCallback(
    (deviceId?: string): Promise<Id<"sessions">> =>
      create({ deviceId: deviceId ?? BoothConfig.deviceId }) as Promise<
        Id<"sessions">
      >,
    [create],
  );
}

/** Returns a callback that fetches the transient Vapi assistant config. */
export function useStartConfig(): (
  sessionId: Id<"sessions">,
  deviceId?: string,
) => Promise<VapiAssistantConfig> {
  const startConfig = useAction(api.vapi.startConfig);
  return useCallback(
    (
      sessionId: Id<"sessions">,
      deviceId?: string,
    ): Promise<VapiAssistantConfig> =>
      startConfig({
        sessionId,
        deviceId: deviceId ?? BoothConfig.deviceId,
      }) as Promise<VapiAssistantConfig>,
    [startConfig],
  );
}

/** Returns a callback that runs the end-of-conversation finalize pipeline. */
export function useFinalize(): (sessionId: Id<"sessions">) => Promise<unknown> {
  const finalize = useAction(api.finalize.finalize);
  return useCallback(
    (sessionId: Id<"sessions">): Promise<unknown> => finalize({ sessionId }),
    [finalize],
  );
}

// ---- GPT-tool mutations (fire-and-forget; mirror convex arg names) ----

/** set_needs → sessions.setNeeds. Patches only the provided fields. */
export function useSetNeeds(): (args: {
  sessionId: Id<"sessions">;
  problems?: string[];
  useCase?: string;
  urgency?: Urgency;
  urgencyEvidence?: string;
}) => Promise<void> {
  const setNeeds = useMutation(api.sessions.setNeeds);
  return useCallback(
    async (args): Promise<void> => {
      try {
        await setNeeds(args);
      } catch {
        // fire-and-forget: scripted UX never blocks on backend writes
      }
    },
    [setNeeds],
  );
}

/** show_view → demoState.setDemoState. Drives the shared demo state. */
export function useShowView(): (args: {
  sessionId: Id<"sessions">;
  view: DemoView | string;
  params?: Record<string, unknown>;
  highlight?: string;
}) => Promise<void> {
  const setDemoState = useMutation(api.demoState.setDemoState);
  return useCallback(
    async (args): Promise<void> => {
      try {
        await setDemoState(args);
      } catch {
        // fire-and-forget
      }
    },
    [setDemoState],
  );
}

/** highlight → demoState.setHighlight. Pulses a single element id. */
export function useSetHighlight(): (args: {
  sessionId: Id<"sessions">;
  elementId: string;
}) => Promise<void> {
  const setHighlight = useMutation(api.demoState.setHighlight);
  return useCallback(
    async (args): Promise<void> => {
      try {
        await setHighlight(args);
      } catch {
        // fire-and-forget
      }
    },
    [setHighlight],
  );
}

/** capture_contact → sessions.captureContact. Saves contact fields. */
export function useCaptureContact(): (args: {
  sessionId: Id<"sessions">;
  email?: string;
  phone?: string;
  linkedinUrl?: string;
}) => Promise<void> {
  const captureContact = useMutation(api.sessions.captureContact);
  return useCallback(
    async (args): Promise<void> => {
      try {
        await captureContact(args);
      } catch {
        // fire-and-forget
      }
    },
    [captureContact],
  );
}

/** messages.add → append a transcript turn. Skips empty text. */
export function useAddMessage(): (args: {
  sessionId: Id<"sessions">;
  role: string;
  text: string;
}) => Promise<void> {
  const add = useMutation(api.messages.add);
  return useCallback(
    async ({ sessionId, role, text }): Promise<void> => {
      if (!text) return;
      try {
        await add({ sessionId, role, text });
      } catch {
        // fire-and-forget: transcript writes never block the voice loop
      }
    },
    [add],
  );
}

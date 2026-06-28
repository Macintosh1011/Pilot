"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";

import { BoothConfig, hasVoice } from "@/lib/boothConfig";
import {
  BEATS,
  LAST_BEAT,
  stageForView,
  type Screen,
} from "@/lib/demoBeats";
import type { SparkMode } from "@/lib/sparkMode";
import type { Badge, Id, Session } from "@/lib/types";
import { useVapiVoice } from "@/lib/useVapiVoice";
import {
  useAddMessage,
  useCaptureContact,
  useCreateSession,
  useDemoState,
  useFinalize,
  useSession,
  useSetHighlight,
  useSetNeeds,
  useShowView,
} from "@/lib/useBooth";

/**
 * Director — the web port of `ios/BoothPilot/Demo/DemoData.swift`.
 *
 * It runs the booth state machine (attract → greeting → conversation → badge)
 * in two modes, decided once by {@link BoothConfig.vapiPublicKey}:
 *
 *  • LIVE (`hasVoice === true`): a "tap to begin" gesture creates a session and
 *    starts the Vapi voice loop. GPT tool calls write `demoState`/`sessions`
 *    server-side, and we transition to the badge when the call finalizes or the
 *    session's badge appears. `tap()` is disabled — voice drives everything.
 *
 *  • SCRIPTED (no key): a timer/tap walkthrough of the 7 `BEATS`, with the same
 *    `fireBeatHooks` backend writes so the dashboard still sees a coherent
 *    session. The browser's "tap to begin" gesture replaces Raspberry-Pi
 *    presence (and satisfies the mic-permission gesture in live mode).
 *
 * Screens consume the stable public {@link Director} API via {@link useDirector}.
 */

// Timer durations (seconds → ms), matching DemoData.swift.
const GREETING_TO_QR_MS = 6000;
const QR_TO_CONVERSATION_MS = 5500;
const BEAT_INTERVAL_MS = 4600;
const BADGE_TO_ATTRACT_MS = 30000;
const LIVE_GREETING_TO_CONVERSATION_MS = 2500;

/** The stable public surface the screens agent consumes. */
export interface Director {
  screen: Screen;
  /** True when a Vapi public key is configured (live voice mode). */
  live: boolean;
  beat: number;

  // display selectors (live vs scripted)
  displaySpark: SparkMode;
  displaySpeaker: string;
  displayCaption: string;
  /** 0–3, drives how much of AcmeDemoPanel is revealed. */
  displayStage: number;
  /** 1–4 step indicator (MEET·UNDERSTAND·SHOW·BADGE). */
  displayStep: number;
  badgeURL: string;

  // live data passthrough
  session: Session | null | undefined;
  demoView: string | undefined;
  highlight: string | undefined;
  badge: Badge | undefined;
  visitorName: string | undefined;

  // actions
  /** Attract "tap to begin": live → create + greeting + conversation + voice; scripted → advance from attract. */
  begin: () => void;
  /** Scripted-only advance; no-op in live mode. */
  tap: () => void;
  /** From badge → attract (resets state for the next visitor). */
  restart: () => void;
  /** Optional QR path: capture a scanned LinkedIn URL and enter the conversation. */
  captureLinkedIn: (url: string) => void;
}

const DirectorContext = createContext<Director | null>(null);

/** Bundle of the booth mutation/action callbacks, kept in a ref for the timers. */
type BoothHooks = {
  createSession: (deviceId?: string) => Promise<Id<"sessions">>;
  addMessage: (args: {
    sessionId: Id<"sessions">;
    role: string;
    text: string;
  }) => Promise<void>;
  setNeeds: (args: {
    sessionId: Id<"sessions">;
    problems?: string[];
    useCase?: string;
    urgency?: "low" | "medium" | "high";
    urgencyEvidence?: string;
  }) => Promise<void>;
  showView: (args: {
    sessionId: Id<"sessions">;
    view: string;
    params?: Record<string, unknown>;
    highlight?: string;
  }) => Promise<void>;
  setHighlight: (args: {
    sessionId: Id<"sessions">;
    elementId: string;
  }) => Promise<void>;
  captureContact: (args: {
    sessionId: Id<"sessions">;
    email?: string;
    phone?: string;
    linkedinUrl?: string;
  }) => Promise<void>;
  finalize: (sessionId: Id<"sessions">) => Promise<unknown>;
};

export function DirectorProvider({ children }: { children: ReactNode }) {
  const live = hasVoice;

  // ---- rendered state ----
  const [screen, setScreen] = useState<Screen>("attract");
  const [beat, setBeat] = useState(0);
  const [sessionId, setSessionId] = useState<Id<"sessions"> | null>(null);

  // ---- reactive Convex subscriptions (skip while sessionId is null) ----
  const session = useSession(sessionId);
  const demoState = useDemoState(sessionId);

  // ---- live voice loop (no-op without a Vapi key) ----
  const voice = useVapiVoice(BoothConfig.deviceId);

  // ---- booth backend callbacks ----
  const createSession = useCreateSession();
  const addMessage = useAddMessage();
  const setNeeds = useSetNeeds();
  const showView = useShowView();
  const setHighlight = useSetHighlight();
  const captureContact = useCaptureContact();
  const finalize = useFinalize();

  // ---- refs holding the latest values for use inside timers/effects ----
  const screenRef = useRef<Screen>(screen);
  const beatRef = useRef(0);
  const sessionIdRef = useRef<Id<"sessions"> | null>(null);
  const liveRef = useRef(live);
  const pendingLinkedInRef = useRef<string | undefined>(undefined);

  const transitionRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const beatTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const goToRef = useRef<(s: Screen) => void>(() => {});
  const voiceRef = useRef(voice);
  const hooksRef = useRef<BoothHooks>({
    createSession,
    addMessage,
    setNeeds,
    showView,
    setHighlight,
    captureContact,
    finalize,
  });

  // Keep the "latest value" refs current every render (read only in callbacks).
  screenRef.current = screen;
  liveRef.current = live;
  voiceRef.current = voice;
  hooksRef.current = {
    createSession,
    addMessage,
    setNeeds,
    showView,
    setHighlight,
    captureContact,
    finalize,
  };

  // ---- low-level timer helpers (stable) ----

  const after = useCallback((ms: number, fn: () => void) => {
    if (transitionRef.current) clearTimeout(transitionRef.current);
    transitionRef.current = setTimeout(fn, ms);
  }, []);

  const clearAllTimers = useCallback(() => {
    if (transitionRef.current) {
      clearTimeout(transitionRef.current);
      transitionRef.current = null;
    }
    if (beatTimerRef.current) {
      clearInterval(beatTimerRef.current);
      beatTimerRef.current = null;
    }
  }, []);

  // ---- backend drive (fire-and-forget; mirrors fireBeatHooks/driveConversationBackend) ----

  const fireBeatHooks = useCallback((n: number) => {
    const sid = sessionIdRef.current;
    if (!sid) return; // no session yet → scripted UX continues without writes
    const b = BEATS[n];
    if (!b) return;
    const text = b.line.replace(/\*/g, "");
    const role = b.speaker === "VISITOR" ? "visitor" : "assistant";
    const h = hooksRef.current;

    void h.addMessage({ sessionId: sid, role, text });
    switch (n) {
      case 0:
        void h.setNeeds({
          sessionId: sid,
          problems: ["churn / retention", "growth stalling"],
          useCase: "reduce churn and protect growth",
          urgency: "high",
          urgencyEvidence: "churn is quietly killing our growth",
        });
        break;
      case 2:
        void h.showView({
          sessionId: sid,
          view: "churn",
          params: { period: "30d" },
        });
        break;
      case 3:
        void h.setHighlight({ sessionId: sid, elementId: "at-risk-accounts" });
        break;
      case 4:
        void h.setNeeds({
          sessionId: sid,
          problems: ["churn / retention", "wants proactive churn alerts"],
          useCase: "get pinged before accounts churn",
          urgency: "high",
        });
        break;
      case 5:
        void h.showView({
          sessionId: sid,
          view: "alerts",
          params: { severity: "high" },
        });
        void h.captureContact({
          sessionId: sid,
          linkedinUrl: "https://www.linkedin.com/in/maya-chen-product",
        });
        break;
      case 6:
        void h.finalize(sid);
        break;
      default:
        break;
    }
  }, []);

  const goToBeat = useCallback(
    (i: number) => {
      const clamped = Math.max(0, Math.min(LAST_BEAT, i));
      beatRef.current = clamped;
      setBeat(clamped);
      fireBeatHooks(clamped);
    },
    [fireBeatHooks],
  );

  const restartBeatTimer = useCallback(() => {
    if (beatTimerRef.current) clearInterval(beatTimerRef.current);
    beatTimerRef.current = setInterval(() => {
      if (beatRef.current >= LAST_BEAT) {
        if (beatTimerRef.current) {
          clearInterval(beatTimerRef.current);
          beatTimerRef.current = null;
        }
        after(BEAT_INTERVAL_MS, () => goToRef.current("badge"));
      } else {
        goToBeat(beatRef.current + 1);
      }
    }, BEAT_INTERVAL_MS);
  }, [after, goToBeat]);

  const driveConversationBackend = useCallback(() => {
    void (async () => {
      try {
        const id = await hooksRef.current.createSession();
        sessionIdRef.current = id;
        setSessionId(id);
        const pending = pendingLinkedInRef.current;
        if (pending) {
          void hooksRef.current.captureContact({
            sessionId: id,
            linkedinUrl: pending,
          });
          pendingLinkedInRef.current = undefined;
        }
        fireBeatHooks(0);
      } catch {
        // offline: the scripted walkthrough continues with no backend writes
      }
    })();
  }, [fireBeatHooks]);

  // ---- scheduling (mirrors Director.schedule(for:)) ----

  const scheduleFor = useCallback(
    (s: Screen) => {
      if (liveRef.current) {
        switch (s) {
          case "greeting":
            void (async () => {
              try {
                const id = await hooksRef.current.createSession();
                sessionIdRef.current = id;
                setSessionId(id);
              } catch {
                // offline: greeting still advances to conversation on its timer
              }
            })();
            after(LIVE_GREETING_TO_CONVERSATION_MS, () =>
              goToRef.current("conversation"),
            );
            break;
          // conversation: voice.start is driven by the dedicated effect below;
          // attract waits for the tap-to-begin gesture; badge waits for restart.
          default:
            break;
        }
        return;
      }
      switch (s) {
        case "greeting":
          after(GREETING_TO_QR_MS, () => goToRef.current("qr"));
          break;
        case "qr":
          after(QR_TO_CONVERSATION_MS, () => goToRef.current("conversation"));
          break;
        case "conversation":
          restartBeatTimer();
          driveConversationBackend();
          break;
        case "badge":
          after(BADGE_TO_ATTRACT_MS, () => goToRef.current("attract"));
          break;
        case "attract":
          break;
        default:
          break;
      }
    },
    [after, restartBeatTimer, driveConversationBackend],
  );

  // ---- the core transition (mirrors Director.goTo) ----

  const goTo = useCallback(
    (s: Screen) => {
      clearAllTimers();
      if (s === "attract" || s === "badge") voiceRef.current.stop();
      if (s === "attract") {
        sessionIdRef.current = null;
        setSessionId(null);
        pendingLinkedInRef.current = undefined;
      }
      setScreen(s);
      if (s === "conversation") {
        beatRef.current = 0;
        setBeat(0);
      }
      scheduleFor(s);
    },
    [clearAllTimers, scheduleFor],
  );
  goToRef.current = goTo;

  // ---- live edge-triggered transitions ----

  // Start the voice loop once we're in conversation with a session id (live only).
  useEffect(() => {
    if (live && screen === "conversation" && sessionId) {
      void voiceRef.current.start(sessionId);
    }
  }, [live, screen, sessionId]);

  // Rising-edge of voice.finalized → badge (mirrors voice.$finalized.filter{$0}).
  const prevFinalizedRef = useRef(false);
  useEffect(() => {
    if (!live) {
      prevFinalizedRef.current = voice.finalized;
      return;
    }
    const wasFinalized = prevFinalizedRef.current;
    prevFinalizedRef.current = voice.finalized;
    if (!wasFinalized && voice.finalized && screenRef.current !== "badge") {
      goTo("badge");
    }
  }, [live, voice.finalized, goTo]);

  // The subscribed session's badge appeared → badge (live only).
  const hasBadge = !!session?.badge;
  useEffect(() => {
    if (live && hasBadge && screenRef.current !== "badge") {
      goTo("badge");
    }
  }, [live, hasBadge, goTo]);

  // Clear any pending timers on unmount.
  useEffect(() => clearAllTimers, [clearAllTimers]);

  // ---- public actions ----

  const begin = useCallback(() => {
    if (screenRef.current !== "attract") return;
    goTo("greeting");
  }, [goTo]);

  const tap = useCallback(() => {
    if (liveRef.current) return; // live is driven by voice; tap is disabled
    switch (screenRef.current) {
      case "attract":
        goTo("greeting");
        break;
      case "greeting":
        goTo("qr");
        break;
      case "qr":
        goTo("conversation");
        break;
      case "conversation":
        if (beatRef.current < LAST_BEAT) {
          goToBeat(beatRef.current + 1);
          restartBeatTimer();
        } else {
          goTo("badge");
        }
        break;
      case "badge":
        goTo("attract");
        break;
      default:
        break;
    }
  }, [goTo, goToBeat, restartBeatTimer]);

  const restart = useCallback(() => {
    goTo("attract");
  }, [goTo]);

  const captureLinkedIn = useCallback(
    (url: string) => {
      pendingLinkedInRef.current = url;
      goTo("conversation");
    },
    [goTo],
  );

  // ---- display selectors (mirrors Director.display*) ----

  const beatData = BEATS[Math.min(beat, BEATS.length - 1)];
  const inConversation = screen === "conversation";

  const scriptedSpark: SparkMode = inConversation
    ? beatData.spark
    : screen === "greeting" || screen === "badge"
      ? "speaking"
      : screen === "qr"
        ? "listening"
        : "idle"; // attract

  const displaySpark: SparkMode =
    live && inConversation ? voice.spark : scriptedSpark;
  const displaySpeaker =
    live && inConversation ? voice.speaker : beatData.speaker;
  const displayCaption =
    live && inConversation ? voice.transcript : beatData.line;

  const demoView = demoState?.view;
  const displayStage =
    live && inConversation
      ? stageForView(demoView)
      : inConversation
        ? beatData.stage
        : 0;

  const displayStep = (() => {
    if (live && inConversation) {
      const s = stageForView(demoView);
      return s === 0 ? 1 : Math.min(s + 1, 3);
    }
    return inConversation ? beatData.step : 0;
  })();

  const badgeBase =
    BoothConfig.badgeBaseUrl ||
    (typeof window !== "undefined" ? window.location.origin : "");
  const badgeURL = sessionId
    ? `${badgeBase}/badge/${sessionId}`
    : `${badgeBase}/badge/preview`;

  const value: Director = {
    screen,
    live,
    beat,
    displaySpark,
    displaySpeaker,
    displayCaption,
    displayStage,
    displayStep,
    badgeURL,
    session,
    demoView,
    highlight: demoState?.highlight,
    badge: session?.badge,
    visitorName: session?.visitorName,
    begin,
    tap,
    restart,
    captureLinkedIn,
  };

  return (
    <DirectorContext.Provider value={value}>
      {children}
    </DirectorContext.Provider>
  );
}

/** Read the Director from context. Must be used under {@link DirectorProvider}. */
export function useDirector(): Director {
  const ctx = useContext(DirectorContext);
  if (!ctx) {
    throw new Error("useDirector must be used within a <DirectorProvider>");
  }
  return ctx;
}

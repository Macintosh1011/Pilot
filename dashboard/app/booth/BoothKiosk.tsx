"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type Ref } from "react";
import { useConvex, useQuery } from "convex/react";
import { api } from "@cvx/_generated/api";
import type { Id } from "@cvx/_generated/dataModel";
import type { Session } from "../types";
import { Wordmark } from "../components/Wordmark";
import { useBoothAgent } from "./useBoothAgent";
import { BoothFinale } from "./BoothFinale";
import { AcmeDemoPanel, type DemoView, type DemoParams } from "./components/AcmeDemoPanel";
import { LiveContactCard } from "./components/LiveContactCard";
import { WebcamCapture, type WebcamHandle } from "./components/WebcamCapture";
import { ConnectQR } from "./components/ConnectQR";
import { VoiceOrb } from "./components/VoiceOrb";
import { Transcript } from "./components/Transcript";
import { StageRail, type Stage } from "./components/StageRail";
import styles from "./booth.module.css";

export function BoothKiosk() {
  const convex = useConvex();
  const webcamRef = useRef<WebcamHandle>(null);
  const [sessionId, setSessionId] = useState<Id<"sessions"> | null>(null);
  // "attract" → tap to start → "scanning" (silent QR gate) → agent connects on a successful scan.
  const [phase, setPhase] = useState<"attract" | "scanning">("attract");

  // A fresh CRM card per visitor, created once on mount.
  const createdRef = useRef(false);
  useEffect(() => {
    if (createdRef.current) return;
    createdRef.current = true;
    convex
      .mutation(api.sessions.create, { deviceId: "web-booth" })
      .then(setSessionId)
      .catch((e) => console.error("[booth] create session", e));
  }, [convex]);

  const agent = useBoothAgent({ convex, sessionId, webcamRef });
  const demo = useQuery(api.demoState.bySession, sessionId ? { sessionId } : "skip");
  const session = useQuery(api.sessions.get, sessionId ? { sessionId } : "skip") as
    | Session
    | null
    | undefined;

  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const connectUrl = sessionId ? `${origin}/booth/connect/${sessionId}` : "";
  const badgeUrl = sessionId ? `${origin}/badge/${sessionId}` : "";

  const stage: Stage = useMemo(() => {
    if (!session) return "meet";
    if (session.status === "done" || session.badge) return "badge";
    const scoped = (session.problems?.length ?? 0) > 0 || !!session.useCase;
    if (scoped && (session.demoShown?.length ?? 0) > 0) return "show";
    if (scoped) return "understand";
    return "meet";
  }, [session]);

  const finalized = !!(session && session.status === "done" && session.badge);

  // Identity is known once enrichment (from the QR scan) or a name has landed on the card.
  const identified = !!(session?.visitorName || session?.linkedinUrl || session?.fiber);

  // Tap-to-start: grab camera + mic permission up front (one prompt), then show the scan gate.
  const beginScan = useCallback(async () => {
    try {
      const probe = await navigator.mediaDevices.getUserMedia({ audio: true, video: true });
      probe.getTracks().forEach((t) => t.stop());
    } catch (e) {
      console.error("[booth permissions]", e);
    }
    setPhase("scanning");
  }, []);

  // A successful LinkedIn QR scan is the only thing that wakes the agent: enrich, then connect
  // (the agent opens by name). Connect even if enrichment is thin — the scan itself succeeded.
  const qrHandledRef = useRef(false);
  const onQR = useCallback(
    async (value: string) => {
      if (qrHandledRef.current || !sessionId) return;
      if (!/linkedin\.com\/(in|pub|profile)/i.test(value)) return; // LinkedIn profile QRs
      qrHandledRef.current = true;
      try {
        await convex.action(api.fiber.lookupVisitor, { sessionId, linkedinUrl: value, reveal: false });
      } catch (e) {
        console.error("[booth qr enrich]", e);
      }
      void agent.connect();
    },
    [convex, sessionId, agent],
  );

  // Escape hatch for someone without a QR — connect without identity (agent asks their name).
  const startWithoutScan = useCallback(() => {
    qrHandledRef.current = true;
    void agent.connect();
  }, [agent]);

  const restart = useCallback(() => {
    agent.stop();
    if (typeof window !== "undefined") window.location.reload();
  }, [agent]);

  // ---- Badge finale ----
  if (finalized && session) {
    return (
      <BoothFinale
        session={session}
        sessionId={String(sessionId)}
        badgeUrl={badgeUrl}
        onRestart={restart}
      />
    );
  }

  // ---- Pre-conversation: connecting / errors / scan gate / attract ----
  if (agent.status === "connecting") {
    return <Splash title="One sec…" sub="Bringing your host in." />;
  }
  if (agent.status === "no-mic") {
    return (
      <Splash
        title="Camera & mic needed"
        sub="Allow camera and microphone access, then start again."
        onRetry={beginScan}
      />
    );
  }
  if (agent.status === "no-key") {
    return (
      <Splash
        title="Voice is offline"
        sub="No OpenAI key is set — add OPENAI_API_KEY to Convex to enable the live agent."
        onRetry={() => void agent.connect()}
      />
    );
  }
  if (agent.status === "error") {
    return (
      <Splash title="Something hiccuped" sub={agent.error ?? "Tap to retry."} onRetry={() => void agent.connect()} />
    );
  }
  if (agent.status !== "live") {
    if (phase === "scanning") {
      return <ScanScreen webcamRef={webcamRef} onQR={onQR} onSkip={startWithoutScan} />;
    }
    return <Attract status={agent.status} onStart={beginScan} ready={!!sessionId} />;
  }

  // ---- Conversation (live) ----
  const view = (demo?.view as DemoView | undefined) ?? undefined;
  const params = (demo?.params as DemoParams | undefined) ?? undefined;
  const highlight = demo?.highlight ?? undefined;

  // The company UI stays hidden until the agent has actually figured out what the
  // visitor wants — needs scoped (problems/useCase) AND a view chosen. Until then the
  // center is a warm "getting to know you" moment with the visitor on camera.
  const understood = !!(
    session &&
    ((session.problems?.length ?? 0) > 0 || session.useCase)
  );
  const showCompany = understood && !!view;

  return (
    <div className={styles.stage}>
      {agent.photoFlash && <div className={styles.flash} aria-hidden />}

      <header className={styles.topbar}>
        <Wordmark />
        <StageRail stage={stage} />
      </header>

      <div className={styles.grid}>
        <section className={styles.leftRail}>
          <VoiceOrb state={agent.voiceState} size={120} />
          <Transcript turns={agent.turns} className={styles.transcript} />
        </section>

        <section
          className={`${styles.center} ${showCompany ? styles.centerDemo : styles.centerMeet}`}
        >
          <div className={styles.demoLayer}>
            {showCompany && view && (
              <AcmeDemoPanel view={view} params={params} highlight={highlight} />
            )}
          </div>
          {!showCompany && <Welcome name={session?.visitorName} identified={identified} />}
          <div className={styles.webcamSlot}>
            <WebcamCapture ref={webcamRef} idle={agent.voiceState === "idle"} />
          </div>
        </section>

        <section className={styles.rightRail}>
          {session && <LiveContactCard session={session} />}
          {connectUrl && <ConnectQR url={connectUrl} caption="Scan to share your details" />}
        </section>
      </div>
    </div>
  );
}

function Attract({
  status,
  onStart,
  ready,
}: {
  status: string;
  onStart: () => void;
  ready: boolean;
}) {
  return (
    <button type="button" className={styles.attract} onClick={onStart} disabled={!ready}>
      <Wordmark />
      <div className={styles.attractOrb}>
        <VoiceOrb state="idle" size={200} />
      </div>
      <h1 className={styles.attractTitle}>Step up &amp; say hello</h1>
      <p className={styles.attractSub}>
        {status === "ended"
          ? "Tap to start a new conversation"
          : ready
            ? "Tap to begin — then scan your LinkedIn QR"
            : "Setting up…"}
      </p>
    </button>
  );
}

function ScanScreen({
  webcamRef,
  onQR,
  onSkip,
}: {
  webcamRef: Ref<WebcamHandle>;
  onQR: (value: string) => void;
  onSkip: () => void;
}) {
  return (
    <div className={styles.scanScreen}>
      <Wordmark />
      <h1 className={styles.scanTitle}>Scan your LinkedIn QR to begin</h1>
      <div className={styles.scanCam}>
        <WebcamCapture ref={webcamRef} scanQR onQR={onQR} />
      </div>
      <p className={styles.scanHint}>Hold it steady in the frame — I start the moment I see it.</p>
      <button type="button" className={styles.skipLink} onClick={onSkip}>
        I don&apos;t have a QR — start anyway
      </button>
    </div>
  );
}

function Splash({
  title,
  sub,
  onRetry,
}: {
  title: string;
  sub: string;
  onRetry?: () => void;
}) {
  return (
    <div className={styles.splash}>
      <VoiceOrb state="thinking" size={140} />
      <h1 className={styles.attractTitle}>{title}</h1>
      <p className={styles.attractSub}>{sub}</p>
      {onRetry && (
        <button type="button" className={styles.restartBtn} onClick={onRetry}>
          Try again
        </button>
      )}
    </div>
  );
}

function Welcome({ name, identified }: { name?: string; identified: boolean }) {
  if (!identified) {
    return (
      <div className={styles.welcome}>
        <p className={styles.welcomeEyebrow}>Let&apos;s talk</p>
        <h2 className={styles.welcomeTitle}>Tell me a bit about yourself.</h2>
        <p className={styles.welcomeSub}>Your name and company — I&apos;ll take it from there.</p>
      </div>
    );
  }
  return (
    <div className={styles.welcome}>
      <p className={styles.welcomeEyebrow}>{name ? `Hi, ${name}` : "Let's talk"}</p>
      <h2 className={styles.welcomeTitle}>Let&apos;s figure out what matters to you.</h2>
      <p className={styles.welcomeSub}>
        Tell me what you&apos;re working on — I&apos;ll pull the right view up the moment it clicks.
      </p>
    </div>
  );
}

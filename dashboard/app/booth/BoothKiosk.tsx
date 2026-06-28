"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useConvex, useQuery } from "convex/react";
import { api } from "@cvx/_generated/api";
import type { Id } from "@cvx/_generated/dataModel";
import type { Session } from "../types";
import { Wordmark } from "../components/Wordmark";
import { useBoothAgent } from "./useBoothAgent";
import { summarizeEnrichment } from "./tools";
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

  // Identity is known once enrichment (from a QR scan) or a name has landed on the card.
  const identified = !!(
    session?.visitorName ||
    session?.linkedinUrl ||
    session?.fiber
  );

  // Scan the visitor's LinkedIn QR off the webcam → enrich → tell the agent who they are.
  const qrHandledRef = useRef(false);
  const onQR = useCallback(
    async (value: string) => {
      if (qrHandledRef.current || !sessionId) return;
      if (!/linkedin\.com\/(in|pub)\//i.test(value)) return; // only LinkedIn profile QRs
      qrHandledRef.current = true;
      try {
        await convex.action(api.fiber.lookupVisitor, {
          sessionId,
          linkedinUrl: value,
          reveal: false,
        });
        const s = (await convex.query(api.sessions.get, { sessionId })) as Session | null;
        const real = !!(s?.fiber && s.fiber.source !== "fallback" && s.fiber.person?.fullName);
        agent.sendContext(
          real
            ? `(The visitor just held up their LinkedIn QR and it scanned. ${summarizeEnrichment(s)} Greet them by name now.)`
            : `(The visitor showed a LinkedIn QR but I couldn't pull reliable info on them. Warmly ask them to tell you their name and company — do NOT guess.)`,
        );
      } catch (e) {
        console.error("[booth qr]", e);
        qrHandledRef.current = false;
      }
    },
    [convex, sessionId, agent],
  );

  const restart = useCallback(() => {
    agent.stop();
    if (typeof window !== "undefined") window.location.reload();
  }, [agent]);

  // ---- Attract / pre-conversation states ----
  if (!finalized && (agent.status === "idle" || agent.status === "ended")) {
    return <Attract status={agent.status} onStart={agent.connect} ready={!!sessionId} />;
  }
  if (!finalized && agent.status === "connecting") {
    return <Splash title="Connecting…" sub="Warming up the mic and the voice." />;
  }
  if (!finalized && agent.status === "no-mic") {
    return (
      <Splash
        title="Microphone needed"
        sub="Allow microphone access in your browser, then tap to try again."
        onRetry={agent.connect}
      />
    );
  }
  if (!finalized && agent.status === "no-key") {
    return (
      <Splash
        title="Voice is offline"
        sub="No OpenAI key is set — add OPENAI_API_KEY to Convex to enable the live agent."
        onRetry={agent.connect}
      />
    );
  }
  if (!finalized && agent.status === "error") {
    return <Splash title="Something hiccuped" sub={agent.error ?? "Tap to retry."} onRetry={agent.connect} />;
  }

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
            <WebcamCapture
              ref={webcamRef}
              idle={agent.voiceState === "idle"}
              scanQR={!identified}
              onQR={onQR}
            />
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
            ? "Tap, allow the mic, and just talk"
            : "Setting up…"}
      </p>
    </button>
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
        <p className={styles.welcomeEyebrow}>Step one</p>
        <h2 className={styles.welcomeTitle}>Hold your LinkedIn QR up to the camera.</h2>
        <p className={styles.welcomeSub}>
          I&apos;ll pull up your world so we can skip the small talk — or just tell me your name.
        </p>
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

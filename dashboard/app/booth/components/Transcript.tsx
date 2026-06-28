"use client";
// 'use client' — needs useRef + useEffect for auto-scroll to newest turn.

import { useRef, useEffect } from "react";
import styles from "./Transcript.module.css";

export type Turn = {
  id: string;
  role: "visitor" | "assistant";
  text: string;
  partial?: boolean;
};

export function Transcript({
  turns,
  className,
}: {
  turns: Turn[];
  className?: string;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const prevTurnCountRef = useRef(0);

  // Smooth-scroll only when a new turn is added; instant-set scrollTop on
  // partial-token updates so the container stays pinned without jitter.
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const isNewTurn = turns.length > prevTurnCountRef.current;
    prevTurnCountRef.current = turns.length;
    if (isNewTurn) {
      el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
    } else {
      el.scrollTop = el.scrollHeight;
    }
  }, [turns]);

  if (turns.length === 0) {
    return (
      <div
        className={[styles.container, className].filter(Boolean).join(" ")}
        aria-live="polite"
        aria-label="Conversation transcript"
      >
        <p className={styles.empty}>Conversation will appear here</p>
      </div>
    );
  }

  // Find the index of the latest assistant turn for active styling
  let lastAssistantIdx = -1;
  for (let i = turns.length - 1; i >= 0; i--) {
    if (turns[i].role === "assistant") {
      lastAssistantIdx = i;
      break;
    }
  }

  return (
    <div
      className={[styles.container, className].filter(Boolean).join(" ")}
      aria-live="polite"
      aria-label="Conversation transcript"
    >
      <div ref={scrollRef} className={styles.scroll}>
        {turns.map((turn, i) => {
          const isLatestAssistant =
            turn.role === "assistant" && i === lastAssistantIdx;

          return (
            <div
              key={turn.id}
              className={[
                styles.turn,
                turn.role === "visitor" ? styles.visitor : styles.assistant,
                isLatestAssistant ? styles.active : "",
              ]
                .filter(Boolean)
                .join(" ")}
            >
              <span className={styles.roleLabel} aria-hidden="true">
                {turn.role === "visitor" ? "YOU" : "BOOTH"}
              </span>
              <p className={styles.text}>
                {turn.text}
                {turn.partial && (
                  <span className={styles.cursor} aria-label="typing" />
                )}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}

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
  const bottomRef = useRef<HTMLDivElement>(null);

  // Scroll to bottom whenever turns change (new turn or partial update)
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
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
      <div className={styles.scroll}>
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
        {/* Anchor for auto-scroll */}
        <div ref={bottomRef} />
      </div>
    </div>
  );
}

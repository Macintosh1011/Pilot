// Server component — purely prop-driven. A compact horizontal stepper for the topbar:
// MEET · UNDERSTAND · SHOW · BADGE. Completed steps show a clay check; the connector
// hairline turns clay once a step is done.

import styles from "./StageRail.module.css";

export type Stage = "meet" | "understand" | "show" | "badge";

const STEPS: { key: Stage; label: string }[] = [
  { key: "meet", label: "MEET" },
  { key: "understand", label: "UNDERSTAND" },
  { key: "show", label: "SHOW" },
  { key: "badge", label: "BADGE" },
];

const STAGE_INDEX: Record<Stage, number> = {
  meet: 0,
  understand: 1,
  show: 2,
  badge: 3,
};

function CheckMark() {
  return (
    <svg width="9" height="9" viewBox="0 0 9 9" fill="none" aria-hidden="true">
      <polyline
        points="1.5,4.5 3.5,6.5 7.5,2.5"
        stroke="var(--paper)"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function StageRail({ stage }: { stage: Stage }) {
  const currentIndex = STAGE_INDEX[stage];

  return (
    <nav aria-label="Conversation stages" className={styles.rail}>
      <ol className={styles.list}>
        {STEPS.map(({ key, label }, i) => {
          const isDone = i < currentIndex;
          const isActive = i === currentIndex;

          return (
            <li
              key={key}
              className={[
                styles.step,
                isDone ? styles.done : "",
                isActive ? styles.active : "",
                !isDone && !isActive ? styles.future : "",
              ]
                .filter(Boolean)
                .join(" ")}
              aria-current={isActive ? "step" : undefined}
            >
              <span className={styles.dot} aria-hidden="true">
                {isDone && <CheckMark />}
              </span>
              <span className={styles.label}>{label}</span>
              {i < STEPS.length - 1 && (
                <span
                  className={[styles.hairline, isDone ? styles.hairlineDone : ""]
                    .filter(Boolean)
                    .join(" ")}
                  aria-hidden="true"
                />
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

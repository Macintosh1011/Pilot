/** The booth's top-level experience states. The whole iPad surface is a state machine. */
export type BoothStage =
  | "idle" // attract loop, waiting for a visitor (or a `presence` approach event)
  | "greeting" // someone walked up; the booth opens the conversation
  | "conversation" // back-and-forth: research, scoping needs
  | "demo" // live demo view, reactive to demoState
  | "badge"; // the takeaway Booth Badge

/** What the voice orb is doing right now — drives its motion + color energy. */
export type OrbState = "idle" | "listening" | "thinking" | "speaking";

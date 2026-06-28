/**
 * The four animation states of the booth's `Spark` starburst, ported 1:1 from
 * the iOS `SparkMode` enum (ios/BoothPilot/Components/Spark.swift).
 *
 * This is the single source of truth for the spark state across the web app:
 * the voice hook, the `Spark` component, the Director, and the screens all
 * import `SparkMode` from here so the live (Vapi) and scripted modes stay in
 * lockstep.
 */
export type SparkMode = "idle" | "listening" | "thinking" | "speaking";

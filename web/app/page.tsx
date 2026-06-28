"use client";

import { useState } from "react";
import type { BoothStage } from "@/lib/stage";
import { IdleScreen } from "@/components/IdleScreen";

export default function Booth() {
  const [stage, setStage] = useState<BoothStage>("idle");

  // The booth is one state machine. For now only `idle` is built; tapping advances
  // it (later this is driven by the `presence` approach event + the voice loop).
  switch (stage) {
    case "idle":
      return <IdleScreen onBegin={() => setStage("greeting")} />;
    default:
      return (
        <div className="flex h-dvh w-screen items-center justify-center font-mono text-sm uppercase tracking-[0.2em] text-fog">
          {stage} — coming next
        </div>
      );
  }
}

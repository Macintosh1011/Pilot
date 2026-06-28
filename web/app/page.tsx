"use client";

import BoothStage from "@/components/BoothStage";
import { DirectorProvider } from "@/lib/director";

/*
 * Booth entry — a thin client page that mounts the Director state machine and
 * renders the scaled artboard + active screen (see BoothStage / BoothView.swift).
 */

export default function Page() {
  return (
    <DirectorProvider>
      <BoothStage />
    </DirectorProvider>
  );
}

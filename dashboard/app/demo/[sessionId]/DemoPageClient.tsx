"use client";

// Client component: subscribes to live demo state and renders the product panel
// full-viewport with no chrome. Intended for iPad WKWebView embed.

import { api } from "@cvx/_generated/api";
import { useQuery } from "convex/react";
import type { Id } from "../../types";
import { AcmeDemoPanel, type DemoView, type DemoParams } from "../../booth/components/AcmeDemoPanel";

export default function DemoPageClient({ sessionId }: { sessionId: Id<"sessions"> }) {
  const demo = useQuery(api.demoState.bySession, { sessionId });

  const view = (demo?.view as DemoView | undefined) ?? "home";
  const params = (demo?.params as DemoParams | undefined) ?? undefined;
  const highlight = demo?.highlight ?? undefined;

  return (
    <div
      style={{
        width: "100vw",
        height: "100svh",
        background: "var(--paper)",
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <AcmeDemoPanel view={view} params={params} highlight={highlight} />
    </div>
  );
}

"use client";

import { ConvexProvider, ConvexReactClient } from "convex/react";
import { ReactNode, useMemo } from "react";

export default function ConvexClientProvider({ children }: { children: ReactNode }) {
  const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;

  const convex = useMemo(() => {
    if (!convexUrl) {
      return null;
    }

    return new ConvexReactClient(convexUrl);
  }, [convexUrl]);

  if (!convexUrl || !convex) {
    return (
      <div className="env-shell">
        <div className="env-card">
          <p className="eyebrow">BoothPilot dashboard</p>
          <h1>Connect Convex to light up the live screen.</h1>
          <p>
            Set <code>NEXT_PUBLIC_CONVEX_URL</code> to the shared Convex
            deployment URL, then restart the Next.js dev server.
          </p>
        </div>
      </div>
    );
  }

  return <ConvexProvider client={convex}>{children}</ConvexProvider>;
}

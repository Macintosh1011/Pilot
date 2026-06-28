import type { Metadata } from "next";
import BadgePageClient from "./BadgePageClient";

/**
 * Public badge route. Server component: resolves the async `params` (Next 15),
 * derives share metadata from the session via the Convex HTTP query endpoint,
 * then hands off to the reactive client bookplate. Convex is provided globally
 * by app/layout.tsx, so the client can use hooks directly.
 */

type SessionForMetadata = {
  visitorName?: string;
  company?: string;
  badge?: {
    archetype: string;
    tagline: string;
  };
};

// Reads a session through Convex's HTTP query API (no React hooks available on
// the server). Returns null on any failure so metadata gracefully degrades.
async function fetchSession(sessionId: string): Promise<SessionForMetadata | null> {
  const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
  if (!convexUrl) return null;

  try {
    const response = await fetch(`${convexUrl}/api/query`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        path: "sessions:get",
        args: { sessionId },
        format: "json",
      }),
      cache: "no-store",
    });

    if (!response.ok) return null;

    const payload = (await response.json()) as { value?: SessionForMetadata | null };
    return payload.value ?? null;
  } catch {
    return null;
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ sessionId: string }>;
}): Promise<Metadata> {
  const { sessionId } = await params;
  const session = await fetchSession(sessionId);
  const badge = session?.badge;

  const title = badge ? `${badge.archetype} · BoothPilot` : "BoothPilot Badge";
  const description = badge?.tagline ?? "A shareable BoothPilot collectible bookplate.";
  const ogImage = `/badge/${sessionId}/opengraph-image`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: "profile",
      images: [{ url: ogImage, width: 1200, height: 630 }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [ogImage],
    },
  };
}

export default async function BadgePage({
  params,
}: {
  params: Promise<{ sessionId: string }>;
}) {
  const { sessionId } = await params;
  return <BadgePageClient sessionId={sessionId} />;
}

import type { Metadata } from "next";
import type { Id } from "@cvx/_generated/dataModel";
import BadgePageClient from "./BadgePageClient";

type SessionForMetadata = {
  badge?: {
    archetype: string;
    tagline: string;
  };
};

async function fetchSession(sessionId: string): Promise<SessionForMetadata | null> {
  const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;

  if (!convexUrl) {
    return null;
  }

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

    if (!response.ok) {
      return null;
    }

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
  const description = badge?.tagline ?? "A shareable BoothPilot collectible badge.";

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      images: [`/badge/${sessionId}/opengraph-image`],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [`/badge/${sessionId}/opengraph-image`],
    },
  };
}

export default async function BadgePage({ params }: { params: Promise<{ sessionId: string }> }) {
  const { sessionId } = await params;

  return <BadgePageClient sessionId={sessionId as Id<"sessions">} />;
}

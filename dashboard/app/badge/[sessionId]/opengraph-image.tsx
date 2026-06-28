import { ImageResponse } from "next/og";

export const runtime = "edge";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

type Badge = {
  archetype: string;
  tagline: string;
  compliment: string;
  stats: { label: string; value: number }[];
  discountCode: string;
  ogImageId?: string;
};

type Session = {
  visitorName?: string;
  company?: string;
  badge?: Badge;
};

async function getSession(sessionId: string): Promise<Session | null> {
  const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;

  if (!convexUrl) {
    return null;
  }

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

  const payload = (await response.json()) as { value?: Session | null };
  return payload.value ?? null;
}

export default async function OpenGraphImage({
  params,
}: {
  params: Promise<{ sessionId: string }>;
}) {
  const { sessionId } = await params;
  const session = await getSession(sessionId);
  const badge = session?.badge;
  const topStat = badge?.stats?.[0];

  // Baseline renders this image on demand. badge.ogImageId is intentionally unused;
  // it is reserved for a later pre-render-to-Convex-storage stretch path.
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: "radial-gradient(circle at 20% 20%, #27337a 0, transparent 34%), #0b0d12",
          color: "white",
          padding: 64,
          fontFamily: "Inter, Arial, sans-serif",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ color: "#22d3ee", fontSize: 28, letterSpacing: 4, textTransform: "uppercase" }}>
            BoothPilot Badge
          </div>
          <div
            style={{
              border: "1px solid rgba(255,255,255,0.18)",
              borderRadius: 999,
              padding: "14px 24px",
              color: "#dbeafe",
              fontSize: 28,
            }}
          >
            {badge?.discountCode ?? "Minting"}
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 26 }}>
          <div style={{ fontSize: 86, fontWeight: 800, letterSpacing: -3, lineHeight: 0.95 }}>
            {badge?.archetype ?? "Badge being minted"}
          </div>
          <div style={{ maxWidth: 850, color: "#cbd5e1", fontSize: 38, lineHeight: 1.25 }}>
            {badge?.tagline ?? "The BoothPilot agent is finishing the collectible."}
          </div>
          {topStat ? (
            <div style={{ display: "flex", alignItems: "center", gap: 28 }}>
              <div style={{ color: "#22d3ee", fontSize: 78, fontWeight: 800 }}>{Math.round(topStat.value)}</div>
              <div style={{ color: "#e2e8f0", fontSize: 32 }}>{topStat.label}</div>
            </div>
          ) : null}
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", color: "#94a3b8", fontSize: 28 }}>
          <span>{session?.visitorName ?? "Booth visitor"}</span>
          <span>{session?.company ?? "Acme Analytics"}</span>
        </div>
      </div>
    ),
    size,
  );
}

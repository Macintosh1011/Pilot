import { ImageResponse } from "next/og";

/**
 * Static, server-rendered OG image (1200x630) in the booth's bookplate
 * aesthetic — cream stock, ink + clay. Cannot use Convex React hooks, so it
 * reads the session through Convex's HTTP query API and degrades to a generic
 * branded card on any failure. Self-contained and typed.
 */

export const runtime = "edge";
export const alt = "BoothPilot bookplate badge";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// Editorial palette (ios/BoothPilot/Theme.swift).
const PAPER = "#FAF9F5";
const INK = "#141413";
const MUTED = "#6B6B63";
const CLAY = "#CC785C";

type Badge = {
  archetype: string;
  tagline: string;
  compliment: string;
  stats: { label: string; value: number }[];
  discountCode: string;
};

type Session = {
  visitorName?: string;
  company?: string;
  badge?: Badge;
};

async function getSession(sessionId: string): Promise<Session | null> {
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
    const payload = (await response.json()) as { value?: Session | null };
    return payload.value ?? null;
  } catch {
    return null;
  }
}

export default async function OpenGraphImage({
  params,
}: {
  params: Promise<{ sessionId: string }>;
}) {
  const { sessionId } = await params;
  const session = await getSession(sessionId);
  const badge = session?.badge;

  const archetype = badge?.archetype ?? "BoothPilot Bookplate";
  const compliment =
    badge?.compliment ??
    badge?.tagline ??
    "An editorial collectible from the booth — your archetype, minted live.";
  const visitorName = session?.visitorName ?? "Booth visitor";
  const discount = badge?.discountCode ?? "BOOTHPILOT";

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          padding: 56,
          background: PAPER,
        }}
      >
        {/* Bookplate card with the booth's double-rule border */}
        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            padding: 56,
            background: PAPER,
            border: `2px solid ${INK}`,
            borderRadius: 14,
            boxShadow: `inset 0 0 0 1px ${PAPER}, inset 0 0 0 3px rgba(20,20,19,0.28)`,
          }}
        >
          {/* Header */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <div
              style={{
                fontSize: 26,
                fontWeight: 700,
                letterSpacing: 8,
                color: INK,
              }}
            >
              {"BOOTHP\\LOT"}
            </div>
            <div style={{ fontSize: 22, letterSpacing: 4, color: MUTED }}>NO. 047</div>
          </div>

          {/* Center */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              textAlign: "center",
            }}
          >
            <div
              style={{
                fontSize: 24,
                fontWeight: 700,
                letterSpacing: 8,
                textTransform: "uppercase",
                color: CLAY,
                marginBottom: 22,
              }}
            >
              Your Archetype
            </div>
            <div
              style={{
                fontSize: 84,
                fontWeight: 700,
                letterSpacing: -2,
                lineHeight: 1.02,
                color: INK,
                maxWidth: 940,
              }}
            >
              {archetype}
            </div>
            <div
              style={{
                fontSize: 30,
                fontStyle: "italic",
                lineHeight: 1.4,
                color: MUTED,
                maxWidth: 760,
                marginTop: 26,
              }}
            >
              {`“${compliment}”`}
            </div>
          </div>

          {/* Footer */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-end",
              borderTop: `1px solid rgba(20,20,19,0.18)`,
              paddingTop: 24,
            }}
          >
            <div style={{ display: "flex", flexDirection: "column" }}>
              <div style={{ fontSize: 20, letterSpacing: 3, color: MUTED }}>ISSUED TO</div>
              <div style={{ fontSize: 34, fontWeight: 600, color: INK, marginTop: 6 }}>
                {visitorName}
              </div>
            </div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                fontSize: 24,
                fontWeight: 700,
                letterSpacing: 2,
                color: PAPER,
                background: CLAY,
                borderRadius: 999,
                padding: "12px 26px",
              }}
            >
              {discount}
            </div>
          </div>
        </div>
      </div>
    ),
    size,
  );
}

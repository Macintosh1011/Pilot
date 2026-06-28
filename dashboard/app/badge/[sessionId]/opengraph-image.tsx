import { ImageResponse } from "next/og";

export const runtime = "edge";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// Paper palette (mirrors iOS Theme.swift + CSS tokens — no CSS variables at edge)
const PAPER = "#FAF9F5";
const CARD = "#FCFBF7";
const INK = "#141413";
const MUTED = "#6B6B63";
const CLAY = "#CC785C";

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
      path: "sessions:badgePublic",
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

// Derives a stable 3-digit display number from the session ID.
function badgeNumber(id: string): string {
  const n = id.split("").reduce((acc, c) => (acc * 31 + c.charCodeAt(0)) & 0xffff, 0);
  return String((n % 900) + 100).padStart(3, "0");
}

export default async function OpenGraphImage({
  params,
}: {
  params: Promise<{ sessionId: string }>;
}) {
  const { sessionId } = await params;
  const session = await getSession(sessionId);
  const badge = session?.badge;
  const num = badgeNumber(sessionId);
  const visitorName = session?.visitorName ?? "Booth visitor";
  const archetype = badge?.archetype ?? "Badge Minting";
  const compliment =
    badge?.compliment ?? "The BoothPilot agent is finishing your collectible.";
  const discountCode = badge?.discountCode ?? "";
  const topStat = badge?.stats?.[0];
  const secondStat = badge?.stats?.[1];

  // Baseline renders this image on demand. badge.ogImageId is intentionally unused;
  // it is reserved for a later pre-render-to-Convex-storage stretch path.
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          background: PAPER,
          padding: 36,
          fontFamily: "Georgia, serif",
        }}
      >
        {/* Outer bookplate card: strong border + card bg */}
        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            border: `1.5px solid rgba(20,20,19,0.5)`,
            borderRadius: 10,
            background: CARD,
            padding: 10,
          }}
        >
          {/* Inner frame: inset rule, mirrors iOS letterpress double-border */}
          <div
            style={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              border: `1px solid rgba(20,20,19,0.25)`,
              borderRadius: 3,
              padding: "36px 52px",
            }}
          >
            {/* ── Header: wordmark + badge number ── */}
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 28,
              }}
            >
              <span
                style={{
                  fontFamily: "Courier New, monospace",
                  fontSize: 13,
                  fontWeight: 700,
                  letterSpacing: "0.28em",
                  color: INK,
                  textTransform: "uppercase",
                }}
              >
                BOOTHP\LOT
              </span>
              <span
                style={{
                  fontFamily: "Courier New, monospace",
                  fontSize: 12,
                  fontWeight: 600,
                  letterSpacing: "0.12em",
                  color: MUTED,
                }}
              >
                NO. {num}
              </span>
            </div>

            {/* ── Center hero: archetype + compliment ── */}
            <div
              style={{
                flex: 1,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                textAlign: "center",
                gap: 16,
              }}
            >
              {/* Clay eyebrow */}
              <span
                style={{
                  fontFamily: "Courier New, monospace",
                  fontSize: 12,
                  fontWeight: 600,
                  letterSpacing: "0.2em",
                  color: CLAY,
                  textTransform: "uppercase",
                }}
              >
                YOUR ARCHETYPE
              </span>

              {/* Archetype name — responsive font size based on length */}
              <span
                style={{
                  fontFamily: "Georgia, serif",
                  fontWeight: 500,
                  fontSize: archetype.length > 22 ? 64 : archetype.length > 14 ? 76 : 92,
                  color: INK,
                  letterSpacing: "-2px",
                  lineHeight: 0.95,
                }}
              >
                {archetype}
              </span>

              {/* Italic compliment — muted, max 680px wide */}
              <span
                style={{
                  fontFamily: "Georgia, serif",
                  fontStyle: "italic",
                  fontSize: 24,
                  color: MUTED,
                  maxWidth: 680,
                  lineHeight: 1.45,
                }}
              >
                {compliment}
              </span>
            </div>

            {/* ── Footer: ISSUED TO + stats + discount ── */}
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-end",
                paddingTop: 28,
                borderTop: `1px solid rgba(20,20,19,0.15)`,
                marginTop: 24,
              }}
            >
              {/* Issued to */}
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <span
                  style={{
                    fontFamily: "Courier New, monospace",
                    fontSize: 11,
                    fontWeight: 600,
                    letterSpacing: "0.14em",
                    color: MUTED,
                    textTransform: "uppercase",
                  }}
                >
                  ISSUED TO
                </span>
                <span
                  style={{
                    fontFamily: "Georgia, serif",
                    fontSize: 24,
                    fontWeight: 500,
                    color: INK,
                  }}
                >
                  {visitorName}
                </span>
                {session?.company ? (
                  <span
                    style={{
                      fontFamily: "Courier New, monospace",
                      fontSize: 13,
                      color: MUTED,
                      letterSpacing: "0.04em",
                    }}
                  >
                    {session.company}
                  </span>
                ) : null}
              </div>

              {/* Stats: up to two */}
              <div style={{ display: "flex", gap: 36, alignItems: "flex-end" }}>
                {topStat ? (
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      gap: 4,
                    }}
                  >
                    <span
                      style={{
                        fontFamily: "Georgia, serif",
                        fontSize: 52,
                        fontWeight: 500,
                        color: CLAY,
                        lineHeight: 1,
                      }}
                    >
                      {Math.round(topStat.value)}
                    </span>
                    <span
                      style={{
                        fontFamily: "Courier New, monospace",
                        fontSize: 11,
                        fontWeight: 600,
                        letterSpacing: "0.1em",
                        color: MUTED,
                        textTransform: "uppercase",
                      }}
                    >
                      {topStat.label}
                    </span>
                  </div>
                ) : null}
                {secondStat ? (
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      gap: 4,
                    }}
                  >
                    <span
                      style={{
                        fontFamily: "Georgia, serif",
                        fontSize: 52,
                        fontWeight: 500,
                        color: INK,
                        lineHeight: 1,
                      }}
                    >
                      {Math.round(secondStat.value)}
                    </span>
                    <span
                      style={{
                        fontFamily: "Courier New, monospace",
                        fontSize: 11,
                        fontWeight: 600,
                        letterSpacing: "0.1em",
                        color: MUTED,
                        textTransform: "uppercase",
                      }}
                    >
                      {secondStat.label}
                    </span>
                  </div>
                ) : null}
              </div>

              {/* Discount code */}
              {discountCode ? (
                <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 8 }}>
                  <span
                    style={{
                      fontFamily: "Courier New, monospace",
                      fontSize: 11,
                      fontWeight: 600,
                      letterSpacing: "0.14em",
                      color: MUTED,
                      textTransform: "uppercase",
                    }}
                  >
                    YOUR REWARD
                  </span>
                  <span
                    style={{
                      fontFamily: "Courier New, monospace",
                      fontSize: 22,
                      fontWeight: 700,
                      letterSpacing: "0.04em",
                      color: INK,
                    }}
                  >
                    {discountCode}
                  </span>
                  <span
                    style={{
                      fontFamily: "Courier New, monospace",
                      fontSize: 11,
                      fontWeight: 600,
                      letterSpacing: "0.08em",
                      textTransform: "uppercase",
                      color: CARD,
                      background: CLAY,
                      borderRadius: 999,
                      padding: "5px 14px",
                    }}
                  >
                    25% OFF PRO
                  </span>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    ),
    size,
  );
}

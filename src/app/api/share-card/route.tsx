import { ImageResponse } from "next/og";

/**
 * A pictorial, shareable result card (1080×1080) rendered with next/og (Satori).
 * Stateless - everything comes from the query string, so it works the instant a
 * result is shown, with no DB read:
 *   /api/share-card?score=72&tier=Interview-Ready&d=60,40,80,70,50&arch=The%20Cert%20Waiter
 *
 * Satori rules honoured: every multi-child box sets display:flex, solid fills
 * only, fixed px widths for the bars. Edge runtime sidesteps the @vercel/og
 * Windows font-loading bug that breaks `next build`.
 */
export const runtime = "edge";

const SIZE = 1080;
const PAD = 80;
const INNER = SIZE - PAD * 2; // 920
const LABEL_W = 250;
const BAR_GAP = 22;
const TRACK_W = INNER - LABEL_W - BAR_GAP; // 648

// Bar labels in DIMENSIONS order (short forms for the card).
const DIM_LABELS = ["Profile", "Strategy", "German", "Mindset", "Plan"];

const PAPER = "#f5f2ea";
const MUTED = "#93a39a";
const GOLD = "#f0b429";
const ANCHOR = "#0f3d2e";
const BG = "#0a0f0d";

function tierColor(tier: string): string {
  if (tier === "Invisible to Recruiters") return "#e0533d";
  if (tier === "Offer Magnet") return "#36b37e";
  return GOLD; // Visible, Not Competitive · Interview-Ready
}
// Dark ink on gold; white on the dark red/green fills.
const tierInk = (c: string) => (c === GOLD ? "#0a0f0d" : "#ffffff");

function clampPct(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(100, Math.round(n)));
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const score = clampPct(Number(searchParams.get("score")));
  const tier = (searchParams.get("tier") ?? "").slice(0, 40) || "Your Readiness";
  const arch = (searchParams.get("arch") ?? "").slice(0, 60);
  const dims = (searchParams.get("d") ?? "")
    .split(",")
    .slice(0, 5)
    .map((v) => clampPct(Number(v)));
  while (dims.length < 5) dims.push(0);

  const accent = tierColor(tier);

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: BG,
          borderTop: `12px solid ${ANCHOR}`,
          padding: `${PAD}px`,
          color: PAPER,
          fontFamily: "sans-serif",
        }}
      >
        {/* Brand row */}
        <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: "56px",
              height: "56px",
              borderRadius: "12px",
              background: GOLD,
              color: "#0B0B0D",
              fontSize: "32px",
              fontWeight: 700,
            }}
          >
            B²
          </div>
          <div style={{ display: "flex", fontSize: "20px", letterSpacing: "5px", color: GOLD }}>
            GERMANY CAREER SUMMIT · 20 JUN 2026
          </div>
        </div>

        {/* Score + tier */}
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ display: "flex", fontSize: "26px", letterSpacing: "4px", color: GOLD }}>
            GERMANY READINESS SCORE
          </div>
          <div style={{ display: "flex", alignItems: "flex-end", marginTop: "8px" }}>
            <div style={{ display: "flex", fontSize: "232px", fontWeight: 700, lineHeight: 1, color: accent }}>
              {score}
            </div>
            <div style={{ display: "flex", fontSize: "52px", color: MUTED, marginBottom: "34px", marginLeft: "12px" }}>
              / 100
            </div>
          </div>
          <div
            style={{
              display: "flex",
              alignSelf: "flex-start",
              marginTop: "12px",
              padding: "12px 26px",
              borderRadius: "999px",
              background: accent,
              color: tierInk(accent),
              fontSize: "34px",
              fontWeight: 700,
            }}
          >
            {tier}
          </div>
          {arch ? (
            <div style={{ display: "flex", marginTop: "20px", fontSize: "30px", color: PAPER }}>
              Archetype: {arch}
            </div>
          ) : null}
        </div>

        {/* Dimension bars */}
        <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
          {DIM_LABELS.map((label, i) => (
            <div key={label} style={{ display: "flex", alignItems: "center" }}>
              <div style={{ display: "flex", width: `${LABEL_W}px`, fontSize: "28px", color: PAPER }}>
                {label}
              </div>
              <div
                style={{
                  display: "flex",
                  width: `${TRACK_W}px`,
                  height: "24px",
                  marginLeft: `${BAR_GAP}px`,
                  borderRadius: "999px",
                  background: "rgba(245,242,234,0.12)",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    width: `${Math.round((TRACK_W * dims[i]) / 100)}px`,
                    height: "24px",
                    borderRadius: "999px",
                    background: GOLD,
                  }}
                />
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div style={{ display: "flex", gap: "12px", fontSize: "26px", color: MUTED }}>
          <span style={{ color: GOLD }}>The Reality Check</span>
          <span>- a mirror, not motivation.</span>
        </div>
      </div>
    ),
    { width: SIZE, height: SIZE },
  );
}

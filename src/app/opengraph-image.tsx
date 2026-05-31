import { ImageResponse } from "next/og";

// Branded social card for link previews. Built with next/og (Satori) - no extra
// dependency. Keep layout simple: Satori needs explicit display:flex on any div
// with multiple children. Edge runtime avoids the @vercel/og node fileURLToPath
// font-loading bug that breaks `next build` on Windows.
export const runtime = "edge";
export const alt = "Germany Readiness Suite - Germany Career Summit 2026";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OgImage() {
  return new ImageResponse(
    (
      <div
        style={{
          position: "relative",
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          // Satori's CSS parser is strict - keep it to a solid fill + a simple
          // top accent bar rather than a complex radial-gradient.
          background: "#0a0f0d",
          borderTop: "10px solid #0f3d2e",
          padding: "72px",
          color: "#f5f2ea",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: "56px",
              height: "56px",
              borderRadius: "12px",
              background: "#f0b429",
              color: "#0B0B0D",
              fontSize: "34px",
              fontWeight: 700,
            }}
          >
            B²
          </div>
          <div
            style={{
              display: "flex",
              fontSize: "22px",
              letterSpacing: "6px",
              color: "#f0b429",
            }}
          >
            GERMANY CAREER SUMMIT · 20 JUN 2026
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
          <div
            style={{
              display: "flex",
              fontSize: "76px",
              fontWeight: 700,
              lineHeight: 1.05,
              maxWidth: "1000px",
            }}
          >
            See exactly where you stand on Germany.
          </div>
          <div
            style={{
              display: "flex",
              fontSize: "30px",
              color: "#93a39a",
              maxWidth: "920px",
            }}
          >
            5-dimension Readiness Score · CV &amp; LinkedIn gap diagnosis · AI
            90-Day Roadmap
          </div>
        </div>

        <div
          style={{
            display: "flex",
            gap: "12px",
            fontSize: "24px",
            color: "#93a39a",
          }}
        >
          <span style={{ color: "#f0b429" }}>The Reality Check</span>
          <span>- a mirror, not motivation.</span>
        </div>
      </div>
    ),
    { ...size },
  );
}

import { ImageResponse } from "next/og";

// Branded 1200×630 social card used for link previews (Open Graph + Twitter).
// File-based convention: Next injects og:image / twitter:image automatically.

export const alt = "PadelMGT — Crea. Juega. Rankea.";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const NEON = "#d6ff00";
const BLACK = "#0a0a0a";

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: BLACK,
          padding: "72px 80px",
          fontFamily: "sans-serif",
        }}
      >
        {/* Neon court-line accent in the corner */}
        <div
          style={{
            position: "absolute",
            top: 0,
            right: 0,
            width: 520,
            height: 630,
            borderLeft: `4px solid ${NEON}`,
            opacity: 0.18,
            transform: "skewX(-12deg)",
            transformOrigin: "top right",
          }}
        />
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div
            style={{
              fontSize: 22,
              letterSpacing: 6,
              color: "rgba(255,255,255,0.55)",
              textTransform: "uppercase",
              fontWeight: 600,
            }}
          >
            Plataforma de pádel · LATAM
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column" }}>
          <div
            style={{
              fontSize: 132,
              fontWeight: 800,
              color: "#ffffff",
              lineHeight: 1,
              letterSpacing: -4,
              textTransform: "uppercase",
            }}
          >
            PadelMGT
          </div>
          <div
            style={{
              marginTop: 24,
              fontSize: 56,
              fontWeight: 700,
              lineHeight: 1,
              letterSpacing: -1,
              textTransform: "uppercase",
              display: "flex",
              gap: 18,
            }}
          >
            <span style={{ color: "#ffffff" }}>Crea.</span>
            <span style={{ color: NEON }}>Juega.</span>
            <span style={{ color: "#ffffff" }}>Rankea.</span>
          </div>
        </div>

        <div
          style={{
            fontSize: 28,
            color: "rgba(255,255,255,0.7)",
            maxWidth: 760,
          }}
        >
          Crea y gestiona torneos, ligas y clubes de pádel. Todo automatizado.
        </div>
      </div>
    ),
    { ...size },
  );
}

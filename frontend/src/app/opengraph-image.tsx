import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "Sensory Audit — Make Any Space Autism-Friendly";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "80px",
          background: "#050507",
          backgroundImage: "radial-gradient(circle at 75% 30%, rgba(16, 185, 129, 0.15), transparent 50%)",
          fontFamily: "Inter, system-ui, sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "32px" }}>
          <div style={{ width: "8px", height: "8px", borderRadius: "999px", background: "#10b981" }} />
          <div style={{ color: "#71717a", fontSize: "20px", letterSpacing: "0.2em", textTransform: "uppercase" }}>
            AI-Powered Sensory Analysis
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", color: "#fafafa", fontSize: "80px", fontWeight: 500, letterSpacing: "-0.03em", lineHeight: 1.05, marginBottom: "32px" }}>
          <div>Make any space</div>
          <div style={{ background: "linear-gradient(135deg, #10b981 0%, #06d6a0 50%, #6c63ff 100%)", backgroundClip: "text", color: "transparent" }}>
            autism-friendly
          </div>
        </div>

        <div style={{ color: "#a1a1aa", fontSize: "24px", fontWeight: 300, maxWidth: "900px", marginBottom: "48px" }}>
          Upload a video or describe any space. AI analyzes sensory load across visual, auditory, and social dimensions — and tells you exactly what to fix.
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "16px", marginTop: "auto" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <span style={{ fontSize: "28px", color: "transparent", backgroundImage: "linear-gradient(135deg, #10b981, #06d6a0, #6c63ff)", backgroundClip: "text", fontWeight: 500 }}>Sensory</span>
            <span style={{ fontSize: "28px", color: "#d4d4d8", fontWeight: 500 }}>Audit</span>
          </div>
          <div style={{ marginLeft: "auto", color: "#71717a", fontSize: "18px" }}>sensory.mind.new</div>
        </div>
      </div>
    ),
    { ...size }
  );
}

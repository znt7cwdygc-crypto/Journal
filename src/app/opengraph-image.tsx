import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "WebcamExpert Journal";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function Image() {
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", background: "linear-gradient(135deg, #1B1B1B 0%, #2D1B1B 100%)", fontFamily: "system-ui, sans-serif" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 80, height: 80, borderRadius: 16, background: "#FF4D2E", fontSize: 36, fontWeight: 900, color: "white", marginBottom: 24 }}>WE</div>
        <div style={{ fontSize: 48, fontWeight: 700, color: "white", textAlign: "center", maxWidth: 800 }}>WebcamExpert Journal</div>
        <div style={{ fontSize: 24, color: "#9CA3AF", marginTop: 16, textAlign: "center", maxWidth: 700 }}>UGC-медиа о вебкам-индустрии: статьи, вакансии, резюме, услуги</div>
      </div>
    ),
    { ...size }
  );
}

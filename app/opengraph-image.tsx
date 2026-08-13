import { ImageResponse } from "next/og";

export const alt = "SendGO — Envíos entre USA y Colombia con viajeros";
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = "image/png";

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "#0a0a0a",
          backgroundImage:
            "radial-gradient(circle at 50% 35%, rgba(115,112,255,0.35), transparent 60%)",
          color: "#f5f5f7",
          fontFamily: "sans-serif",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "10px 28px",
            borderRadius: 999,
            border: "1px solid rgba(255,255,255,0.15)",
            fontSize: 26,
            letterSpacing: 4,
            textTransform: "uppercase",
            color: "#7370ff",
            marginBottom: 32,
          }}
        >
          USA · Colombia
        </div>
        <div
          style={{
            display: "flex",
            fontSize: 140,
            fontWeight: 700,
            letterSpacing: -2,
          }}
        >
          SendGO
        </div>
        <div
          style={{
            display: "flex",
            fontSize: 34,
            color: "#a1a1aa",
            marginTop: 24,
            maxWidth: 860,
            textAlign: "center",
          }}
        >
          Conecta viajeros con espacio en su maleta y personas que envían encomiendas
        </div>
      </div>
    ),
    { ...size }
  );
}

import { ImageResponse } from "next/og";

export const alt = "SendGo — Envíos entre USA y Colombia con viajeros";
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = "image/png";

// El arco de la marca, con la misma geometría que components/Logo.tsx pero
// resuelto con divs redondos: Satori (el motor de ImageResponse) no rasteriza
// SVG importado, así que la forma se arma con posiciones absolutas.
const PUNTOS = 11;
const APERTURA = 40;
const ESCALA = 3.9;

function mezclar(t: number) {
  const c = (a: number, b: number) => Math.round(a + (b - a) * t);
  return `rgb(${c(255, 115)}, ${c(255, 112)}, 255)`;
}

function arco() {
  return Array.from({ length: PUNTOS }, (_, i) => {
    const t = i / (PUNTOS - 1);
    const rad = ((-90 - APERTURA + 2 * APERTURA * t) * Math.PI) / 180;
    const extremo = i === 0 || i === PUNTOS - 1;
    const r = (extremo ? 6 : 2.6) * ESCALA;
    return {
      left: (60 + 84 * Math.cos(rad)) * ESCALA - r,
      top: (87 + 84 * Math.sin(rad)) * ESCALA - r,
      d: r * 2,
      color: mezclar(t),
    };
  });
}

export default function Image() {
  const puntos = arco();

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
            marginBottom: 40,
          }}
        >
          USA · Colombia
        </div>

        <div
          style={{
            position: "relative",
            display: "flex",
            width: 120 * ESCALA,
            height: 30 * ESCALA,
          }}
        >
          {puntos.map((p, i) => (
            <div
              key={i}
              style={{
                position: "absolute",
                left: p.left,
                top: p.top,
                width: p.d,
                height: p.d,
                borderRadius: p.d,
                background: p.color,
              }}
            />
          ))}
        </div>

        <div
          style={{
            display: "flex",
            fontSize: 140,
            fontWeight: 700,
            letterSpacing: -2,
            marginTop: 4,
          }}
        >
          <span>Send</span>
          <span style={{ color: "#7370ff" }}>Go</span>
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

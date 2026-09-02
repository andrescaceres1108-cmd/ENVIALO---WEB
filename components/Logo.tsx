// Marca de SendGo: "ruta punto a punto". El punto blanco de la izquierda es
// el origen, el morado de la derecha el destino, y los puntos intermedios el
// vuelo que los une. Se dibuja por geometría (no con paths a mano) para que
// ajustar el arco sea cambiar un número, no redibujar el SVG.

const PUNTOS = 11;
// Círculo sobre el que se apoya el arco, en coordenadas del viewBox 120×30.
// Los números salen de que el arco llene la caja: con apertura 40° y radio 84,
// los extremos caen en x=6 y x=114, y con r=6 sus bordes tocan 0 y 120.
const CENTRO_X = 60;
const CENTRO_Y = 87;
const RADIO = 84;
// Apertura del arco a cada lado de la vertical.
const APERTURA = 40;
const RADIO_EXTREMO = 6;
const RADIO_CAMINO = 2.6;

const ORIGEN = "#ffffff";
const DESTINO = "#7370ff";

function mezclar(hexA: string, hexB: string, t: number): string {
  const canal = (hex: string, i: number) => parseInt(hex.slice(1 + i * 2, 3 + i * 2), 16);
  const v = [0, 1, 2].map((i) => Math.round(canal(hexA, i) + (canal(hexB, i) - canal(hexA, i)) * t));
  return `#${v.map((n) => n.toString(16).padStart(2, "0")).join("")}`;
}

function puntos() {
  return Array.from({ length: PUNTOS }, (_, i) => {
    const t = i / (PUNTOS - 1);
    // De -90-APERTURA a -90+APERTURA grados: el arco va de izquierda a derecha
    // pasando por arriba.
    const grados = -90 - APERTURA + 2 * APERTURA * t;
    const rad = (grados * Math.PI) / 180;
    const extremo = i === 0 || i === PUNTOS - 1;
    return {
      cx: CENTRO_X + RADIO * Math.cos(rad),
      cy: CENTRO_Y + RADIO * Math.sin(rad),
      // Los extremos son las ciudades: pesan más que el camino.
      r: extremo ? RADIO_EXTREMO : RADIO_CAMINO,
      fill: mezclar(ORIGEN, DESTINO, t),
    };
  });
}

export default function Logo({
  alto = 22,
  className,
}: {
  alto?: number;
  className?: string;
}) {
  // El viewBox recorta justo el arco: 120 de ancho por 30 de alto.
  return (
    <svg
      className={className}
      viewBox="0 0 120 30"
      height={alto}
      width={(alto * 120) / 30}
      fill="none"
      aria-hidden="true"
      focusable="false"
    >
      {puntos().map((p, i) => (
        <circle key={i} cx={p.cx} cy={p.cy} r={p.r} fill={p.fill} />
      ))}
    </svg>
  );
}

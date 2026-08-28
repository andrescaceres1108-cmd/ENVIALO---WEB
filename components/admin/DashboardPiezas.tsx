import type { ReactNode } from "react";
import type { Comparado, PasoEmbudo, PuntoSerie } from "@/lib/admin-dashboard";

const numero = new Intl.NumberFormat("es-CO");

export function formatearNumero(n: number): string {
  return numero.format(n);
}

export function formatearDinero(n: number): string {
  return `$${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

const MESES = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];

// Las fechas llegan como YYYY-MM-DD y se formatean sin `new Date()` para que
// no se corran un día por zona horaria.
export function formatearFecha(iso: string): string {
  const [a, m, d] = iso.slice(0, 10).split("-");
  return `${Number(d)} ${MESES[Number(m) - 1]}${a !== String(new Date().getFullYear()) ? ` ${a}` : ""}`;
}

export function Kpi({
  etiqueta,
  valor,
  comparado,
  pie,
  destacado = false,
}: {
  etiqueta: string;
  valor: string;
  comparado?: Comparado;
  pie?: ReactNode;
  destacado?: boolean;
}) {
  return (
    <div className={`kpi${destacado ? " kpi-destacado" : ""}`}>
      <div className="kpi-label">{etiqueta}</div>
      <div className="kpi-valor">{valor}</div>
      {comparado && <Delta comparado={comparado} />}
      {pie && <div className="kpi-pie">{pie}</div>}
    </div>
  );
}

function Delta({ comparado }: { comparado: Comparado }) {
  if (comparado.variacion === null) {
    return (
      <div className="delta delta-nuevo">
        {comparado.valor > 0 ? "sin comparación previa" : "sin actividad"}
      </div>
    );
  }
  const v = comparado.variacion;
  const clase = v > 0 ? "delta-sube" : v < 0 ? "delta-baja" : "delta-igual";
  return (
    <div className={`delta ${clase}`}>
      {v > 0 ? "▲" : v < 0 ? "▼" : "="} {Math.abs(v)}%
      <span className="delta-ref">vs. periodo anterior ({formatearNumero(comparado.previo)})</span>
    </div>
  );
}

export function Panel({
  titulo,
  descripcion,
  children,
  accion,
}: {
  titulo: string;
  descripcion?: string;
  children: ReactNode;
  accion?: ReactNode;
}) {
  return (
    <section className="panel">
      <div className="panel-head">
        <div>
          <h3>{titulo}</h3>
          {descripcion && <p>{descripcion}</p>}
        </div>
        {accion}
      </div>
      {children}
    </section>
  );
}

export function Embudo({ pasos }: { pasos: PasoEmbudo[] }) {
  const max = Math.max(...pasos.map((p) => p.valor), 1);
  return (
    <div className="embudo">
      {pasos.map((p) => (
        <div key={p.etapa} className="embudo-paso">
          <div className="embudo-info">
            <span className="embudo-etapa">{p.etapa}</span>
            <span className="embudo-valor">{formatearNumero(p.valor)}</span>
          </div>
          <div className="embudo-pista">
            <div
              className="embudo-barra"
              style={{ width: `${Math.max((p.valor / max) * 100, p.valor > 0 ? 3 : 0)}%` }}
            />
          </div>
          {(p.conversion !== null || p.nota) && (
            <div className="embudo-nota">
              {p.conversion !== null && (
                <strong>{p.conversion}% de quienes vieron el detalle</strong>
              )}
              {p.conversion !== null && p.nota ? " · " : ""}
              {p.nota}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

export function Serie({
  puntos,
  porSemana,
}: {
  puntos: PuntoSerie[];
  porSemana: boolean;
}) {
  const filas = [
    { clave: "registros" as const, texto: "Registros", color: "var(--accent)" },
    { clave: "anuncios" as const, texto: "Anuncios", color: "#4ea8de" },
    { clave: "contactos" as const, texto: "Contactos", color: "var(--ok)" },
  ];

  return (
    <div className="serie">
      {filas.map((f) => {
        const valores = puntos.map((p) => p[f.clave]);
        const max = Math.max(...valores, 1);
        const total = valores.reduce((s, v) => s + v, 0);
        return (
          <div key={f.clave} className="serie-fila">
            <div className="serie-etiqueta">
              {f.texto}
              <span>{formatearNumero(total)}</span>
            </div>
            <div className="serie-barras">
              {puntos.map((p) => (
                <div
                  key={p.etiqueta}
                  className="serie-barra"
                  title={`${formatearFecha(p.etiqueta)}: ${p[f.clave]}`}
                >
                  <div
                    style={{
                      height: `${p[f.clave] === 0 ? 2 : Math.max((p[f.clave] / max) * 100, 8)}%`,
                      background: p[f.clave] === 0 ? "var(--border)" : f.color,
                    }}
                  />
                </div>
              ))}
            </div>
          </div>
        );
      })}
      <div className="serie-eje">
        <span>{puntos.length > 0 ? formatearFecha(puntos[0].etiqueta) : ""}</span>
        <span>{porSemana ? "una barra por semana" : "una barra por día"}</span>
        <span>{puntos.length > 0 ? formatearFecha(puntos[puntos.length - 1].etiqueta) : "hoy"}</span>
      </div>
    </div>
  );
}

export function Dato({
  etiqueta,
  valor,
  detalle,
}: {
  etiqueta: string;
  valor: ReactNode;
  detalle?: string;
}) {
  return (
    <div className="dato">
      <div className="dato-etiqueta">{etiqueta}</div>
      <div className="dato-valor">{valor}</div>
      {detalle && <div className="dato-detalle">{detalle}</div>}
    </div>
  );
}

// Barra de proporción con el número dentro: sirve para "X de Y perfiles".
export function Proporcion({
  etiqueta,
  parte,
  total,
  invertirColor = false,
}: {
  etiqueta: string;
  parte: number;
  total: number;
  invertirColor?: boolean;
}) {
  const porcentaje = total === 0 ? 0 : Math.round((parte / total) * 100);
  const bien = invertirColor ? porcentaje === 0 : porcentaje === 100;
  return (
    <div className="proporcion">
      <div className="proporcion-info">
        <span>{etiqueta}</span>
        <span className={bien ? "proporcion-ok" : undefined}>
          {formatearNumero(parte)} de {formatearNumero(total)}
          {total > 0 && ` · ${porcentaje}%`}
        </span>
      </div>
      <div className="proporcion-pista">
        <div
          className="proporcion-barra"
          style={{
            width: `${porcentaje}%`,
            background: invertirColor
              ? porcentaje > 0
                ? "var(--red)"
                : "var(--ok)"
              : porcentaje === 100
                ? "var(--ok)"
                : "var(--accent)",
          }}
        />
      </div>
    </div>
  );
}

export function Aviso({
  tono = "info",
  children,
}: {
  tono?: "info" | "alerta";
  children: ReactNode;
}) {
  return <div className={`aviso aviso-${tono}`}>{children}</div>;
}

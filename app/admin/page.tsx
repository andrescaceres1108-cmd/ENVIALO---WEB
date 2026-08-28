import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import AdminNav from "@/components/AdminNav";
import {
  cargarDashboard,
  periodoValido,
  PERIODOS,
  PRECIO_DESBLOQUEO_USD,
} from "@/lib/admin-dashboard";
import {
  Aviso,
  Dato,
  Embudo,
  formatearDinero,
  formatearFecha,
  formatearNumero,
  Kpi,
  Panel,
  Proporcion,
  Serie,
} from "@/components/admin/DashboardPiezas";

export const dynamic = "force-dynamic";

export default async function AdminPage({
  searchParams,
}: {
  searchParams: Promise<{ dias?: string }>;
}) {
  const { dias } = await searchParams;
  const periodo = periodoValido(dias);

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return (
      <div className="empty" style={{ marginTop: 40 }}>
        <div className="big">Necesitas iniciar sesión</div>
        <p>Esta página es solo para el administrador de SendGO.</p>
        <div className="cta-row" style={{ marginTop: 20 }}>
          <Link href="/cuenta" className="btn btn-primary btn-sm">
            Iniciar sesión
          </Link>
        </div>
      </div>
    );
  }

  const res = await cargarDashboard(periodo);

  if (!res.ok) {
    return (
      <div className="empty" style={{ marginTop: 40 }}>
        <div className="big">{res.noAutorizado ? "No autorizado" : "No se pudo cargar"}</div>
        <p>{res.noAutorizado ? "Tu cuenta no tiene permisos de administrador." : res.message}</p>
      </div>
    );
  }

  const d = res.data;
  const { kpis, liquidez, oferta, confianza, usuarios } = d;
  const sinVistas = (d.eventosPorTipo["anuncio_visto"] ?? 0) === 0;

  return (
    <>
      <div className="section-head">
        <h2>Tablero de SendGO</h2>
        <p>Cómo va el mercado entre viajeros y remitentes.</p>
      </div>

      <AdminNav activo="resumen" reportesPendientes={confianza.reportesAbiertos} />

      <div className="periodo-tabs" role="group" aria-label="Periodo">
        {PERIODOS.map((p) => (
          <Link key={p} href={`/admin?dias=${p}`} className={p === periodo ? "on" : ""}>
            {p} días
          </Link>
        ))}
      </div>

      <div className="kpi-grid">
        <Kpi
          destacado
          etiqueta="Contactos desbloqueados"
          valor={formatearNumero(kpis.contactos.valor)}
          comparado={kpis.contactos}
          pie="El momento en que SendGO entrega su valor."
        />
        <Kpi
          etiqueta="Ingreso potencial"
          valor={formatearDinero(kpis.ingresoPotencial)}
          pie={`${formatearNumero(kpis.contactos.valor)} × ${formatearDinero(PRECIO_DESBLOQUEO_USD)}. Hoy no se cobra.`}
        />
        <Kpi
          etiqueta="Anuncios publicados"
          valor={formatearNumero(kpis.anuncios.valor)}
          comparado={kpis.anuncios}
        />
        <Kpi
          etiqueta="Cuentas nuevas"
          valor={formatearNumero(kpis.registros.valor)}
          comparado={kpis.registros}
        />
        <Kpi
          etiqueta="Anuncios activos"
          valor={formatearNumero(kpis.anunciosActivos)}
          pie="Con fecha de viaje de hoy en adelante."
        />
      </div>

      {kpis.ingresoPotencial > 0 && (
        <Aviso tono="alerta">
          El botón muestra <strong>{formatearDinero(PRECIO_DESBLOQUEO_USD)}</strong> pero no hay
          pasarela de pago conectada: esos {formatearDinero(kpis.ingresoPotencial)} no se cobraron.
          Es dinero que la plataforma ya generó en valor y está dejando sobre la mesa.
        </Aviso>
      )}

      <div className="dash-2col">
        <Panel
          titulo="Embudo de la demanda"
          descripcion={`Del anuncio publicado al contacto desbloqueado, en ${periodo} días.`}
        >
          <Embudo pasos={d.embudo} />
          {sinVistas && (
            <Aviso tono="alerta">
              Nunca se ha registrado una <strong>vista de detalle</strong>. La gente desbloquea
              contactos directo desde el tablón sin abrir la página del anuncio, así que ese paso
              del embudo no se puede medir todavía.
            </Aviso>
          )}
        </Panel>

        <Panel
          titulo="Liquidez del mercado"
          descripcion="Un anuncio sin contactos es un viajero que se va con la maleta vacía."
        >
          <div className="dato-grid">
            <Dato
              etiqueta="Anuncios con al menos un contacto"
              valor={liquidez.pctConContacto === null ? "—" : `${liquidez.pctConContacto}%`}
              detalle={`${formatearNumero(liquidez.anunciosConContacto)} de ${formatearNumero(liquidez.anunciosTotales)} anuncios`}
            />
            <Dato
              etiqueta="Contactos por anuncio"
              valor={liquidez.contactosPorAnuncio ?? "—"}
              detalle="Promedio histórico."
            />
            <Dato
              etiqueta="Hasta el primer contacto"
              valor={
                liquidez.horasHastaPrimerContacto === null
                  ? "—"
                  : liquidez.horasHastaPrimerContacto < 48
                    ? `${liquidez.horasHastaPrimerContacto} h`
                    : `${Math.round(liquidez.horasHastaPrimerContacto / 24)} d`
              }
              detalle="Mediana desde que se publica."
            />
            <Dato
              etiqueta="Activos sin ningún contacto"
              valor={formatearNumero(liquidez.sinDemanda.length)}
              detalle="Oferta que nadie está viendo."
            />
          </div>
        </Panel>
      </div>

      <Panel
        titulo="Actividad"
        descripcion={`Registros, anuncios y contactos en los últimos ${periodo} días.`}
      >
        <Serie puntos={d.serie} porSemana={d.serieAgrupadaPorSemana} />
      </Panel>

      <div className="dash-2col">
        <Panel titulo="La oferta" descripcion="Qué está cargando el tablón ahora mismo.">
          <div className="dato-grid">
            <Dato
              etiqueta="Kilos disponibles"
              valor={`${formatearNumero(oferta.kilosActivos)} kg`}
              detalle="Suma de los anuncios activos."
            />
            <Dato
              etiqueta="Precio por kilo"
              valor={oferta.precioPromedio === null ? "—" : formatearDinero(oferta.precioPromedio)}
              detalle={
                oferta.precioMin === null
                  ? "Sin anuncios activos."
                  : `Entre ${formatearDinero(oferta.precioMin)} y ${formatearDinero(oferta.precioMax ?? 0)}.`
              }
            />
            <Dato
              etiqueta="Anticipación del viaje"
              valor={
                oferta.anticipacionMediaDias === null ? "—" : `${oferta.anticipacionMediaDias} días`
              }
              detalle="Mediana entre publicar y viajar."
            />
            <Dato
              etiqueta="Entrega a domicilio"
              valor={oferta.pctDomicilio === null ? "—" : `${oferta.pctDomicilio}%`}
              detalle="De todos los anuncios."
            />
          </div>
          <div className="direccion-split">
            <Proporcion
              etiqueta="USA → Colombia"
              parte={oferta.usaCo}
              total={oferta.usaCo + oferta.coUsa}
            />
            <Proporcion
              etiqueta="Colombia → USA"
              parte={oferta.coUsa}
              total={oferta.usaCo + oferta.coUsa}
            />
          </div>
        </Panel>

        <Panel
          titulo="Confianza"
          descripcion="Lo que hace que un desconocido se atreva a entregar un paquete."
        >
          <Proporcion etiqueta="Perfiles con foto" parte={confianza.conFoto} total={confianza.perfiles} />
          <Proporcion
            etiqueta="Perfiles con Facebook e Instagram"
            parte={confianza.conRedes}
            total={confianza.perfiles}
          />
          <Proporcion
            etiqueta="Correos sin confirmar"
            parte={confianza.sinConfirmar}
            total={confianza.perfiles}
            invertirColor
          />
          <Proporcion
            etiqueta="Anuncios reportados"
            parte={confianza.anunciosReportados}
            total={liquidez.anunciosTotales}
            invertirColor
          />
          {confianza.reportesAbiertos > 0 && (
            <Aviso tono="alerta">
              Hay {formatearNumero(confianza.reportesAbiertos)}{" "}
              {confianza.reportesAbiertos === 1 ? "reporte sin revisar" : "reportes sin revisar"}.{" "}
              <Link href="/admin/reportes">Revisarlos →</Link>
            </Aviso>
          )}
        </Panel>
      </div>

      <Panel
        titulo="Rutas"
        descripcion="Dónde hay oferta y dónde hay demanda de verdad."
      >
        {d.rutas.length === 0 ? (
          <p className="dash-vacio">Todavía no hay anuncios ni eventos por ruta.</p>
        ) : (
          <div className="metrics-wrap">
            <table className="dash-table">
              <thead>
                <tr>
                  <th>Ruta</th>
                  <th>Anuncios</th>
                  <th>Kilos</th>
                  <th>Vistas</th>
                  <th>Contactos</th>
                </tr>
              </thead>
              <tbody>
                {d.rutas.map((r) => (
                  <tr key={r.ruta}>
                    <td>{r.ruta}</td>
                    <td>{formatearNumero(r.anuncios)}</td>
                    <td>{formatearNumero(r.kilos)} kg</td>
                    <td>{formatearNumero(r.vistas)}</td>
                    <td>
                      <strong>{formatearNumero(r.contactos)}</strong>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>

      <div className="dash-2col">
        <Panel titulo="Usuarios" descripcion="Quién está en SendGO y quién la está usando.">
          <div className="dato-grid">
            <Dato etiqueta="Cuentas creadas" valor={formatearNumero(usuarios.total)} />
            <Dato
              etiqueta="Han publicado o contactado"
              valor={formatearNumero(usuarios.activos)}
              detalle={
                usuarios.total > 0
                  ? `${Math.round((usuarios.activos / usuarios.total) * 100)}% de las cuentas.`
                  : undefined
              }
            />
            <Dato etiqueta="Desde USA" valor={formatearNumero(usuarios.usa)} />
            <Dato etiqueta="Desde Colombia" valor={formatearNumero(usuarios.co)} />
          </div>
        </Panel>

        <Panel
          titulo="Anuncios activos sin un solo contacto"
          descripcion="Viajeros que publicaron y no han recibido nada."
        >
          {liquidez.sinDemanda.length === 0 ? (
            <p className="dash-vacio">
              Todos los anuncios activos han recibido al menos un contacto.
            </p>
          ) : (
            <ul className="sin-demanda">
              {liquidez.sinDemanda.slice(0, 8).map((a) => (
                <li key={a.id}>
                  <Link href={`/anuncios/${a.id}`}>{a.ruta}</Link>
                  <span>
                    viaja el {formatearFecha(a.fechaViaje)} · publicado hace {a.diasPublicado}{" "}
                    {a.diasPublicado === 1 ? "día" : "días"}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>

      <p className="dash-pie">
        Los anuncios y las cuentas se cuentan desde sus propias tablas; las vistas y los contactos,
        desde los eventos, que empezaron a registrarse el 27 de agosto de 2026.
      </p>
    </>
  );
}

import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { listMetricasAction } from "@/lib/admin-actions";

export const dynamic = "force-dynamic";

export default async function AdminMetricasPage() {
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

  const res = await listMetricasAction();

  if (!res.ok) {
    return res.noAutorizado ? (
      <div className="empty" style={{ marginTop: 40 }}>
        <div className="big">No autorizado</div>
        <p>Tu cuenta no tiene permisos de administrador.</p>
      </div>
    ) : (
      <div className="empty" style={{ marginTop: 40 }}>
        <div className="big">No se pudieron cargar las métricas</div>
        <p>{res.message}</p>
      </div>
    );
  }

  const semanas = res.semanas ?? [];

  return (
    <>
      <div className="section-head">
        <h2>Métricas del embudo</h2>
        <p>
          Últimas 12 semanas, por semana y ruta.{" "}
          <Link href="/admin">← Volver al panel</Link>
        </p>
      </div>

      {semanas.length === 0 ? (
        <div className="empty">
          <div className="big">Aún no hay eventos registrados</div>
          <p>
            Los eventos se registran al publicar anuncios, abrir su detalle y
            desbloquear contactos.
          </p>
        </div>
      ) : (
        <div className="metrics-wrap">
          <table className="metrics-table">
            <thead>
              <tr>
                <th>Semana</th>
                <th>Ruta</th>
                <th>Publicados</th>
                <th>Vistas</th>
                <th>Contactos</th>
                <th>Encuesta sí / no</th>
                <th>Contactos por anuncio</th>
                <th>% con contacto en 7 días</th>
              </tr>
            </thead>
            <tbody>
              {semanas.map((s) => (
                <tr key={`${s.semana}|${s.ruta}`}>
                  <td>{s.semana}</td>
                  <td>{s.ruta}</td>
                  <td>{s.publicados}</td>
                  <td>{s.vistas}</td>
                  <td>{s.contactos}</td>
                  <td>
                    {s.encuestasSi} / {s.encuestasNo}
                  </td>
                  <td>{s.promedioContactosPorAnuncio ?? "—"}</td>
                  <td>{s.pctConContacto7d !== null ? `${s.pctConContacto7d}%` : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="field-hint" style={{ marginTop: 12 }}>
            &quot;Contactos por anuncio&quot; y &quot;% con contacto en 7 días&quot; son de
            cohorte: miden los anuncios publicados esa semana, contando sus contactos
            aunque lleguen en semanas posteriores.
          </p>
        </div>
      )}
    </>
  );
}

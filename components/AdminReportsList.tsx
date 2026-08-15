"use client";

import { useState } from "react";
import {
  adminBorrarAnuncioAction,
  adminDescartarReporteAction,
  type AdminReporte,
} from "@/lib/admin-actions";

function formatFecha(iso: string | null) {
  if (!iso) return "";
  try {
    return new Date(iso).toLocaleDateString("es-CO", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  } catch {
    return iso;
  }
}

export default function AdminReportsList({
  reportesIniciales,
}: {
  reportesIniciales: AdminReporte[];
}) {
  const [reportes, setReportes] = useState(reportesIniciales);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [errorId, setErrorId] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  async function handleDescartar(reporteId: string) {
    setPendingId(reporteId);
    setErrorId(null);
    const res = await adminDescartarReporteAction(reporteId);
    setPendingId(null);
    if (!res.ok) {
      setErrorId(reporteId);
      setErrorMsg(res.message ?? "No se pudo descartar el reporte.");
      return;
    }
    setReportes((prev) => prev.filter((r) => r.id !== reporteId));
  }

  async function handleBorrarAnuncio(reporte: AdminReporte) {
    if (!reporte.anuncioId) return;
    setPendingId(reporte.id);
    setErrorId(null);
    const res = await adminBorrarAnuncioAction(reporte.anuncioId);
    setPendingId(null);
    if (!res.ok) {
      setErrorId(reporte.id);
      setErrorMsg(res.message ?? "No se pudo borrar el anuncio.");
      return;
    }
    setReportes((prev) => prev.filter((r) => r.id !== reporte.id));
  }

  if (reportes.length === 0) {
    return (
      <div className="empty" style={{ marginTop: 20 }}>
        <div className="big">No hay reportes pendientes</div>
        <p>Cuando alguien reporte un anuncio, va a aparecer aquí.</p>
      </div>
    );
  }

  return (
    <div className="admin-list">
      {reportes.map((r) => (
        <div key={r.id} className="admin-report">
          <div className="admin-report-head">
            <span className="admin-report-route">{r.anuncioRuta}</span>
            <span className="admin-report-meta">
              {formatFecha(r.creadoEn)} · reportado por {r.reporterNombre ?? "usuario"}
              {r.duenoNombre ? ` · publicado por ${r.duenoNombre}` : ""}
            </span>
          </div>
          <p className="admin-report-motivo">{r.motivo}</p>
          <div className="admin-report-actions">
            <button
              type="button"
              className="btn btn-outline btn-sm"
              onClick={() => handleDescartar(r.id)}
              disabled={pendingId === r.id}
            >
              {pendingId === r.id ? "Procesando…" : "Descartar reporte"}
            </button>
            {r.anuncioId && (
              <button
                type="button"
                className="btn btn-primary btn-sm"
                onClick={() => handleBorrarAnuncio(r)}
                disabled={pendingId === r.id}
              >
                {pendingId === r.id ? "Procesando…" : "Borrar anuncio"}
              </button>
            )}
            {errorId === r.id && <span className="field-error">{errorMsg}</span>}
          </div>
        </div>
      ))}
    </div>
  );
}

import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { listReportesAction } from "@/lib/admin-actions";
import AdminNav from "@/components/AdminNav";
import AdminReportsList from "@/components/AdminReportsList";

export const dynamic = "force-dynamic";

export default async function AdminReportesPage() {
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

  const res = await listReportesAction();

  if (!res.ok) {
    return (
      <div className="empty" style={{ marginTop: 40 }}>
        <div className="big">No autorizado</div>
        <p>Tu cuenta no tiene permisos de administrador.</p>
      </div>
    );
  }

  const reportes = res.reportes ?? [];

  return (
    <>
      <div className="section-head">
        <h2>Reportes</h2>
        <p>Anuncios que los usuarios marcaron como sospechosos.</p>
      </div>

      <AdminNav activo="reportes" reportesPendientes={reportes.length} />

      <AdminReportsList reportesIniciales={reportes} />
    </>
  );
}

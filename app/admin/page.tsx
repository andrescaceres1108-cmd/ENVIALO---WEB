import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { listReportesAction } from "@/lib/admin-actions";
import AdminReportsList from "@/components/AdminReportsList";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
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

  return (
    <>
      <div className="section-head">
        <h2>Panel de administración</h2>
        <p>Reportes de anuncios enviados por usuarios.</p>
      </div>
      <AdminReportsList reportesIniciales={res.reportes ?? []} />
    </>
  );
}

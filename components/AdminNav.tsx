import Link from "next/link";

const SECCIONES = [
  { clave: "resumen", href: "/admin", texto: "Resumen" },
  { clave: "rutas", href: "/admin/metricas", texto: "Embudo semanal" },
  { clave: "reportes", href: "/admin/reportes", texto: "Reportes" },
] as const;

export default function AdminNav({
  activo,
  reportesPendientes = 0,
}: {
  activo: (typeof SECCIONES)[number]["clave"];
  reportesPendientes?: number;
}) {
  return (
    <div className="admin-nav">
      {SECCIONES.map((s) => (
        <Link
          key={s.clave}
          href={s.href}
          className={s.clave === activo ? "on" : ""}
          aria-current={s.clave === activo ? "page" : undefined}
        >
          {s.texto}
          {s.clave === "reportes" && reportesPendientes > 0 && (
            <span className="admin-nav-badge">{reportesPendientes}</span>
          )}
        </Link>
      ))}
    </div>
  );
}

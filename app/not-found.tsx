import Link from "next/link";

export default function NotFound() {
  return (
    <div className="empty" style={{ marginTop: 40 }}>
      <div className="big">Página no encontrada</div>
      <p>El enlace que seguiste no existe o ya no está disponible.</p>
      <div className="cta-row" style={{ marginTop: 20 }}>
        <Link href="/" className="btn btn-primary btn-sm">
          Ir al inicio
        </Link>
        <Link href="/anuncios" className="btn btn-outline btn-sm">
          Ver anuncios
        </Link>
      </div>
    </div>
  );
}

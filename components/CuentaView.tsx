"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { logOutAction, borrarCuentaAction } from "@/lib/actions";

export default function CuentaView({
  nombre,
  email,
}: {
  nombre: string;
  email: string;
}) {
  const router = useRouter();
  const [borrando, setBorrando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleBorrar() {
    setError(null);
    const ok1 = window.confirm(
      "¿Seguro que quieres borrar tu cuenta? Se eliminarán tu perfil y todos tus anuncios publicados."
    );
    if (!ok1) return;
    const ok2 = window.confirm(
      "Esta acción no se puede deshacer. ¿Borrar la cuenta definitivamente?"
    );
    if (!ok2) return;

    setBorrando(true);
    const res = await borrarCuentaAction();
    setBorrando(false);

    if (!res.ok) {
      setError(res.message ?? "No se pudo borrar la cuenta.");
      return;
    }
    router.push("/");
    router.refresh();
  }

  return (
    <>
      <div className="section-head">
        <h2>Tu cuenta</h2>
        <p>Administra tu sesión y tu cuenta en SendGO.</p>
      </div>
      <div className="card-form">
        <div className="field">
          <label>Nombre</label>
          <p className="kv-value">{nombre}</p>
        </div>
        <div className="field">
          <label>Correo</label>
          <p className="kv-value">{email}</p>
        </div>
        <form action={logOutAction}>
          <button type="submit" className="btn btn-outline">
            Cerrar sesión
          </button>
        </form>

        <div className="danger-zone">
          <label>Zona de peligro</label>
          <p className="field-hint">
            Borrar tu cuenta elimina tu perfil y todos tus anuncios
            publicados. Esta acción no se puede deshacer.
          </p>
          <button
            type="button"
            className="btn-danger"
            onClick={handleBorrar}
            disabled={borrando}
          >
            {borrando ? "Borrando…" : "Borrar cuenta"}
          </button>
        </div>
        {error && <p className="field-error">{error}</p>}
      </div>
    </>
  );
}

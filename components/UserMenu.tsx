"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { logOutAction, borrarCuentaAction } from "@/lib/actions";

export default function UserMenu({
  nombre,
  email,
}: {
  nombre: string;
  email: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [borrando, setBorrando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    function onDocClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [open]);

  const inicial = (nombre || email || "?").trim().charAt(0).toUpperCase();

  async function handleBorrarCuenta() {
    setError(null);
    setOpen(false);
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
    <div className="user-menu" ref={ref}>
      <button
        type="button"
        className="avatar-badge"
        aria-label="Menú de cuenta"
        aria-haspopup="true"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        <span>{inicial}</span>
        <i className="avatar-dot"></i>
      </button>
      {open && (
        <div className="user-menu-dropdown">
          <Link href="/perfil" onClick={() => setOpen(false)}>
            Perfil
          </Link>
          <Link href="/cuenta" onClick={() => setOpen(false)}>
            Cuenta
          </Link>
          <button
            type="button"
            className="danger"
            onClick={handleBorrarCuenta}
            disabled={borrando}
          >
            {borrando ? "Borrando…" : "Borrar cuenta"}
          </button>
          <div className="user-menu-sep"></div>
          <form action={logOutAction}>
            <button type="submit">Cerrar sesión</button>
          </form>
        </div>
      )}
      {error && <p className="user-menu-error">{error}</p>}
    </div>
  );
}

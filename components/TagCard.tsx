"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { obtenerContactoAction, borrarAnuncioAction } from "@/lib/actions";
import EditAnuncioModal from "@/components/EditAnuncioModal";

export type AnuncioPublico = {
  id: string;
  user_id: string;
  direccion: "usa-co" | "co-usa";
  ciudad_origen: string;
  ciudad_destino: string;
  entrega_domicilio: boolean;
  fecha_viaje: string;
  kilos_disponibles: number;
  precio_kilo_usd: number;
  nombre_contacto: string;
  notas: string | null;
};

function fmtFecha(f: string) {
  const d = new Date(f + "T12:00:00");
  return d.toLocaleDateString("es-CO", { day: "numeric", month: "short", year: "numeric" });
}

function code(city: string) {
  return city.replace(/[^A-Za-zÁÉÍÓÚÑáéíóúñ]/g, "").substring(0, 3).toUpperCase();
}

export default function TagCard({
  anuncio,
  isAuthenticated,
  isOwner = false,
  onRequireAuth,
}: {
  anuncio: AnuncioPublico;
  isAuthenticated: boolean;
  isOwner?: boolean;
  onRequireAuth: () => void;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [wa, setWa] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [menuOpen, setMenuOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [loadingEdit, setLoadingEdit] = useState(false);
  const [whatsappEdit, setWhatsappEdit] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleted, setDeleted] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!menuOpen) return;
    function onDocClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [menuOpen]);

  async function handleEditar() {
    setMenuOpen(false);
    setLoadingEdit(true);
    const res = await obtenerContactoAction(anuncio.id);
    setLoadingEdit(false);
    if (res.error || !res.whatsapp) {
      setError(res.error ?? "No se pudo cargar el anuncio para editar.");
      return;
    }
    setWhatsappEdit(res.whatsapp);
    setEditing(true);
  }

  async function handleBorrar() {
    setMenuOpen(false);
    const confirmado = window.confirm("¿Seguro que quieres borrar este anuncio?");
    if (!confirmado) return;
    setDeleting(true);
    const res = await borrarAnuncioAction(anuncio.id);
    setDeleting(false);
    if (!res.ok) {
      setError(res.message ?? "No se pudo borrar el anuncio.");
      return;
    }
    setDeleted(true);
    router.refresh();
  }

  async function handleContacto() {
    if (!isAuthenticated) {
      onRequireAuth();
      return;
    }
    // Abrimos la pestaña ya (dentro del gesto de clic del usuario) para que
    // el navegador no la bloquee como popup; la redirigimos cuando tengamos
    // el número.
    const newTab = window.open("", "_blank");
    setLoading(true);
    setError(null);
    const res = await obtenerContactoAction(anuncio.id);
    setLoading(false);
    if (res.error || !res.whatsapp) {
      setError(res.error ?? "No se pudo obtener el contacto.");
      newTab?.close();
      return;
    }
    setWa(res.whatsapp);
    const url = `https://wa.me/${res.whatsapp.replace(/[^0-9]/g, "")}`;
    if (newTab) {
      newTab.location.href = url;
    } else {
      // El navegador bloqueó la apertura anticipada; probamos igual con un
      // clic directo del usuario (el enlace "Abrir WhatsApp" de abajo queda
      // como respaldo).
      window.open(url, "_blank", "noopener");
    }
  }

  if (deleted) return null;

  return (
    <>
    <article className="tag-card">
      {isOwner && (
        <div className="tag-menu" ref={menuRef}>
          <button
            type="button"
            className="tag-menu-btn"
            aria-label="Opciones del anuncio"
            aria-haspopup="true"
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((v) => !v)}
          >
            ⋮
          </button>
          {menuOpen && (
            <div className="tag-menu-dropdown">
              <button type="button" onClick={handleEditar} disabled={loadingEdit}>
                {loadingEdit ? "Cargando…" : "Editar"}
              </button>
              <button
                type="button"
                className="danger"
                onClick={handleBorrar}
                disabled={deleting}
              >
                {deleting ? "Borrando…" : "Borrar"}
              </button>
            </div>
          )}
        </div>
      )}
      <div className="tag-spine">
        <i></i>
        <i></i>
        <i></i>
      </div>
      <div className="tag-body">
        <div className="tag-top">
          <div className="route">
            {code(anuncio.ciudad_origen)} <span className="arrow">→</span>{" "}
            {code(anuncio.ciudad_destino)}
          </div>
          <div className="hole"></div>
        </div>
        <div className="cities">
          {anuncio.ciudad_origen} → {anuncio.ciudad_destino}
        </div>
        <div className="tag-data">
          <div className="datum">
            <div className="lbl">Fecha</div>
            <div className="val">{fmtFecha(anuncio.fecha_viaje)}</div>
          </div>
          <div className="datum">
            <div className="lbl">Disponible</div>
            <div className="val">
              {anuncio.kilos_disponibles} <small>kg</small>
            </div>
          </div>
          <div className="datum">
            <div className="lbl">Precio</div>
            <div className="val">
              ${anuncio.precio_kilo_usd} <small>USD/kg</small>
            </div>
          </div>
        </div>
        {anuncio.direccion === "co-usa" && anuncio.entrega_domicilio && (
          <div className="tag-badge">Entrega a domicilio en cualquier ciudad del DMV</div>
        )}
        {anuncio.notas && <div className="tag-notes">&quot;{anuncio.notas}&quot;</div>}
        <div className="tag-actions">
          {wa ? (
            <a
              className="btn-wa"
              href={`https://wa.me/${wa.replace(/[^0-9]/g, "")}`}
              target="_blank"
              rel="noopener"
            >
              Abrir WhatsApp
            </a>
          ) : (
            <button type="button" className="btn-wa" onClick={handleContacto} disabled={loading}>
              {loading ? "Cargando…" : "Contactar por WhatsApp"}
            </button>
          )}
          <span className="pill-name">{anuncio.nombre_contacto}</span>
        </div>
        {error && <p className="field-error">{error}</p>}
      </div>
    </article>
    {editing && whatsappEdit && (
      <EditAnuncioModal
        anuncio={anuncio}
        whatsappInicial={whatsappEdit}
        onClose={() => setEditing(false)}
        onSaved={() => {
          setEditing(false);
          router.refresh();
        }}
      />
    )}
    </>
  );
}

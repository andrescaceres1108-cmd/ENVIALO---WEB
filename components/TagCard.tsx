"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  obtenerContactoAction,
  borrarAnuncioAction,
  reportarAnuncioAction,
} from "@/lib/actions";
import EditAnuncioModal from "@/components/EditAnuncioModal";
import ContactoModal from "@/components/ContactoModal";

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
  avatar_url: string | null;
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
  enlazarDetalle = true,
}: {
  anuncio: AnuncioPublico;
  isAuthenticated: boolean;
  isOwner?: boolean;
  onRequireAuth: () => void;
  // false en la página de detalle, donde enlazar a sí misma no aporta
  enlazarDetalle?: boolean;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [contacto, setContacto] = useState<{
    whatsapp: string;
    instagram: string | null;
    facebook: string | null;
  } | null>(null);
  const [contactoOpen, setContactoOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [menuOpen, setMenuOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [loadingEdit, setLoadingEdit] = useState(false);
  const [whatsappEdit, setWhatsappEdit] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleted, setDeleted] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);

  const [reportOpen, setReportOpen] = useState(false);
  const [reportMotivo, setReportMotivo] = useState("");
  const [reportSubmitting, setReportSubmitting] = useState(false);
  const [reportDone, setReportDone] = useState(false);
  const [reportMsg, setReportMsg] = useState<string | null>(null);

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
    // Ya desbloqueado en esta sesión: solo reabrimos la tarjeta (sin
    // volver a llamar la acción, para no duplicar el evento de métricas).
    if (contacto) {
      setContactoOpen(true);
      return;
    }
    setLoading(true);
    setError(null);
    const res = await obtenerContactoAction(anuncio.id);
    setLoading(false);
    if (res.error || !res.whatsapp) {
      setError(res.error ?? "No se pudo obtener el contacto.");
      return;
    }
    setContacto({
      whatsapp: res.whatsapp,
      instagram: res.instagram ?? null,
      facebook: res.facebook ?? null,
    });
    setContactoOpen(true);
  }

  function handleReportToggle() {
    if (!isAuthenticated) {
      onRequireAuth();
      return;
    }
    setReportMsg(null);
    setReportOpen((v) => !v);
  }

  async function handleReportSubmit(e: FormEvent) {
    e.preventDefault();
    setReportSubmitting(true);
    setReportMsg(null);
    const res = await reportarAnuncioAction(anuncio.id, reportMotivo);
    setReportSubmitting(false);
    if (!res.ok) {
      setReportMsg(res.message ?? "No se pudo enviar el reporte.");
      return;
    }
    setReportOpen(false);
    setReportDone(true);
    setReportMsg(res.message ?? "Reporte enviado.");
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
        {enlazarDetalle ? (
          <Link href={`/anuncios/${anuncio.id}`} className="cities cities-link">
            {anuncio.ciudad_origen} → {anuncio.ciudad_destino}
          </Link>
        ) : (
          <div className="cities">
            {anuncio.ciudad_origen} → {anuncio.ciudad_destino}
          </div>
        )}
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
        <div className="unlock-block">
          <button type="button" className="btn-wa" onClick={handleContacto} disabled={loading}>
            {loading
              ? "Cargando…"
              : contacto
                ? "Ver contacto del viajero"
                : "🔒 Desbloquear contacto gratis"}
          </button>
          {!contacto && (
            <p className="unlock-desc">
              WhatsApp, Instagram y datos de contacto del viajero.
              {!isAuthenticated && " Solo necesitas crear una cuenta."}
            </p>
          )}
        </div>
        <div className="tag-actions">
          <span className="pill-name">
            {anuncio.avatar_url && (
              <img src={anuncio.avatar_url} alt="" className="tag-avatar" />
            )}
            {anuncio.nombre_contacto}
          </span>
        </div>
        {error && <p className="field-error">{error}</p>}

        {!isOwner && (
          <div className="report-block">
            {reportDone ? (
              <p className="field-hint">{reportMsg}</p>
            ) : reportOpen ? (
              <form onSubmit={handleReportSubmit} className="report-form">
                <textarea
                  placeholder="¿Por qué quieres reportar este anuncio?"
                  value={reportMotivo}
                  onChange={(e) => setReportMotivo(e.target.value)}
                  maxLength={500}
                  required
                />
                <div className="report-form-actions">
                  <button
                    type="submit"
                    className="btn btn-outline btn-sm"
                    disabled={reportSubmitting}
                  >
                    {reportSubmitting ? "Enviando…" : "Enviar reporte"}
                  </button>
                  <button
                    type="button"
                    className="link-btn"
                    onClick={() => setReportOpen(false)}
                  >
                    Cancelar
                  </button>
                </div>
                {reportMsg && <p className="field-error">{reportMsg}</p>}
              </form>
            ) : (
              <button type="button" className="link-btn report-toggle" onClick={handleReportToggle}>
                Reportar anuncio
              </button>
            )}
          </div>
        )}
      </div>
    </article>
    {contactoOpen && contacto && (
      <ContactoModal
        anuncio={anuncio}
        whatsapp={contacto.whatsapp}
        instagram={contacto.instagram}
        facebook={contacto.facebook}
        onClose={() => setContactoOpen(false)}
      />
    )}
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

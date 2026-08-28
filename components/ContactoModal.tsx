"use client";

import type { AnuncioPublico } from "@/components/TagCard";

// Enlace de Instagram solo si parece un usuario (sin espacios); si la
// persona escribió otra cosa, se muestra como texto plano.
function instagramHref(valor: string): string | null {
  const limpio = valor.trim().replace(/^@/, "");
  if (!limpio || /\s/.test(limpio)) return null;
  return `https://instagram.com/${limpio}`;
}

function facebookHref(valor: string): string | null {
  const limpio = valor.trim();
  if (/^https?:\/\//i.test(limpio)) return limpio;
  return null;
}

export default function ContactoModal({
  anuncio,
  whatsapp,
  instagram,
  facebook,
  onClose,
}: {
  anuncio: AnuncioPublico;
  whatsapp: string;
  instagram: string | null;
  facebook: string | null;
  onClose: () => void;
}) {
  const waUrl = `https://wa.me/${whatsapp.replace(/[^0-9]/g, "")}`;
  const igHref = instagram ? instagramHref(instagram) : null;
  const fbHref = facebook ? facebookHref(facebook) : null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box contact-modal" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose} aria-label="Cerrar">
          ×
        </button>

        {anuncio.avatar_url ? (
          <img src={anuncio.avatar_url} alt="" className="contact-avatar" />
        ) : (
          <div className="contact-avatar contact-avatar-empty">
            {anuncio.nombre_contacto.charAt(0).toUpperCase()}
          </div>
        )}
        <div className="contact-name">{anuncio.nombre_contacto}</div>
        <div className="contact-ruta">
          {anuncio.ciudad_origen} → {anuncio.ciudad_destino}
        </div>

        <div className="contact-rows">
          <div className="contact-row">
            <span className="contact-label">WhatsApp</span>
            <span className="contact-value">{whatsapp}</span>
          </div>
          <div className="contact-row">
            <span className="contact-label">Instagram</span>
            {instagram ? (
              igHref ? (
                <a
                  className="contact-value"
                  href={igHref}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {instagram}
                </a>
              ) : (
                <span className="contact-value">{instagram}</span>
              )
            ) : (
              <span className="contact-value contact-missing">No registrado</span>
            )}
          </div>
          <div className="contact-row">
            <span className="contact-label">Facebook</span>
            {facebook ? (
              fbHref ? (
                <a
                  className="contact-value"
                  href={fbHref}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {facebook}
                </a>
              ) : (
                <span className="contact-value">{facebook}</span>
              )
            ) : (
              <span className="contact-value contact-missing">No registrado</span>
            )}
          </div>
        </div>

        <a
          className="btn-wa contact-wa-btn"
          href={waUrl}
          target="_blank"
          rel="noopener noreferrer"
        >
          Contactar por WhatsApp
        </a>
      </div>
    </div>
  );
}

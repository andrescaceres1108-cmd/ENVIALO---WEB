"use client";

import AuthForm from "@/components/AuthForm";

export default function AuthModal({
  onClose,
  onSuccess,
}: {
  onClose: () => void;
  onSuccess: () => void;
}) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose} aria-label="Cerrar">
          ×
        </button>
        <div className="section-head" style={{ padding: "0 0 8px" }}>
          <h2 style={{ fontSize: "1.3rem" }}>Crea tu cuenta para contactar</h2>
          <p>Necesitas una cuenta en SendGO para ver el WhatsApp del viajero.</p>
        </div>
        <AuthForm onSuccess={onSuccess} />
      </div>
    </div>
  );
}

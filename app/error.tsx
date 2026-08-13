"use client";

import { useEffect } from "react";

export default function ErrorPage({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="empty" style={{ marginTop: 40 }}>
      <div className="big">Algo salió mal</div>
      <p>Tuvimos un problema al cargar esto. Intenta de nuevo en unos segundos.</p>
      <div className="cta-row" style={{ marginTop: 20 }}>
        <button type="button" className="btn btn-primary btn-sm" onClick={() => retry()}>
          Reintentar
        </button>
      </div>
    </div>
  );
}

"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import TagCard, { type AnuncioPublico } from "@/components/TagCard";
import SegmentedControl from "@/components/SegmentedControl";
import AuthModal from "@/components/AuthModal";

export default function AnunciosList({
  anuncios,
  isAuthenticated,
}: {
  anuncios: AnuncioPublico[];
  isAuthenticated: boolean;
}) {
  const router = useRouter();
  const [filtro, setFiltro] = useState<"todos" | "usa-co" | "co-usa">("todos");
  const [query, setQuery] = useState("");
  const [showAuthModal, setShowAuthModal] = useState(false);

  const list = useMemo(() => {
    const q = query.trim().toLowerCase();
    return anuncios.filter((a) => {
      const okDir = filtro === "todos" || a.direccion === filtro;
      const okCity =
        !q ||
        a.ciudad_origen.toLowerCase().includes(q) ||
        a.ciudad_destino.toLowerCase().includes(q);
      return okDir && okCity;
    });
  }, [anuncios, filtro, query]);

  return (
    <>
      <div className="section-head">
        <h2>Anuncios de viajeros</h2>
        <p>Crea una cuenta para contactar directo al viajero por WhatsApp y acuerden entre ustedes.</p>
      </div>

      <div className="filters">
        <SegmentedControl
          value={filtro}
          onChange={setFiltro}
          options={[
            { value: "todos", label: "TODOS" },
            { value: "usa-co", label: "DMV → CO" },
            { value: "co-usa", label: "CO → DMV" },
          ]}
        />
        <input
          placeholder="Buscar ciudad…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <span className="count">
          {list.length} anuncio{list.length === 1 ? "" : "s"}
        </span>
      </div>

      {list.length === 0 ? (
        <div className="empty">
          <div className="big">No hay anuncios con ese filtro</div>
          <p>Prueba otra ciudad o publica el primero de la ruta.</p>
        </div>
      ) : (
        <div className="tags-grid">
          {list.map((a) => (
            <TagCard
              key={a.id}
              anuncio={a}
              isAuthenticated={isAuthenticated}
              onRequireAuth={() => setShowAuthModal(true)}
            />
          ))}
        </div>
      )}

      {showAuthModal && (
        <AuthModal
          onClose={() => setShowAuthModal(false)}
          onSuccess={() => {
            setShowAuthModal(false);
            router.refresh();
          }}
        />
      )}
    </>
  );
}

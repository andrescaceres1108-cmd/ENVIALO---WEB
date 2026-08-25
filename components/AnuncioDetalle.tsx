"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import TagCard, { type AnuncioPublico } from "@/components/TagCard";
import AuthModal from "@/components/AuthModal";

export default function AnuncioDetalle({
  anuncio,
  isAuthenticated,
  currentUserId,
}: {
  anuncio: AnuncioPublico;
  isAuthenticated: boolean;
  currentUserId: string | null;
}) {
  const router = useRouter();
  const [showAuthModal, setShowAuthModal] = useState(false);

  return (
    <>
      <div className="section-head">
        <h2>
          {anuncio.ciudad_origen} → {anuncio.ciudad_destino}
        </h2>
        <p>
          <Link href="/anuncios">← Volver a todos los anuncios</Link>
        </p>
      </div>

      <div className="tags-grid">
        <TagCard
          anuncio={anuncio}
          isAuthenticated={isAuthenticated}
          isOwner={currentUserId !== null && currentUserId === anuncio.user_id}
          onRequireAuth={() => setShowAuthModal(true)}
          enlazarDetalle={false}
        />
      </div>

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

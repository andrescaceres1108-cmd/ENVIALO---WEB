"use client";

import { useRouter } from "next/navigation";
import AuthForm from "@/components/AuthForm";

export default function AccountView({ next }: { next?: string }) {
  const router = useRouter();

  return (
    <>
      <div className="section-head">
        <h2>Crear cuenta / Iniciar sesión</h2>
        <p>
          Necesitas una cuenta para publicar un anuncio y para ver el
          contacto de WhatsApp de los viajeros.
        </p>
      </div>
      <div className="card-form">
        <AuthForm onSuccess={() => router.push(next || "/anuncios")} />
      </div>
    </>
  );
}

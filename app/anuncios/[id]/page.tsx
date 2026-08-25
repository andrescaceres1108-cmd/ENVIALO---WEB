import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { registrarEvento } from "@/lib/events";
import AnuncioDetalle from "@/components/AnuncioDetalle";
import type { AnuncioPublico } from "@/components/TagCard";

export const dynamic = "force-dynamic";

const ANUNCIO_FIELDS =
  "id, user_id, direccion, ciudad_origen, ciudad_destino, entrega_domicilio, fecha_viaje, kilos_disponibles, precio_kilo_usd, nombre_contacto, notas, avatar_url";

async function getAnuncio(id: string) {
  const supabase = await createClient();
  const [{ data: anuncio }, { data: userData }] = await Promise.all([
    supabase.from("anuncios").select(ANUNCIO_FIELDS).eq("id", id).single(),
    supabase.auth.getUser(),
  ]);
  return { anuncio: anuncio as AnuncioPublico | null, user: userData.user };
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { anuncio } = await getAnuncio(id);
  if (!anuncio) return { title: "Anuncio no encontrado" };
  return {
    title: `${anuncio.ciudad_origen} → ${anuncio.ciudad_destino}`,
    description: `Viajero con ${anuncio.kilos_disponibles} kg disponibles a $${anuncio.precio_kilo_usd} USD/kg. Contáctalo por WhatsApp en SendGO.`,
  };
}

export default async function AnuncioDetallePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { anuncio, user } = await getAnuncio(id);

  if (!anuncio) notFound();

  // Evento del embudo: vista de detalle (la lista no cuenta). Las visitas
  // del dueño a su propio anuncio no cuentan como vista.
  if (user?.id !== anuncio.user_id) {
    await registrarEvento({
      tipo: "anuncio_visto",
      anuncioId: anuncio.id,
      ciudadOrigen: anuncio.ciudad_origen,
      ciudadDestino: anuncio.ciudad_destino,
      userId: user?.id ?? null,
    });
  }

  return (
    <AnuncioDetalle
      anuncio={anuncio}
      isAuthenticated={Boolean(user)}
      currentUserId={user?.id ?? null}
    />
  );
}

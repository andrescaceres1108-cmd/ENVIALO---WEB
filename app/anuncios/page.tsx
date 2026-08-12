import { createClient } from "@/lib/supabase/server";
import AnunciosList from "@/components/AnunciosList";

export const dynamic = "force-dynamic";

export default async function AnunciosPage() {
  const supabase = await createClient();

  const [{ data: anuncios, error: anunciosError }, { data: userData }] =
    await Promise.all([
      supabase
        .from("anuncios")
        .select(
          "id, direccion, ciudad_origen, ciudad_destino, entrega_domicilio, fecha_viaje, kilos_disponibles, precio_kilo_usd, nombre_contacto, notas"
        )
        .gte("fecha_viaje", new Date().toISOString().slice(0, 10))
        .order("fecha_viaje", { ascending: true }),
      supabase.auth.getUser(),
    ]);

  if (anunciosError) {
    console.error("[anuncios] query error:", anunciosError.message);
  }

  return (
    <AnunciosList
      anuncios={anuncios ?? []}
      isAuthenticated={Boolean(userData.user)}
    />
  );
}

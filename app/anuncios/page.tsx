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
    // DEBUG temporal: diagnosticar por qué prod no muestra anuncios.
    // TODO: quitar este log una vez resuelto.
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";
    const findNonAscii = (s: string) =>
      Array.from(s)
        .map((ch, i) => ({ i, code: ch.charCodeAt(0) }))
        .filter((c) => c.code > 127);
    console.error("[anuncios] query error:", anunciosError.message, {
      urlLen: url.length,
      keyLen: key.length,
      urlNonAscii: findNonAscii(url),
      keyNonAscii: findNonAscii(key),
      urlHead: JSON.stringify(url.slice(0, 12)),
      keyHead: JSON.stringify(key.slice(0, 12)),
      keyTail: JSON.stringify(key.slice(-12)),
    });
  }

  return (
    <AnunciosList
      anuncios={anuncios ?? []}
      isAuthenticated={Boolean(userData.user)}
    />
  );
}

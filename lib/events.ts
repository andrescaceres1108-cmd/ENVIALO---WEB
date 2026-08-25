import { createAdminClient } from "@/lib/supabase/admin";

export type EventoTipo =
  | "anuncio_publicado"
  | "anuncio_visto"
  | "contacto_desbloqueado"
  | "respuesta_encuesta";

// Registra un evento de métricas en la tabla `events` con el cliente
// admin (la tabla no tiene policies de RLS: solo el service role escribe
// y lee). NUNCA lanza: si falla el registro, la acción principal del
// usuario (publicar, ver, contactar) debe completarse igual.
export async function registrarEvento(evento: {
  tipo: EventoTipo;
  anuncioId: string;
  ciudadOrigen: string;
  ciudadDestino: string;
  valor?: "si" | "no";
  userId?: string | null;
}): Promise<void> {
  try {
    const admin = createAdminClient();
    const { error } = await admin.from("events").insert({
      tipo: evento.tipo,
      anuncio_id: evento.anuncioId,
      ciudad_origen: evento.ciudadOrigen,
      ciudad_destino: evento.ciudadDestino,
      valor: evento.valor ?? null,
      user_id: evento.userId ?? null,
    });
    if (error) {
      console.error(`[registrarEvento] no se pudo registrar ${evento.tipo}:`, error.message);
    }
  } catch (e) {
    console.error(`[registrarEvento] no se pudo registrar ${evento.tipo}:`, e);
  }
}

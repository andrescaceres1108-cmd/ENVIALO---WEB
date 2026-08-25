"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

async function requireAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { supabase, isAdmin: false as const };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("id", user.id)
    .single();

  return { supabase, isAdmin: profile?.is_admin === true };
}

export type AdminReporte = {
  id: string;
  motivo: string;
  creadoEn: string;
  reporterNombre: string | null;
  anuncioId: string | null;
  anuncioRuta: string;
  anuncioFecha: string | null;
  duenoNombre: string | null;
};

type ReporteRow = {
  id: string;
  motivo: string;
  created_at: string;
  anuncio_id: string;
  reporter: { nombre: string | null } | { nombre: string | null }[] | null;
  anuncio:
    | {
        ciudad_origen: string;
        ciudad_destino: string;
        fecha_viaje: string;
        dueno: { nombre: string | null } | { nombre: string | null }[] | null;
      }
    | {
        ciudad_origen: string;
        ciudad_destino: string;
        fecha_viaje: string;
        dueno: { nombre: string | null } | { nombre: string | null }[] | null;
      }[]
    | null;
};

function primero<T>(v: T | T[] | null): T | null {
  if (Array.isArray(v)) return v[0] ?? null;
  return v;
}

export async function listReportesAction(): Promise<{
  ok: boolean;
  message?: string;
  reportes?: AdminReporte[];
}> {
  const { supabase, isAdmin } = await requireAdmin();
  if (!isAdmin) {
    return { ok: false, message: "No autorizado." };
  }

  const { data, error } = await supabase
    .from("reportes")
    .select(
      "id, motivo, created_at, anuncio_id, reporter:profiles!reportes_reporter_id_fkey(nombre), anuncio:anuncios(ciudad_origen, ciudad_destino, fecha_viaje, dueno:profiles!anuncios_user_id_fkey(nombre))"
    )
    .order("created_at", { ascending: false })
    .returns<ReporteRow[]>();

  if (error || !data) {
    return { ok: false, message: "No se pudieron cargar los reportes." };
  }

  const reportes: AdminReporte[] = data.map((r) => {
    const anuncio = primero(r.anuncio);
    const dueno = anuncio ? primero(anuncio.dueno) : null;
    const reporter = primero(r.reporter);
    return {
      id: r.id,
      motivo: r.motivo,
      creadoEn: r.created_at,
      reporterNombre: reporter?.nombre ?? null,
      anuncioId: anuncio ? r.anuncio_id : null,
      anuncioRuta: anuncio
        ? `${anuncio.ciudad_origen} → ${anuncio.ciudad_destino}`
        : "Anuncio ya borrado",
      anuncioFecha: anuncio?.fecha_viaje ?? null,
      duenoNombre: dueno?.nombre ?? null,
    };
  });

  return { ok: true, reportes };
}

export async function adminBorrarAnuncioAction(
  anuncioId: string
): Promise<{ ok: boolean; message?: string }> {
  const { supabase, isAdmin } = await requireAdmin();
  if (!isAdmin) {
    return { ok: false, message: "No autorizado." };
  }

  const { error } = await supabase.from("anuncios").delete().eq("id", anuncioId);

  if (error) {
    return { ok: false, message: "No se pudo borrar el anuncio." };
  }

  revalidatePath("/anuncios");
  revalidatePath("/admin");
  return { ok: true };
}

export type MetricaSemana = {
  // lunes de la semana, en formato YYYY-MM-DD
  semana: string;
  ruta: string;
  publicados: number;
  vistas: number;
  contactos: number;
  encuestasSi: number;
  encuestasNo: number;
  // métricas de cohorte: sobre los anuncios PUBLICADOS en esta
  // semana/ruta, no sobre los eventos que cayeron en la semana
  promedioContactosPorAnuncio: number | null;
  pctConContacto7d: number | null;
};

type EventoRow = {
  tipo: string;
  fecha: string;
  anuncio_id: string | null;
  ciudad_origen: string;
  ciudad_destino: string;
  valor: string | null;
};

// Lunes de la semana del timestamp, como YYYY-MM-DD (en UTC).
function inicioSemana(fecha: string): string {
  const d = new Date(fecha);
  const diasDesdeLunes = (d.getUTCDay() + 6) % 7;
  d.setUTCDate(d.getUTCDate() - diasDesdeLunes);
  return d.toISOString().slice(0, 10);
}

export async function listMetricasAction(): Promise<{
  ok: boolean;
  noAutorizado?: boolean;
  message?: string;
  semanas?: MetricaSemana[];
}> {
  const { isAdmin } = await requireAdmin();
  if (!isAdmin) {
    return { ok: false, noAutorizado: true, message: "No autorizado." };
  }

  // La tabla events no tiene policies de RLS: se lee con el cliente admin.
  const desde = new Date();
  desde.setDate(desde.getDate() - 12 * 7);

  const { data, error } = await createAdminClient()
    .from("events")
    .select("tipo, fecha, anuncio_id, ciudad_origen, ciudad_destino, valor")
    .gte("fecha", desde.toISOString())
    .order("fecha", { ascending: true })
    .returns<EventoRow[]>();

  if (error || !data) {
    return {
      ok: false,
      message:
        "No se pudieron cargar las métricas. Si aún no corriste la migración de la tabla `events` en Supabase, ese es el motivo.",
    };
  }

  // Contactos por anuncio (para las métricas de cohorte).
  const contactosPorAnuncio = new Map<string, string[]>();
  for (const e of data) {
    if (e.tipo === "contacto_desbloqueado" && e.anuncio_id) {
      const fechas = contactosPorAnuncio.get(e.anuncio_id) ?? [];
      fechas.push(e.fecha);
      contactosPorAnuncio.set(e.anuncio_id, fechas);
    }
  }

  const SIETE_DIAS_MS = 7 * 24 * 60 * 60 * 1000;
  const buckets = new Map<
    string,
    MetricaSemana & { cohorteContactos: number; cohorteCon7d: number }
  >();

  const bucketDe = (e: EventoRow) => {
    const semana = inicioSemana(e.fecha);
    const ruta = `${e.ciudad_origen} → ${e.ciudad_destino}`;
    const key = `${semana}|${ruta}`;
    let b = buckets.get(key);
    if (!b) {
      b = {
        semana,
        ruta,
        publicados: 0,
        vistas: 0,
        contactos: 0,
        encuestasSi: 0,
        encuestasNo: 0,
        promedioContactosPorAnuncio: null,
        pctConContacto7d: null,
        cohorteContactos: 0,
        cohorteCon7d: 0,
      };
      buckets.set(key, b);
    }
    return b;
  };

  for (const e of data) {
    const b = bucketDe(e);
    switch (e.tipo) {
      case "anuncio_publicado": {
        b.publicados += 1;
        const contactos = e.anuncio_id ? (contactosPorAnuncio.get(e.anuncio_id) ?? []) : [];
        b.cohorteContactos += contactos.length;
        const publicadoEn = new Date(e.fecha).getTime();
        const tuvoEn7d = contactos.some((f) => {
          const t = new Date(f).getTime();
          return t >= publicadoEn && t - publicadoEn <= SIETE_DIAS_MS;
        });
        if (tuvoEn7d) b.cohorteCon7d += 1;
        break;
      }
      case "anuncio_visto":
        b.vistas += 1;
        break;
      case "contacto_desbloqueado":
        b.contactos += 1;
        break;
      case "respuesta_encuesta":
        if (e.valor === "si") b.encuestasSi += 1;
        if (e.valor === "no") b.encuestasNo += 1;
        break;
    }
  }

  const semanas: MetricaSemana[] = Array.from(buckets.values())
    .map(({ cohorteContactos, cohorteCon7d, ...b }) => ({
      ...b,
      promedioContactosPorAnuncio:
        b.publicados > 0 ? Math.round((cohorteContactos / b.publicados) * 10) / 10 : null,
      pctConContacto7d:
        b.publicados > 0 ? Math.round((cohorteCon7d / b.publicados) * 100) : null,
    }))
    .sort((a, z) => z.semana.localeCompare(a.semana) || a.ruta.localeCompare(z.ruta));

  return { ok: true, semanas };
}

export async function adminDescartarReporteAction(
  reporteId: string
): Promise<{ ok: boolean; message?: string }> {
  const { supabase, isAdmin } = await requireAdmin();
  if (!isAdmin) {
    return { ok: false, message: "No autorizado." };
  }

  const { error } = await supabase.from("reportes").delete().eq("id", reporteId);

  if (error) {
    return { ok: false, message: "No se pudo descartar el reporte." };
  }

  revalidatePath("/admin");
  return { ok: true };
}

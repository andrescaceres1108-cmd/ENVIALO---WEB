"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

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

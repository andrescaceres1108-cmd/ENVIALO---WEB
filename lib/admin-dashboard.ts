import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/admin-guard";

// Precio que muestra el botón de desbloqueo. Hoy NO se cobra (no hay
// pasarela), así que el dinero que sale del tablero es potencial, no real.
export const PRECIO_DESBLOQUEO_USD = 3.99;

export const PERIODOS = [7, 30, 90] as const;
export type Periodo = (typeof PERIODOS)[number];

export function periodoValido(v: string | undefined): Periodo {
  const n = Number(v);
  return (PERIODOS as readonly number[]).includes(n) ? (n as Periodo) : 30;
}

export type Comparado = {
  valor: number;
  previo: number;
  // variación % contra el periodo anterior de igual duración; null cuando el
  // periodo anterior fue 0 (un "+∞%" no le dice nada a nadie)
  variacion: number | null;
};

export type PasoEmbudo = {
  etapa: string;
  valor: number;
  // % respecto al paso anterior; null en el primero
  conversion: number | null;
  nota?: string;
};

export type FilaRuta = {
  ruta: string;
  anuncios: number;
  kilos: number;
  vistas: number;
  contactos: number;
};

export type AnuncioSinDemanda = {
  id: string;
  ruta: string;
  fechaViaje: string;
  diasPublicado: number;
};

export type PuntoSerie = {
  etiqueta: string;
  registros: number;
  anuncios: number;
  contactos: number;
};

export type Dashboard = {
  periodo: Periodo;
  generadoEn: string;
  kpis: {
    contactos: Comparado;
    ingresoPotencial: number;
    anuncios: Comparado;
    registros: Comparado;
    anunciosActivos: number;
  };
  embudo: PasoEmbudo[];
  liquidez: {
    anunciosTotales: number;
    anunciosConContacto: number;
    pctConContacto: number | null;
    contactosPorAnuncio: number | null;
    horasHastaPrimerContacto: number | null;
    sinDemanda: AnuncioSinDemanda[];
  };
  oferta: {
    kilosActivos: number;
    precioPromedio: number | null;
    precioMin: number | null;
    precioMax: number | null;
    anticipacionMediaDias: number | null;
    usaCo: number;
    coUsa: number;
    pctDomicilio: number | null;
  };
  rutas: FilaRuta[];
  confianza: {
    perfiles: number;
    conFoto: number;
    conRedes: number;
    sinConfirmar: number;
    reportesAbiertos: number;
    anunciosReportados: number;
  };
  usuarios: {
    total: number;
    activos: number;
    usa: number;
    co: number;
  };
  serie: PuntoSerie[];
  serieAgrupadaPorSemana: boolean;
  // Huecos de instrumentación: qué eventos nunca se han registrado. Sirve
  // para no leer un 0 como "nadie lo hace" cuando en realidad no se mide.
  eventosPorTipo: Record<string, number>;
};

type ProfileRow = {
  id: string;
  pais: string;
  created_at: string;
  avatar_url: string | null;
  facebook: string | null;
  instagram: string | null;
};

type AnuncioRow = {
  id: string;
  user_id: string;
  direccion: string;
  ciudad_origen: string;
  ciudad_destino: string;
  fecha_viaje: string;
  kilos_disponibles: number;
  precio_kilo_usd: number;
  entrega_domicilio: boolean;
  created_at: string;
};

type EventRow = {
  tipo: string;
  fecha: string;
  anuncio_id: string | null;
  user_id: string | null;
  ciudad_origen: string;
  ciudad_destino: string;
};

type ReporteRow = { id: string; anuncio_id: string };

const DIA_MS = 24 * 60 * 60 * 1000;

function comparar(valor: number, previo: number): Comparado {
  return {
    valor,
    previo,
    variacion: previo === 0 ? null : Math.round(((valor - previo) / previo) * 100),
  };
}

function pct(parte: number, total: number): number | null {
  return total === 0 ? null : Math.round((parte / total) * 100);
}

function mediana(valores: number[]): number | null {
  if (valores.length === 0) return null;
  const orden = [...valores].sort((a, z) => a - z);
  const medio = Math.floor(orden.length / 2);
  return orden.length % 2 === 0 ? (orden[medio - 1] + orden[medio]) / 2 : orden[medio];
}

function diaClave(fecha: string): string {
  return fecha.slice(0, 10);
}

function lunesDe(fecha: Date): string {
  const d = new Date(fecha);
  const desdeLunes = (d.getUTCDay() + 6) % 7;
  d.setUTCDate(d.getUTCDate() - desdeLunes);
  return d.toISOString().slice(0, 10);
}

export async function cargarDashboard(
  periodo: Periodo
): Promise<
  | { ok: true; data: Dashboard }
  | { ok: false; noAutorizado?: boolean; message: string }
> {
  const { isAdmin } = await requireAdmin();
  if (!isAdmin) {
    return { ok: false, noAutorizado: true, message: "No autorizado." };
  }

  const admin = createAdminClient();

  // Se traen las tablas completas y se agrega en memoria. Es adecuado para el
  // volumen actual (decenas de filas); si SendGO crece a decenas de miles de
  // anuncios habrá que mover estos conteos a vistas SQL agregadas.
  const [perfilesRes, anunciosRes, eventosRes, reportesRes, authRes] = await Promise.all([
    admin.from("profiles").select("id, pais, created_at, avatar_url, facebook, instagram"),
    admin
      .from("anuncios")
      .select(
        "id, user_id, direccion, ciudad_origen, ciudad_destino, fecha_viaje, kilos_disponibles, precio_kilo_usd, entrega_domicilio, created_at"
      ),
    admin.from("events").select("tipo, fecha, anuncio_id, user_id, ciudad_origen, ciudad_destino"),
    admin.from("reportes").select("id, anuncio_id"),
    admin.auth.admin.listUsers({ perPage: 1000 }),
  ]);

  if (perfilesRes.error || anunciosRes.error || reportesRes.error) {
    return { ok: false, message: "No se pudieron cargar los datos del tablero." };
  }

  const perfiles = (perfilesRes.data ?? []) as ProfileRow[];
  const anuncios = (anunciosRes.data ?? []) as AnuncioRow[];
  // events puede fallar si aún no se corrió su migración: el resto del
  // tablero sigue siendo útil sin ella.
  const eventos = (eventosRes.error ? [] : ((eventosRes.data ?? []) as EventRow[])) as EventRow[];
  const reportes = (reportesRes.data ?? []) as ReporteRow[];
  const authUsers = authRes.data?.users ?? [];

  const ahora = Date.now();
  const inicio = ahora - periodo * DIA_MS;
  const inicioPrevio = ahora - 2 * periodo * DIA_MS;
  const hoy = new Date().toISOString().slice(0, 10);

  const enPeriodo = (f: string) => {
    const t = new Date(f).getTime();
    return t >= inicio && t <= ahora;
  };
  const enPeriodoPrevio = (f: string) => {
    const t = new Date(f).getTime();
    return t >= inicioPrevio && t < inicio;
  };

  // ---------- eventos ----------
  const eventosPorTipo: Record<string, number> = {};
  for (const e of eventos) eventosPorTipo[e.tipo] = (eventosPorTipo[e.tipo] ?? 0) + 1;

  const vistas = eventos.filter((e) => e.tipo === "anuncio_visto");
  const desbloqueos = eventos.filter((e) => e.tipo === "contacto_desbloqueado");

  const contactos = comparar(
    desbloqueos.filter((e) => enPeriodo(e.fecha)).length,
    desbloqueos.filter((e) => enPeriodoPrevio(e.fecha)).length
  );

  // ---------- oferta y usuarios (fuente de verdad: las tablas, no events,
  // porque la tabla events nació después que los primeros anuncios) ----------
  const anunciosPeriodo = comparar(
    anuncios.filter((a) => enPeriodo(a.created_at)).length,
    anuncios.filter((a) => enPeriodoPrevio(a.created_at)).length
  );
  const registros = comparar(
    perfiles.filter((p) => enPeriodo(p.created_at)).length,
    perfiles.filter((p) => enPeriodoPrevio(p.created_at)).length
  );

  const activos = anuncios.filter((a) => a.fecha_viaje >= hoy);

  // ---------- liquidez: ¿la oferta encuentra demanda? ----------
  const primerContactoPorAnuncio = new Map<string, number>();
  const contactosPorAnuncio = new Map<string, number>();
  for (const e of desbloqueos) {
    if (!e.anuncio_id) continue;
    contactosPorAnuncio.set(e.anuncio_id, (contactosPorAnuncio.get(e.anuncio_id) ?? 0) + 1);
    const t = new Date(e.fecha).getTime();
    const previo = primerContactoPorAnuncio.get(e.anuncio_id);
    if (previo === undefined || t < previo) primerContactoPorAnuncio.set(e.anuncio_id, t);
  }

  const anunciosConContacto = anuncios.filter((a) => contactosPorAnuncio.has(a.id)).length;
  const horasPrimerContacto = anuncios
    .filter((a) => primerContactoPorAnuncio.has(a.id))
    .map(
      (a) =>
        (primerContactoPorAnuncio.get(a.id)! - new Date(a.created_at).getTime()) / (60 * 60 * 1000)
    )
    .filter((h) => h >= 0);

  const sinDemanda: AnuncioSinDemanda[] = activos
    .filter((a) => !contactosPorAnuncio.has(a.id))
    .map((a) => ({
      id: a.id,
      ruta: `${a.ciudad_origen} → ${a.ciudad_destino}`,
      fechaViaje: a.fecha_viaje,
      diasPublicado: Math.max(
        0,
        Math.floor((ahora - new Date(a.created_at).getTime()) / DIA_MS)
      ),
    }))
    .sort((a, z) => z.diasPublicado - a.diasPublicado);

  // ---------- embudo de la demanda ----------
  const vistasPeriodo = vistas.filter((e) => enPeriodo(e.fecha)).length;
  const desbloqueosPeriodo = contactos.valor;
  const embudo: PasoEmbudo[] = [
    {
      etapa: "Anuncios publicados",
      valor: anunciosPeriodo.valor,
      conversion: null,
      nota: "oferta que entra al tablón",
    },
    {
      etapa: "Vistas de detalle",
      valor: vistasPeriodo,
      conversion: null,
      nota:
        (eventosPorTipo["anuncio_visto"] ?? 0) === 0
          ? "nunca se ha registrado una vista de detalle"
          : undefined,
    },
    {
      etapa: "Contactos desbloqueados",
      valor: desbloqueosPeriodo,
      conversion: vistasPeriodo > 0 ? Math.round((desbloqueosPeriodo / vistasPeriodo) * 100) : null,
      nota: "el momento en que SendGO entrega su valor",
    },
  ];

  // ---------- rutas ----------
  const rutasMap = new Map<string, FilaRuta>();
  const filaRuta = (ruta: string) => {
    let f = rutasMap.get(ruta);
    if (!f) {
      f = { ruta, anuncios: 0, kilos: 0, vistas: 0, contactos: 0 };
      rutasMap.set(ruta, f);
    }
    return f;
  };
  for (const a of anuncios) {
    const f = filaRuta(`${a.ciudad_origen} → ${a.ciudad_destino}`);
    f.anuncios += 1;
    f.kilos += Number(a.kilos_disponibles);
  }
  for (const e of vistas) filaRuta(`${e.ciudad_origen} → ${e.ciudad_destino}`).vistas += 1;
  for (const e of desbloqueos) filaRuta(`${e.ciudad_origen} → ${e.ciudad_destino}`).contactos += 1;
  const rutas = Array.from(rutasMap.values()).sort(
    (a, z) => z.contactos - a.contactos || z.anuncios - a.anuncios
  );

  // ---------- confianza (el problema social de SendGO) ----------
  const anunciosReportados = new Set(reportes.map((r) => r.anuncio_id)).size;
  const sinConfirmar = authUsers.filter((u) => !u.email_confirmed_at).length;

  // ---------- usuarios activos: publicaron o desbloquearon algo ----------
  const idsActivos = new Set<string>();
  for (const a of anuncios) idsActivos.add(a.user_id);
  for (const e of desbloqueos) if (e.user_id) idsActivos.add(e.user_id);

  // ---------- serie temporal ----------
  const porSemana = periodo > 30;
  const claveDe = (f: string) => (porSemana ? lunesDe(new Date(f)) : diaClave(f));
  const serieMap = new Map<string, PuntoSerie>();
  const cubo = (clave: string) => {
    let p = serieMap.get(clave);
    if (!p) {
      p = { etiqueta: clave, registros: 0, anuncios: 0, contactos: 0 };
      serieMap.set(clave, p);
    }
    return p;
  };
  // Se siembran todos los cubos del periodo para que los días sin actividad
  // se vean como huecos y no desaparezcan del gráfico.
  for (let t = inicio; t <= ahora; t += DIA_MS) {
    cubo(claveDe(new Date(t).toISOString()));
  }
  for (const p of perfiles) if (enPeriodo(p.created_at)) cubo(claveDe(p.created_at)).registros += 1;
  for (const a of anuncios) if (enPeriodo(a.created_at)) cubo(claveDe(a.created_at)).anuncios += 1;
  for (const e of desbloqueos) if (enPeriodo(e.fecha)) cubo(claveDe(e.fecha)).contactos += 1;
  const serie = Array.from(serieMap.values()).sort((a, z) => a.etiqueta.localeCompare(z.etiqueta));

  const precios = activos.map((a) => Number(a.precio_kilo_usd));
  const anticipaciones = anuncios.map(
    (a) =>
      (new Date(a.fecha_viaje + "T12:00:00Z").getTime() - new Date(a.created_at).getTime()) / DIA_MS
  );

  return {
    ok: true,
    data: {
      periodo,
      generadoEn: new Date().toISOString(),
      kpis: {
        contactos,
        ingresoPotencial: Math.round(contactos.valor * PRECIO_DESBLOQUEO_USD * 100) / 100,
        anuncios: anunciosPeriodo,
        registros,
        anunciosActivos: activos.length,
      },
      embudo,
      liquidez: {
        anunciosTotales: anuncios.length,
        anunciosConContacto,
        pctConContacto: pct(anunciosConContacto, anuncios.length),
        contactosPorAnuncio:
          anuncios.length === 0
            ? null
            : Math.round((desbloqueos.length / anuncios.length) * 10) / 10,
        horasHastaPrimerContacto: (() => {
          const m = mediana(horasPrimerContacto);
          return m === null ? null : Math.round(m * 10) / 10;
        })(),
        sinDemanda,
      },
      oferta: {
        kilosActivos: Math.round(activos.reduce((s, a) => s + Number(a.kilos_disponibles), 0) * 10) / 10,
        precioPromedio:
          precios.length === 0
            ? null
            : Math.round((precios.reduce((s, p) => s + p, 0) / precios.length) * 100) / 100,
        precioMin: precios.length === 0 ? null : Math.min(...precios),
        precioMax: precios.length === 0 ? null : Math.max(...precios),
        anticipacionMediaDias: (() => {
          const m = mediana(anticipaciones);
          return m === null ? null : Math.round(m);
        })(),
        usaCo: anuncios.filter((a) => a.direccion === "usa-co").length,
        coUsa: anuncios.filter((a) => a.direccion === "co-usa").length,
        pctDomicilio: pct(anuncios.filter((a) => a.entrega_domicilio).length, anuncios.length),
      },
      rutas,
      confianza: {
        perfiles: perfiles.length,
        conFoto: perfiles.filter((p) => !!p.avatar_url).length,
        conRedes: perfiles.filter((p) => !!p.facebook && !!p.instagram).length,
        sinConfirmar,
        reportesAbiertos: reportes.length,
        anunciosReportados,
      },
      usuarios: {
        total: perfiles.length,
        activos: idsActivos.size,
        usa: perfiles.filter((p) => p.pais === "usa").length,
        co: perfiles.filter((p) => p.pais === "co").length,
      },
      serie,
      serieAgrupadaPorSemana: porSemana,
      eventosPorTipo,
    },
  };
}

"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { randomUUID } from "crypto";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { registrarEvento } from "@/lib/events";
import {
  signupSchema,
  loginSchema,
  forgotPasswordSchema,
  updatePasswordSchema,
  perfilSchema,
  publicarSchema,
  reportSchema,
} from "@/lib/validation";

async function getOrigin() {
  const envUrl = process.env.NEXT_PUBLIC_SITE_URL;
  if (envUrl) return envUrl.replace(/\/$/, "");
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const isLocal = host.startsWith("localhost") || host.startsWith("127.0.0.1");
  const proto = h.get("x-forwarded-proto") ?? (isLocal ? "http" : "https");
  return `${proto}://${host}`;
}

// La IP se usa como llave del rate limiting, así que tiene que venir de una
// fuente que el cliente no pueda inventar. `x-forwarded-for` SÍ es
// falsificable: si el visitante manda su propio header, el proxy le agrega
// la IP real al final, y quedarse con el primer valor (lo que se hacía
// antes) devuelve justo la parte que escribió el atacante. Con eso se
// obtiene una llave distinta en cada request y el límite de intentos deja
// de existir — fuerza bruta de login y spam de correos sin freno.
// Vercel expone `x-vercel-forwarded-for` y `x-real-ip`, que sobrescribe él
// mismo; se prefieren esos y, como último recurso, se toma el ÚLTIMO valor
// de la cadena (el que agregó el proxy más cercano, no el del cliente).
async function getClientIp() {
  const h = await headers();
  const confiable = h.get("x-vercel-forwarded-for") ?? h.get("x-real-ip");
  if (confiable) return confiable.trim();
  const fwd = h.get("x-forwarded-for");
  if (fwd) {
    const partes = fwd.split(",").map((p) => p.trim()).filter(Boolean);
    if (partes.length > 0) return partes[partes.length - 1];
  }
  return "unknown";
}

const RATE_LIMIT_MESSAGE =
  "Demasiados intentos. Espera unos minutos y vuelve a intentarlo.";

// Límite de envío de correos de Supabase (distinto de nuestro check_rate_limit
// propio): se activa cuando se mandan demasiados correos de auth en poco
// tiempo. El mensaje crudo de Supabase viene en inglés ("email rate limit
// exceeded"), así que lo traducimos.
const EMAIL_RATE_LIMIT_MESSAGE =
  "Se enviaron demasiados correos en poco tiempo. Espera unos minutos y vuelve a intentarlo.";

// Envuelve la función SQL check_rate_limit() (ver supabase/schema.sql).
//
// Corre SIEMPRE con el cliente admin (service role), nunca con el de la
// sesión: la llave anónima está en el bundle del navegador, así que si la
// función fuera invocable desde el cliente, cualquiera podría llamarla con
// la llave de otra persona (ej. 'login-cuenta:victima@correo.com') y agotar
// su contador para dejarla sin poder iniciar sesión. El contador solo lo
// toca el servidor.
//
// Si la llamada falla (migración sin correr, error de red) no bloqueamos al
// usuario —preferimos dejar pasar antes que tumbar el login—, pero queda
// registrado en los logs porque implica que el freno anti-abuso no está
// actuando.
async function checkRateLimit(key: string, max: number, windowSeconds: number) {
  try {
    const { data, error } = await createAdminClient().rpc("check_rate_limit", {
      p_key: key,
      p_max: max,
      p_window_seconds: windowSeconds,
    });
    if (error) {
      console.error("[checkRateLimit] sin aplicar para", key, "->", error.message);
      return true;
    }
    return data === true;
  } catch (e) {
    console.error("[checkRateLimit] sin aplicar para", key, "->", e);
    return true;
  }
}

export type ActionState = {
  ok: boolean;
  message?: string;
  errors?: Record<string, string>;
  // true si el signup quedó pendiente de confirmar por correo (no hay
  // sesión activa todavía). Se usa para no cerrar el modal de auth como
  // si ya hubiera quedado logueado.
  requiresConfirmation?: boolean;
  // true si el login falló específicamente porque el correo no está
  // confirmado (para ofrecer el botón de "reenviar correo").
  unconfirmed?: boolean;
};

function firstErrors(flat: Record<string, string[] | undefined>) {
  const errors: Record<string, string> = {};
  for (const key in flat) {
    const arr = flat[key];
    if (arr && arr[0]) errors[key] = arr[0];
  }
  return errors;
}

const AVATAR_BUCKET = "avatars";
const AVATAR_EXT: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

// Sube la foto a una ruta temporal ANTES de crear la cuenta: si el storage
// falla (bucket sin migrar, service role mal configurada, etc.) preferimos
// avisar aquí y no dejar creada una cuenta sin la foto obligatoria.
async function uploadAvatarTemp(
  file: File
): Promise<{ ok: true; path: string } | { ok: false; message: string }> {
  const ext = AVATAR_EXT[file.type];
  if (!ext) {
    return { ok: false, message: "Formato no soportado: usa JPG, PNG o WEBP." };
  }
  let admin;
  try {
    admin = createAdminClient();
  } catch {
    return { ok: false, message: "No se pudo subir la foto de perfil. Intenta de nuevo." };
  }
  const path = `pending/${randomUUID()}.${ext}`;
  const { error } = await admin.storage
    .from(AVATAR_BUCKET)
    .upload(path, file, { contentType: file.type, upsert: false });
  if (error) {
    return { ok: false, message: "No se pudo subir la foto de perfil. Intenta de nuevo." };
  }
  return { ok: true, path };
}

export async function signUpAction(
  redirectTo: string | null,
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const raw = {
    ...Object.fromEntries(formData),
    acepto_terminos: formData.get("acepto_terminos") === "on",
  };
  const parsed = signupSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, errors: firstErrors(parsed.error.flatten().fieldErrors) };
  }

  const supabase = await createClient();
  const ip = await getClientIp();
  const allowed = await checkRateLimit(`signup:${ip}`, 5, 3600);
  if (!allowed) {
    return { ok: false, message: RATE_LIMIT_MESSAGE };
  }

  const { data } = parsed;

  const uploaded = await uploadAvatarTemp(data.avatar);
  if (!uploaded.ok) {
    return { ok: false, errors: { avatar: uploaded.message } };
  }

  const origin = await getOrigin();

  const { data: authData, error } = await supabase.auth.signUp({
    email: data.email,
    password: data.password,
    options: {
      emailRedirectTo: `${origin}/auth/confirm`,
      data: {
        nombre: data.nombre,
        pais: data.pais,
        telefono: data.telefono,
        cedula: data.pais === "co" ? data.cedula : null,
        facebook: data.facebook,
        instagram: data.instagram,
      },
    },
  });

  if (error) {
    try {
      await createAdminClient().storage.from(AVATAR_BUCKET).remove([uploaded.path]);
    } catch {
      // best-effort: no bloqueamos el mensaje de error por esto
    }
    if (error.code === "over_email_send_rate_limit") {
      return { ok: false, message: EMAIL_RATE_LIMIT_MESSAGE };
    }
    if (error.code === "weak_password") {
      return {
        ok: false,
        errors: { password: "Elige una contraseña más segura." },
      };
    }
    // El resto de errores de Supabase llegan en inglés y algunos revelan si
    // un correo ya está registrado (enumeración de usuarios). Se responde
    // en genérico y el detalle queda solo en los logs del servidor.
    console.error("[signUpAction] error de Supabase:", error.code, error.message);
    return {
      ok: false,
      message: "No se pudo crear la cuenta. Revisa los datos e intenta de nuevo.",
    };
  }

  // Movemos la foto a su ruta definitiva (carpeta = user id) y la
  // guardamos en el perfil. Seguimos usando el cliente admin: si la
  // confirmación de email está activada, todavía no hay sesión para el
  // cliente normal en este punto.
  if (authData.user) {
    const ext = uploaded.path.split(".").pop();
    const finalPath = `${authData.user.id}/avatar.${ext}`;
    try {
      const admin = createAdminClient();
      const { error: moveError } = await admin.storage
        .from(AVATAR_BUCKET)
        .move(uploaded.path, finalPath);
      if (!moveError) {
        const {
          data: { publicUrl },
        } = admin.storage.from(AVATAR_BUCKET).getPublicUrl(finalPath);
        await admin.from("profiles").update({ avatar_url: publicUrl }).eq("id", authData.user.id);
      }
    } catch {
      // best-effort: la cuenta ya se creó; si esto falla, el usuario queda
      // sin avatar_url pero puede seguir usando la cuenta con normalidad.
    }
  }

  if (!authData.session) {
    return {
      ok: true,
      requiresConfirmation: true,
      message:
        "Cuenta creada. Revisa tu correo (y la carpeta de spam) y haz clic en el enlace para activar tu cuenta.",
    };
  }

  revalidatePath("/", "layout");
  if (redirectTo) {
    redirect(redirectTo);
  }
  return { ok: true, message: "Cuenta creada. Ya puedes publicar y ver contactos." };
}

export async function logInAction(
  redirectTo: string | null,
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const raw = Object.fromEntries(formData);
  const parsed = loginSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, errors: firstErrors(parsed.error.flatten().fieldErrors) };
  }

  const supabase = await createClient();
  const ip = await getClientIp();
  // Dos límites a la vez: por IP (frena a un atacante desde una máquina) y
  // por cuenta (frena el ataque distribuido desde muchas IPs contra un
  // mismo correo, que el límite por IP no detecta).
  const allowedIp = await checkRateLimit(`login:${ip}`, 10, 300);
  const allowedCuenta = await checkRateLimit(
    `login-cuenta:${parsed.data.email.toLowerCase()}`,
    10,
    900
  );
  if (!allowedIp || !allowedCuenta) {
    return { ok: false, message: RATE_LIMIT_MESSAGE };
  }

  const { error } = await supabase.auth.signInWithPassword(parsed.data);

  if (error) {
    if (error.code === "email_not_confirmed") {
      return {
        ok: false,
        unconfirmed: true,
        message:
          "Tu correo aún no está confirmado. Revisa tu bandeja de entrada (y spam) para activar tu cuenta.",
      };
    }
    return { ok: false, message: "Correo o contraseña incorrectos." };
  }

  revalidatePath("/", "layout");
  if (redirectTo) {
    redirect(redirectTo);
  }
  return { ok: true, message: "Sesión iniciada." };
}

export async function resendConfirmationAction(
  email: string
): Promise<{ ok: boolean; message?: string }> {
  const parsed = loginSchema.shape.email.safeParse(email);
  if (!parsed.success) {
    return { ok: false, message: "Ingresa un correo válido." };
  }

  const supabase = await createClient();
  const ip = await getClientIp();
  const allowed = await checkRateLimit(`resend:${ip}`, 3, 3600);
  if (!allowed) {
    return { ok: false, message: RATE_LIMIT_MESSAGE };
  }

  const origin = await getOrigin();

  const { error } = await supabase.auth.resend({
    type: "signup",
    email: parsed.data,
    options: { emailRedirectTo: `${origin}/auth/confirm` },
  });

  if (error?.code === "over_email_send_rate_limit") {
    return { ok: false, message: EMAIL_RATE_LIMIT_MESSAGE };
  }

  // Mensaje genérico para el resto de los casos: no revelamos si el correo
  // está registrado o ya confirmado.
  return {
    ok: true,
    message: "Si el correo existe y no está confirmado, te reenviamos el enlace de activación.",
  };
}

export async function forgotPasswordAction(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const raw = Object.fromEntries(formData);
  const parsed = forgotPasswordSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, errors: firstErrors(parsed.error.flatten().fieldErrors) };
  }

  const supabase = await createClient();
  const ip = await getClientIp();
  const allowed = await checkRateLimit(`forgot:${ip}`, 3, 3600);
  if (!allowed) {
    return { ok: false, message: RATE_LIMIT_MESSAGE };
  }

  const origin = await getOrigin();

  await supabase.auth.resetPasswordForEmail(parsed.data.email, {
    redirectTo: `${origin}/auth/confirm?next=/cuenta/actualizar-password`,
  });

  // Mensaje genérico: no revelamos si el correo está registrado o no.
  return {
    ok: true,
    message:
      "Si el correo está registrado, te enviamos un enlace para restablecer tu contraseña.",
  };
}

export async function actualizarPasswordAction(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const raw = Object.fromEntries(formData);
  const parsed = updatePasswordSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, errors: firstErrors(parsed.error.flatten().fieldErrors) };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      ok: false,
      message: "El enlace expiró o no es válido. Solicita uno nuevo desde 'Iniciar sesión'.",
    };
  }

  const { error } = await supabase.auth.updateUser({ password: parsed.data.password });

  if (error) {
    return { ok: false, message: "No se pudo actualizar la contraseña. Intenta de nuevo." };
  }

  revalidatePath("/", "layout");
  return { ok: true, message: "Contraseña actualizada." };
}

export async function logOutAction() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
}

export async function borrarCuentaAction(): Promise<{ ok: boolean; message?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false, message: "Debes iniciar sesión." };
  }

  const { error } = await supabase.rpc("delete_own_account");

  if (error) {
    return { ok: false, message: "No se pudo borrar la cuenta. Intenta de nuevo." };
  }

  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  return { ok: true };
}

export async function actualizarPerfilAction(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false, message: "Debes iniciar sesión para editar tu perfil." };
  }

  const parsed = perfilSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { ok: false, errors: firstErrors(parsed.error.flatten().fieldErrors) };
  }

  const { data } = parsed;

  // Foto nueva (opcional): se sube directo a la ruta definitiva con
  // upsert. Se agrega ?v= a la URL para romper la caché del navegador al
  // reemplazar la imagen (la ruta del archivo no cambia).
  const nuevaFoto = data.avatar && data.avatar.size > 0 ? data.avatar : null;
  let avatarUrl: string | null = null;
  if (nuevaFoto) {
    const ext = AVATAR_EXT[nuevaFoto.type];
    try {
      const admin = createAdminClient();
      const path = `${user.id}/avatar.${ext}`;
      const { error: uploadError } = await admin.storage
        .from(AVATAR_BUCKET)
        .upload(path, nuevaFoto, { contentType: nuevaFoto.type, upsert: true });
      if (uploadError) {
        return {
          ok: false,
          errors: { avatar: "No se pudo subir la nueva foto. Intenta de nuevo." },
        };
      }
      // Limpieza best-effort si la foto anterior tenía otra extensión.
      const otras = Object.values(AVATAR_EXT)
        .filter((e) => e !== ext)
        .map((e) => `${user.id}/avatar.${e}`);
      await admin.storage.from(AVATAR_BUCKET).remove(otras);
      const {
        data: { publicUrl },
      } = admin.storage.from(AVATAR_BUCKET).getPublicUrl(path);
      avatarUrl = `${publicUrl}?v=${Date.now()}`;
    } catch {
      return {
        ok: false,
        errors: { avatar: "No se pudo subir la nueva foto. Intenta de nuevo." },
      };
    }
  }

  const updates: Record<string, unknown> = {
    nombre: data.nombre,
    pais: data.pais,
    telefono: data.telefono,
    cedula: data.pais === "co" ? data.cedula : null,
    facebook: data.facebook,
    instagram: data.instagram,
  };
  if (avatarUrl) updates.avatar_url = avatarUrl;

  const { error } = await supabase.from("profiles").update(updates).eq("id", user.id);
  if (error) {
    return { ok: false, message: "No se pudieron guardar los cambios. Intenta de nuevo." };
  }

  // El nombre y la foto van copiados en cada anuncio, así que al cambiarlos
  // hay que propagarlos a los anuncios ya publicados; si no, el tablón
  // seguiría mostrando los datos viejos del viajero.
  const anunciosUpdate: Record<string, unknown> = { nombre_contacto: data.nombre };
  if (avatarUrl) anunciosUpdate.avatar_url = avatarUrl;
  await supabase.from("anuncios").update(anunciosUpdate).eq("user_id", user.id);

  revalidatePath("/perfil");
  revalidatePath("/anuncios");
  return { ok: true, message: "Perfil actualizado." };
}

export async function publicarAnuncioAction(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false, message: "Debes iniciar sesión para publicar un anuncio." };
  }

  const allowed = await checkRateLimit(`publicar:${user.id}`, 5, 86400);
  if (!allowed) {
    return {
      ok: false,
      message: "Alcanzaste el máximo de anuncios publicados por hoy. Intenta mañana.",
    };
  }

  const raw = {
    ...Object.fromEntries(formData),
    entrega_domicilio: formData.get("entrega_domicilio") === "on",
    acepto_terminos: formData.get("acepto_terminos") === "on",
  };

  const parsed = publicarSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, errors: firstErrors(parsed.error.flatten().fieldErrors) };
  }

  const { whatsapp, ...anuncio } = parsed.data;

  // El nombre y la foto se toman SIEMPRE del perfil, nunca de lo que venga
  // en el formulario: si se aceptara el valor enviado, cualquiera podría
  // publicar un anuncio a nombre de otra persona mostrando su propia foto
  // verificada al lado. El nombre se cambia desde /perfil.
  const { data: profile } = await supabase
    .from("profiles")
    .select("nombre, avatar_url")
    .eq("id", user.id)
    .single();

  const { data: inserted, error } = await supabase
    .from("anuncios")
    .insert({
      ...anuncio,
      nombre_contacto: profile?.nombre ?? anuncio.nombre_contacto,
      user_id: user.id,
      avatar_url: profile?.avatar_url ?? null,
    })
    .select("id")
    .single();

  if (error || !inserted) {
    console.error("[publicarAnuncioAction] insert anuncio:", error?.message);
    return { ok: false, message: "No se pudo publicar el anuncio. Intenta de nuevo." };
  }

  const { error: contactoError } = await supabase
    .from("anuncios_contacto")
    .insert({ anuncio_id: inserted.id, whatsapp });

  if (contactoError) {
    // El anuncio ya se creó pero se quedó sin WhatsApp: así aparecería
    // publicado y sin forma de contactar al viajero. Se deshace para no
    // dejar basura visible en el tablón.
    console.error("[publicarAnuncioAction] insert contacto:", contactoError.message);
    await supabase.from("anuncios").delete().eq("id", inserted.id).eq("user_id", user.id);
    return { ok: false, message: "No se pudo publicar el anuncio. Intenta de nuevo." };
  }

  await registrarEvento({
    tipo: "anuncio_publicado",
    anuncioId: inserted.id,
    ciudadOrigen: anuncio.ciudad_origen,
    ciudadDestino: anuncio.ciudad_destino,
    userId: user.id,
  });

  revalidatePath("/anuncios");
  return { ok: true, message: "Anuncio publicado." };
}

export async function editarAnuncioAction(
  anuncioId: string,
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false, message: "Debes iniciar sesión para editar tu anuncio." };
  }

  const raw = {
    ...Object.fromEntries(formData),
    entrega_domicilio: formData.get("entrega_domicilio") === "on",
    acepto_terminos: formData.get("acepto_terminos") === "on",
  };

  const parsed = publicarSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, errors: firstErrors(parsed.error.flatten().fieldErrors) };
  }

  const { whatsapp, ...anuncio } = parsed.data;

  // El nombre y la foto se toman SIEMPRE del perfil, nunca de lo que venga
  // en el formulario: si se aceptara el valor enviado, cualquiera podría
  // publicar un anuncio a nombre de otra persona mostrando su propia foto
  // verificada al lado. El nombre se cambia desde /perfil.
  const { data: profile } = await supabase
    .from("profiles")
    .select("nombre, avatar_url")
    .eq("id", user.id)
    .single();

  const { data: updated, error } = await supabase
    .from("anuncios")
    .update({
      ...anuncio,
      nombre_contacto: profile?.nombre ?? anuncio.nombre_contacto,
      avatar_url: profile?.avatar_url ?? null,
    })
    .eq("id", anuncioId)
    .eq("user_id", user.id)
    .select("id")
    .single();

  if (error || !updated) {
    console.error("[editarAnuncioAction] update anuncio:", error?.message);
    return {
      ok: false,
      message: "No se pudo actualizar el anuncio. Verifica que sea tuyo e intenta de nuevo.",
    };
  }

  const { error: contactoError } = await supabase
    .from("anuncios_contacto")
    .update({ whatsapp })
    .eq("anuncio_id", anuncioId);

  if (contactoError) {
    console.error("[editarAnuncioAction] update contacto:", contactoError.message);
    return { ok: false, message: "No se pudo actualizar el anuncio. Intenta de nuevo." };
  }

  revalidatePath("/anuncios");
  return { ok: true, message: "Anuncio actualizado." };
}

export async function borrarAnuncioAction(
  anuncioId: string
): Promise<{ ok: boolean; message?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false, message: "Debes iniciar sesión." };
  }

  const { error } = await supabase
    .from("anuncios")
    .delete()
    .eq("id", anuncioId)
    .eq("user_id", user.id);

  if (error) {
    return { ok: false, message: "No se pudo borrar el anuncio." };
  }

  revalidatePath("/anuncios");
  return { ok: true };
}

export async function obtenerContactoAction(
  anuncioId: string
): Promise<{
  whatsapp: string | null;
  instagram?: string | null;
  facebook?: string | null;
  error?: string;
}> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { whatsapp: null, error: "Debes iniciar sesión para ver el contacto." };
  }

  // Sin este freno, una sola cuenta puede recorrer el tablón y llevarse el
  // WhatsApp de todos los viajeros de una sentada. El tope es holgado para
  // el uso normal (quien busca envío abre unos pocos anuncios) y corta el
  // raspado masivo. Importa más ahora que el desbloqueo es gratis: sin cobro
  // de por medio, el único costo de raspar el tablón es crear una cuenta.
  const allowed = await checkRateLimit(`contacto:${user.id}`, 30, 86400);
  if (!allowed) {
    return {
      whatsapp: null,
      error: "Viste muchos contactos hoy. Intenta de nuevo mañana.",
    };
  }

  const { data, error } = await supabase
    .from("anuncios_contacto")
    .select("whatsapp")
    .eq("anuncio_id", anuncioId)
    .single();

  if (error || !data) {
    return { whatsapp: null, error: "No se pudo obtener el contacto." };
  }

  // Evento del embudo, registrado antes de revelar el número. El dueño
  // también pasa por esta acción al abrir el modal de edición de su
  // propio anuncio; esos casos no cuentan como contacto.
  const { data: anuncio } = await supabase
    .from("anuncios")
    .select("user_id, ciudad_origen, ciudad_destino")
    .eq("id", anuncioId)
    .single();

  if (anuncio && anuncio.user_id !== user.id) {
    await registrarEvento({
      tipo: "contacto_desbloqueado",
      anuncioId,
      ciudadOrigen: anuncio.ciudad_origen,
      ciudadDestino: anuncio.ciudad_destino,
      userId: user.id,
    });
  }

  // Redes sociales del dueño del anuncio. Van con el cliente admin porque
  // profiles no es de lectura pública (RLS: solo el propio usuario y el
  // admin). Best-effort: si falla, el WhatsApp se entrega igual.
  let instagram: string | null = null;
  let facebook: string | null = null;
  if (anuncio) {
    try {
      const { data: perfil } = await createAdminClient()
        .from("profiles")
        .select("instagram, facebook")
        .eq("id", anuncio.user_id)
        .single();
      instagram = perfil?.instagram ?? null;
      facebook = perfil?.facebook ?? null;
    } catch {
      // sin redes; no bloqueamos la entrega del contacto
    }
  }

  return { whatsapp: data.whatsapp, instagram, facebook };
}

export async function reportarAnuncioAction(
  anuncioId: string,
  motivo: string
): Promise<{ ok: boolean; message?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false, message: "Debes iniciar sesión para reportar un anuncio." };
  }

  const parsed = reportSchema.safeParse({ motivo });
  if (!parsed.success) {
    return {
      ok: false,
      message: parsed.error.issues[0]?.message ?? "Cuéntanos brevemente por qué lo reportas.",
    };
  }

  const allowed = await checkRateLimit(`reportar:${user.id}`, 10, 86400);
  if (!allowed) {
    return { ok: false, message: RATE_LIMIT_MESSAGE };
  }

  const { error } = await supabase
    .from("reportes")
    .insert({ anuncio_id: anuncioId, reporter_id: user.id, motivo: parsed.data.motivo });

  if (error) {
    if (error.code === "23505") {
      return { ok: false, message: "Ya habías reportado este anuncio." };
    }
    return { ok: false, message: "No se pudo enviar el reporte. Intenta de nuevo." };
  }

  return {
    ok: true,
    message: "Reporte enviado. Gracias por ayudarnos a mantener SendGO seguro.",
  };
}

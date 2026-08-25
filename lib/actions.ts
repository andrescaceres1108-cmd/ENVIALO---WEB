"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { randomUUID } from "crypto";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  signupSchema,
  loginSchema,
  forgotPasswordSchema,
  updatePasswordSchema,
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

async function getClientIp() {
  const h = await headers();
  const fwd = h.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0].trim();
  return h.get("x-real-ip") ?? "unknown";
}

const RATE_LIMIT_MESSAGE =
  "Demasiados intentos. Espera unos minutos y vuelve a intentarlo.";

// Límite de envío de correos de Supabase (distinto de nuestro check_rate_limit
// propio): se activa cuando se mandan demasiados correos de auth en poco
// tiempo. El mensaje crudo de Supabase viene en inglés ("email rate limit
// exceeded"), así que lo traducimos.
const EMAIL_RATE_LIMIT_MESSAGE =
  "Se enviaron demasiados correos en poco tiempo. Espera unos minutos y vuelve a intentarlo.";

// Envuelve la función SQL check_rate_limit() (ver supabase/schema.sql). Si
// la migración todavía no se corrió (o hay un error de red), no bloqueamos
// al usuario: preferimos dejar pasar antes que romper la app por esto.
async function checkRateLimit(
  supabase: Awaited<ReturnType<typeof createClient>>,
  key: string,
  max: number,
  windowSeconds: number
) {
  const { data, error } = await supabase.rpc("check_rate_limit", {
    p_key: key,
    p_max: max,
    p_window_seconds: windowSeconds,
  });
  if (error) return true;
  return data === true;
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
  const allowed = await checkRateLimit(supabase, `signup:${ip}`, 5, 3600);
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
    return { ok: false, message: error.message };
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
  const allowed = await checkRateLimit(supabase, `login:${ip}`, 10, 300);
  if (!allowed) {
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
  const allowed = await checkRateLimit(supabase, `resend:${ip}`, 3, 3600);
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
  const allowed = await checkRateLimit(supabase, `forgot:${ip}`, 3, 3600);
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

  const allowed = await checkRateLimit(supabase, `publicar:${user.id}`, 5, 86400);
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

  const { data: profile } = await supabase
    .from("profiles")
    .select("avatar_url")
    .eq("id", user.id)
    .single();

  const { data: inserted, error } = await supabase
    .from("anuncios")
    .insert({ ...anuncio, user_id: user.id, avatar_url: profile?.avatar_url ?? null })
    .select("id")
    .single();

  if (error || !inserted) {
    return { ok: false, message: error?.message ?? "No se pudo publicar el anuncio." };
  }

  const { error: contactoError } = await supabase
    .from("anuncios_contacto")
    .insert({ anuncio_id: inserted.id, whatsapp });

  if (contactoError) {
    return { ok: false, message: contactoError.message };
  }

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

  const { data: profile } = await supabase
    .from("profiles")
    .select("avatar_url")
    .eq("id", user.id)
    .single();

  const { data: updated, error } = await supabase
    .from("anuncios")
    .update({ ...anuncio, avatar_url: profile?.avatar_url ?? null })
    .eq("id", anuncioId)
    .eq("user_id", user.id)
    .select("id")
    .single();

  if (error || !updated) {
    return { ok: false, message: error?.message ?? "No se pudo actualizar el anuncio." };
  }

  const { error: contactoError } = await supabase
    .from("anuncios_contacto")
    .update({ whatsapp })
    .eq("anuncio_id", anuncioId);

  if (contactoError) {
    return { ok: false, message: contactoError.message };
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
): Promise<{ whatsapp: string | null; error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { whatsapp: null, error: "Debes iniciar sesión para ver el contacto." };
  }

  const { data, error } = await supabase
    .from("anuncios_contacto")
    .select("whatsapp")
    .eq("anuncio_id", anuncioId)
    .single();

  if (error || !data) {
    return { whatsapp: null, error: "No se pudo obtener el contacto." };
  }

  return { whatsapp: data.whatsapp };
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

  const allowed = await checkRateLimit(supabase, `reportar:${user.id}`, 10, 86400);
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

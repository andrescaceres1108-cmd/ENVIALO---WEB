"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import {
  signupSchema,
  loginSchema,
  forgotPasswordSchema,
  updatePasswordSchema,
  publicarSchema,
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

export type ActionState = {
  ok: boolean;
  message?: string;
  errors?: Record<string, string>;
};

function firstErrors(flat: Record<string, string[] | undefined>) {
  const errors: Record<string, string> = {};
  for (const key in flat) {
    const arr = flat[key];
    if (arr && arr[0]) errors[key] = arr[0];
  }
  return errors;
}

export async function signUpAction(
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
  const { data } = parsed;

  const { error } = await supabase.auth.signUp({
    email: data.email,
    password: data.password,
    options: {
      data: {
        nombre: data.nombre,
        pais: data.pais,
        telefono: data.telefono,
        cedula: data.pais === "co" ? data.cedula : null,
      },
    },
  });

  if (error) {
    return { ok: false, message: error.message };
  }

  revalidatePath("/", "layout");
  return { ok: true, message: "Cuenta creada. Ya puedes publicar y ver contactos." };
}

export async function logInAction(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const raw = Object.fromEntries(formData);
  const parsed = loginSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, errors: firstErrors(parsed.error.flatten().fieldErrors) };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);

  if (error) {
    return { ok: false, message: "Correo o contraseña incorrectos." };
  }

  revalidatePath("/", "layout");
  return { ok: true, message: "Sesión iniciada." };
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

  const { data: inserted, error } = await supabase
    .from("anuncios")
    .insert({ ...anuncio, user_id: user.id })
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

  const { data: updated, error } = await supabase
    .from("anuncios")
    .update(anuncio)
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

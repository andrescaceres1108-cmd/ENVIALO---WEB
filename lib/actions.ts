"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import {
  signupSchema,
  loginSchema,
  publicarSchema,
} from "@/lib/validation";

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
  const raw = Object.fromEntries(formData);
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

export async function logOutAction() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
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

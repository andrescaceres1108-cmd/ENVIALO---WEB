import { createClient as createSupabaseClient } from "@supabase/supabase-js";

// Cliente con la service role key de Supabase: ignora RLS por completo.
// Se usa SOLO desde Server Actions (nunca se expone al navegador) para
// subir la foto de perfil durante el signup. Hace falta un cliente con
// privilegios elevados porque, si la confirmación de email está activada,
// todavía no hay sesión de usuario justo después de auth.signUp().
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error(
      "Falta configurar SUPABASE_SERVICE_ROLE_KEY en las variables de entorno."
    );
  }
  return createSupabaseClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

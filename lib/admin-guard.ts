import { createClient } from "@/lib/supabase/server";

// Comprobación de administrador compartida por las acciones del panel y por
// el tablero. Vive fuera de admin-actions.ts (que es "use server") para que
// se pueda importar sin convertirla en una server action expuesta al cliente.
export async function requireAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { supabase, user: null, isAdmin: false as const };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("id", user.id)
    .single();

  return { supabase, user, isAdmin: profile?.is_admin === true };
}

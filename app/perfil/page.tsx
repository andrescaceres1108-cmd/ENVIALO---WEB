import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import PerfilForm, { type PerfilInicial } from "@/components/PerfilForm";

export const dynamic = "force-dynamic";

export default async function PerfilPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/cuenta");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("nombre, pais, telefono, cedula, facebook, instagram, avatar_url")
    .eq("id", user.id)
    .single();

  const perfil: PerfilInicial = {
    nombre: profile?.nombre ?? "",
    pais: profile?.pais === "co" ? "co" : "usa",
    telefono: profile?.telefono ?? "",
    cedula: profile?.cedula ?? null,
    facebook: profile?.facebook ?? null,
    instagram: profile?.instagram ?? null,
    avatar_url: profile?.avatar_url ?? null,
  };

  return (
    <>
      <div className="section-head">
        <h2>Tu perfil</h2>
        <p>Estos son los datos con los que creaste tu cuenta. Puedes editarlos cuando quieras.</p>
      </div>
      <PerfilForm perfil={perfil} email={user.email ?? ""} />
    </>
  );
}

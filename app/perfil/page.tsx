import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export default async function PerfilPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/cuenta?next=/perfil");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("nombre, pais, telefono, cedula")
    .eq("id", user.id)
    .single();

  return (
    <>
      <div className="section-head">
        <h2>Tu perfil</h2>
        <p>Información con la que creaste tu cuenta en SendGO.</p>
      </div>
      <div className="card-form">
        <div className="field">
          <label>Nombre</label>
          <p className="kv-value">{profile?.nombre ?? "—"}</p>
        </div>
        <div className="field">
          <label>Correo</label>
          <p className="kv-value">{user.email}</p>
        </div>
        <div className="field">
          <label>País</label>
          <p className="kv-value">
            {profile?.pais === "co" ? "Colombia" : "Estados Unidos"}
          </p>
        </div>
        <div className="field">
          <label>Teléfono</label>
          <p className="kv-value">{profile?.telefono ?? "—"}</p>
        </div>
        {profile?.cedula && (
          <div className="field">
            <label>Cédula</label>
            <p className="kv-value">{profile.cedula}</p>
          </div>
        )}
      </div>
    </>
  );
}

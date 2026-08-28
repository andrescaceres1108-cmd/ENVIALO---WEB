import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import PublicarForm from "@/components/PublicarForm";

export default async function PublicarPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/cuenta");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("nombre")
    .eq("id", user.id)
    .single();

  return (
    <>
      <div className="section-head">
        <h2>Publicar anuncio</h2>
        <p>¿Viajas pronto y te sobra espacio? Publica tu ruta y deja que te contacten.</p>
      </div>
      <PublicarForm nombrePerfil={profile?.nombre ?? ""} />
    </>
  );
}

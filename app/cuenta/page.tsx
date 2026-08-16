import AccountView from "@/components/AccountView";
import CuentaView from "@/components/CuentaView";
import { createClient } from "@/lib/supabase/server";

export default async function CuentaPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("nombre")
      .eq("id", user.id)
      .single();
    return <CuentaView nombre={profile?.nombre ?? "—"} email={user.email ?? ""} />;
  }

  return (
    <>
      {error === "enlace_invalido" && (
        <p className="form-msg err" style={{ marginTop: 24 }}>
          El enlace para restablecer tu contraseña expiró o no es válido. Solicita uno nuevo
          desde &quot;Iniciar sesión&quot;.
        </p>
      )}
      <AccountView />
    </>
  );
}

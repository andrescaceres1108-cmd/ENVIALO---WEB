import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import ActualizarPasswordView from "@/components/ActualizarPasswordView";

export default async function ActualizarPasswordPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/cuenta?error=enlace_invalido");
  }

  return <ActualizarPasswordView />;
}

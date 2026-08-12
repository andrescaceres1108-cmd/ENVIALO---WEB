import AccountView from "@/components/AccountView";
import CuentaView from "@/components/CuentaView";
import { createClient } from "@/lib/supabase/server";

export default async function CuentaPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;
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

  return <AccountView next={next} />;
}

import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import UserMenu from "@/components/UserMenu";

export default async function Header() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let nombre: string | null = null;
  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("nombre")
      .eq("id", user.id)
      .single();
    nombre = profile?.nombre ?? null;
  }

  return (
    <header>
      <div className="tricolor">
        <span></span>
        <span></span>
        <span></span>
      </div>
      <div className="header-in">
        <Link href="/" className="logo">
          <span className="logo-badge">S</span>
          <span className="logo-text">
            SendGO
            <small>Tu envío. Su viaje.</small>
          </span>
        </Link>
        <nav>
          <Link href="/publicar">Publicar anuncio</Link>
          <Link href="/anuncios">Ver anuncios</Link>
          {user ? (
            <UserMenu nombre={nombre ?? user.email ?? "U"} email={user.email ?? ""} />
          ) : (
            <Link href="/cuenta">Crear cuenta</Link>
          )}
        </nav>
      </div>
    </header>
  );
}

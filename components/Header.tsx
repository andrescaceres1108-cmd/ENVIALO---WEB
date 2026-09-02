import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import Logo from "@/components/Logo";
import UserMenu from "@/components/UserMenu";

export default async function Header() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let nombre: string | null = null;
  let isAdmin = false;
  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("nombre, is_admin")
      .eq("id", user.id)
      .single();
    nombre = profile?.nombre ?? null;
    isAdmin = profile?.is_admin === true;
  }

  return (
    <header>
      <div className="header-in">
        <Link href="/" className="logo" aria-label="SendGo — inicio">
          {/* La marca va en su propia caja para que el arco se mida contra
              "SendGo" y no contra el eslogan, que es más ancho. */}
          <span className="marca">
            <Logo className="marca-arco" />
            <span className="marca-texto">
              Send<span>Go</span>
            </span>
          </span>
          <small>Tu envío. Su viaje.</small>
        </Link>
        <nav>
          <Link href="/publicar">Publicar anuncio</Link>
          <Link href="/anuncios">Ver anuncios</Link>
          {isAdmin && <Link href="/admin">Admin</Link>}
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

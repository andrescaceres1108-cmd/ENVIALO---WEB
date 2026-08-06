import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { logOutAction } from "@/lib/actions";

export default async function Header() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <header>
      <div className="tricolor">
        <span></span>
        <span></span>
        <span></span>
      </div>
      <div className="header-in">
        <Link href="/" className="logo">
          ENVIALO
          <small>USA ⇄ Colombia</small>
        </Link>
        <nav>
          <Link href="/publicar">Publicar anuncio</Link>
          <Link href="/anuncios">Ver anuncios</Link>
          {user ? (
            <form action={logOutAction} style={{ display: "inline" }}>
              <button type="submit">Cerrar sesión</button>
            </form>
          ) : (
            <Link href="/cuenta">Crear cuenta</Link>
          )}
        </nav>
      </div>
    </header>
  );
}

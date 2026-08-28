import { type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

// Refresca el token de sesión de Supabase en cada request. Sin esto, el
// access token (1 hora de vida) expira y los Server Components no pueden
// renovarlo — no pueden escribir cookies —, así que el usuario aparece
// deslogueado aunque su refresh token siga siendo válido. Este archivo
// existía a medias: `lib/supabase/middleware.ts` ya tenía updateSession()
// pero nada la invocaba.
//
// En Next.js 16 la convención `middleware.ts` está deprecada y se renombró
// a `proxy.ts` (ver node_modules/next/dist/docs/.../proxy.md).
export async function proxy(request: NextRequest) {
  return await updateSession(request);
}

export const config = {
  // Se excluyen estáticos e imágenes: no necesitan sesión y hacerlos pasar
  // por aquí solo agrega latencia.
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};

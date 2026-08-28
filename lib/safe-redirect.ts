// `next` llega en la URL del correo de confirmación y es controlable por
// quien arme el enlace, así que solo se aceptan rutas internas.
//
// Sin esta validación, un `next` como "//sitio-malicioso.com" produce
// "https://send-go.vercel.app//sitio-malicioso.com", que el navegador
// interpreta como URL protocolo-relativa y termina redirigiendo fuera del
// sitio justo después de autenticar (open redirect, base de campañas de
// phishing: el enlace se ve legítimo porque el dominio es el real).
export function rutaInternaSegura(raw: string | null | undefined): string {
  if (!raw) return "/";
  // Debe ser una ruta relativa ("/algo"). Se descartan "//" y "/\", que los
  // navegadores tratan como host externo, y cualquier cosa con esquema.
  if (!raw.startsWith("/")) return "/";
  if (raw.startsWith("//") || raw.startsWith("/\\")) return "/";
  return raw;
}

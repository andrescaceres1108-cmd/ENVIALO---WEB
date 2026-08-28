// Candado del sitio: mientras sea true, todo SendGO muestra la página
// "Próximamente" salvo para la cuenta administradora (profiles.is_admin),
// que navega con normalidad. Para lanzar al público: cambiar a false,
// commitear y hacer push (Vercel despliega solo).
export const MODO_PRIVADO = false;

import type { NextConfig } from "next";

// Dominio de Supabase, de donde salen las fotos de perfil y las llamadas a
// la API. Se deriva de la variable de entorno para no fijar el proyecto.
const supabaseOrigin = (() => {
  try {
    return new URL(process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").origin;
  } catch {
    return "";
  }
})();

// Dominios de Vercel Analytics y Speed Insights (los componentes <Analytics>
// y <SpeedInsights> del layout). En producción Vercel los sirve desde el
// propio dominio, pero en desarrollo se cargan desde va.vercel-scripts.com;
// se permiten ambos para que las métricas no se corten en ningún entorno.
const vercelScripts = "https://va.vercel-scripts.com";
const vercelVitals = "https://vitals.vercel-insights.com";

// script-src y style-src necesitan 'unsafe-inline' porque Next.js inyecta
// scripts y estilos en línea para la hidratación. Aun así la CSP sirve: al
// limitar los orígenes permitidos, un script inyectado desde otro dominio
// no carga y no puede mandar datos a un servidor ajeno.
//
// 'unsafe-eval' solo en desarrollo: lo necesita el recargado en caliente de
// Turbopack, y dejarlo fuera de producción cierra una vía de ejecución de
// código.
const esDesarrollo = process.env.NODE_ENV === "development";

const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline' ${esDesarrollo ? "'unsafe-eval' " : ""}${vercelScripts}`,
  "style-src 'self' 'unsafe-inline'",
  `img-src 'self' data: blob: ${supabaseOrigin}`.trim(),
  "font-src 'self' data:",
  `connect-src 'self' ${supabaseOrigin} ${vercelVitals} ${vercelScripts}`.trim(),
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "object-src 'none'",
].join("; ");

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      // La foto de perfil admite hasta 4MB (ver AVATAR_BUCKET en lib/actions.ts);
      // el límite por defecto de Server Actions es 1MB, muy poco para una foto real.
      bodySizeLimit: "5mb",
    },
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "Content-Security-Policy", value: csp },
          // Evita que el sitio se cargue dentro de un iframe ajeno para
          // superponerle controles falsos (clickjacking).
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          // No filtrar la ruta completa a sitios externos: las URLs de
          // anuncio llevan identificadores que no tienen por qué salir.
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=(), payment=()",
          },
        ],
      },
    ];
  },
};

export default nextConfig;

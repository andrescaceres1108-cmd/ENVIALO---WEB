import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import ComingSoon from "@/components/ComingSoon";
import { MODO_PRIVADO } from "@/lib/site-config";
import { createClient } from "@/lib/supabase/server";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL ?? "https://send-go.vercel.app").replace(
  /\/$/,
  ""
);
const title = "SendGO — Envíos entre USA y Colombia con viajeros";
const description =
  "Tablón de anuncios que conecta viajeros con espacio en su maleta con personas que necesitan enviar cosas entre el DMV y Colombia.";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: title,
    template: "%s · SendGO",
  },
  description,
  openGraph: {
    title,
    description,
    url: siteUrl,
    siteName: "SendGO",
    locale: "es_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title,
    description,
  },
  robots: MODO_PRIVADO
    ? { index: false, follow: false }
    : { index: true, follow: true },
};

// Con MODO_PRIVADO activo, solo la cuenta admin ve el sitio; el resto ve
// "Próximamente". El chequeo usa cookies(), lo que vuelve dinámicas todas
// las rutas mientras el candado esté puesto — aceptable en modo privado.
async function esAdmin(): Promise<boolean> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return false;
  const { data: profile } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("id", user.id)
    .single();
  return profile?.is_admin === true;
}

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const mostrarSitio = !MODO_PRIVADO || (await esAdmin());

  return (
    <html
      lang="es"
      className={`${geistSans.variable} ${geistMono.variable}`}
    >
      <body>
        <div className="bg-glow" aria-hidden="true"></div>
        {mostrarSitio ? (
          <>
            <Header />
            <main>{children}</main>
            <Footer />
          </>
        ) : (
          <ComingSoon />
        )}
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}

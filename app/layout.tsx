import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
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

export const metadata: Metadata = {
  title: "SendGO — Envíos entre USA y Colombia con viajeros",
  description:
    "Tablón de anuncios que conecta viajeros con espacio en su maleta con personas que necesitan enviar cosas entre el DMV y Colombia.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="es"
      className={`${geistSans.variable} ${geistMono.variable}`}
    >
      <body>
        <div className="bg-glow" aria-hidden="true"></div>
        <Header />
        <main>{children}</main>
        <Footer />
      </body>
    </html>
  );
}

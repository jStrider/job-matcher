import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Providers } from "@/components/providers";
import { Navbar } from "@/components/navbar";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "Job Matcher — Trouvez le poste idéal",
    template: "%s | Job Matcher",
  },
  description:
    "Plateforme IA de matching d'offres d'emploi avec scoring ATS. Importez votre CV, recherchez sur Indeed, LinkedIn, WTTJ, APEC et obtenez un score de compatibilité instantané.",
  keywords: ["emploi", "job matching", "ATS", "CV", "recherche emploi", "intelligence artificielle"],
  openGraph: {
    title: "Job Matcher — Trouvez le poste idéal",
    description: "Matching d'offres d'emploi propulsé par l'IA avec scoring ATS",
    type: "website",
    locale: "fr_FR",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr" className="dark">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-slate-950 text-slate-200`}
      >
        <a href="#main-content" className="skip-link">
          Aller au contenu principal
        </a>
        <Providers>
          <Navbar />
          <main id="main-content">{children}</main>
        </Providers>
      </body>
    </html>
  );
}

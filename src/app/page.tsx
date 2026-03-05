"use client";

import Link from "next/link";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Briefcase, Target, BarChart3, Zap } from "lucide-react";

export default function LandingPage() {
  const { data: session } = useSession();

  return (
    <div className="min-h-screen bg-slate-950">
      <div className="mx-auto max-w-5xl px-4 py-20">
        <div className="flex flex-col items-center text-center space-y-8">
          <div className="flex items-center gap-3 text-emerald-400">
            <Briefcase className="h-10 w-10" />
            <h1 className="text-4xl font-bold md:text-6xl">Job Matcher</h1>
          </div>

          <p className="max-w-2xl text-lg text-slate-400 md:text-xl">
            Trouvez le poste ideal grace a l&apos;intelligence artificielle.
            Importez votre profil, recherchez des offres et obtenez un score de
            compatibilite ATS instantane.
          </p>

          <div className="flex gap-4">
            {session ? (
              <Link href="/dashboard">
                <Button size="lg">Acceder au tableau de bord</Button>
              </Link>
            ) : (
              <>
                <Link href="/login">
                  <Button size="lg">Commencer</Button>
                </Link>
                <Link href="/login">
                  <Button variant="outline" size="lg">Se connecter</Button>
                </Link>
              </>
            )}
          </div>
        </div>

        <div className="mt-24 grid gap-8 md:grid-cols-3">
          <div className="rounded-xl border border-slate-800 bg-slate-900 p-8 space-y-4">
            <Target className="h-8 w-8 text-emerald-400" />
            <h3 className="text-lg font-semibold">Analyse de profil IA</h3>
            <p className="text-sm text-slate-400">
              Importez votre CV ou profil LinkedIn. Notre IA extrait
              automatiquement vos competences, experience et preferences.
            </p>
          </div>

          <div className="rounded-xl border border-slate-800 bg-slate-900 p-8 space-y-4">
            <Zap className="h-8 w-8 text-emerald-400" />
            <h3 className="text-lg font-semibold">Recherche multi-sources</h3>
            <p className="text-sm text-slate-400">
              Recherchez des offres sur Indeed, LinkedIn, Welcome to the Jungle,
              APEC et plus encore, en une seule recherche.
            </p>
          </div>

          <div className="rounded-xl border border-slate-800 bg-slate-900 p-8 space-y-4">
            <BarChart3 className="h-8 w-8 text-emerald-400" />
            <h3 className="text-lg font-semibold">Score ATS intelligent</h3>
            <p className="text-sm text-slate-400">
              Chaque offre recoit un score de compatibilite 0-100 avec un
              detail des points forts et des competences manquantes.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

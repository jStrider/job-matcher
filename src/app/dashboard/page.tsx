"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScoreBadge } from "@/components/score-badge";
import {
  Loader2,
  Search,
  User,
  Briefcase,
  TrendingUp,
  BarChart3,
  ArrowRight,
  AlertCircle,
} from "lucide-react";

interface DashboardData {
  profile: {
    currentTitle: string | null;
    skills: string[];
    summary: string | null;
    location: string | null;
  } | null;
  recentSearches: {
    id: string;
    query: string;
    createdAt: string;
    _count: { results: number };
  }[];
  topJobs: {
    id: string;
    title: string;
    company: string;
    atsScore: number | null;
    url: string;
  }[];
  stats: {
    totalSearches: number;
    totalJobs: number;
    savedJobs: number;
    avgScore: number;
    scoreDistribution: { range: string; count: number }[];
    topMissingSkills: { skill: string; count: number }[];
  };
}

export default function DashboardPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState(false);

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login");
  }, [status, router]);

  const fetchData = useCallback(async () => {
    setFetchError(false);
    try {
      const res = await fetch("/api/dashboard");
      const json = await res.json();
      setData(json);
    } catch {
      setFetchError(true);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    if (session?.user?.id) {
      fetchData();
    }
  }, [session, fetchData]);

  if (status === "loading" || loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-400" aria-label="Chargement" />
      </div>
    );
  }

  if (fetchError) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-8 text-center space-y-4">
        <AlertCircle className="h-12 w-12 text-red-400 mx-auto" aria-hidden="true" />
        <p className="text-red-400">Erreur lors du chargement du tableau de bord.</p>
        <Button onClick={fetchData}>Réessayer</Button>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="mx-auto max-w-6xl px-3 sm:px-4 py-6 sm:py-8 space-y-6 sm:space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold">Tableau de bord</h1>
          <p className="text-slate-400 text-sm sm:text-base">
            {data.profile
              ? `Bonjour${data.profile.currentTitle ? `, ${data.profile.currentTitle}` : ""}`
              : "Commencez par importer votre profil"}
          </p>
        </div>
        <Link href="/search">
          <Button className="w-full sm:w-auto">
            <Search className="mr-2 h-4 w-4" aria-hidden="true" />
            Nouvelle recherche
          </Button>
        </Link>
      </div>

      {!data.profile && (
        <Card className="border-emerald-800 bg-emerald-950/20">
          <CardContent className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-6">
            <div className="space-y-1">
              <p className="font-semibold">Profil non configuré</p>
              <p className="text-sm text-slate-400">
                Importez votre CV pour obtenir des scores ATS personnalisés
              </p>
            </div>
            <Link href="/profile">
              <Button className="w-full sm:w-auto">
                <User className="mr-2 h-4 w-4" aria-hidden="true" />
                Configurer
              </Button>
            </Link>
          </CardContent>
        </Card>
      )}

      {/* Stats cards */}
      <div className="grid gap-3 sm:gap-4 grid-cols-2 md:grid-cols-4">
        <Card>
          <CardContent className="p-4 sm:p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs sm:text-sm text-slate-400">Recherches</p>
                <p className="text-xl sm:text-2xl font-bold">{data.stats.totalSearches}</p>
              </div>
              <Search className="h-6 w-6 sm:h-8 sm:w-8 text-slate-700" aria-hidden="true" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 sm:p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs sm:text-sm text-slate-400">Offres analysées</p>
                <p className="text-xl sm:text-2xl font-bold">{data.stats.totalJobs}</p>
              </div>
              <Briefcase className="h-6 w-6 sm:h-8 sm:w-8 text-slate-700" aria-hidden="true" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 sm:p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs sm:text-sm text-slate-400">Sauvegardées</p>
                <p className="text-xl sm:text-2xl font-bold">{data.stats.savedJobs}</p>
              </div>
              <TrendingUp className="h-6 w-6 sm:h-8 sm:w-8 text-slate-700" aria-hidden="true" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 sm:p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs sm:text-sm text-slate-400">Score moyen</p>
                <p className="text-xl sm:text-2xl font-bold">
                  {data.stats.avgScore > 0 ? `${data.stats.avgScore}%` : "-"}
                </p>
              </div>
              <BarChart3 className="h-6 w-6 sm:h-8 sm:w-8 text-slate-700" aria-hidden="true" />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 sm:gap-8 lg:grid-cols-2">
        {/* Top matches */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between text-base">
              Meilleurs matchs
              <Link href="/jobs">
                <Button variant="ghost" size="sm">
                  Voir tout <ArrowRight className="ml-1 h-3 w-3" aria-hidden="true" />
                </Button>
              </Link>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {data.topJobs.length === 0 ? (
              <div className="text-center py-6 space-y-2">
                <Search className="h-8 w-8 text-slate-700 mx-auto" aria-hidden="true" />
                <p className="text-sm text-slate-500">Aucune offre analysée</p>
                <Link href="/search">
                  <Button variant="link" size="sm">Lancer une recherche</Button>
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                {data.topJobs.map((job) => (
                  <Link
                    key={job.id}
                    href={`/job/${job.id}`}
                    className="flex items-center gap-3 rounded-lg p-2 hover:bg-slate-800/50 transition-colors"
                  >
                    {job.atsScore !== null && (
                      <ScoreBadge score={job.atsScore} size="sm" />
                    )}
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{job.title}</p>
                      <p className="text-xs text-slate-400">{job.company}</p>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Skill gaps */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Compétences manquantes fréquentes</CardTitle>
          </CardHeader>
          <CardContent>
            {data.stats.topMissingSkills.length === 0 ? (
              <p className="text-sm text-slate-500 text-center py-4">
                Pas encore de données
              </p>
            ) : (
              <div className="space-y-3">
                {data.stats.topMissingSkills.map(({ skill, count }) => (
                  <div key={skill} className="flex items-center justify-between">
                    <Badge variant="destructive">{skill}</Badge>
                    <span className="text-xs text-slate-500">
                      manquante dans {count} offre{count > 1 ? "s" : ""}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Score distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Distribution des scores</CardTitle>
          </CardHeader>
          <CardContent>
            {data.stats.scoreDistribution.length === 0 ? (
              <p className="text-sm text-slate-500 text-center py-4">
                Pas encore de données
              </p>
            ) : (
              <div className="space-y-2">
                {data.stats.scoreDistribution.map(({ range, count }) => (
                  <div key={range} className="flex items-center gap-3">
                    <span className="text-xs text-slate-400 w-16">{range}</span>
                    <div className="flex-1 h-4 bg-slate-800 rounded" role="progressbar" aria-valuenow={count} aria-label={`${range}: ${count}`}>
                      <div
                        className="h-full bg-emerald-600 rounded"
                        style={{
                          width: `${Math.max(4, (count / Math.max(...data.stats.scoreDistribution.map((d) => d.count), 1)) * 100)}%`,
                        }}
                      />
                    </div>
                    <span className="text-xs text-slate-500 w-6 text-right">{count}</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent searches */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Recherches récentes</CardTitle>
          </CardHeader>
          <CardContent>
            {data.recentSearches.length === 0 ? (
              <div className="text-center py-6 space-y-2">
                <Search className="h-8 w-8 text-slate-700 mx-auto" aria-hidden="true" />
                <p className="text-sm text-slate-500">Aucune recherche effectuée</p>
                <Link href="/search">
                  <Button variant="link" size="sm">Rechercher des offres</Button>
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                {data.recentSearches.map((search) => (
                  <div key={search.id} className="flex items-center justify-between">
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{search.query}</p>
                      <p className="text-xs text-slate-500">
                        {new Date(search.createdAt).toLocaleDateString("fr-FR")} — {search._count.results} résultats
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

"use client";

import { useState, useEffect } from "react";
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

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login");
  }, [status, router]);

  useEffect(() => {
    if (session?.user?.id) {
      fetch("/api/dashboard")
        .then((r) => r.json())
        .then(setData)
        .finally(() => setLoading(false));
    }
  }, [session]);

  if (status === "loading" || loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-400" />
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Tableau de bord</h1>
          <p className="text-slate-400">
            {data.profile
              ? `Bonjour${data.profile.currentTitle ? `, ${data.profile.currentTitle}` : ""}`
              : "Commencez par importer votre profil"}
          </p>
        </div>
        <Link href="/search">
          <Button>
            <Search className="mr-2 h-4 w-4" />
            Nouvelle recherche
          </Button>
        </Link>
      </div>

      {!data.profile && (
        <Card className="border-emerald-800 bg-emerald-950/20">
          <CardContent className="flex items-center justify-between p-6">
            <div className="space-y-1">
              <p className="font-semibold">Profil non configure</p>
              <p className="text-sm text-slate-400">
                Importez votre CV pour obtenir des scores ATS personnalises
              </p>
            </div>
            <Link href="/profile">
              <Button>
                <User className="mr-2 h-4 w-4" />
                Configurer
              </Button>
            </Link>
          </CardContent>
        </Card>
      )}

      {/* Stats cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-400">Recherches</p>
                <p className="text-2xl font-bold">{data.stats.totalSearches}</p>
              </div>
              <Search className="h-8 w-8 text-slate-700" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-400">Offres analysees</p>
                <p className="text-2xl font-bold">{data.stats.totalJobs}</p>
              </div>
              <Briefcase className="h-8 w-8 text-slate-700" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-400">Offres sauvegardees</p>
                <p className="text-2xl font-bold">{data.stats.savedJobs}</p>
              </div>
              <TrendingUp className="h-8 w-8 text-slate-700" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-400">Score moyen</p>
                <p className="text-2xl font-bold">
                  {data.stats.avgScore > 0 ? `${data.stats.avgScore}%` : "-"}
                </p>
              </div>
              <BarChart3 className="h-8 w-8 text-slate-700" />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-8 lg:grid-cols-2">
        {/* Top matches */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              Meilleurs matchs
              <Link href="/jobs">
                <Button variant="ghost" size="sm">
                  Voir tout <ArrowRight className="ml-1 h-3 w-3" />
                </Button>
              </Link>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {data.topJobs.length === 0 ? (
              <p className="text-sm text-slate-500 text-center py-4">
                Aucune offre analysee
              </p>
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
            <CardTitle>Competences manquantes frequentes</CardTitle>
          </CardHeader>
          <CardContent>
            {data.stats.topMissingSkills.length === 0 ? (
              <p className="text-sm text-slate-500 text-center py-4">
                Pas encore de donnees
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
            <CardTitle>Distribution des scores</CardTitle>
          </CardHeader>
          <CardContent>
            {data.stats.scoreDistribution.length === 0 ? (
              <p className="text-sm text-slate-500 text-center py-4">
                Pas encore de donnees
              </p>
            ) : (
              <div className="space-y-2">
                {data.stats.scoreDistribution.map(({ range, count }) => (
                  <div key={range} className="flex items-center gap-3">
                    <span className="text-xs text-slate-400 w-16">{range}</span>
                    <div className="flex-1 h-4 bg-slate-800 rounded">
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
            <CardTitle>Recherches recentes</CardTitle>
          </CardHeader>
          <CardContent>
            {data.recentSearches.length === 0 ? (
              <p className="text-sm text-slate-500 text-center py-4">
                Aucune recherche effectuee
              </p>
            ) : (
              <div className="space-y-3">
                {data.recentSearches.map((search) => (
                  <div key={search.id} className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">{search.query}</p>
                      <p className="text-xs text-slate-500">
                        {new Date(search.createdAt).toLocaleDateString("fr-FR")} - {search._count.results} resultats
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

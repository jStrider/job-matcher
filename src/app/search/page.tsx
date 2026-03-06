"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { saveJob } from "@/app/actions/jobs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScoreBadge } from "@/components/score-badge";
import {
  Search,
  Loader2,
  MapPin,
  Building2,
  ExternalLink,
  Bookmark,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

interface Job {
  id: string;
  title: string;
  company: string;
  location: string | null;
  salary: string | null;
  remote: string | null;
  contract: string | null;
  description: string;
  url: string;
  source: string;
  atsScore: number | null;
  matchingSkills: string[];
  missingSkills: string[];
  scoreBreakdown: Record<string, { score: number; max: number; details: string }> | null;
}

export default function SearchPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [location, setLocation] = useState("");
  const [remote, setRemote] = useState("");
  const [contract, setContract] = useState("");
  const [jobs, setJobs] = useState<Job[]>([]);
  const [searching, setSearching] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login");
  }, [status, router]);

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (!query.trim()) return;

    setSearching(true);
    setError("");
    setJobs([]);

    try {
      const res = await fetch("/api/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query, location, remote, contract }),
      });

      const data = await res.json();
      if (data.error) {
        setError(data.error);
      } else {
        setJobs(data.jobs || []);
      }
    } catch {
      setError("Erreur de connexion au serveur. Veuillez réessayer.");
    }
    setSearching(false);
  }

  async function handleSave(jobId: string) {
    const result = await saveJob(jobId);
    if (result.success) {
      setSavedIds((prev) => new Set(prev).add(jobId));
    }
  }

  if (status === "loading") {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-400" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 space-y-6">
      <h1 className="text-2xl font-bold">Rechercher des offres</h1>

      <form onSubmit={handleSearch} className="space-y-4">
        <div className="flex gap-3">
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Titre du poste, compétences..."
            className="flex-1"
          />
          <Input
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder="Ville, région..."
            className="w-48"
          />
          <Button type="submit" disabled={searching || !query.trim()}>
            {searching ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Search className="h-4 w-4" />
            )}
          </Button>
        </div>

        <div className="flex gap-3">
          <Select value={remote} onChange={(e) => setRemote(e.target.value)}>
            <option value="">Tous les modes</option>
            <option value="remote">Télétravail</option>
            <option value="hybrid">Hybride</option>
            <option value="onsite">Sur site</option>
          </Select>
          <Select value={contract} onChange={(e) => setContract(e.target.value)}>
            <option value="">Tous les contrats</option>
            <option value="CDI">CDI</option>
            <option value="CDD">CDD</option>
            <option value="freelance">Freelance</option>
            <option value="stage">Stage</option>
            <option value="alternance">Alternance</option>
          </Select>
        </div>
      </form>

      {searching && (
        <div className="flex flex-col items-center gap-3 py-12">
          <Loader2 className="h-10 w-10 animate-spin text-emerald-400" />
          <p className="text-slate-400">
            Recherche en cours...
          </p>
          <p className="text-xs text-slate-500">
            Analyse des offres et calcul des scores ATS. Cela peut prendre jusqu&apos;à 30 secondes.
          </p>
        </div>
      )}

      {error && (
        <div className="rounded-lg border border-red-800 bg-red-900/20 p-4 text-red-400">
          {error}
        </div>
      )}

      {jobs.length > 0 && (
        <div className="space-y-3">
          <p className="text-sm text-slate-400">
            {jobs.length} résultat{jobs.length > 1 ? "s" : ""} trouvé{jobs.length > 1 ? "s" : ""}
          </p>

          {jobs.map((job) => (
            <Card key={job.id}>
              <CardContent className="p-4">
                <div className="flex items-start gap-4">
                  {job.atsScore !== null && (
                    <ScoreBadge score={job.atsScore} />
                  )}

                  <div className="flex-1 min-w-0 space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <Link
                          href={`/job/${job.id}`}
                          className="font-semibold hover:text-emerald-400 transition-colors"
                        >
                          {job.title}
                        </Link>
                        <div className="flex items-center gap-3 text-sm text-slate-400 mt-1">
                          <span className="flex items-center gap-1">
                            <Building2 className="h-3 w-3" />
                            {job.company}
                          </span>
                          {job.location && (
                            <span className="flex items-center gap-1">
                              <MapPin className="h-3 w-3" />
                              {job.location}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <Badge variant="outline" className="text-xs">
                          {job.source}
                        </Badge>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleSave(job.id)}
                          disabled={savedIds.has(job.id)}
                        >
                          <Bookmark
                            className={`h-4 w-4 ${savedIds.has(job.id) ? "fill-emerald-400 text-emerald-400" : ""}`}
                          />
                        </Button>
                        <a href={job.url} target="_blank" rel="noopener noreferrer">
                          <Button variant="ghost" size="icon">
                            <ExternalLink className="h-4 w-4" />
                          </Button>
                        </a>
                      </div>
                    </div>

                    {job.matchingSkills.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {job.matchingSkills.slice(0, 5).map((skill) => (
                          <Badge key={skill} variant="success" className="text-xs">
                            {skill}
                          </Badge>
                        ))}
                        {job.missingSkills.slice(0, 3).map((skill) => (
                          <Badge key={skill} variant="destructive" className="text-xs">
                            {skill}
                          </Badge>
                        ))}
                      </div>
                    )}

                    <button
                      onClick={() => setExpanded(expanded === job.id ? null : job.id)}
                      className="flex items-center gap-1 text-xs text-slate-500 hover:text-slate-300"
                    >
                      {expanded === job.id ? (
                        <>
                          <ChevronUp className="h-3 w-3" /> Masquer
                        </>
                      ) : (
                        <>
                          <ChevronDown className="h-3 w-3" /> Details
                        </>
                      )}
                    </button>

                    {expanded === job.id && (
                      <div className="mt-3 space-y-3 border-t border-slate-800 pt-3">
                        <p className="text-sm text-slate-300 whitespace-pre-wrap line-clamp-[20]">
                          {job.description.slice(0, 2000)}
                        </p>
                        <Link href={`/job/${job.id}`}>
                          <Button variant="link" size="sm">
                            Voir l&apos;analyse complete
                          </Button>
                        </Link>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

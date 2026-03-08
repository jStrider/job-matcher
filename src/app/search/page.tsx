"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { saveJob } from "@/app/actions/jobs";
import { useToast } from "@/components/use-toast";
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
  Sparkles,
  Zap,
  AlertCircle,
  RefreshCw,
  SearchX,
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

interface ProfileData {
  currentTitle: string | null;
  skills: string[];
  location: string | null;
  desiredRoles: string[];
  remotePreference: string | null;
  desiredSalary: string | null;
}

const SOURCE_ICONS: Record<string, { label: string; color: string }> = {
  indeed: { label: "Indeed", color: "bg-blue-600/20 text-blue-400 border-blue-600/30" },
  linkedin: { label: "LinkedIn", color: "bg-sky-600/20 text-sky-400 border-sky-600/30" },
  wttj: { label: "Welcome to the Jungle", color: "bg-yellow-600/20 text-yellow-400 border-yellow-600/30" },
  apec: { label: "APEC", color: "bg-red-600/20 text-red-400 border-red-600/30" },
  "france-travail": { label: "France Travail", color: "bg-purple-600/20 text-purple-400 border-purple-600/30" },
  other: { label: "Autre", color: "bg-slate-600/20 text-slate-400 border-slate-600/30" },
};

export default function SearchPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { toast } = useToast();
  const [query, setQuery] = useState("");
  const [location, setLocation] = useState("");
  const [remote, setRemote] = useState("");
  const [contract, setContract] = useState("");
  const [jobs, setJobs] = useState<Job[]>([]);
  const [searching, setSearching] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());
  const [savingIds, setSavingIds] = useState<Set<string>>(new Set());
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [smartSearching, setSmartSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login");
  }, [status, router]);

  useEffect(() => {
    if (session?.user?.id) {
      fetch("/api/profile")
        .then((r) => r.json())
        .then((data) => {
          if (data.profile) {
            setProfile(data.profile);
            if (data.profile.location && !location) {
              setLocation(data.profile.location);
            }
            if (data.profile.remotePreference && !remote) {
              setRemote(data.profile.remotePreference);
            }
          }
        });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session]);

  const uniqueSuggestions = useMemo(() => {
    if (!profile) return [];
    const suggestions: string[] = [];
    if (profile.desiredRoles?.length > 0) {
      suggestions.push(...profile.desiredRoles.slice(0, 3));
    }
    if (profile.currentTitle) {
      suggestions.push(profile.currentTitle);
    }
    if (profile.skills?.length > 0) {
      const topSkills = profile.skills.slice(0, 3);
      suggestions.push(`${topSkills[0]} ${topSkills[1] || ""}`.trim());
    }
    return [...new Set(suggestions)].slice(0, 5);
  }, [profile]);

  const sourceCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    jobs.forEach((j) => {
      counts[j.source] = (counts[j.source] || 0) + 1;
    });
    return counts;
  }, [jobs]);

  const handleSearch = useCallback(async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!query.trim()) return;

    setSearching(true);
    setError("");
    setJobs([]);
    setHasSearched(true);

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
  }, [query, location, remote, contract]);

  const handleSmartSearch = useCallback(async () => {
    if (!profile) return;
    setSmartSearching(true);
    setError("");
    setJobs([]);
    setHasSearched(true);

    try {
      const res = await fetch("/api/search/smart", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      const data = await res.json();
      if (data.error) {
        setError(data.error);
      } else {
        setJobs(data.jobs || []);
        if (data.query) setQuery(data.query);
      }
    } catch {
      setError("Erreur de connexion au serveur. Veuillez réessayer.");
    }
    setSmartSearching(false);
  }, [profile]);

  const handleSave = useCallback(async (jobId: string) => {
    setSavingIds((prev) => new Set(prev).add(jobId));
    try {
      const result = await saveJob(jobId);
      if (result.success) {
        setSavedIds((prev) => new Set(prev).add(jobId));
        toast({ title: "Offre sauvegardée", variant: "success" });
      }
    } catch {
      toast({ title: "Erreur lors de la sauvegarde", variant: "destructive" });
    }
    setSavingIds((prev) => {
      const next = new Set(prev);
      next.delete(jobId);
      return next;
    });
  }, [toast]);

  if (status === "loading") {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-400" aria-label="Chargement" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-3 sm:px-4 py-6 sm:py-8 space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <h1 className="text-xl sm:text-2xl font-bold">Rechercher des offres</h1>
        {profile && (
          <Button
            onClick={handleSmartSearch}
            disabled={smartSearching || searching}
            variant="outline"
            className="border-emerald-600/50 text-emerald-400 hover:bg-emerald-600/10 w-full sm:w-auto"
          >
            {smartSearching ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
            ) : (
              <Sparkles className="mr-2 h-4 w-4" aria-hidden="true" />
            )}
            Recherche intelligente
          </Button>
        )}
      </div>

      {/* Profile-based suggestions */}
      {uniqueSuggestions.length > 0 && !searching && jobs.length === 0 && (
        <div className="space-y-2">
          <p className="text-sm text-slate-500 flex items-center gap-1">
            <Zap className="h-3 w-3" aria-hidden="true" />
            Suggestions basées sur votre profil
          </p>
          <div className="flex flex-wrap gap-2">
            {uniqueSuggestions.map((s) => (
              <button
                key={s}
                onClick={() => setQuery(s)}
                className={`rounded-full border px-3 py-1.5 text-sm transition-all hover:border-emerald-500/50 hover:bg-emerald-500/10 ${
                  query === s
                    ? "border-emerald-500 bg-emerald-500/20 text-emerald-300"
                    : "border-slate-700 text-slate-300"
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      )}

      <form onSubmit={handleSearch} className="space-y-3 sm:space-y-4" role="search">
        <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Titre du poste, compétences..."
            className="flex-1"
            aria-label="Recherche d'emploi"
          />
          <div className="flex gap-2">
            <Input
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="Ville, région..."
              className="flex-1 sm:w-48 sm:flex-none"
              aria-label="Localisation"
            />
            <Button type="submit" disabled={searching || !query.trim()} aria-label="Lancer la recherche">
              {searching ? (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              ) : (
                <Search className="h-4 w-4" aria-hidden="true" />
              )}
            </Button>
          </div>
        </div>

        <div className="flex gap-2 sm:gap-3">
          <Select value={remote} onChange={(e) => setRemote(e.target.value)} aria-label="Mode de travail">
            <option value="">Tous les modes</option>
            <option value="remote">Télétravail</option>
            <option value="hybrid">Hybride</option>
            <option value="onsite">Sur site</option>
          </Select>
          <Select value={contract} onChange={(e) => setContract(e.target.value)} aria-label="Type de contrat">
            <option value="">Tous les contrats</option>
            <option value="CDI">CDI</option>
            <option value="CDD">CDD</option>
            <option value="freelance">Freelance</option>
            <option value="stage">Stage</option>
            <option value="alternance">Alternance</option>
          </Select>
        </div>

        {/* Sources indicator */}
        <div className="flex flex-wrap gap-2">
          <span className="text-xs text-slate-500 py-1">Sources :</span>
          {Object.entries(SOURCE_ICONS).filter(([k]) => k !== "other").map(([key, { label, color }]) => (
            <span key={key} className={`rounded-full border px-2 py-0.5 text-xs ${color}`}>
              {label}
            </span>
          ))}
        </div>
      </form>

      {(searching || smartSearching) && (
        <div className="flex flex-col items-center gap-3 py-12" role="status" aria-live="polite">
          <Loader2 className="h-10 w-10 animate-spin text-emerald-400" aria-hidden="true" />
          <p className="text-slate-400">
            {smartSearching
              ? "Recherche intelligente en cours..."
              : "Recherche en cours..."}
          </p>
          <p className="text-xs text-slate-500 text-center px-4">
            {smartSearching
              ? "Analyse de votre profil, recherche sur plusieurs plateformes et scoring ATS."
              : "Analyse des offres et calcul des scores ATS. Cela peut prendre jusqu'à 30 secondes."}
          </p>
        </div>
      )}

      {error && (
        <div
          className="flex items-start gap-3 rounded-lg border border-red-800 bg-red-900/20 p-4"
          role="alert"
        >
          <AlertCircle className="h-5 w-5 text-red-400 mt-0.5 shrink-0" aria-hidden="true" />
          <div className="flex-1">
            <p className="text-red-400">{error}</p>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setError("");
                if (query.trim()) handleSearch();
                else if (profile) handleSmartSearch();
              }}
              className="mt-2 text-red-400 hover:text-red-300"
            >
              <RefreshCw className="mr-2 h-3 w-3" aria-hidden="true" />
              Réessayer
            </Button>
          </div>
        </div>
      )}

      {/* Empty state after search */}
      {hasSearched && !searching && !smartSearching && !error && jobs.length === 0 && (
        <div className="flex flex-col items-center gap-3 py-12 text-center">
          <SearchX className="h-12 w-12 text-slate-700" aria-hidden="true" />
          <p className="text-slate-400 font-medium">Aucun résultat trouvé</p>
          <p className="text-sm text-slate-500 max-w-md">
            Essayez d&apos;élargir votre recherche avec des termes plus généraux ou une autre localisation.
          </p>
        </div>
      )}

      {jobs.length > 0 && (
        <div className="space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <p className="text-sm text-slate-400">
              {jobs.length} résultat{jobs.length > 1 ? "s" : ""} trouvé{jobs.length > 1 ? "s" : ""}
            </p>
            <div className="flex flex-wrap gap-2">
              {Object.entries(sourceCounts).map(([source, count]) => {
                const info = SOURCE_ICONS[source] || SOURCE_ICONS.other;
                return (
                  <span key={source} className={`rounded-full border px-2 py-0.5 text-xs ${info.color}`}>
                    {info.label} ({count})
                  </span>
                );
              })}
            </div>
          </div>

          {jobs.map((job) => {
            const sourceInfo = SOURCE_ICONS[job.source] || SOURCE_ICONS.other;
            return (
              <Card key={job.id}>
                <CardContent className="p-3 sm:p-4">
                  <div className="flex items-start gap-3 sm:gap-4">
                    {job.atsScore !== null && (
                      <div className="hidden sm:block">
                        <ScoreBadge score={job.atsScore} />
                      </div>
                    )}

                    <div className="flex-1 min-w-0 space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            {job.atsScore !== null && (
                              <div className="sm:hidden">
                                <ScoreBadge score={job.atsScore} size="sm" />
                              </div>
                            )}
                            <Link
                              href={`/job/${job.id}`}
                              className="font-semibold hover:text-emerald-400 transition-colors truncate block"
                            >
                              {job.title}
                            </Link>
                          </div>
                          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-slate-400 mt-1">
                            <span className="flex items-center gap-1">
                              <Building2 className="h-3 w-3" aria-hidden="true" />
                              {job.company}
                            </span>
                            {job.location && (
                              <span className="flex items-center gap-1">
                                <MapPin className="h-3 w-3" aria-hidden="true" />
                                {job.location}
                              </span>
                            )}
                            <Badge variant="outline" className={`text-xs ${sourceInfo.color}`}>
                              {sourceInfo.label}
                            </Badge>
                          </div>
                        </div>

                        <div className="flex items-center gap-1 sm:gap-2 shrink-0">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleSave(job.id)}
                            disabled={savedIds.has(job.id) || savingIds.has(job.id)}
                            aria-label={savedIds.has(job.id) ? "Offre sauvegardée" : "Sauvegarder l'offre"}
                          >
                            {savingIds.has(job.id) ? (
                              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                            ) : (
                              <Bookmark
                                className={`h-4 w-4 ${savedIds.has(job.id) ? "fill-emerald-400 text-emerald-400" : ""}`}
                                aria-hidden="true"
                              />
                            )}
                          </Button>
                          <a href={job.url} target="_blank" rel="noopener noreferrer">
                            <Button variant="ghost" size="icon" aria-label="Ouvrir l'offre originale">
                              <ExternalLink className="h-4 w-4" aria-hidden="true" />
                            </Button>
                          </a>
                        </div>
                      </div>

                      {job.matchingSkills.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {job.matchingSkills.slice(0, 5).map((skill) => (
                            <Badge key={skill} variant="success" className="text-xs">
                              ✓ {skill}
                            </Badge>
                          ))}
                          {job.missingSkills.slice(0, 3).map((skill) => (
                            <Badge key={skill} variant="destructive" className="text-xs">
                              ✗ {skill}
                            </Badge>
                          ))}
                        </div>
                      )}

                      <button
                        onClick={() => setExpanded(expanded === job.id ? null : job.id)}
                        className="flex items-center gap-1 text-xs text-slate-500 hover:text-slate-300"
                        aria-expanded={expanded === job.id}
                      >
                        {expanded === job.id ? (
                          <>
                            <ChevronUp className="h-3 w-3" aria-hidden="true" /> Masquer
                          </>
                        ) : (
                          <>
                            <ChevronDown className="h-3 w-3" aria-hidden="true" /> Détails
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
                              Voir l&apos;analyse complète →
                            </Button>
                          </Link>
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

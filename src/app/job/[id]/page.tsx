"use client";

import { useState, useEffect, use } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { saveJob } from "@/app/actions/jobs";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScoreBadge, ScoreBar } from "@/components/score-badge";
import {
  Loader2,
  Building2,
  MapPin,
  ExternalLink,
  Bookmark,
  ArrowLeft,
} from "lucide-react";
import Link from "next/link";

interface JobDetail {
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
  scoreBreakdown: Record<string, { score: number; max: number; details: string }> | null;
  matchingSkills: string[];
  missingSkills: string[];
  createdAt: string;
}

export default function JobDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { data: session, status } = useSession();
  const router = useRouter();
  const [job, setJob] = useState<JobDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login");
  }, [status, router]);

  useEffect(() => {
    if (session?.user?.id && id) {
      fetch(`/api/job/${id}`)
        .then((r) => r.json())
        .then((data) => {
          setJob(data.job);
          setSaved(data.isSaved);
        })
        .finally(() => setLoading(false));
    }
  }, [session, id]);

  async function handleSave() {
    if (!job) return;
    const result = await saveJob(job.id);
    if (result.success) setSaved(true);
  }

  if (status === "loading" || loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-400" />
      </div>
    );
  }

  if (!job) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-8 text-center">
        <p className="text-slate-400">Offre non trouvee</p>
        <Link href="/search">
          <Button variant="link">Retour a la recherche</Button>
        </Link>
      </div>
    );
  }

  const breakdownLabels: Record<string, string> = {
    keywordMatch: "Mots-cles",
    skillsAlignment: "Competences",
    experienceRelevance: "Experience",
    jobTitleMatch: "Titre du poste",
    educationMatch: "Formation",
    locationMatch: "Localisation",
    languageMatch: "Langues",
    overallFit: "Adequation globale",
  };

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 space-y-6">
      <Link
        href="/search"
        className="inline-flex items-center gap-1 text-sm text-slate-400 hover:text-slate-200"
      >
        <ArrowLeft className="h-4 w-4" />
        Retour
      </Link>

      <div className="flex items-start justify-between gap-4">
        <div className="space-y-2">
          <h1 className="text-2xl font-bold">{job.title}</h1>
          <div className="flex items-center gap-4 text-slate-400">
            <span className="flex items-center gap-1">
              <Building2 className="h-4 w-4" />
              {job.company}
            </span>
            {job.location && (
              <span className="flex items-center gap-1">
                <MapPin className="h-4 w-4" />
                {job.location}
              </span>
            )}
          </div>
          <div className="flex gap-2">
            <Badge variant="outline">{job.source}</Badge>
            {job.remote && <Badge variant="secondary">{job.remote}</Badge>}
            {job.contract && <Badge variant="secondary">{job.contract}</Badge>}
            {job.salary && <Badge variant="secondary">{job.salary}</Badge>}
          </div>
        </div>

        <div className="flex items-center gap-3">
          {job.atsScore !== null && <ScoreBadge score={job.atsScore} size="lg" />}
          <div className="flex flex-col gap-2">
            <Button onClick={handleSave} disabled={saved} variant={saved ? "secondary" : "default"}>
              <Bookmark className={`mr-2 h-4 w-4 ${saved ? "fill-current" : ""}`} />
              {saved ? "Sauvegardee" : "Sauvegarder"}
            </Button>
            <a href={job.url} target="_blank" rel="noopener noreferrer">
              <Button variant="outline" className="w-full">
                <ExternalLink className="mr-2 h-4 w-4" />
                Voir l&apos;offre
              </Button>
            </a>
          </div>
        </div>
      </div>

      {/* ATS Score Breakdown */}
      {job.scoreBreakdown && (
        <Card>
          <CardHeader>
            <CardTitle>Analyse ATS detaillee</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3 md:grid-cols-2">
              {Object.entries(job.scoreBreakdown).map(([key, data]) => (
                <div key={key} className="space-y-1">
                  <ScoreBar
                    score={data.score}
                    max={data.max}
                    label={breakdownLabels[key] || key}
                  />
                  <p className="text-xs text-slate-500">{data.details}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Skills */}
      {(job.matchingSkills.length > 0 || job.missingSkills.length > 0) && (
        <div className="grid gap-4 md:grid-cols-2">
          {job.matchingSkills.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm text-green-400">
                  Competences correspondantes
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {job.matchingSkills.map((skill) => (
                    <Badge key={skill} variant="success">{skill}</Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
          {job.missingSkills.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm text-red-400">
                  Competences manquantes
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {job.missingSkills.map((skill) => (
                    <Badge key={skill} variant="destructive">{skill}</Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Job description */}
      <Card>
        <CardHeader>
          <CardTitle>Description du poste</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="prose prose-invert prose-sm max-w-none">
            <p className="whitespace-pre-wrap text-sm text-slate-300">
              {job.description}
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

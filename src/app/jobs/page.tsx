"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { updateJobStatus, updateJobNotes, unsaveJob } from "@/app/actions/jobs";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { ScoreBadge } from "@/components/score-badge";
import {
  Loader2,
  Building2,
  MapPin,
  ExternalLink,
  Trash2,
  MessageSquare,
  X,
} from "lucide-react";

interface SavedJobItem {
  id: string;
  status: string;
  notes: string | null;
  appliedAt: string | null;
  job: {
    id: string;
    title: string;
    company: string;
    location: string | null;
    atsScore: number | null;
    url: string;
    source: string;
  };
}

const columns = [
  { id: "saved", label: "Sauvegardées", color: "border-slate-600" },
  { id: "applied", label: "Candidatures", color: "border-blue-600" },
  { id: "interview", label: "Entretien", color: "border-yellow-600" },
  { id: "offer", label: "Offre", color: "border-green-600" },
  { id: "rejected", label: "Refusée", color: "border-red-600" },
];

export default function JobsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [jobs, setJobs] = useState<SavedJobItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [notesEditing, setNotesEditing] = useState<string | null>(null);
  const [notesText, setNotesText] = useState("");

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login");
  }, [status, router]);

  useEffect(() => {
    if (session?.user?.id) {
      fetchJobs();
    }
  }, [session]);

  async function fetchJobs() {
    const res = await fetch("/api/saved-jobs");
    const data = await res.json();
    setJobs(data.jobs || []);
    setLoading(false);
  }

  async function handleStatusChange(savedJobId: string, newStatus: string) {
    await updateJobStatus(savedJobId, newStatus);
    setJobs((prev) =>
      prev.map((j) => (j.id === savedJobId ? { ...j, status: newStatus } : j))
    );
  }

  async function handleSaveNotes(savedJobId: string) {
    await updateJobNotes(savedJobId, notesText);
    setJobs((prev) =>
      prev.map((j) => (j.id === savedJobId ? { ...j, notes: notesText } : j))
    );
    setNotesEditing(null);
  }

  async function handleRemove(savedJobId: string, jobId: string) {
    await unsaveJob(jobId);
    setJobs((prev) => prev.filter((j) => j.id !== savedJobId));
  }

  if (status === "loading" || loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-400" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 space-y-6">
      <h1 className="text-2xl font-bold">Mes offres</h1>

      {jobs.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-slate-400 mb-4">Aucune offre sauvegardée</p>
          <Link href="/search">
            <Button>Rechercher des offres</Button>
          </Link>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-5">
          {columns.map((col) => {
            const colJobs = jobs.filter((j) => j.status === col.id);
            return (
              <div key={col.id} className="space-y-3">
                <div className={`border-t-2 ${col.color} pt-2`}>
                  <h3 className="text-sm font-semibold text-slate-300">
                    {col.label}{" "}
                    <span className="text-slate-500">({colJobs.length})</span>
                  </h3>
                </div>

                {colJobs.map((savedJob) => (
                  <Card key={savedJob.id} className="text-sm">
                    <CardContent className="p-3 space-y-2">
                      <div className="flex items-start justify-between gap-1">
                        <Link
                          href={`/job/${savedJob.job.id}`}
                          className="font-medium hover:text-emerald-400 transition-colors text-xs leading-tight"
                        >
                          {savedJob.job.title}
                        </Link>
                        {savedJob.job.atsScore !== null && (
                          <ScoreBadge score={savedJob.job.atsScore} size="sm" />
                        )}
                      </div>

                      <div className="flex items-center gap-1 text-xs text-slate-400">
                        <Building2 className="h-3 w-3" />
                        {savedJob.job.company}
                      </div>

                      {savedJob.job.location && (
                        <div className="flex items-center gap-1 text-xs text-slate-500">
                          <MapPin className="h-3 w-3" />
                          {savedJob.job.location}
                        </div>
                      )}

                      {/* Status selector */}
                      <select
                        value={savedJob.status}
                        onChange={(e) => handleStatusChange(savedJob.id, e.target.value)}
                        className="w-full text-xs bg-slate-800 border border-slate-700 rounded px-2 py-1 text-slate-300"
                      >
                        {columns.map((c) => (
                          <option key={c.id} value={c.id}>{c.label}</option>
                        ))}
                      </select>

                      {/* Notes */}
                      {notesEditing === savedJob.id ? (
                        <div className="space-y-1">
                          <Textarea
                            value={notesText}
                            onChange={(e) => setNotesText(e.target.value)}
                            className="text-xs min-h-[60px]"
                            placeholder="Notes..."
                          />
                          <div className="flex gap-1">
                            <Button
                              size="sm"
                              className="text-xs h-6"
                              onClick={() => handleSaveNotes(savedJob.id)}
                            >
                              Sauver
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="text-xs h-6"
                              onClick={() => setNotesEditing(null)}
                            >
                              <X className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      ) : savedJob.notes ? (
                        <p
                          className="text-xs text-slate-400 cursor-pointer hover:text-slate-300"
                          onClick={() => {
                            setNotesEditing(savedJob.id);
                            setNotesText(savedJob.notes || "");
                          }}
                        >
                          {savedJob.notes}
                        </p>
                      ) : null}

                      <div className="flex items-center gap-1 pt-1 border-t border-slate-800">
                        <button
                          onClick={() => {
                            setNotesEditing(savedJob.id);
                            setNotesText(savedJob.notes || "");
                          }}
                          className="text-slate-500 hover:text-slate-300"
                          title="Notes"
                        >
                          <MessageSquare className="h-3 w-3" />
                        </button>
                        <a
                          href={savedJob.job.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-slate-500 hover:text-slate-300"
                        >
                          <ExternalLink className="h-3 w-3" />
                        </a>
                        <Badge variant="outline" className="text-[10px] ml-auto">
                          {savedJob.job.source}
                        </Badge>
                        <button
                          onClick={() => handleRemove(savedJob.id, savedJob.job.id)}
                          className="text-slate-500 hover:text-red-400"
                          title="Supprimer"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

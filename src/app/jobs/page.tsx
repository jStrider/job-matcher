"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { updateJobStatus, updateJobNotes, unsaveJob } from "@/app/actions/jobs";
import { useToast } from "@/components/use-toast";
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
  Search,
  Briefcase,
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
  const { toast } = useToast();
  const [jobs, setJobs] = useState<SavedJobItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState(false);
  const [notesEditing, setNotesEditing] = useState<string | null>(null);
  const [notesText, setNotesText] = useState("");
  const [deletingIds, setDeletingIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login");
  }, [status, router]);

  const fetchJobs = useCallback(async () => {
    setFetchError(false);
    try {
      const res = await fetch("/api/saved-jobs");
      const data = await res.json();
      setJobs(data.jobs || []);
    } catch {
      setFetchError(true);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    if (session?.user?.id) {
      fetchJobs();
    }
  }, [session, fetchJobs]);

  const handleStatusChange = useCallback(async (savedJobId: string, newStatus: string) => {
    setJobs((prev) =>
      prev.map((j) => (j.id === savedJobId ? { ...j, status: newStatus } : j))
    );
    try {
      await updateJobStatus(savedJobId, newStatus);
      toast({ title: "Statut mis à jour", variant: "success" });
    } catch {
      toast({ title: "Erreur lors de la mise à jour", variant: "destructive" });
      fetchJobs();
    }
  }, [toast, fetchJobs]);

  const handleSaveNotes = useCallback(async (savedJobId: string) => {
    const text = notesText;
    setJobs((prev) =>
      prev.map((j) => (j.id === savedJobId ? { ...j, notes: text } : j))
    );
    setNotesEditing(null);
    try {
      await updateJobNotes(savedJobId, text);
      toast({ title: "Notes sauvegardées", variant: "success" });
    } catch {
      toast({ title: "Erreur lors de la sauvegarde des notes", variant: "destructive" });
    }
  }, [notesText, toast]);

  const handleRemove = useCallback(async (savedJobId: string, jobId: string) => {
    setDeletingIds((prev) => new Set(prev).add(savedJobId));
    try {
      await unsaveJob(jobId);
      setJobs((prev) => prev.filter((j) => j.id !== savedJobId));
      toast({ title: "Offre retirée" });
    } catch {
      toast({ title: "Erreur lors de la suppression", variant: "destructive" });
    }
    setDeletingIds((prev) => {
      const next = new Set(prev);
      next.delete(savedJobId);
      return next;
    });
  }, [toast]);

  const jobsByColumn = useMemo(() => {
    const map: Record<string, SavedJobItem[]> = {};
    columns.forEach((col) => {
      map[col.id] = jobs.filter((j) => j.status === col.id);
    });
    return map;
  }, [jobs]);

  if (status === "loading" || loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-400" aria-label="Chargement" />
      </div>
    );
  }

  if (fetchError) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-8 text-center space-y-4">
        <p className="text-red-400">Erreur lors du chargement des offres.</p>
        <Button onClick={fetchJobs}>Réessayer</Button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-3 sm:px-4 py-6 sm:py-8 space-y-4 sm:space-y-6">
      <h1 className="text-xl sm:text-2xl font-bold">Mes offres</h1>

      {jobs.length === 0 ? (
        <div className="flex flex-col items-center gap-4 text-center py-16">
          <Briefcase className="h-16 w-16 text-slate-700" aria-hidden="true" />
          <div>
            <p className="text-lg font-medium text-slate-400">Aucune offre sauvegardée</p>
            <p className="text-sm text-slate-500 mt-1">
              Sauvegardez des offres depuis la recherche pour les retrouver ici et suivre vos candidatures.
            </p>
          </div>
          <Link href="/search">
            <Button>
              <Search className="mr-2 h-4 w-4" aria-hidden="true" />
              Rechercher des offres
            </Button>
          </Link>
        </div>
      ) : (
        <>
          {/* Mobile: stacked view with only non-empty columns */}
          <div className="block md:hidden space-y-6">
            {columns.map((col) => {
              const colJobs = jobsByColumn[col.id];
              if (colJobs.length === 0) return null;
              return (
                <div key={col.id} className="space-y-3">
                  <div className={`border-t-2 ${col.color} pt-2`}>
                    <h3 className="text-sm font-semibold text-slate-300">
                      {col.label}{" "}
                      <span className="text-slate-500">({colJobs.length})</span>
                    </h3>
                  </div>
                  {colJobs.map((savedJob) => (
                    <JobCard
                      key={savedJob.id}
                      savedJob={savedJob}
                      isEditingNotes={notesEditing === savedJob.id}
                      notesText={notesText}
                      isDeleting={deletingIds.has(savedJob.id)}
                      onStatusChange={handleStatusChange}
                      onNotesEdit={(id, text) => { setNotesEditing(id); setNotesText(text); }}
                      onNotesSave={handleSaveNotes}
                      onNotesCancel={() => setNotesEditing(null)}
                      onNotesTextChange={setNotesText}
                      onRemove={handleRemove}
                    />
                  ))}
                </div>
              );
            })}
          </div>

          {/* Desktop: kanban grid */}
          <div className="hidden md:grid gap-4 md:grid-cols-5">
            {columns.map((col) => {
              const colJobs = jobsByColumn[col.id];
              return (
                <div key={col.id} className="space-y-3">
                  <div className={`border-t-2 ${col.color} pt-2`}>
                    <h3 className="text-sm font-semibold text-slate-300">
                      {col.label}{" "}
                      <span className="text-slate-500">({colJobs.length})</span>
                    </h3>
                  </div>
                  {colJobs.length === 0 && (
                    <p className="text-xs text-slate-600 text-center py-4">Aucune offre</p>
                  )}
                  {colJobs.map((savedJob) => (
                    <JobCard
                      key={savedJob.id}
                      savedJob={savedJob}
                      isEditingNotes={notesEditing === savedJob.id}
                      notesText={notesText}
                      isDeleting={deletingIds.has(savedJob.id)}
                      onStatusChange={handleStatusChange}
                      onNotesEdit={(id, text) => { setNotesEditing(id); setNotesText(text); }}
                      onNotesSave={handleSaveNotes}
                      onNotesCancel={() => setNotesEditing(null)}
                      onNotesTextChange={setNotesText}
                      onRemove={handleRemove}
                    />
                  ))}
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

interface JobCardProps {
  savedJob: SavedJobItem;
  isEditingNotes: boolean;
  notesText: string;
  isDeleting: boolean;
  onStatusChange: (id: string, status: string) => void;
  onNotesEdit: (id: string, text: string) => void;
  onNotesSave: (id: string) => void;
  onNotesCancel: () => void;
  onNotesTextChange: (text: string) => void;
  onRemove: (savedJobId: string, jobId: string) => void;
}

function JobCard({
  savedJob,
  isEditingNotes,
  notesText,
  isDeleting,
  onStatusChange,
  onNotesEdit,
  onNotesSave,
  onNotesCancel,
  onNotesTextChange,
  onRemove,
}: JobCardProps) {
  return (
    <Card className="text-sm">
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
          <Building2 className="h-3 w-3" aria-hidden="true" />
          {savedJob.job.company}
        </div>

        {savedJob.job.location && (
          <div className="flex items-center gap-1 text-xs text-slate-500">
            <MapPin className="h-3 w-3" aria-hidden="true" />
            {savedJob.job.location}
          </div>
        )}

        <select
          value={savedJob.status}
          onChange={(e) => onStatusChange(savedJob.id, e.target.value)}
          className="w-full text-xs bg-slate-800 border border-slate-700 rounded px-2 py-1 text-slate-300"
          aria-label={`Statut de ${savedJob.job.title}`}
        >
          {columns.map((c) => (
            <option key={c.id} value={c.id}>{c.label}</option>
          ))}
        </select>

        {isEditingNotes ? (
          <div className="space-y-1">
            <Textarea
              value={notesText}
              onChange={(e) => onNotesTextChange(e.target.value)}
              className="text-xs min-h-[60px]"
              placeholder="Notes..."
              aria-label="Notes"
            />
            <div className="flex gap-1">
              <Button
                size="sm"
                className="text-xs h-6"
                onClick={() => onNotesSave(savedJob.id)}
              >
                Sauver
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="text-xs h-6"
                onClick={onNotesCancel}
                aria-label="Annuler"
              >
                <X className="h-3 w-3" aria-hidden="true" />
              </Button>
            </div>
          </div>
        ) : savedJob.notes ? (
          <p
            className="text-xs text-slate-400 cursor-pointer hover:text-slate-300"
            onClick={() => onNotesEdit(savedJob.id, savedJob.notes || "")}
          >
            {savedJob.notes}
          </p>
        ) : null}

        <div className="flex items-center gap-1 pt-1 border-t border-slate-800">
          <button
            onClick={() => onNotesEdit(savedJob.id, savedJob.notes || "")}
            className="text-slate-500 hover:text-slate-300 p-1"
            aria-label="Modifier les notes"
          >
            <MessageSquare className="h-3 w-3" aria-hidden="true" />
          </button>
          <a
            href={savedJob.job.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-slate-500 hover:text-slate-300 p-1"
            aria-label="Voir l'offre originale"
          >
            <ExternalLink className="h-3 w-3" aria-hidden="true" />
          </a>
          <Badge variant="outline" className="text-[10px] ml-auto">
            {savedJob.job.source}
          </Badge>
          <button
            onClick={() => onRemove(savedJob.id, savedJob.job.id)}
            className="text-slate-500 hover:text-red-400 p-1"
            disabled={isDeleting}
            aria-label="Supprimer l'offre"
          >
            {isDeleting ? (
              <Loader2 className="h-3 w-3 animate-spin" aria-hidden="true" />
            ) : (
              <Trash2 className="h-3 w-3" aria-hidden="true" />
            )}
          </button>
        </div>
      </CardContent>
    </Card>
  );
}

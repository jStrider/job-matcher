"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { saveProfile } from "@/app/actions/profile";
import { useToast } from "@/components/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Upload,
  FileText,
  Loader2,
  User,
  MapPin,
  Briefcase,
  GraduationCap,
  Languages,
  Link as LinkIcon,
  AlertCircle,
} from "lucide-react";

interface ProfileData {
  rawText: string;
  summary: string | null;
  currentTitle: string | null;
  yearsExperience: number | null;
  skills: string[];
  languages: string[];
  education: string | null;
  location: string | null;
  desiredRoles: string[];
  desiredSalary: string | null;
  remotePreference: string | null;
}

export default function ProfilePage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { toast } = useToast();
  const [rawText, setRawText] = useState("");
  const [linkedinUrl, setLinkedinUrl] = useState("");
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [fetchingLinkedin, setFetchingLinkedin] = useState(false);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login");
  }, [status, router]);

  useEffect(() => {
    if (session?.user?.id) {
      setLoadingProfile(true);
      fetch("/api/profile")
        .then((r) => r.json())
        .then((data) => {
          if (data.profile) {
            setProfile(data.profile);
            setRawText(data.profile.rawText);
          }
        })
        .catch(() => {
          toast({ title: "Erreur de chargement du profil", variant: "destructive" });
        })
        .finally(() => setLoadingProfile(false));
    }
  }, [session, toast]);

  const handleLinkedInImport = useCallback(async () => {
    if (!linkedinUrl.includes("linkedin.com")) {
      setError("Entrez une URL LinkedIn valide (ex: https://linkedin.com/in/votre-profil)");
      return;
    }

    setFetchingLinkedin(true);
    setError("");

    try {
      const res = await fetch("/api/profile/linkedin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: linkedinUrl }),
      });
      const data = await res.json();

      if (data.error) {
        setError(data.error);
      } else if (data.text) {
        setRawText(data.text);
        toast({ title: "Profil LinkedIn importé", variant: "success" });
      }
    } catch {
      setError("Erreur lors de la récupération du profil LinkedIn");
    }

    setFetchingLinkedin(false);
  }, [linkedinUrl, toast]);

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);
    setError("");
    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch("/api/profile/parse-pdf", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (data.text) {
        setRawText(data.text);
        toast({ title: "CV importé avec succès", variant: "success" });
      } else {
        setError(data.error || "Erreur lors de la lecture du fichier");
      }
    } catch {
      setError("Erreur lors de l'upload");
    }
    setLoading(false);
  }

  async function handleAnalyze() {
    setAnalyzing(true);
    setError("");
    const formData = new FormData();
    formData.append("rawText", rawText);

    try {
      const result = await saveProfile(formData);
      if (result?.error) {
        setError(result.error);
        setAnalyzing(false);
      }
      // saveProfile redirects to /dashboard on success
    } catch {
      setError("Erreur lors de l'analyse. Veuillez réessayer.");
      setAnalyzing(false);
    }
  }

  if (status === "loading") {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-400" aria-label="Chargement" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-6 sm:py-8 space-y-6 sm:space-y-8">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold">Mon profil</h1>
        <p className="text-slate-400 text-sm sm:text-base">
          Importez votre profil LinkedIn, uploadez un CV ou collez votre profil
        </p>
      </div>

      <div className="grid gap-6 sm:gap-8 lg:grid-cols-2">
        <div className="space-y-4">
          {/* LinkedIn URL Import */}
          <Card className="border-emerald-500/30">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                <LinkIcon className="h-5 w-5 text-emerald-400" aria-hidden="true" />
                Importer depuis LinkedIn
              </CardTitle>
              <CardDescription>
                Collez l&apos;URL de votre profil LinkedIn public
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex gap-2">
                <Input
                  value={linkedinUrl}
                  onChange={(e) => setLinkedinUrl(e.target.value)}
                  placeholder="https://linkedin.com/in/votre-profil"
                  type="url"
                  aria-label="URL du profil LinkedIn"
                />
                <Button
                  onClick={handleLinkedInImport}
                  disabled={!linkedinUrl.trim() || fetchingLinkedin}
                  className="shrink-0"
                >
                  {fetchingLinkedin ? (
                    <Loader2 className="h-4 w-4 animate-spin" aria-label="Import en cours" />
                  ) : (
                    "Importer"
                  )}
                </Button>
              </div>
              <p className="text-xs text-slate-500">
                Le profil doit être public. L&apos;IA extrait les données via le web.
              </p>
            </CardContent>
          </Card>

          {/* PDF Upload + Text */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base sm:text-lg">Autres options</CardTitle>
              <CardDescription>PDF LinkedIn ou texte libre</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <label className="flex cursor-pointer flex-col items-center gap-2 rounded-lg border-2 border-dashed border-slate-700 p-4 hover:border-emerald-500/50 transition-colors focus-within:border-emerald-500/50">
                <Upload className="h-6 w-6 text-slate-500" aria-hidden="true" />
                <span className="text-sm text-slate-400">
                  {loading ? (
                    <span className="flex items-center gap-2">
                      <Loader2 className="h-3 w-3 animate-spin" />
                      Lecture en cours...
                    </span>
                  ) : (
                    "Uploader un PDF"
                  )}
                </span>
                <input
                  type="file"
                  accept=".pdf,.txt"
                  className="hidden"
                  onChange={handleFileUpload}
                  disabled={loading}
                  aria-label="Uploader un fichier PDF ou texte"
                />
              </label>

              <Textarea
                value={rawText}
                onChange={(e) => setRawText(e.target.value)}
                placeholder="Ou collez ici le texte de votre CV..."
                className="min-h-[200px]"
                aria-label="Texte du CV"
              />

              {error && (
                <div
                  className="flex items-start gap-2 rounded-lg border border-red-800 bg-red-900/20 p-3 text-sm text-red-400"
                  role="alert"
                >
                  <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" aria-hidden="true" />
                  <div className="flex-1">
                    <p>{error}</p>
                    <button
                      onClick={() => setError("")}
                      className="mt-1 text-xs underline hover:text-red-300"
                    >
                      Fermer
                    </button>
                  </div>
                </div>
              )}

              <Button
                onClick={handleAnalyze}
                disabled={!rawText.trim() || analyzing}
                className="w-full"
              >
                {analyzing ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
                    Analyse IA en cours... (peut prendre 15-30s)
                  </>
                ) : (
                  <>
                    <FileText className="mr-2 h-4 w-4" aria-hidden="true" />
                    Analyser avec l&apos;IA
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Right side: profile data or empty state */}
        <div className="space-y-4">
          {loadingProfile ? (
            <Card>
              <CardContent className="flex items-center justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-emerald-400" aria-label="Chargement du profil" />
              </CardContent>
            </Card>
          ) : profile ? (
            <>
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <User className="h-5 w-5 text-emerald-400" aria-hidden="true" />
                    Résumé
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {profile.currentTitle && (
                    <div className="flex items-center gap-2">
                      <Briefcase className="h-4 w-4 text-slate-500" aria-hidden="true" />
                      <span className="font-medium">{profile.currentTitle}</span>
                    </div>
                  )}
                  {profile.location && (
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-slate-500" aria-hidden="true" />
                      <span>{profile.location}</span>
                    </div>
                  )}
                  {profile.yearsExperience && (
                    <p className="text-sm text-slate-400">
                      {profile.yearsExperience} ans d&apos;expérience
                    </p>
                  )}
                  {profile.summary && (
                    <p className="text-sm text-slate-300">{profile.summary}</p>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Compétences</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {profile.skills.map((skill) => (
                      <Badge key={skill} variant="secondary">{skill}</Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {profile.education && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-sm">
                      <GraduationCap className="h-4 w-4 text-emerald-400" aria-hidden="true" />
                      Formation
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-slate-300">{profile.education}</p>
                  </CardContent>
                </Card>
              )}

              {profile.languages.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-sm">
                      <Languages className="h-4 w-4 text-emerald-400" aria-hidden="true" />
                      Langues
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-2">
                      {profile.languages.map((lang) => (
                        <Badge key={lang} variant="outline">{lang}</Badge>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {profile.desiredRoles.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Rôles recherchés</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-2">
                      {profile.desiredRoles.map((role) => (
                        <Badge key={role}>{role}</Badge>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </>
          ) : (
            <Card className="border-dashed border-slate-700">
              <CardContent className="flex flex-col items-center justify-center py-12 text-center space-y-3">
                <User className="h-12 w-12 text-slate-700" aria-hidden="true" />
                <div>
                  <p className="font-medium text-slate-400">Aucun profil analysé</p>
                  <p className="text-sm text-slate-500 mt-1">
                    Importez votre CV ou profil LinkedIn puis lancez l&apos;analyse IA pour voir vos compétences extraites ici.
                  </p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { saveProfile } from "@/app/actions/profile";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Upload, FileText, Loader2, User, MapPin, Briefcase, GraduationCap, Languages } from "lucide-react";

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
  const [rawText, setRawText] = useState("");
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState("");

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
            setRawText(data.profile.rawText);
          }
        });
    }
  }, [session]);

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);
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

    const result = await saveProfile(formData);
    if (result?.error) {
      setError(result.error);
      setAnalyzing(false);
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
    <div className="mx-auto max-w-4xl px-4 py-8 space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Mon profil</h1>
        <p className="text-slate-400">
          Importez votre CV ou collez votre profil pour l&apos;analyser avec l&apos;IA
        </p>
      </div>

      <div className="grid gap-8 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Importer le profil</CardTitle>
            <CardDescription>
              Uploadez un PDF LinkedIn ou collez votre CV
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="flex cursor-pointer flex-col items-center gap-2 rounded-lg border-2 border-dashed border-slate-700 p-6 hover:border-emerald-500/50 transition-colors">
                <Upload className="h-8 w-8 text-slate-500" />
                <span className="text-sm text-slate-400">
                  {loading ? "Lecture en cours..." : "Cliquez pour uploader un PDF"}
                </span>
                <input
                  type="file"
                  accept=".pdf,.txt"
                  className="hidden"
                  onChange={handleFileUpload}
                  disabled={loading}
                />
              </label>
            </div>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-800" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-slate-900 px-2 text-slate-500">ou collez votre CV</span>
              </div>
            </div>

            <Textarea
              value={rawText}
              onChange={(e) => setRawText(e.target.value)}
              placeholder="Collez ici le texte de votre CV ou profil LinkedIn..."
              className="min-h-[300px]"
            />

            {error && <p className="text-sm text-red-400">{error}</p>}

            <Button
              onClick={handleAnalyze}
              disabled={!rawText.trim() || analyzing}
              className="w-full"
            >
              {analyzing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Analyse en cours...
                </>
              ) : (
                <>
                  <FileText className="mr-2 h-4 w-4" />
                  Analyser avec l&apos;IA
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {profile && (
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5 text-emerald-400" />
                  Resume
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {profile.currentTitle && (
                  <div className="flex items-center gap-2">
                    <Briefcase className="h-4 w-4 text-slate-500" />
                    <span className="font-medium">{profile.currentTitle}</span>
                  </div>
                )}
                {profile.location && (
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-slate-500" />
                    <span>{profile.location}</span>
                  </div>
                )}
                {profile.yearsExperience && (
                  <p className="text-sm text-slate-400">
                    {profile.yearsExperience} ans d&apos;experience
                  </p>
                )}
                {profile.summary && (
                  <p className="text-sm text-slate-300">{profile.summary}</p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Competences</CardTitle>
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
                    <GraduationCap className="h-4 w-4 text-emerald-400" />
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
                    <Languages className="h-4 w-4 text-emerald-400" />
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
                  <CardTitle className="text-sm">Roles recherches</CardTitle>
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
          </div>
        )}
      </div>
    </div>
  );
}

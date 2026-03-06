"use client";

import { useState } from "react";
import Link from "next/link";
import { registerUser, loginUser } from "@/app/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Briefcase } from "lucide-react";

export default function LoginPage() {
  const [isRegister, setIsRegister] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(formData: FormData) {
    setLoading(true);
    setError("");
    const result = isRegister
      ? await registerUser(formData)
      : await loginUser(formData);
    if (result?.error) {
      setError(result.error);
    }
    setLoading(false);
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <Link href="/" className="flex items-center justify-center gap-2 text-emerald-400 mb-2">
            <Briefcase className="h-6 w-6" />
            <span className="text-xl font-bold">Job Matcher</span>
          </Link>
          <CardTitle className="text-xl">
            {isRegister ? "Créer un compte" : "Se connecter"}
          </CardTitle>
          <CardDescription>
            {isRegister
              ? "Créez votre compte pour commencer à matcher"
              : "Connectez-vous à votre compte"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form action={handleSubmit} className="space-y-4">
            {isRegister && (
              <div className="space-y-2">
                <label htmlFor="name" className="text-sm font-medium text-slate-300">
                  Nom
                </label>
                <Input id="name" name="name" placeholder="Votre nom" />
              </div>
            )}
            <div className="space-y-2">
              <label htmlFor="email" className="text-sm font-medium text-slate-300">
                Email
              </label>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="email@exemple.com"
                required
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="password" className="text-sm font-medium text-slate-300">
                Mot de passe
              </label>
              <Input
                id="password"
                name="password"
                type="password"
                placeholder="••••••••"
                required
                minLength={6}
              />
            </div>

            {error && (
              <p className="text-sm text-red-400">{error}</p>
            )}

            <Button type="submit" className="w-full" disabled={loading}>
              {loading
                ? "Chargement..."
                : isRegister
                ? "Créer le compte"
                : "Se connecter"}
            </Button>
          </form>

          <div className="mt-4 text-center text-sm text-slate-400">
            {isRegister ? "Déjà un compte ?" : "Pas encore de compte ?"}{" "}
            <button
              onClick={() => {
                setIsRegister(!isRegister);
                setError("");
              }}
              className="text-emerald-400 hover:underline"
            >
              {isRegister ? "Se connecter" : "Créer un compte"}
            </button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

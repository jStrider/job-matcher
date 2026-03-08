"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { AlertTriangle } from "lucide-react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[ErrorBoundary]", error);
  }, [error]);

  return (
    <div className="flex min-h-[60vh] items-center justify-center px-4">
      <Card className="max-w-md w-full border-red-800">
        <CardContent className="p-8 text-center space-y-4">
          <AlertTriangle className="h-12 w-12 text-red-400 mx-auto" />
          <h2 className="text-xl font-semibold">Une erreur est survenue</h2>
          <p className="text-sm text-slate-400">
            {error.message || "Quelque chose s'est mal passe. Veuillez reessayer."}
          </p>
          {error.digest && (
            <p className="text-xs text-slate-600">Ref: {error.digest}</p>
          )}
          <Button onClick={reset}>Reessayer</Button>
        </CardContent>
      </Card>
    </div>
  );
}

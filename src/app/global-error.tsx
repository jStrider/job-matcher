"use client";

import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[GlobalError]", error);
  }, [error]);

  return (
    <html lang="fr" className="dark">
      <body className="bg-slate-950 text-slate-200 antialiased">
        <div className="flex min-h-screen items-center justify-center px-4">
          <div className="max-w-md w-full text-center space-y-4 p-8 border border-red-800 rounded-lg bg-slate-900">
            <h2 className="text-xl font-semibold">Erreur critique</h2>
            <p className="text-sm text-slate-400">
              L&apos;application a rencontre une erreur inattendue.
            </p>
            {error.digest && (
              <p className="text-xs text-slate-600">Ref: {error.digest}</p>
            )}
            <button
              onClick={reset}
              className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors"
            >
              Recharger
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}

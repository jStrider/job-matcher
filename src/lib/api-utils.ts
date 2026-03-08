import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { logger } from "@/lib/logger";

export type AuthSession = {
  user: { id: string; email: string; name?: string | null };
};

/**
 * Authenticate the request and return the session.
 * Returns a NextResponse with 401 if not authenticated, or the session if valid.
 */
export async function requireAuth(): Promise<AuthSession | NextResponse> {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Non authentifie" }, { status: 401 });
  }
  return session as AuthSession;
}

/**
 * Check if the result of requireAuth is an error response.
 */
export function isAuthError(
  result: AuthSession | NextResponse
): result is NextResponse {
  return result instanceof NextResponse;
}

/**
 * Wrap an API handler with error handling and logging.
 */
export function apiHandler(
  context: string,
  handler: () => Promise<NextResponse>
): Promise<NextResponse> {
  return handler().catch((error: unknown) => {
    logger.error(`API error in ${context}`, {
      context,
      error: error instanceof Error ? error : new Error(String(error)),
    });
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Une erreur inattendue est survenue",
      },
      { status: 500 }
    );
  });
}

/**
 * Extract profile data fields used for ATS scoring.
 */
export function extractProfileForScoring(profile: {
  skills: string[];
  currentTitle: string | null;
  yearsExperience: number | null;
  education: string | null;
  location: string | null;
  languages: string[];
  desiredRoles: string[];
}) {
  return {
    skills: profile.skills,
    currentTitle: profile.currentTitle,
    yearsExperience: profile.yearsExperience,
    education: profile.education,
    location: profile.location,
    languages: profile.languages,
    desiredRoles: profile.desiredRoles,
  };
}

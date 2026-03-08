import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { searchJobs, fetchJobDescription } from "@/lib/brave-search";
import { scoreJobATS } from "@/lib/ai";
import { checkRateLimit, RATE_LIMITS } from "@/lib/rate-limit";
import { requireAuth, isAuthError, apiHandler, extractProfileForScoring } from "@/lib/api-utils";
import { logger } from "@/lib/logger";
import { pLimit } from "@/lib/utils";

export async function POST() {
  return apiHandler("search/smart/POST", async () => {
    const session = await requireAuth();
    if (isAuthError(session)) return session;

    const rl = checkRateLimit(`search:${session.user.id}`, RATE_LIMITS.search);
    if (!rl.allowed) {
      return NextResponse.json({ error: "Trop de recherches. Réessayez dans une minute." }, { status: 429 });
    }

    const profile = await prisma.profile.findUnique({
      where: { userId: session.user.id },
    });

    if (!profile) {
      return NextResponse.json(
        { error: "Creez d'abord votre profil pour utiliser la recherche intelligente." },
        { status: 400 }
      );
    }

    const searches: { query: string; location?: string }[] = [];

    if (profile.desiredRoles.length > 0) {
      for (const role of profile.desiredRoles.slice(0, 5)) {
        searches.push({
          query: role,
          location: profile.location || undefined,
        });
      }
    }

    if (
      profile.currentTitle &&
      !profile.desiredRoles.some(
        (r: string) => r.toLowerCase() === profile.currentTitle?.toLowerCase()
      )
    ) {
      searches.push({
        query: profile.currentTitle,
        location: profile.location || undefined,
      });
    }

    if (profile.skills.length >= 2) {
      const topSkills = profile.skills.slice(0, 3).join(" ");
      searches.push({
        query: `${topSkills} emploi`,
        location: profile.location || undefined,
      });
      if (profile.skills.length >= 4) {
        const altSkills = profile.skills.slice(1, 4).join(" ");
        searches.push({
          query: `${altSkills} recrutement`,
          location: profile.location || undefined,
        });
      }
    }

    if (searches.length === 0) {
      return NextResponse.json(
        { error: "Profil trop incomplet pour la recherche intelligente. Ajoutez des roles ou competences." },
        { status: 400 }
      );
    }

    const queryDesc = searches.map((s) => s.query).join(" | ");
    const search = await prisma.search.create({
      data: {
        userId: session.user.id,
        query: `Smart: ${queryDesc}`,
        location: profile.location,
      },
    });

    const allResults = await Promise.allSettled(
      searches.map((s) =>
        searchJobs(s.query, s.location, profile.remotePreference || undefined)
      )
    );

    const seenUrls = new Set<string>();
    const uniqueResults = allResults
      .flatMap((r) => (r.status === "fulfilled" ? r.value : []))
      .filter((r) => {
        if (seenUrls.has(r.url)) return false;
        seenUrls.add(r.url);
        return true;
      })
      .slice(0, 15);

    if (uniqueResults.length === 0) {
      return NextResponse.json(
        { error: "Aucun resultat trouve. Essayez une recherche manuelle." },
        { status: 404 }
      );
    }

    const descriptions = await Promise.all(
      uniqueResults.map(async (result) => {
        try {
          const desc = await fetchJobDescription(result.url);
          return desc.length > 100 ? desc : result.snippet;
        } catch {
          return result.snippet;
        }
      })
    );

    const jobs = await Promise.all(
      uniqueResults.map((result, i) =>
        prisma.job.create({
          data: {
            searchId: search.id,
            title: result.title,
            company: result.company,
            location: result.location,
            url: result.url,
            source: result.source,
            description: descriptions[i],
          },
        })
      )
    );

    const profileData = extractProfileForScoring(profile);
    const limit = pLimit(3);

    await Promise.allSettled(
      jobs.map((job: { id: string; title: string; description: string }) =>
        limit(async () => {
          try {
            const score = await scoreJobATS(profileData, job.title, job.description);
            await prisma.job.update({
              where: { id: job.id },
              data: {
                atsScore: score.totalScore,
                scoreBreakdown: JSON.parse(JSON.stringify(score.breakdown)),
                matchingSkills: score.matchingSkills,
                missingSkills: score.missingSkills,
              },
            });
          } catch (err) {
            logger.warn("Smart search ATS scoring failed", {
              jobId: job.id,
              error: err instanceof Error ? err : new Error(String(err)),
            });
          }
        })
      )
    );

    const scoredJobs = await prisma.job.findMany({
      where: { searchId: search.id },
      orderBy: { atsScore: { sort: "desc", nulls: "last" } },
    });

    return NextResponse.json({
      searchId: search.id,
      jobs: scoredJobs,
      query: queryDesc,
      searchesRun: searches.length,
    });
  });
}

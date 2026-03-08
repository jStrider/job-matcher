import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { searchJobs, fetchJobDescription } from "@/lib/brave-search";
import { scoreJobATS } from "@/lib/ai";
import { requireAuth, isAuthError, apiHandler, extractProfileForScoring } from "@/lib/api-utils";
import { searchSchema } from "@/lib/validations";
import { logger } from "@/lib/logger";

export async function POST(request: NextRequest) {
  return apiHandler("search/POST", async () => {
    const session = await requireAuth();
    if (isAuthError(session)) return session;

    const body = await request.json();
    const parsed = searchSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || "Donnees invalides" },
        { status: 400 }
      );
    }

    const { query, location, remote, contract } = parsed.data;

    const profile = await prisma.profile.findUnique({
      where: { userId: session.user.id },
      select: {
        skills: true,
        currentTitle: true,
        yearsExperience: true,
        education: true,
        location: true,
        languages: true,
        desiredRoles: true,
      },
    });

    const search = await prisma.search.create({
      data: {
        userId: session.user.id,
        query,
        location: location || null,
      },
    });

    const results = await searchJobs(query, location, remote, contract);

    const descriptionsPromises = results.map(async (result) => {
      try {
        const fullDesc = await fetchJobDescription(result.url);
        return fullDesc.length > 100 ? fullDesc : result.snippet;
      } catch {
        return result.snippet;
      }
    });
    const descriptions = await Promise.all(descriptionsPromises);

    const jobs = await Promise.all(
      results.map((result, i) =>
        prisma.job.create({
          data: {
            searchId: search.id,
            title: result.title,
            company: result.company,
            location: result.location,
            url: result.url,
            source: result.source,
            description: descriptions[i],
            remote: remote || null,
            contract: contract || null,
          },
        })
      )
    );

    if (profile) {
      const profileData = extractProfileForScoring(profile);

      await Promise.allSettled(
        jobs.map(async (job: { id: string; title: string; description: string }) => {
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
            logger.warn("ATS scoring failed for job", {
              jobId: job.id,
              error: err instanceof Error ? err : new Error(String(err)),
            });
          }
        })
      );
    }

    const scoredJobs = await prisma.job.findMany({
      where: { searchId: search.id },
      orderBy: { atsScore: { sort: "desc", nulls: "last" } },
    });

    return NextResponse.json({ searchId: search.id, jobs: scoredJobs });
  });
}

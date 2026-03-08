import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, isAuthError, apiHandler } from "@/lib/api-utils";

export async function GET() {
  return apiHandler("dashboard/GET", async () => {
    const session = await requireAuth();
    if (isAuthError(session)) return session;

    const userId = session.user.id;

    const [profile, recentSearches, topJobs, totalSearches, totalJobs, savedJobsCount] =
      await Promise.all([
        prisma.profile.findUnique({
          where: { userId },
          select: { currentTitle: true, skills: true, summary: true, location: true },
        }),
        prisma.search.findMany({
          where: { userId },
          orderBy: { createdAt: "desc" },
          take: 5,
          select: {
            id: true,
            query: true,
            createdAt: true,
            _count: { select: { results: true } },
          },
        }),
        prisma.job.findMany({
          where: { search: { userId }, atsScore: { not: null } },
          orderBy: { atsScore: "desc" },
          take: 5,
          select: { id: true, title: true, company: true, atsScore: true, url: true },
        }),
        prisma.search.count({ where: { userId } }),
        prisma.job.count({ where: { search: { userId } } }),
        prisma.savedJob.count({ where: { userId } }),
      ]);

    // Aggregate avg score
    const avgAgg = await prisma.job.aggregate({
      where: { search: { userId }, atsScore: { not: null } },
      _avg: { atsScore: true },
    });
    const avgScore = Math.round(avgAgg._avg.atsScore ?? 0);

    // Score distribution via groupBy with raw ranges
    const scoredJobs = await prisma.job.groupBy({
      by: ["atsScore"],
      where: { search: { userId }, atsScore: { not: null } },
      _count: true,
    });

    const ranges = [
      { range: "0-20", min: 0, max: 20 },
      { range: "21-40", min: 21, max: 40 },
      { range: "41-60", min: 41, max: 60 },
      { range: "61-80", min: 61, max: 80 },
      { range: "81-100", min: 81, max: 100 },
    ];
    const scoreDistribution = ranges.map(({ range, min, max }) => ({
      range,
      count: scoredJobs
        .filter((g: { atsScore: number | null; _count: number }) => g.atsScore! >= min && g.atsScore! <= max)
        .reduce((sum: number, g: { _count: number }) => sum + g._count, 0),
    }));

    // Top missing skills from a limited set of recent scored jobs
    const recentScoredJobs = await prisma.job.findMany({
      where: { search: { userId }, atsScore: { not: null } },
      orderBy: { createdAt: "desc" },
      take: 200,
      select: { missingSkills: true },
    });

    const skillCounts: Record<string, number> = {};
    for (const job of recentScoredJobs) {
      for (const skill of job.missingSkills) {
        skillCounts[skill] = (skillCounts[skill] || 0) + 1;
      }
    }
    const topMissingSkills = Object.entries(skillCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 8)
      .map(([skill, count]) => ({ skill, count }));

    return NextResponse.json({
      profile,
      recentSearches,
      topJobs,
      stats: {
        totalSearches,
        totalJobs,
        savedJobs: savedJobsCount,
        avgScore,
        scoreDistribution,
        topMissingSkills,
      },
    });
  });
}

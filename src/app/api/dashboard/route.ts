import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, isAuthError, apiHandler } from "@/lib/api-utils";

export async function GET() {
  return apiHandler("dashboard/GET", async () => {
    const session = await requireAuth();
    if (isAuthError(session)) return session;

    const userId = session.user.id;

    const [profile, recentSearches, topJobs, totalSearches, totalJobs, savedJobsCount, allJobs] =
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
        prisma.job.findMany({
          where: { search: { userId }, atsScore: { not: null } },
          select: { atsScore: true, missingSkills: true },
        }),
      ]);

    const scores: number[] = allJobs.map((j: { atsScore: number | null }) => j.atsScore!);
    const avgScore =
      scores.length > 0
        ? Math.round(scores.reduce((a: number, b: number) => a + b, 0) / scores.length)
        : 0;

    const ranges = ["0-20", "21-40", "41-60", "61-80", "81-100"];
    const scoreDistribution = ranges.map((range) => {
      const [min, max] = range.split("-").map(Number);
      return {
        range,
        count: scores.filter((s: number) => s >= min && s <= max).length,
      };
    });

    const skillCounts: Record<string, number> = {};
    for (const job of allJobs) {
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

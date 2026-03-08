import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";

const MAX_SEARCH_AGE_DAYS = 30;
const MAX_SEARCHES_PER_USER = 100;

/**
 * Clean up old searches and their associated jobs.
 * Keeps the last 30 days OR last 100 searches per user, whichever is more recent.
 */
export async function cleanupOldSearches(): Promise<{
  deletedSearches: number;
  deletedJobs: number;
}> {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - MAX_SEARCH_AGE_DAYS);

  // Find searches older than cutoff that are not in the last 100 per user
  const users = await prisma.user.findMany({
    select: { id: true },
  });

  let totalDeletedSearches = 0;
  let totalDeletedJobs = 0;

  for (const user of users) {
    // Get the 100th most recent search date for this user
    const recentSearches = await prisma.search.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      take: MAX_SEARCHES_PER_USER,
      select: { id: true, createdAt: true },
    });

    const keepIds = new Set(recentSearches.map((s: { id: string }) => s.id));

    // Find old searches to delete (older than cutoff AND not in the keep set)
    const oldSearches = await prisma.search.findMany({
      where: {
        userId: user.id,
        createdAt: { lt: cutoffDate },
        id: { notIn: [...keepIds] },
      },
      select: { id: true },
    });

    if (oldSearches.length === 0) continue;

    const searchIds = oldSearches.map((s: { id: string }) => s.id);

    // Delete saved jobs referencing jobs from these searches
    await prisma.savedJob.deleteMany({
      where: { job: { searchId: { in: searchIds } } },
    });

    // Delete jobs from these searches
    const deletedJobs = await prisma.job.deleteMany({
      where: { searchId: { in: searchIds } },
    });

    // Delete the searches themselves
    const deletedSearches = await prisma.search.deleteMany({
      where: { id: { in: searchIds } },
    });

    totalDeletedSearches += deletedSearches.count;
    totalDeletedJobs += deletedJobs.count;
  }

  logger.info("DB cleanup completed", {
    deletedSearches: totalDeletedSearches,
    deletedJobs: totalDeletedJobs,
    cutoffDate: cutoffDate.toISOString(),
  });

  return {
    deletedSearches: totalDeletedSearches,
    deletedJobs: totalDeletedJobs,
  };
}

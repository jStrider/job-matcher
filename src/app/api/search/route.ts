import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { searchJobs, fetchJobDescription } from "@/lib/brave-search";
import { scoreJobATS } from "@/lib/ai";

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  const { query, location, remote, contract } = await request.json();

  if (!query?.trim()) {
    return NextResponse.json({ error: "Requête de recherche requise" }, { status: 400 });
  }

  const profile = await prisma.profile.findUnique({
    where: { userId: session.user.id },
  });

  // Create search record
  const search = await prisma.search.create({
    data: {
      userId: session.user.id,
      query,
      location: location || null,
    },
  });

  try {
    const results = await searchJobs(query, location, remote, contract);

    // Fetch all job descriptions in parallel (with timeout)
    const descriptionsPromises = results.map(async (result) => {
      try {
        const fullDesc = await fetchJobDescription(result.url);
        return fullDesc.length > 100 ? fullDesc : result.snippet;
      } catch {
        return result.snippet;
      }
    });
    const descriptions = await Promise.all(descriptionsPromises);

    // Create all jobs in DB
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

    // Score all jobs with ATS in parallel (all at once, API handles rate limiting)
    if (profile) {
      const profileData = {
        skills: profile.skills,
        currentTitle: profile.currentTitle,
        yearsExperience: profile.yearsExperience,
        education: profile.education,
        location: profile.location,
        languages: profile.languages,
        desiredRoles: profile.desiredRoles,
      };

      await Promise.allSettled(
        jobs.map(async (job) => {
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
          } catch {
            // Skip scoring on failure
          }
        })
      );
    }

    const scoredJobs = await prisma.job.findMany({
      where: { searchId: search.id },
      orderBy: { atsScore: { sort: "desc", nulls: "last" } },
    });

    return NextResponse.json({ searchId: search.id, jobs: scoredJobs });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erreur lors de la recherche. Veuillez réessayer." },
      { status: 500 }
    );
  }
}

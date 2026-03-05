import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { searchJobs, fetchJobDescription } from "@/lib/brave-search";
import { scoreJobATS } from "@/lib/ai";

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Non authentifie" }, { status: 401 });
  }

  const { query, location, remote, contract } = await request.json();

  if (!query?.trim()) {
    return NextResponse.json({ error: "Requete de recherche requise" }, { status: 400 });
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
    const results = await searchJobs(query, location);

    // Create jobs from search results
    const jobs = await Promise.all(
      results.map(async (result) => {
        let description = result.snippet;
        try {
          const fullDesc = await fetchJobDescription(result.url);
          if (fullDesc.length > 100) description = fullDesc;
        } catch {
          // Keep snippet as fallback
        }

        return prisma.job.create({
          data: {
            searchId: search.id,
            title: result.title,
            company: result.company,
            location: result.location,
            url: result.url,
            source: result.source,
            description,
            remote: remote || null,
            contract: contract || null,
          },
        });
      })
    );

    // Score jobs with ATS in parallel (max 5 concurrent)
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

      const batchSize = 5;
      for (let i = 0; i < jobs.length; i += batchSize) {
        const batch = jobs.slice(i, i + batchSize);
        await Promise.allSettled(
          batch.map(async (job) => {
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
    }

    const scoredJobs = await prisma.job.findMany({
      where: { searchId: search.id },
      orderBy: { atsScore: { sort: "desc", nulls: "last" } },
    });

    return NextResponse.json({ searchId: search.id, jobs: scoredJobs });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erreur de recherche" },
      { status: 500 }
    );
  }
}

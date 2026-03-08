import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { searchJobs, fetchJobDescription } from "@/lib/brave-search";
import { scoreJobATS } from "@/lib/ai";
import { checkRateLimit, RATE_LIMITS } from "@/lib/rate-limit";

export async function POST() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  const rl = checkRateLimit(`search:${session.user.id}`, RATE_LIMITS.search);
  if (!rl.allowed) {
    return NextResponse.json({ error: "Trop de recherches. Réessayez dans une minute." }, { status: 429 });
  }

  const profile = await prisma.profile.findUnique({
    where: { userId: session.user.id },
  });

  if (!profile) {
    return NextResponse.json(
      { error: "Créez d'abord votre profil pour utiliser la recherche intelligente." },
      { status: 400 }
    );
  }

  // Build multiple targeted searches based on profile
  const searches: { query: string; location?: string }[] = [];

  // Search by desired roles (cap at 5 to limit API calls)
  if (profile.desiredRoles.length > 0) {
    for (const role of profile.desiredRoles.slice(0, 5)) {
      searches.push({
        query: role,
        location: profile.location || undefined,
      });
    }
  }

  // Search by current title if not already in desiredRoles
  if (profile.currentTitle && !profile.desiredRoles.some(
    (r) => r.toLowerCase() === profile.currentTitle?.toLowerCase()
  )) {
    searches.push({
      query: profile.currentTitle,
      location: profile.location || undefined,
    });
  }

  // Add skill-based search variants (combine 2-3 top skills with job-related terms)
  if (profile.skills.length >= 2) {
    const topSkills = profile.skills.slice(0, 3).join(" ");
    searches.push({
      query: `${topSkills} emploi`,
      location: profile.location || undefined,
    });
    // Secondary combo with different skills
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
      { error: "Profil trop incomplet pour la recherche intelligente. Ajoutez des rôles ou compétences." },
      { status: 400 }
    );
  }

  // Create a combined search record
  const queryDesc = searches.map((s) => s.query).join(" | ");
  const search = await prisma.search.create({
    data: {
      userId: session.user.id,
      query: `🔮 Smart: ${queryDesc}`,
      location: profile.location,
    },
  });

  try {
    // Run all searches in parallel
    const allResults = await Promise.allSettled(
      searches.map((s) =>
        searchJobs(s.query, s.location, profile.remotePreference || undefined)
      )
    );

    // Flatten and deduplicate by URL
    const seenUrls = new Set<string>();
    const uniqueResults = allResults
      .flatMap((r) => (r.status === "fulfilled" ? r.value : []))
      .filter((r) => {
        if (seenUrls.has(r.url)) return false;
        seenUrls.add(r.url);
        return true;
      })
      .slice(0, 15); // Cap at 15 to avoid too many API calls

    if (uniqueResults.length === 0) {
      return NextResponse.json(
        { error: "Aucun résultat trouvé. Essayez une recherche manuelle." },
        { status: 404 }
      );
    }

    // Fetch descriptions in parallel
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

    // Create jobs in DB
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

    // Score all with ATS
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
          // Skip
        }
      })
    );

    // Return sorted by score
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
  } catch (error) {
    return NextResponse.json(
      { error: "Erreur lors de la recherche intelligente." },
      { status: 500 }
    );
  }
}

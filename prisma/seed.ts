import { PrismaClient } from "../src/generated/prisma";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

async function main() {
  // Create demo user
  const password = await bcrypt.hash("demo1234", 12);
  const user = await prisma.user.upsert({
    where: { email: "demo@jobmatcher.fr" },
    update: {},
    create: {
      email: "demo@jobmatcher.fr",
      password,
      name: "Utilisateur Demo",
    },
  });

  // Create demo profile
  await prisma.profile.upsert({
    where: { userId: user.id },
    update: {},
    create: {
      userId: user.id,
      rawText: "Developpeur Full Stack avec 5 ans d'experience en React, Node.js, TypeScript et Python. Master en Informatique. Bilingue francais-anglais.",
      summary: "Developpeur Full Stack experimente specialise dans les technologies web modernes avec une forte expertise en React et Node.js.",
      currentTitle: "Developpeur Full Stack Senior",
      yearsExperience: 5,
      skills: [
        "React", "Next.js", "TypeScript", "Node.js", "Python",
        "PostgreSQL", "Docker", "AWS", "Git", "REST API",
        "GraphQL", "Tailwind CSS", "MongoDB", "Redis",
      ],
      languages: ["Francais", "Anglais"],
      education: "Master Informatique - Universite Paris-Saclay",
      location: "Paris, France",
      desiredRoles: ["Lead Developer", "Senior Full Stack Developer", "Tech Lead"],
      desiredSalary: "55-70k EUR",
      remotePreference: "hybrid",
    },
  });

  // Create a demo search with results
  const search = await prisma.search.create({
    data: {
      userId: user.id,
      query: "Developpeur Full Stack React",
      location: "Paris",
    },
  });

  const demoJobs = [
    {
      title: "Developpeur Full Stack React/Node.js",
      company: "TechCorp",
      location: "Paris, France",
      salary: "55-65k EUR",
      remote: "hybrid",
      contract: "CDI",
      description: "Nous recherchons un developpeur Full Stack pour rejoindre notre equipe produit. Vous travaillerez sur notre plateforme SaaS avec React, Node.js, TypeScript et PostgreSQL. Experience requise: 3-5 ans. Stack: React, Next.js, Node.js, TypeScript, PostgreSQL, Docker, AWS.",
      url: "https://example.com/job1",
      source: "linkedin",
      atsScore: 85,
      scoreBreakdown: {
        keywordMatch: { score: 13, max: 15, details: "Excellente correspondance des mots-cles" },
        skillsAlignment: { score: 17, max: 20, details: "React, Node.js, TypeScript correspondent" },
        experienceRelevance: { score: 13, max: 15, details: "5 ans correspond a 3-5 ans requis" },
        jobTitleMatch: { score: 9, max: 10, details: "Full Stack correspond parfaitement" },
        educationMatch: { score: 8, max: 10, details: "Master en informatique pertinent" },
        locationMatch: { score: 10, max: 10, details: "Paris correspond" },
        languageMatch: { score: 8, max: 10, details: "Francais et anglais couverts" },
        overallFit: { score: 7, max: 10, details: "Tres bonne adequation globale" },
      },
      matchingSkills: ["React", "Next.js", "Node.js", "TypeScript", "PostgreSQL", "Docker", "AWS"],
      missingSkills: ["Kubernetes"],
    },
    {
      title: "Lead Developer Python/Django",
      company: "DataFlow",
      location: "Lyon, France",
      salary: "60-75k EUR",
      remote: "remote",
      contract: "CDI",
      description: "Recherche Lead Developer pour piloter l'equipe backend. Stack: Python, Django, PostgreSQL, Redis, Docker. Management de 3-4 developpeurs. Experience: 5+ ans.",
      url: "https://example.com/job2",
      source: "indeed",
      atsScore: 62,
      scoreBreakdown: {
        keywordMatch: { score: 9, max: 15, details: "Correspondance partielle" },
        skillsAlignment: { score: 12, max: 20, details: "Python, PostgreSQL correspondent mais Django manquant" },
        experienceRelevance: { score: 12, max: 15, details: "Experience suffisante" },
        jobTitleMatch: { score: 6, max: 10, details: "Lead correspond a l'objectif" },
        educationMatch: { score: 8, max: 10, details: "Formation adequate" },
        locationMatch: { score: 5, max: 10, details: "Lyon vs Paris, mais remote" },
        languageMatch: { score: 8, max: 10, details: "Langues correspondantes" },
        overallFit: { score: 2, max: 10, details: "Profil plutot frontend, poste plutot backend" },
      },
      matchingSkills: ["Python", "PostgreSQL", "Redis", "Docker"],
      missingSkills: ["Django", "Management d'equipe"],
    },
    {
      title: "Frontend Developer React",
      company: "StartupXYZ",
      location: "Paris, France",
      remote: "onsite",
      contract: "CDI",
      description: "Startup en forte croissance cherche developpeur frontend React. Vous rejoindrez une equipe de 10 personnes. Stack: React, TypeScript, Tailwind CSS, REST API.",
      url: "https://example.com/job3",
      source: "wttj",
      atsScore: 73,
      scoreBreakdown: {
        keywordMatch: { score: 11, max: 15, details: "Bonne correspondance" },
        skillsAlignment: { score: 15, max: 20, details: "React, TypeScript, Tailwind correspondent" },
        experienceRelevance: { score: 10, max: 15, details: "Surqualifie pour le poste" },
        jobTitleMatch: { score: 7, max: 10, details: "Frontend vs Full Stack" },
        educationMatch: { score: 8, max: 10, details: "Formation adequate" },
        locationMatch: { score: 10, max: 10, details: "Paris correspond" },
        languageMatch: { score: 8, max: 10, details: "OK" },
        overallFit: { score: 4, max: 10, details: "Poste frontend uniquement, profil full stack" },
      },
      matchingSkills: ["React", "TypeScript", "Tailwind CSS", "REST API"],
      missingSkills: [],
    },
  ];

  for (const jobData of demoJobs) {
    const job = await prisma.job.create({
      data: {
        searchId: search.id,
        ...jobData,
      },
    });

    // Save first job
    if (jobData.atsScore === 85) {
      await prisma.savedJob.create({
        data: {
          userId: user.id,
          jobId: job.id,
          status: "saved",
        },
      });
    }
  }

  console.log("Seed complete! Demo account: demo@jobmatcher.fr / demo1234");
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    prisma.$disconnect();
    process.exit(1);
  });

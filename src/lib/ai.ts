import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { logger } from "@/lib/logger";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const extractedProfileSchema = z.object({
  summary: z.string().default(""),
  currentTitle: z.string().default(""),
  yearsExperience: z.number().default(0),
  skills: z.array(z.string()).default([]),
  languages: z.array(z.string()).default([]),
  education: z.string().default(""),
  location: z.string().default(""),
  desiredRoles: z.array(z.string()).default([]),
  desiredSalary: z.string().default(""),
  remotePreference: z.string().default("non specifie"),
});

const atsBreakdownItemSchema = z.object({
  score: z.number().default(0),
  max: z.number().default(0),
  details: z.string().default(""),
});

const atsScoreSchema = z.object({
  totalScore: z.number().default(0),
  breakdown: z.object({
    keywordMatch: atsBreakdownItemSchema.default({}),
    skillsAlignment: atsBreakdownItemSchema.default({}),
    experienceRelevance: atsBreakdownItemSchema.default({}),
    jobTitleMatch: atsBreakdownItemSchema.default({}),
    educationMatch: atsBreakdownItemSchema.default({}),
    locationMatch: atsBreakdownItemSchema.default({}),
    languageMatch: atsBreakdownItemSchema.default({}),
    overallFit: atsBreakdownItemSchema.default({}),
  }).default({}),
  matchingSkills: z.array(z.string()).default([]),
  missingSkills: z.array(z.string()).default([]),
  recommendations: z.array(z.string()).default([]),
});

export interface ExtractedProfile {
  summary: string;
  currentTitle: string;
  yearsExperience: number;
  skills: string[];
  languages: string[];
  education: string;
  location: string;
  desiredRoles: string[];
  desiredSalary: string;
  remotePreference: string;
}

export async function extractProfile(rawText: string): Promise<ExtractedProfile> {
  const message = await anthropic.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 2048,
    messages: [
      {
        role: "user",
        content: `Analyse ce CV/profil et extrais les informations structurees. Reponds UNIQUEMENT en JSON valide, sans markdown.

IMPORTANT pour "desiredRoles": Tu DOIS deduire 5 a 8 titres de postes pertinents. REGLES STRICTES:
- Base-toi UNIQUEMENT sur les informations presentes dans le CV/profil (titre, experience, competences mentionnees)
- N'invente PAS de technologies ou competences non mentionnees dans le profil
- Genere des variantes du titre actuel (Senior, Lead, Principal, Head of, Responsable)
- Genere des equivalents francais ET anglais du meme role
- Les roles connexes doivent etre directement lies aux competences listees dans le profil
- Ne rajoute JAMAIS de technologie specifique (AWS, Azure, GCP, etc.) si elle n'est pas dans le profil

CV/Profil:
${rawText}

Format de reponse JSON:
{
  "summary": "resume professionnel en 2-3 phrases",
  "currentTitle": "titre actuel",
  "yearsExperience": nombre,
  "skills": ["skill1", "skill2"],
  "languages": ["Francais", "Anglais"],
  "education": "formation principale",
  "location": "ville, pays",
  "desiredRoles": ["role1", "role2", "role3", "role4", "role5", "role6", "role7", "role8"],
  "desiredSalary": "fourchette salariale si mentionnee ou vide",
  "remotePreference": "remote|hybrid|onsite|non specifie"
}`,
      },
    ],
  });

  const text = message.content[0].type === "text" ? message.content[0].text : "";

  try {
    const raw = JSON.parse(text);
    return extractedProfileSchema.parse(raw);
  } catch (err) {
    logger.error("Failed to parse AI profile response", {
      error: err instanceof Error ? err : new Error(String(err)),
      responsePreview: text.substring(0, 200),
    });
    throw new Error("Reponse AI invalide");
  }
}

export interface ATSScore {
  totalScore: number;
  breakdown: {
    keywordMatch: { score: number; max: number; details: string };
    skillsAlignment: { score: number; max: number; details: string };
    experienceRelevance: { score: number; max: number; details: string };
    jobTitleMatch: { score: number; max: number; details: string };
    educationMatch: { score: number; max: number; details: string };
    locationMatch: { score: number; max: number; details: string };
    languageMatch: { score: number; max: number; details: string };
    overallFit: { score: number; max: number; details: string };
  };
  matchingSkills: string[];
  missingSkills: string[];
  recommendations: string[];
}

export async function scoreJobATS(
  profileData: {
    skills: string[];
    currentTitle: string | null;
    yearsExperience: number | null;
    education: string | null;
    location: string | null;
    languages: string[];
    desiredRoles: string[];
  },
  jobTitle: string,
  jobDescription: string
): Promise<ATSScore> {
  const message = await anthropic.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 2048,
    messages: [
      {
        role: "user",
        content: `Analyse la compatibilite ATS entre ce profil candidat et cette offre d'emploi. Reponds UNIQUEMENT en JSON valide, sans markdown.

PROFIL CANDIDAT:
- Titre actuel: ${profileData.currentTitle || "Non specifie"}
- Experience: ${profileData.yearsExperience || "Non specifie"} ans
- Competences: ${profileData.skills.join(", ")}
- Formation: ${profileData.education || "Non specifie"}
- Localisation: ${profileData.location || "Non specifie"}
- Langues: ${profileData.languages.join(", ")}
- Roles recherches: ${profileData.desiredRoles.join(", ")}

OFFRE D'EMPLOI:
Titre: ${jobTitle}
Description: ${jobDescription}

Reponds avec ce JSON:
{
  "totalScore": 0-100,
  "breakdown": {
    "keywordMatch": {"score": 0-15, "max": 15, "details": "explication"},
    "skillsAlignment": {"score": 0-20, "max": 20, "details": "explication"},
    "experienceRelevance": {"score": 0-15, "max": 15, "details": "explication"},
    "jobTitleMatch": {"score": 0-10, "max": 10, "details": "explication"},
    "educationMatch": {"score": 0-10, "max": 10, "details": "explication"},
    "locationMatch": {"score": 0-10, "max": 10, "details": "explication"},
    "languageMatch": {"score": 0-10, "max": 10, "details": "explication"},
    "overallFit": {"score": 0-10, "max": 10, "details": "explication"}
  },
  "matchingSkills": ["skill1", "skill2"],
  "missingSkills": ["skill1", "skill2"],
  "recommendations": ["conseil1", "conseil2"]
}`,
      },
    ],
  });

  const text = message.content[0].type === "text" ? message.content[0].text : "";

  try {
    const raw = JSON.parse(text);
    return atsScoreSchema.parse(raw);
  } catch (err) {
    logger.error("Failed to parse AI ATS score response", {
      error: err instanceof Error ? err : new Error(String(err)),
      jobTitle,
      responsePreview: text.substring(0, 200),
    });
    throw new Error("Reponse AI invalide pour le scoring ATS");
  }
}

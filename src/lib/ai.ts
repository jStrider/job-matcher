import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
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
  "desiredRoles": ["role1", "role2"],
  "desiredSalary": "fourchette salariale si mentionnee ou vide",
  "remotePreference": "remote|hybrid|onsite|non specifie"
}`,
      },
    ],
  });

  const text = message.content[0].type === "text" ? message.content[0].text : "";
  return JSON.parse(text);
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
  return JSON.parse(text);
}

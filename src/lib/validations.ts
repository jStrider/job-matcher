import { z } from "zod";

export const searchSchema = z.object({
  query: z.string().trim().min(1, "Requete de recherche requise"),
  location: z.string().optional(),
  remote: z.enum(["remote", "hybrid", "onsite", ""]).optional(),
  contract: z.enum(["CDI", "CDD", "freelance", "stage", "alternance", ""]).optional(),
});

export type SearchInput = z.infer<typeof searchSchema>;

export const linkedinUrlSchema = z.object({
  url: z
    .string()
    .min(1, "URL requise")
    .refine(
      (url) => {
        try {
          const parsed = new URL(url);
          return parsed.hostname === "linkedin.com" || parsed.hostname === "www.linkedin.com";
        } catch {
          return false;
        }
      },
      {
        message: "URL LinkedIn invalide. Exemple: https://linkedin.com/in/votre-profil",
      }
    ),
});

export const jobStatusSchema = z.object({
  status: z.enum(["saved", "applied", "interview", "offer", "rejected"]),
});

const stringFieldSchema = z.object({
  field: z.enum(["summary", "currentTitle", "education", "location", "desiredSalary", "remotePreference"]),
  value: z.string(),
});

const arrayFieldSchema = z.object({
  field: z.enum(["skills", "languages", "desiredRoles"]),
  value: z.array(z.string()),
});

const numberFieldSchema = z.object({
  field: z.literal("yearsExperience"),
  value: z.number(),
});

export const profileFieldSchema = z.discriminatedUnion("field", [
  stringFieldSchema,
  arrayFieldSchema,
  numberFieldSchema,
]);

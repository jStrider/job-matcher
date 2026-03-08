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
    .refine((url) => url.includes("linkedin.com"), {
      message: "URL LinkedIn invalide. Exemple: https://linkedin.com/in/votre-profil",
    }),
});

export const jobStatusSchema = z.object({
  status: z.enum(["saved", "applied", "interview", "offer", "rejected"]),
});

export const profileFieldSchema = z.object({
  field: z.enum([
    "summary",
    "currentTitle",
    "skills",
    "languages",
    "education",
    "location",
    "desiredRoles",
    "desiredSalary",
    "remotePreference",
  ]),
  value: z.union([z.string(), z.array(z.string())]),
});

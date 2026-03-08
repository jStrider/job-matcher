"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { extractProfile } from "@/lib/ai";
import { redirect } from "next/navigation";

export async function saveProfile(formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) return { error: "Non authentifié" };

  const rawText = formData.get("rawText") as string;
  if (!rawText?.trim()) return { error: "Texte du profil requis" };

  let extracted;
  try {
    extracted = await extractProfile(rawText);
  } catch {
    return { error: "Erreur lors de l'analyse du profil" };
  }

  await prisma.profile.upsert({
    where: { userId: session.user.id },
    create: {
      userId: session.user.id,
      rawText,
      summary: extracted.summary,
      currentTitle: extracted.currentTitle,
      yearsExperience: extracted.yearsExperience,
      skills: extracted.skills,
      languages: extracted.languages,
      education: extracted.education,
      location: extracted.location,
      desiredRoles: extracted.desiredRoles,
      desiredSalary: extracted.desiredSalary,
      remotePreference: extracted.remotePreference,
    },
    update: {
      rawText,
      summary: extracted.summary,
      currentTitle: extracted.currentTitle,
      yearsExperience: extracted.yearsExperience,
      skills: extracted.skills,
      languages: extracted.languages,
      education: extracted.education,
      location: extracted.location,
      desiredRoles: extracted.desiredRoles,
      desiredSalary: extracted.desiredSalary,
      remotePreference: extracted.remotePreference,
    },
  });

  redirect("/dashboard");
}

const ALLOWED_PROFILE_FIELDS = new Set([
  "summary",
  "currentTitle",
  "yearsExperience",
  "skills",
  "languages",
  "education",
  "location",
  "desiredRoles",
  "desiredSalary",
  "remotePreference",
]);

export async function updateProfileField(field: string, value: string | string[]) {
  const session = await auth();
  if (!session?.user?.id) return { error: "Non authentifié" };

  if (!ALLOWED_PROFILE_FIELDS.has(field)) {
    return { error: "Champ non autorisé" };
  }

  const profile = await prisma.profile.findUnique({
    where: { userId: session.user.id },
  });
  if (!profile) return { error: "Profil non trouve" };

  // Validate value length
  if (typeof value === "string" && value.length > 5000) {
    return { error: "Valeur trop longue" };
  }
  if (Array.isArray(value) && value.some((v) => typeof v !== "string" || v.length > 500)) {
    return { error: "Valeur invalide" };
  }

  await prisma.profile.update({
    where: { userId: session.user.id },
    data: { [field]: value },
  });

  return { success: true };
}

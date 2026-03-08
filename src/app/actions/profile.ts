"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { extractProfile } from "@/lib/ai";
import { profileFieldSchema } from "@/lib/validations";
import { logger } from "@/lib/logger";
import { redirect } from "next/navigation";

export async function saveProfile(formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) return { error: "Non authentifie" };

  const rawText = formData.get("rawText") as string;
  if (!rawText?.trim()) return { error: "Texte du profil requis" };

  let extracted;
  try {
    extracted = await extractProfile(rawText);
  } catch (err) {
    logger.error("Profile extraction failed", { error: err instanceof Error ? err : new Error(String(err)) });
    return { error: "Erreur lors de l'analyse du profil" };
  }

  try {
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
  } catch (err) {
    logger.error("Profile upsert failed", { error: err instanceof Error ? err : new Error(String(err)) });
    return { error: "Erreur lors de la sauvegarde du profil" };
  }

  redirect("/dashboard");
}

export async function updateProfileField(field: string, value: string | string[]) {
  const session = await auth();
  if (!session?.user?.id) return { error: "Non authentifie" };

  const parsed = profileFieldSchema.safeParse({ field, value });
  if (!parsed.success) {
    return { error: "Champ invalide" };
  }

  try {
    const profile = await prisma.profile.findUnique({
      where: { userId: session.user.id },
      select: { id: true },
    });
    if (!profile) return { error: "Profil non trouve" };

    await prisma.profile.update({
      where: { userId: session.user.id },
      data: { [parsed.data.field]: parsed.data.value },
    });

    return { success: true };
  } catch (err) {
    logger.error("Profile field update failed", { field, error: err instanceof Error ? err : new Error(String(err)) });
    return { error: "Erreur lors de la mise a jour" };
  }
}

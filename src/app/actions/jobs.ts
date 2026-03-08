"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { jobStatusSchema } from "@/lib/validations";
import { logger } from "@/lib/logger";

async function requireAuthAction() {
  const session = await auth();
  if (!session?.user?.id) return null;
  return session;
}

export async function saveJob(jobId: string) {
  const session = await requireAuthAction();
  if (!session) return { error: "Non authentifie" };

  if (!jobId) return { error: "ID requis" };

  try {
    await prisma.savedJob.upsert({
      where: { userId_jobId: { userId: session.user.id, jobId } },
      create: { userId: session.user.id, jobId },
      update: {},
    });
    return { success: true };
  } catch (err) {
    logger.error("Failed to save job", { jobId, error: err instanceof Error ? err : new Error(String(err)) });
    return { error: "Erreur lors de la sauvegarde" };
  }
}

export async function unsaveJob(jobId: string) {
  const session = await requireAuthAction();
  if (!session) return { error: "Non authentifie" };

  if (!jobId) return { error: "ID requis" };

  try {
    await prisma.savedJob.deleteMany({
      where: { userId: session.user.id, jobId },
    });
    return { success: true };
  } catch (err) {
    logger.error("Failed to unsave job", { jobId, error: err instanceof Error ? err : new Error(String(err)) });
    return { error: "Erreur lors de la suppression" };
  }
}

export async function updateJobStatus(savedJobId: string, status: string) {
  const session = await requireAuthAction();
  if (!session) return { error: "Non authentifie" };

  const parsed = jobStatusSchema.safeParse({ status });
  if (!parsed.success) {
    return { error: "Statut invalide" };
  }

  try {
    await prisma.savedJob.update({
      where: { id: savedJobId, userId: session.user.id },
      data: {
        status: parsed.data.status,
        appliedAt: parsed.data.status === "applied" ? new Date() : undefined,
      },
    });
    return { success: true };
  } catch (err) {
    logger.error("Failed to update job status", { savedJobId, error: err instanceof Error ? err : new Error(String(err)) });
    return { error: "Erreur lors de la mise a jour" };
  }
}

export async function updateJobNotes(savedJobId: string, notes: string) {
  const session = await requireAuthAction();
  if (!session) return { error: "Non authentifie" };

  if (typeof notes !== "string" || notes.length > 10000) {
    return { error: "Notes invalides ou trop longues (max 10 000 caractères)" };
  }

  try {
    await prisma.savedJob.update({
      where: { id: savedJobId, userId: session.user.id },
      data: { notes },
    });
    return { success: true };
  } catch (err) {
    logger.error("Failed to update job notes", { savedJobId, error: err instanceof Error ? err : new Error(String(err)) });
    return { error: "Erreur lors de la mise a jour des notes" };
  }
}

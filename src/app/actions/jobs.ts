"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function saveJob(jobId: string) {
  const session = await auth();
  if (!session?.user?.id) return { error: "Non authentifié" };

  await prisma.savedJob.upsert({
    where: { userId_jobId: { userId: session.user.id, jobId } },
    create: { userId: session.user.id, jobId },
    update: {},
  });

  return { success: true };
}

export async function unsaveJob(jobId: string) {
  const session = await auth();
  if (!session?.user?.id) return { error: "Non authentifié" };

  await prisma.savedJob.deleteMany({
    where: { userId: session.user.id, jobId },
  });

  return { success: true };
}

const ALLOWED_STATUSES = new Set(["saved", "applied", "interview", "offer", "rejected"]);

export async function updateJobStatus(savedJobId: string, status: string) {
  const session = await auth();
  if (!session?.user?.id) return { error: "Non authentifié" };

  if (!ALLOWED_STATUSES.has(status)) {
    return { error: "Statut invalide" };
  }

  await prisma.savedJob.update({
    where: { id: savedJobId, userId: session.user.id },
    data: {
      status,
      appliedAt: status === "applied" ? new Date() : undefined,
    },
  });

  return { success: true };
}

export async function updateJobNotes(savedJobId: string, notes: string) {
  const session = await auth();
  if (!session?.user?.id) return { error: "Non authentifié" };

  if (typeof notes !== "string" || notes.length > 10000) {
    return { error: "Notes invalides ou trop longues (max 10 000 caractères)" };
  }

  await prisma.savedJob.update({
    where: { id: savedJobId, userId: session.user.id },
    data: { notes },
  });

  return { success: true };
}

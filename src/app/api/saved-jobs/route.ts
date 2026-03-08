import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, isAuthError, apiHandler } from "@/lib/api-utils";

export async function GET() {
  return apiHandler("saved-jobs/GET", async () => {
    const session = await requireAuth();
    if (isAuthError(session)) return session;

    const jobs = await prisma.savedJob.findMany({
      where: { userId: session.user.id },
      include: {
        job: {
          select: {
            id: true,
            title: true,
            company: true,
            location: true,
            atsScore: true,
            url: true,
            source: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ jobs });
  });
}

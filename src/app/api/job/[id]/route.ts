import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, isAuthError, apiHandler } from "@/lib/api-utils";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return apiHandler("job/[id]/GET", async () => {
    const session = await requireAuth();
    if (isAuthError(session)) return session;

    const { id } = await params;

    if (!id) {
      return NextResponse.json({ error: "ID requis" }, { status: 400 });
    }

    const job = await prisma.job.findUnique({
      where: { id },
      select: {
        id: true,
        title: true,
        company: true,
        location: true,
        salary: true,
        remote: true,
        contract: true,
        description: true,
        url: true,
        source: true,
        atsScore: true,
        scoreBreakdown: true,
        matchingSkills: true,
        missingSkills: true,
        createdAt: true,
      },
    });

    if (!job) {
      return NextResponse.json({ error: "Offre non trouvee" }, { status: 404 });
    }

    const savedJob = await prisma.savedJob.findUnique({
      where: { userId_jobId: { userId: session.user.id, jobId: id } },
      select: { id: true },
    });

    return NextResponse.json({ job, isSaved: !!savedJob });
  });
}

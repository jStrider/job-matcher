import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Non authentifie" }, { status: 401 });
  }

  const { id } = await params;

  const job = await prisma.job.findUnique({
    where: { id },
  });

  if (!job) {
    return NextResponse.json({ error: "Offre non trouvee" }, { status: 404 });
  }

  const savedJob = await prisma.savedJob.findUnique({
    where: { userId_jobId: { userId: session.user.id, jobId: id } },
  });

  return NextResponse.json({ job, isSaved: !!savedJob });
}

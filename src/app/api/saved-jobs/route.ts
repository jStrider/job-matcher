import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Non authentifie" }, { status: 401 });
  }

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
}

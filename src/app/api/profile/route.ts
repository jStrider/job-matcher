import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, isAuthError, apiHandler } from "@/lib/api-utils";

export async function GET() {
  return apiHandler("profile/GET", async () => {
    const session = await requireAuth();
    if (isAuthError(session)) return session;

    const profile = await prisma.profile.findUnique({
      where: { userId: session.user.id },
      select: {
        rawText: true,
        summary: true,
        currentTitle: true,
        yearsExperience: true,
        skills: true,
        languages: true,
        education: true,
        location: true,
        desiredRoles: true,
        desiredSalary: true,
        remotePreference: true,
      },
    });

    return NextResponse.json({ profile });
  });
}

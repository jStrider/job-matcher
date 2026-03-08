import { NextRequest, NextResponse } from "next/server";
import { cleanupOldSearches } from "@/lib/db-cleanup";
import { apiHandler } from "@/lib/api-utils";

export async function POST(request: NextRequest) {
  return apiHandler("cleanup", async () => {
    // Protect with a secret token (use NEXTAUTH_SECRET as cleanup auth)
    const authHeader = request.headers.get("authorization");
    const expectedToken = process.env.NEXTAUTH_SECRET;

    if (!authHeader || authHeader !== `Bearer ${expectedToken}`) {
      return NextResponse.json({ error: "Non autorise" }, { status: 403 });
    }

    const result = await cleanupOldSearches();
    return NextResponse.json(result);
  });
}

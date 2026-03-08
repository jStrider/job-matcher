import { NextRequest, NextResponse } from "next/server";
import { cleanupOldSearches } from "@/lib/db-cleanup";
import { apiHandler } from "@/lib/api-utils";

export async function POST(request: NextRequest) {
  return apiHandler("cleanup", async () => {
    const authHeader = request.headers.get("authorization");
    const expectedToken = process.env.CLEANUP_API_KEY;

    if (!expectedToken) {
      return NextResponse.json({ error: "CLEANUP_API_KEY non configuree" }, { status: 500 });
    }

    if (!authHeader || authHeader !== `Bearer ${expectedToken}`) {
      return NextResponse.json({ error: "Non autorise" }, { status: 403 });
    }

    const result = await cleanupOldSearches();
    return NextResponse.json(result);
  });
}

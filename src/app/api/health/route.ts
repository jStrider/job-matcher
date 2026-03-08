import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  let db = false;
  try {
    await prisma.$queryRaw`SELECT 1`;
    db = true;
  } catch {
    // DB unreachable
  }

  const status = db ? "ok" : "degraded";
  const statusCode = db ? 200 : 503;

  return NextResponse.json(
    { status, db, timestamp: new Date().toISOString() },
    { status: statusCode }
  );
}

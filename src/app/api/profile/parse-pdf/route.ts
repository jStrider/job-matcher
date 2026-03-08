import { NextRequest, NextResponse } from "next/server";
import { checkRateLimit, RATE_LIMITS } from "@/lib/rate-limit";
import { requireAuth, isAuthError, apiHandler } from "@/lib/api-utils";

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB
const ALLOWED_TYPES = new Set(["application/pdf", "text/plain"]);

async function extractTextFromPDF(buffer: Buffer): Promise<string> {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { PDFParse } = require("pdf-parse");
  const parser = new PDFParse({ data: buffer });
  await parser.load();
  return await parser.getText();
}

export async function POST(request: NextRequest) {
  return apiHandler("profile/parse-pdf/POST", async () => {
    const session = await requireAuth();
    if (isAuthError(session)) return session;

    const rl = checkRateLimit(`pdf:${session.user.id}`, RATE_LIMITS.pdfParse);
    if (!rl.allowed) {
      return NextResponse.json({ error: "Trop de requêtes. Réessayez dans une minute." }, { status: 429 });
    }

    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "Aucun fichier fourni" }, { status: 400 });
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: "Fichier trop volumineux (max 10 Mo)" }, { status: 400 });
    }

    const fileName = file.name.toLowerCase();

    if (!fileName.endsWith(".pdf") && !fileName.endsWith(".txt")) {
      return NextResponse.json(
        { error: "Format non supporte. Utilisez un fichier PDF ou TXT." },
        { status: 400 }
      );
    }

    // Validate MIME type
    if (file.type && !ALLOWED_TYPES.has(file.type)) {
      return NextResponse.json({ error: "Type de fichier non supporté." }, { status: 400 });
    }

    if (fileName.endsWith(".txt")) {
      const text = await file.text();
      return NextResponse.json({ text: text.slice(0, 100_000) });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const text = await extractTextFromPDF(buffer);
    return NextResponse.json({ text: text.slice(0, 100_000) });
  });
}

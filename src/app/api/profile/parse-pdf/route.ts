import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { checkRateLimit, RATE_LIMITS } from "@/lib/rate-limit";

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB
const ALLOWED_TYPES = new Set(["application/pdf", "text/plain"]);
const ALLOWED_EXTENSIONS = [".pdf", ".txt"];

async function extractTextFromPDF(buffer: Buffer): Promise<string> {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { PDFParse } = require("pdf-parse");
  const parser = new PDFParse({ data: buffer });
  await parser.load();
  return await parser.getText();
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  const rl = checkRateLimit(`pdf:${session.user.id}`, RATE_LIMITS.pdfParse);
  if (!rl.allowed) {
    return NextResponse.json({ error: "Trop de requêtes. Réessayez dans une minute." }, { status: 429 });
  }

  const formData = await request.formData();
  const file = formData.get("file") as File;

  if (!file) {
    return NextResponse.json({ error: "Aucun fichier fourni" }, { status: 400 });
  }

  // Validate file size
  if (file.size > MAX_FILE_SIZE) {
    return NextResponse.json({ error: "Fichier trop volumineux (max 10 Mo)" }, { status: 400 });
  }

  // Validate file extension
  const fileName = file.name.toLowerCase();
  if (!ALLOWED_EXTENSIONS.some((ext) => fileName.endsWith(ext))) {
    return NextResponse.json({ error: "Type de fichier non supporté. Utilisez PDF ou TXT." }, { status: 400 });
  }

  // Validate MIME type
  if (file.type && !ALLOWED_TYPES.has(file.type)) {
    return NextResponse.json({ error: "Type de fichier non supporté." }, { status: 400 });
  }

  try {
    if (fileName.endsWith(".txt")) {
      const text = await file.text();
      return NextResponse.json({ text: text.slice(0, 100_000) });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const text = await extractTextFromPDF(buffer);
    return NextResponse.json({ text: text.slice(0, 100_000) });
  } catch {
    return NextResponse.json(
      { error: "Erreur lors de la lecture du fichier" },
      { status: 500 }
    );
  }
}

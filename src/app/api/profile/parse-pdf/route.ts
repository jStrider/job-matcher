import { NextRequest, NextResponse } from "next/server";
import { requireAuth, isAuthError, apiHandler } from "@/lib/api-utils";

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

    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "Aucun fichier fourni" }, { status: 400 });
    }

    if (!file.name.endsWith(".pdf") && !file.name.endsWith(".txt")) {
      return NextResponse.json(
        { error: "Format non supporte. Utilisez un fichier PDF ou TXT." },
        { status: 400 }
      );
    }

    if (file.name.endsWith(".txt")) {
      const text = await file.text();
      return NextResponse.json({ text });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const text = await extractTextFromPDF(buffer);
    return NextResponse.json({ text });
  });
}

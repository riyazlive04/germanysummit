import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_BYTES = 8 * 1024 * 1024; // 8 MB

/**
 * Extract plain text from an uploaded Word .docx résumé so it auto-fills the CV
 * Lab text box (same flow as the PDF route). Modern .docx only - legacy .doc is
 * a different binary format and not supported. Never throws to the client.
 */
export async function POST(req: Request) {
  const form = await req.formData().catch(() => null);
  const file = form?.get("file");

  if (!(file instanceof File)) {
    return NextResponse.json({ ok: false, error: "No file uploaded." }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json(
      { ok: false, error: "File is too large (max 8 MB)." },
      { status: 413 },
    );
  }
  // Guard against the legacy binary .doc format, which mammoth can't read.
  if (file.name.toLowerCase().endsWith(".doc")) {
    return NextResponse.json(
      {
        ok: false,
        error: "Old .doc files aren't supported. Save as .docx or PDF, or paste the text.",
      },
      { status: 415 },
    );
  }

  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    const mammoth = (await import("mammoth")).default;
    const result = await mammoth.extractRawText({ buffer });
    const text = (result.value || "").trim();

    if (!text) {
      return NextResponse.json({
        ok: false,
        error: "No text found in that document. Please paste your résumé instead.",
      });
    }

    return NextResponse.json({ ok: true, text });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "extraction failed";
    return NextResponse.json(
      { ok: false, error: `Could not read the Word file (${msg}). Please paste the text instead.` },
      { status: 422 },
    );
  }
}

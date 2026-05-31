import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_BYTES = 8 * 1024 * 1024; // 8 MB

/**
 * Extract plain text from an uploaded résumé PDF so the attendee can review/edit
 * it before diagnosis. Text-only - scanned/image PDFs won't yield text, in which
 * case the user pastes instead. Never throws to the client.
 */
export async function POST(req: Request) {
  const form = await req.formData().catch(() => null);
  const file = form?.get("file");

  if (!(file instanceof File)) {
    return NextResponse.json({ ok: false, error: "No file uploaded." }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json(
      { ok: false, error: "PDF is too large (max 8 MB)." },
      { status: 413 },
    );
  }

  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    // Import the inner lib file to skip pdf-parse's index debug block.
    const pdf = (await import("pdf-parse/lib/pdf-parse.js")).default;
    const data = await pdf(buffer);
    const text = (data.text || "").trim();

    if (!text) {
      return NextResponse.json({
        ok: false,
        error:
          "No selectable text found - this may be a scanned PDF. Please paste your résumé text instead.",
      });
    }

    return NextResponse.json({ ok: true, text, pages: data.numpages });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "extraction failed";
    return NextResponse.json(
      { ok: false, error: `Could not read the PDF (${msg}). Please paste the text instead.` },
      { status: 422 },
    );
  }
}

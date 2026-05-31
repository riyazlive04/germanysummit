import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { decodeSubmission } from "@/lib/submission";
import { normalizePhone } from "@/lib/phone";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function validEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

/**
 * Audience self-service: return a person's own saved profile (score, archetype,
 * CV diagnosis, roadmap) by email. If a phone was registered on the record, it
 * must be provided and match - a light identity check so an email alone can't
 * pull someone else's data.
 */
export async function POST(req: Request) {
  let body: { email?: string; phone?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
  }

  const email = (body.email ?? "").trim().toLowerCase();
  if (!email || !validEmail(email)) {
    return NextResponse.json(
      { ok: false, error: "Enter the email you used." },
      { status: 400 },
    );
  }

  const row = await prisma.submission
    .findUnique({ where: { email } })
    .catch(() => null);

  if (!row) {
    return NextResponse.json(
      { ok: false, error: "No result found for that email yet. Take the Reality Check first." },
      { status: 404 },
    );
  }

  // If a phone is on file, require it to match.
  if (row.phoneNorm) {
    const provided = normalizePhone(body.phone);
    if (!provided || provided !== row.phoneNorm) {
      return NextResponse.json(
        {
          ok: false,
          needsPhone: true,
          error: "Enter the phone number on your registration to view your result.",
        },
        { status: 401 },
      );
    }
  }

  return NextResponse.json({ ok: true, submission: decodeSubmission(row) });
}

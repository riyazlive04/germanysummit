import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { fireN8n } from "@/lib/n8n";
import { normalizePhone } from "@/lib/phone";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const FILE = "/the-secret-playbook.pdf";

function validEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

type Body = { email?: string; name?: string; phone?: string };

/**
 * "The Secret Playbook" free download. We do NOT capture a separate lead - the
 * playbook is for people already in the room. We tag the matching profile (by
 * email or phone) with playbookAt so the team can see who downloaded it, then
 * return the file. Unknown emails still get the download; we just don't create a
 * parallel record.
 */
export async function POST(req: Request) {
  let body: Body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
  }

  const email = (body.email ?? "").trim().toLowerCase();
  if (!email || !validEmail(email)) {
    return NextResponse.json(
      { ok: false, error: "Enter a valid email to get the playbook." },
      { status: 400 },
    );
  }
  const phoneNorm = normalizePhone(body.phone);

  let matched = false;
  try {
    const existing = await prisma.submission.findFirst({
      where: { OR: [{ email }, ...(phoneNorm ? [{ phoneNorm }] : [])] },
      select: { id: true },
    });
    if (existing) {
      await prisma.submission.update({
        where: { id: existing.id },
        data: { playbookAt: new Date() },
      });
      matched = true;
    }
  } catch (err) {
    // Never block the download on a tagging failure - just log.
    console.warn("[playbook] tag failed:", err);
  }

  // Best-effort delivery (WhatsApp/Sheets) for known individuals only.
  if (matched) {
    void fireN8n({ module: "playbook", email, name: body.name, file: "the-secret-playbook" });
  }

  return NextResponse.json({ ok: true, file: FILE, matched });
}
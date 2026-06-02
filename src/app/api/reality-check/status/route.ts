import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { normalizePhone } from "@/lib/phone";
import { evaluateLock } from "@/lib/gating";
import { getAppConfig } from "@/lib/config";
import { decodeSubmission } from "@/lib/submission";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function validEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

/**
 * Lightweight pre-check so the client can gate the Reality Check BEFORE revealing
 * a freshly computed result: has this person (by email or phone) already taken
 * it, and are they allowed to (re)take right now?
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
      { ok: false, error: "A valid email is required." },
      { status: 400 },
    );
  }

  const phoneNorm = normalizePhone(body.phone);
  const lock = await evaluateLock(email, phoneNorm);
  const config = await getAppConfig();

  // For the event-day re-score, surface this person's previous answers so the
  // quiz can show them under each question.
  let previousAnswers: number[] | null = null;
  if (lock.taken && config.eventDayMode) {
    const row = await prisma.submission.findFirst({
      where: {
        totalScore: { not: null },
        OR: [{ email }, ...(phoneNorm ? [{ phoneNorm }] : [])],
      },
      orderBy: { updatedAt: "desc" },
    });
    if (row) previousAnswers = decodeSubmission(row).answers;
  }

  return NextResponse.json({
    ok: true,
    taken: lock.taken,
    allowed: lock.allowed,
    locked: lock.taken && !lock.allowed,
    eventDayMode: config.eventDayMode,
    previousAnswers,
  });
}

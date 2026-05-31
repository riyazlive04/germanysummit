import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { score } from "@/lib/scoring";
import { encode, decodeSubmission, type Answers } from "@/lib/submission";
import { fireN8n } from "@/lib/n8n";
import { TOTAL_QUESTIONS } from "@/lib/questions";
import { normalizePhone } from "@/lib/phone";
import { evaluateLock, consumeRetakes } from "@/lib/gating";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SESSIONS = ["pre_event", "on_arrival", "end_of_day"] as const;

type Body = {
  email?: string;
  name?: string;
  phone?: string;
  source?: string;
  session?: string;
  answers?: unknown;
};

function validEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function validAnswers(value: unknown): value is Answers {
  return (
    Array.isArray(value) &&
    value.length === TOTAL_QUESTIONS &&
    value.every((n) => Number.isInteger(n) && n >= 0 && n <= 3)
  );
}

/**
 * Persist a Reality Check result to the shared Submission (upsert by email) and
 * fire the n8n webhook. Score is recomputed server-side so the stored row is the
 * source of truth regardless of the client. The webhook is best-effort and never
 * blocks the response - the client already shows the result locally.
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
      { ok: false, error: "A valid email is required." },
      { status: 400 },
    );
  }
  if (!validAnswers(body.answers)) {
    return NextResponse.json(
      { ok: false, error: "answers must be 10 integers (0..3)." },
      { status: 400 },
    );
  }

  const answers = body.answers;
  const result = score(answers);
  const session =
    body.session && (SESSIONS as readonly string[]).includes(body.session)
      ? body.session
      : "pre_event";

  // Only overwrite identity fields when a non-empty value is provided, so a
  // later module submission can't blank out an earlier name/phone.
  const name = body.name?.trim() || undefined;
  const phone = body.phone?.trim() || undefined;
  const source = body.source?.trim() || undefined;
  const phoneNorm = normalizePhone(body.phone);

  // Retake gating: a completed Reality Check locks this person (by email OR
  // phone) unless the admin granted a retake or the global override is on.
  const lock = await evaluateLock(email, phoneNorm);
  if (lock.taken && !lock.allowed) {
    return NextResponse.json(
      {
        ok: false,
        locked: true,
        error:
          "You've already completed your Reality Check. Look up your result, or ask the team to re-enable a retake for you.",
      },
      { status: 403 },
    );
  }

  // Append a phase-tagged snapshot to this person's history so the room view can
  // show a true before/after lift (first take vs latest) across the day. Read the
  // prior history off the existing row, then cap the trail to the last 20 takes.
  const existing = await prisma.submission.findUnique({ where: { email } });
  const priorHistory = existing ? decodeSubmission(existing).scoreHistory ?? [] : [];
  const snapshot = { score: result.totalScore, session, at: new Date().toISOString() };

  const module1 = {
    answers: encode(answers),
    dimScores: encode(result.dimScores),
    totalScore: result.totalScore,
    tier: result.tier,
    weakestDim: result.weakestDim,
    archetype: result.archetype,
    scoreHistory: encode([...priorHistory, snapshot].slice(-20)),
  };

  let row;
  try {
    row = await prisma.submission.upsert({
      where: { email },
      create: {
        email,
        name,
        phone,
        phoneNorm,
        source,
        session,
        ...module1,
      },
      update: {
        ...(name ? { name } : {}),
        ...(phone ? { phone } : {}),
        ...(phoneNorm ? { phoneNorm } : {}),
        ...(source ? { source } : {}),
        session,
        ...module1,
      },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "DB error";
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }

  // Consume any one-shot retake grants now that the take has succeeded, so the
  // person is locked again (the saved row included).
  await consumeRetakes([...new Set([...lock.conflictIds, row.id])]);

  const submission = decodeSubmission(row);

  // Best-effort delivery - fan out to Sheets + WhatsApp. Failures are logged,
  // never surfaced; the result is already saved and shown.
  const delivery = await fireN8n({ module: "reality-check", submission });
  if (!delivery.ok && !("skipped" in delivery)) {
    console.warn("[n8n] reality-check delivery failed:", delivery.error);
  }

  return NextResponse.json({ ok: true, submission, delivered: delivery.ok });
}

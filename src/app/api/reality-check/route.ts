import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { score } from "@/lib/scoring";
import { encode, decodeSubmission, type Answers, type ReadinessSnapshot } from "@/lib/submission";
import { fireN8n } from "@/lib/n8n";
import { TOTAL_QUESTIONS } from "@/lib/questions";
import { normalizePhone } from "@/lib/phone";
import { evaluateLock, consumeRetakes } from "@/lib/gating";
import { buildFollowup, buildMirror, intentScore } from "@/lib/insights";
import { isValidEmail, isValidPhone } from "@/lib/validate";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SESSIONS = ["pre_event", "on_arrival", "end_of_day"] as const;

const YEARS = ["lt1", "1to2", "2to3", "gt3"] as const;

type Body = {
  email?: string;
  name?: string;
  phone?: string;
  source?: string;
  session?: string;
  answers?: unknown;
  consistency?: unknown;
  yearsPlanning?: unknown;
};

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
  if (!email || !isValidEmail(email)) {
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
  // Name and WhatsApp number are required (enforced on the server too).
  if (!body.name?.trim()) {
    return NextResponse.json(
      { ok: false, error: "Your first name is required." },
      { status: 400 },
    );
  }
  if (!isValidPhone(body.phone)) {
    return NextResponse.json(
      { ok: false, error: "A valid 10-digit WhatsApp number is required." },
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

  // Optional emotional-context inputs (not scored).
  const consistency =
    typeof body.consistency === "number" &&
    Number.isInteger(body.consistency) &&
    body.consistency >= 0 &&
    body.consistency <= 10
      ? body.consistency
      : undefined;
  const yearsPlanning =
    typeof body.yearsPlanning === "string" &&
    (YEARS as readonly string[]).includes(body.yearsPlanning)
      ? body.yearsPlanning
      : undefined;

  // Retake gating: a completed Reality Check locks this person (by email OR
  // phone) unless the admin granted a retake or the global override is on.
  const lock = await evaluateLock(email, phoneNorm, session);
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
  const decodedExisting = existing ? decodeSubmission(existing) : null;
  const priorHistory = decodedExisting?.scoreHistory ?? [];

  // Preserve the PREVIOUS take's full detail (dimensions + answers) before the
  // live row is overwritten, so a true per-dimension / per-question before/after
  // survives the retake. The existing row still reflects that previous take.
  if (priorHistory.length && decodedExisting) {
    const last = priorHistory[priorHistory.length - 1];
    if (!last.answers && decodedExisting.answers) last.answers = decodedExisting.answers;
    if (!last.dimScores && decodedExisting.dimScores) last.dimScores = decodedExisting.dimScores;
  }

  const snapshot: ReadinessSnapshot = {
    score: result.totalScore,
    session,
    at: new Date().toISOString(),
    dimScores: result.dimScores,
    answers,
  };

  // Only brand a weakest dimension / archetype when there's a real gap. For a
  // strong-across or evenly-matched result there is no single weakest, so the
  // stored row - and therefore the WhatsApp follow-up and the mirror built from
  // it - leave both null instead of mislabeling a strong attendee.
  const module1 = {
    answers: encode(answers),
    dimScores: encode(result.dimScores),
    totalScore: result.totalScore,
    tier: result.tier,
    weakestDim: result.hasWeakness ? result.weakestDim : null,
    archetype: result.hasWeakness ? result.archetype : null,
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
        ...(consistency !== undefined ? { consistency } : {}),
        ...(yearsPlanning ? { yearsPlanning } : {}),
        ...module1,
      },
      update: {
        ...(name ? { name } : {}),
        ...(phone ? { phone } : {}),
        ...(phoneNorm ? { phoneNorm } : {}),
        ...(source ? { source } : {}),
        ...(consistency !== undefined ? { consistency } : {}),
        ...(yearsPlanning ? { yearsPlanning } : {}),
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
  const delivery = await fireN8n({
    module: "reality-check",
    submission,
    // Personalized assets for the operator's follow-up automation.
    followup: buildFollowup(submission),
    mirror: buildMirror(submission),
    intent: intentScore(submission),
  });
  if (!delivery.ok && !("skipped" in delivery)) {
    console.warn("[n8n] reality-check delivery failed:", delivery.error);
  }

  return NextResponse.json({ ok: true, submission, delivered: delivery.ok });
}

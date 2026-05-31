import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { complete, extractJson } from "@/lib/llm";
import {
  buildSystemPrompt,
  buildUserPrompt,
  normalizeReview,
  CV_INPUT_LIMITS,
} from "@/lib/cv";
import { matchRequirements } from "@/lib/keywords";
import { encode, decodeSubmission, type ScoreSnapshot } from "@/lib/submission";
import { fireN8n } from "@/lib/n8n";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const SESSIONS = ["pre_event", "on_arrival", "end_of_day"] as const;
const MAX_HISTORY = 10;

type Body = {
  email?: string;
  name?: string;
  phone?: string;
  source?: string;
  session?: string;
  resume?: string;
  linkedin?: string;
  jd?: string;
};

function validEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

/**
 * Module 2 — CV Diagnosis (rubric v2 + deterministic JD checklist + delta).
 * Diagnosis only; persists to the shared Submission by email and tracks score
 * history so re-analysis can show the delta.
 */
export async function POST(req: Request) {
  let body: Body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
  }

  const resume = (body.resume ?? "").trim();
  const jd = (body.jd ?? "").trim();
  const linkedin = (body.linkedin ?? "").trim();

  if (resume.length < CV_INPUT_LIMITS.resumeMin) {
    return NextResponse.json(
      { ok: false, error: "Paste a bit more of your résumé to diagnose it." },
      { status: 400 },
    );
  }
  if (jd.length < CV_INPUT_LIMITS.jdMin) {
    return NextResponse.json(
      { ok: false, error: "Paste the target German job description to compare against." },
      { status: 400 },
    );
  }

  let normalized;
  try {
    const text = await complete({
      system: buildSystemPrompt(),
      user: buildUserPrompt({
        resume: resume.slice(0, CV_INPUT_LIMITS.resumeMax),
        linkedin: linkedin.slice(0, CV_INPUT_LIMITS.linkedinMax) || undefined,
        jd: jd.slice(0, CV_INPUT_LIMITS.jdMax),
      }),
      maxTokens: 1900,
      temperature: 0.2,
    });
    normalized = normalizeReview(extractJson(text));
  } catch (err) {
    const msg = err instanceof Error ? err.message : "LLM error";
    return NextResponse.json({ ok: false, error: `Diagnosis failed: ${msg}` }, { status: 502 });
  }

  if (!normalized) {
    return NextResponse.json(
      { ok: false, error: "Could not parse the diagnosis. Please try again." },
      { status: 502 },
    );
  }

  // Deterministic recruiter view: match the JD requirements against the résumé.
  const jdChecklist = matchRequirements(normalized.jdRequirements, resume);
  const review = {
    cvAtsScore: normalized.cvAtsScore,
    subScores: normalized.subScores,
    jdChecklist,
    missingKeywords: normalized.missingKeywords,
    weakBullets: normalized.weakBullets,
    germanChecklist: normalized.germanChecklist,
    quantification: normalized.quantification,
    topFixes: normalized.topFixes,
  };

  // Persist + delta when keyed by email.
  const email = (body.email ?? "").trim().toLowerCase();
  let persisted = false;
  let delivered = false;
  let previousScore: number | null = null;
  let delta: number | null = null;
  let attempts = 1;

  if (email && validEmail(email)) {
    const session =
      body.session && (SESSIONS as readonly string[]).includes(body.session)
        ? body.session
        : undefined;
    const name = body.name?.trim() || undefined;
    const phone = body.phone?.trim() || undefined;
    const source = body.source?.trim() || undefined;

    const existing = await prisma.submission
      .findUnique({ where: { email } })
      .catch(() => null);

    previousScore = existing?.cvAtsScore ?? null;
    delta = previousScore != null ? review.cvAtsScore - previousScore : null;

    let history: ScoreSnapshot[] = [];
    try {
      history = existing?.cvHistory ? JSON.parse(existing.cvHistory) : [];
      if (!Array.isArray(history)) history = [];
    } catch {
      history = [];
    }
    history.push({ score: review.cvAtsScore, at: new Date().toISOString() });
    history = history.slice(-MAX_HISTORY);
    attempts = history.length;

    const cvFields = {
      cvAtsScore: review.cvAtsScore,
      cvGaps: encode(review),
      cvHistory: encode(history),
    };

    try {
      const row = await prisma.submission.upsert({
        where: { email },
        create: {
          email,
          name,
          phone,
          source,
          session: session ?? "pre_event",
          ...cvFields,
        },
        update: {
          ...(name ? { name } : {}),
          ...(phone ? { phone } : {}),
          ...(source ? { source } : {}),
          ...(session ? { session } : {}),
          ...cvFields,
        },
      });
      persisted = true;

      const delivery = await fireN8n({ module: "cv-review", submission: decodeSubmission(row) });
      delivered = delivery.ok;
      if (!delivery.ok && !("skipped" in delivery)) {
        console.warn("[n8n] cv-review delivery failed:", delivery.error);
      }
    } catch (err) {
      console.warn("[cv-review] persist failed:", err);
    }
  }

  return NextResponse.json({
    ok: true,
    review,
    persisted,
    delivered,
    previousScore,
    delta,
    attempts,
  });
}

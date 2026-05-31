import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { complete, extractJson } from "@/lib/llm";
import {
  buildSystemPrompt,
  buildUserPrompt,
  normalizeReview,
  LINKEDIN_INPUT_LIMITS,
} from "@/lib/linkedin";
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
  headline?: string;
  profile?: string; // About / full profile text or PDF-export text
  targetRole?: string;
};

function validEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

/**
 * Module 2b - LinkedIn Optimizer. Runs the diagnosis-only LLM review of a pasted
 * / uploaded profile (never scraped) and, if an email is supplied, persists it to
 * the shared Submission and fires the webhook. The review always returns.
 */
export async function POST(req: Request) {
  let body: Body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
  }

  const headline = (body.headline ?? "").trim();
  const profile = (body.profile ?? "").trim();

  if (headline.length + profile.length < LINKEDIN_INPUT_LIMITS.minTotal) {
    return NextResponse.json(
      {
        ok: false,
        error: "Add your headline and About (or upload your LinkedIn PDF) to analyze.",
      },
      { status: 400 },
    );
  }

  let review;
  try {
    const text = await complete({
      system: buildSystemPrompt(),
      user: buildUserPrompt({
        headline: headline.slice(0, LINKEDIN_INPUT_LIMITS.headlineMax) || undefined,
        profile: profile.slice(0, LINKEDIN_INPUT_LIMITS.profileMax),
        targetRole: body.targetRole,
      }),
      maxTokens: 1500,
      temperature: 0.2,
    });
    review = normalizeReview(extractJson(text));
  } catch (err) {
    const msg = err instanceof Error ? err.message : "LLM error";
    return NextResponse.json(
      { ok: false, error: `Analysis failed: ${msg}` },
      { status: 502 },
    );
  }

  if (!review) {
    return NextResponse.json(
      { ok: false, error: "Could not parse the analysis. Please try again." },
      { status: 502 },
    );
  }

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

    previousScore = existing?.linkedinScore ?? null;
    delta = previousScore != null ? review.visibilityScore - previousScore : null;

    let history: ScoreSnapshot[] = [];
    try {
      history = existing?.linkedinHistory ? JSON.parse(existing.linkedinHistory) : [];
      if (!Array.isArray(history)) history = [];
    } catch {
      history = [];
    }
    history.push({ score: review.visibilityScore, at: new Date().toISOString() });
    history = history.slice(-MAX_HISTORY);
    attempts = history.length;

    const liFields = {
      linkedinScore: review.visibilityScore,
      linkedinReview: encode({
        subScores: review.subScores,
        headlineRead: review.headlineRead,
        missingKeywords: review.missingKeywords,
        sectionFlags: review.sectionFlags,
        topFixes: review.topFixes,
      }),
      linkedinHistory: encode(history),
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
          ...liFields,
        },
        update: {
          ...(name ? { name } : {}),
          ...(phone ? { phone } : {}),
          ...(source ? { source } : {}),
          ...(session ? { session } : {}),
          ...liFields,
        },
      });
      persisted = true;

      const delivery = await fireN8n({
        module: "linkedin-review",
        submission: decodeSubmission(row),
      });
      delivered = delivery.ok;
      if (!delivery.ok && !("skipped" in delivery)) {
        console.warn("[n8n] linkedin-review delivery failed:", delivery.error);
      }
    } catch (err) {
      console.warn("[linkedin-review] persist failed:", err);
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

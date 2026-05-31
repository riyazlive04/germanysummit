import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { complete, extractJson } from "@/lib/llm";
import {
  buildSystemPrompt,
  buildUserPrompt,
  normalizeRoadmap,
  type RoadmapInput,
} from "@/lib/roadmap";
import {
  DIMENSIONS,
  encode,
  decodeSubmission,
  type CvGaps,
  type Dimension,
  type DimScores,
} from "@/lib/submission";
import { fireN8n } from "@/lib/n8n";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const SESSIONS = ["pre_event", "on_arrival", "end_of_day"] as const;

type Body = {
  email?: string;
  name?: string;
  phone?: string;
  source?: string;
  session?: string;
  targetRole?: string;
  // Optional direct inputs (used when there's no saved profile to read).
  dimScores?: DimScores;
  archetype?: string;
  weakestDim?: Dimension;
  cvGaps?: CvGaps | null;
};

function validEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function validDimScores(v: unknown): v is DimScores {
  if (!v || typeof v !== "object") return false;
  return DIMENSIONS.every((d) => {
    const n = (v as Record<string, unknown>)[d];
    return typeof n === "number" && n >= 0 && n <= 1;
  });
}

/**
 * Module 3 - 90-Day Roadmap. Resolves the readiness profile (preferring a saved
 * Submission by email, falling back to inputs in the body), generates the
 * directional roadmap, and - when keyed by email - persists it and fires the
 * webhook. Always returns the roadmap to the client.
 */
export async function POST(req: Request) {
  let body: Body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
  }

  const email = (body.email ?? "").trim().toLowerCase();
  const hasEmail = !!email && validEmail(email);

  // Load the saved profile if we can.
  let row = null;
  if (hasEmail) {
    row = await prisma.submission.findUnique({ where: { email } }).catch(() => null);
  }
  const decoded = row ? decodeSubmission(row) : null;

  // One-shot gate: a roadmap is created once. If it already exists and an admin
  // hasn't approved a regeneration, return the EXISTING plan instead of building
  // a new one (take the user to their existing plan).
  if (decoded?.roadmap && !decoded.roadmapRegenAllowed) {
    return NextResponse.json({
      ok: true,
      roadmap: decoded.roadmap,
      existing: true,
      regenLocked: true,
      persisted: true,
    });
  }

  // Resolve inputs: body overrides, else the saved profile.
  const dimScores = validDimScores(body.dimScores)
    ? body.dimScores
    : decoded?.dimScores ?? null;
  const archetype = body.archetype?.trim() || decoded?.archetype || null;
  const weakestDim =
    (body.weakestDim && DIMENSIONS.includes(body.weakestDim)
      ? body.weakestDim
      : decoded?.weakestDim) ?? null;
  const cvGaps = body.cvGaps ?? decoded?.cvGaps ?? null;

  if (!dimScores || !archetype || !weakestDim) {
    return NextResponse.json(
      {
        ok: false,
        error: "No readiness profile found. Complete the Reality Check first.",
        needsRealityCheck: true,
      },
      { status: 400 },
    );
  }

  const input: RoadmapInput = {
    dimScores,
    archetype,
    weakestDim: weakestDim as Dimension,
    cvGaps,
    targetRole: body.targetRole,
  };

  // Generate.
  let roadmap;
  try {
    const text = await complete({
      system: buildSystemPrompt(),
      user: buildUserPrompt(input),
      maxTokens: 1800,
      temperature: 0.4,
    });
    roadmap = normalizeRoadmap(extractJson(text));
  } catch (err) {
    const msg = err instanceof Error ? err.message : "LLM error";
    return NextResponse.json(
      { ok: false, error: `Roadmap generation failed: ${msg}` },
      { status: 502 },
    );
  }

  if (!roadmap) {
    return NextResponse.json(
      { ok: false, error: "Could not build the roadmap. Please try again." },
      { status: 502 },
    );
  }

  // Persist + deliver when keyed by email.
  let persisted = false;
  let delivered = false;
  if (hasEmail) {
    const session =
      body.session && (SESSIONS as readonly string[]).includes(body.session)
        ? body.session
        : undefined;
    const name = body.name?.trim() || undefined;
    const phone = body.phone?.trim() || undefined;
    const source = body.source?.trim() || undefined;

    try {
      const saved = await prisma.submission.upsert({
        where: { email },
        create: {
          email,
          name,
          phone,
          source,
          session: session ?? "pre_event",
          roadmap: encode(roadmap),
        },
        update: {
          ...(name ? { name } : {}),
          ...(phone ? { phone } : {}),
          ...(source ? { source } : {}),
          ...(session ? { session } : {}),
          roadmap: encode(roadmap),
          // Consume any admin-granted regeneration; the plan re-locks.
          roadmapRegenAllowed: false,
        },
      });
      persisted = true;

      const delivery = await fireN8n({
        module: "roadmap",
        submission: decodeSubmission(saved),
      });
      delivered = delivery.ok;
      if (!delivery.ok && !("skipped" in delivery)) {
        console.warn("[n8n] roadmap delivery failed:", delivery.error);
      }
    } catch (err) {
      console.warn("[roadmap] persist failed:", err);
    }
  }

  return NextResponse.json({ ok: true, roadmap, persisted, delivered });
}

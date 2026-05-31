/**
 * Module 3 - 90-Day Roadmap. DIRECTIONAL ONLY.
 *
 * Built from the readiness profile (dimScores + archetype) and, when present,
 * the CV gaps. 12 weeks → 3 thirty-day phases, each week 1-3 concrete actions,
 * front-loading the TWO weakest dimensions in Phase 1. It motivates and points
 * the way - it never produces finished deliverables (no written CV, no message
 * templates, no cover letters). It ends by pointing to the matching summit
 * session (the Roadmap Reveal) and the accountability sprint (CONTEXT.md §8).
 */
import {
  DIMENSIONS,
  type CvGaps,
  type Dimension,
  type DimScores,
  type Roadmap,
  type RoadmapPhase,
  type RoadmapWeek,
} from "./submission";

export type RoadmapInput = {
  dimScores: DimScores;
  archetype: string;
  weakestDim: Dimension;
  cvGaps?: CvGaps | null;
  targetRole?: string;
};

/** Dimensions sorted weakest → strongest; ties keep DIMENSIONS order. */
export function rankDimensions(dimScores: DimScores): Dimension[] {
  return [...DIMENSIONS].sort((a, b) => {
    const d = (dimScores[a] ?? 0) - (dimScores[b] ?? 0);
    if (d !== 0) return d;
    return DIMENSIONS.indexOf(a) - DIMENSIONS.indexOf(b);
  });
}

/** Human-readable label for each 30-day phase. */
export const PHASE_RANGES: Record<number, string> = {
  1: "Days 1-30",
  2: "Days 31-60",
  3: "Days 61-90",
};

export function buildSystemPrompt(): string {
  return `You build the "90-Day Roadmap" for the Germany Career Summit (B2 Consultants / German Note), for Indian engineers targeting jobs in Germany.

YOUR ROLE - DIRECTIONAL PLAN ONLY. Motivating, concrete, honest. You map the path; the person walks it with the coach.

ABSOLUTE RULES (do not break):
- NEVER produce finished deliverables: no written CV/Lebenslauf, no cover letter, no outreach message templates, no finished LinkedIn text. Actions describe WHAT to do, not the finished artifact.
- Front-load the TWO weakest dimensions in Phase 1 (Days 1-30) - that's where the score moves fastest.
- Every action is concrete and doable in a week (e.g. "Shortlist 10 Mittelstand companies hiring for your role", "Speak German 15 min/day with a partner", "Map your top result to a number"), never vague ("improve your profile").
- German-market specific where relevant (Mittelstand, Xing, direct outreach to hiring managers, German CV norms, speaking practice over passive study).
- Keep it tight: across all 12 weeks aim for roughly 200-280 words total. Short action phrases, not paragraphs.
- Write with regular hyphens only. Never use em dashes or en dashes in any output text.

STRUCTURE - 3 phases of 30 days, 4 weeks each, weeks numbered 1-12 continuously. Each week has 1-3 actions.

OUTPUT - return ONLY valid JSON, no prose, no code fences, exactly:
{
  "phases": [
    {
      "phase": 1,
      "title": "<short phase theme>",
      "weeks": [
        { "week": 1, "focus": "<3-6 word focus>", "actions": ["<action>", "<action>"] }
        // weeks 1-4
      ]
    }
    // phases 2 (weeks 5-8) and 3 (weeks 9-12)
  ],
  "closing": "<2-3 sentences: tie the plan to the 1:30 Roadmap Reveal session and the accountability sprint where the work gets done with the coach. Honest, motivating.>"
}`;
}

export function buildUserPrompt(input: RoadmapInput): string {
  const ranked = rankDimensions(input.dimScores);
  const weakestTwo = ranked.slice(0, 2);
  const scoreLines = DIMENSIONS.map(
    (d) => `- ${d}: ${Math.round((input.dimScores[d] ?? 0) * 100)}/100`,
  ).join("\n");

  const cv = input.cvGaps;
  const cvBlock =
    cv && (cv.missingKeywords?.length || cv.topFixes?.length)
      ? `CV GAP SIGNALS (from the CV & LinkedIn Lab):
- Missing keywords: ${(cv.missingKeywords ?? []).join(", ") || "none noted"}
- Top fixes: ${(cv.topFixes ?? []).join(" | ") || "none noted"}`
      : "CV GAP SIGNALS: not available (the candidate hasn't run the CV Lab yet).";

  return `READINESS PROFILE
Archetype: ${input.archetype}
Weakest dimension: ${input.weakestDim}
Per-dimension readiness:
${scoreLines}

FRONT-LOAD THESE TWO WEAKEST DIMENSIONS IN PHASE 1: ${weakestTwo.join(" and ")}

${cvBlock}

TARGET ROLE: ${input.targetRole?.trim() || "not specified (write for their likely engineering track)"}

Build the 90-day directional roadmap. Return ONLY the JSON object described in your instructions.`;
}

// ── Normalization ─────────────────────────────────────────────────────────────

function cleanActions(v: unknown): string[] {
  if (!Array.isArray(v)) return [];
  return v
    .filter((x): x is string => typeof x === "string")
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 3); // 1-3 actions per week
}

/** Shape whatever the model returned into a safe 3-phase / 12-week Roadmap. */
export function normalizeRoadmap(raw: unknown): Roadmap | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  if (!Array.isArray(r.phases)) return null;

  let weekCounter = 0;
  const phases: RoadmapPhase[] = r.phases
    .slice(0, 3)
    .map((p, pi) => {
      const o = (p ?? {}) as Record<string, unknown>;
      const weeksRaw = Array.isArray(o.weeks) ? o.weeks : [];
      const weeks: RoadmapWeek[] = weeksRaw
        .slice(0, 4)
        .map((w) => {
          const wo = (w ?? {}) as Record<string, unknown>;
          weekCounter += 1;
          return {
            week: weekCounter, // renumber 1..12 continuously, ignoring model drift
            focus: typeof wo.focus === "string" ? wo.focus.trim() : "",
            actions: cleanActions(wo.actions),
          };
        })
        .filter((w) => w.actions.length > 0);

      return {
        phase: pi + 1,
        title: typeof o.title === "string" && o.title.trim() ? o.title.trim() : `Phase ${pi + 1}`,
        weeks,
      };
    })
    .filter((p) => p.weeks.length > 0);

  if (phases.length === 0) return null;

  const closing =
    typeof r.closing === "string" && r.closing.trim() ? r.closing.trim() : undefined;

  return { phases, closing };
}

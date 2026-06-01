/**
 * Per-attendee intelligence derived from a saved submission:
 *  - intent scoring (C)        -> the auto high-intent list for the team
 *  - the "your own words" mirror (G) -> one line the closer references
 *  - the personalized 24h follow-up (D) -> reflects their own answers
 *
 * All deterministic and free (no LLM). Server or client safe.
 */
import type { DecodedSubmission } from "./submission";
import { DIM_META } from "./dimensions";

const YEARS_LABEL: Record<string, string> = {
  lt1: "under a year",
  "1to2": "1 to 2 years",
  "2to3": "2 to 3 years",
  gt3: "3+ years",
};

export type Intent = { score: number; label: "Hot" | "Warm" | "Cool" };

/**
 * Higher = more ready to enroll. Pain (low score, low consistency, long time
 * stuck) and engagement (reachable, ran more tools, retook) raise the score.
 */
export function intentScore(s: DecodedSubmission): Intent {
  if (typeof s.totalScore !== "number") return { score: 0, label: "Cool" };
  let score = 1; // completed the Reality Check

  if (s.totalScore <= 30) score += 3;
  else if (s.totalScore <= 55) score += 2;
  else if (s.totalScore <= 78) score += 1;

  if (typeof s.consistency === "number") {
    if (s.consistency < 3) score += 2;
    else if (s.consistency < 5) score += 1;
  }

  if (s.yearsPlanning === "gt3" || s.yearsPlanning === "2to3") score += 2;
  else if (s.yearsPlanning === "1to2") score += 1;

  if (s.phone) score += 1;
  if (s.cvAtsScore != null) score += 1;
  if (s.linkedinScore != null) score += 1;
  if (s.roadmap != null) score += 1;
  if (Array.isArray(s.scoreHistory) && s.scoreHistory.length >= 2) score += 1;

  const label: Intent["label"] = score >= 7 ? "Hot" : score >= 4 ? "Warm" : "Cool";
  return { score, label };
}

function firstName(s: DecodedSubmission): string {
  return s.name?.trim().split(/\s+/)[0] || "there";
}

/** One compact line of their own answers, for the closing conversation. */
export function buildMirror(s: DecodedSubmission): string {
  const bits: string[] = [];
  if (s.yearsPlanning && YEARS_LABEL[s.yearsPlanning]) {
    bits.push(`${YEARS_LABEL[s.yearsPlanning]} planning`);
  }
  if (typeof s.consistency === "number") bits.push(`consistency ${s.consistency}/10`);
  if (s.weakestDim) bits.push(`weakest: ${s.weakestDim}`);
  if (typeof s.totalScore === "number") bits.push(`score ${s.totalScore}/100`);
  return bits.join(" · ");
}

/** Personalized 24h follow-up that reflects their own answers (D). */
export function buildFollowup(s: DecodedSubmission): string {
  if (typeof s.totalScore !== "number") return "";
  const name = firstName(s);
  const weak = s.weakestDim;
  const weakLine = weak ? DIM_META[weak as keyof typeof DIM_META]?.weak : "";

  const lines: string[] = [
    `Hi ${name}, thank you for today.`,
    `Your Germany Readiness Score came out at ${s.totalScore}/100${
      weak ? `, and the one area holding you back most is ${weak}.` : "."
    }`,
  ];
  if (weakLine) lines.push(weakLine);

  if (s.yearsPlanning && YEARS_LABEL[s.yearsPlanning] && typeof s.consistency === "number") {
    lines.push(
      `You wrote that you've been planning for ${YEARS_LABEL[s.yearsPlanning]} and rated your consistency ${s.consistency}/10. That gap is exactly what a weekly system closes.`,
    );
  }
  lines.push(
    `Your next step is yours to take. If you want to walk it with a coach and weekly accountability, reply to this message and our team will help you. - Ameen`,
  );
  return lines.join("\n");
}

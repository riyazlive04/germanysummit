/**
 * Reality Check scoring - the Germany Readiness Score.
 *
 * Rules (build prompt, MODULE 1):
 *   dimScore  = avg(its 2 questions) / 3            → 0..1
 *   totalScore = round( sum(all 10 answers) / 30 * 100 )  → 0..100
 *   tiers:  0-30 Invisible to Recruiters · 31-55 Visible, Not Competitive
 *           56-78 Interview-Ready · 79-100 Offer Magnet
 *   weakestDim = lowest dimScore; ties → lower-numbered dimension
 *               (earlier in DIMENSIONS order)
 *
 * Pure functions, no I/O - safe to use on client and server.
 */
import { DIMENSIONS, type Answers, type Dimension, type DimScores } from "./submission";
import { getArchetype } from "./archetypes";

export type Tier =
  | "Invisible to Recruiters"
  | "Visible, Not Competitive"
  | "Interview-Ready"
  | "Offer Magnet";

export type ScoreResult = {
  dimScores: DimScores;
  totalScore: number; // 0..100
  tier: Tier;
  weakestDim: Dimension;
  archetype: string; // name of the archetype for the weakest dimension
  hasWeakness: boolean; // is there a single weakest worth flagging? (see hasClearWeakness)
};

const MAX_POINTS_PER_Q = 3;
const QUESTIONS_PER_DIM = 2;

/** Per-dimension normalized score (0..1) from the 10 answers (each 0..3). */
export function computeDimScores(answers: Answers): DimScores {
  const out = {} as DimScores;
  DIMENSIONS.forEach((dim, i) => {
    const a = answers[i * QUESTIONS_PER_DIM] ?? 0;
    const b = answers[i * QUESTIONS_PER_DIM + 1] ?? 0;
    const avg = (a + b) / QUESTIONS_PER_DIM;
    out[dim] = avg / MAX_POINTS_PER_Q; // 0..1
  });
  return out;
}

/** The Germany Readiness Score, 0..100. */
export function computeTotalScore(answers: Answers): number {
  const sum = answers.reduce((acc, v) => acc + (v ?? 0), 0);
  const maxSum = DIMENSIONS.length * QUESTIONS_PER_DIM * MAX_POINTS_PER_Q; // 30
  return Math.round((sum / maxSum) * 100);
}

export function getTier(totalScore: number): Tier {
  if (totalScore <= 30) return "Invisible to Recruiters";
  if (totalScore <= 55) return "Visible, Not Competitive";
  if (totalScore <= 78) return "Interview-Ready";
  return "Offer Magnet";
}

/** Lowest-scoring dimension; ties resolve to the earlier dimension. */
export function getWeakestDim(dimScores: DimScores): Dimension {
  let weakest: Dimension = DIMENSIONS[0];
  let lowest = Infinity;
  for (const dim of DIMENSIONS) {
    if (dimScores[dim] < lowest) {
      lowest = dimScores[dim];
      weakest = dim;
    }
  }
  return weakest;
}

/**
 * A dimension at/above this normalized score (0..1) is "already strong".
 * Dimension scores are quantized to multiples of 1/6, so 0.8 makes the top
 * non-perfect value (5/6 ≈ 0.833) qualify - i.e. a board where even the lowest
 * dimension is strong reads as "strong across the board", not "weakest: X".
 */
export const STRONG_DIM_THRESHOLD = 0.8;

/**
 * Whether there is a single, meaningful weakest dimension worth flagging.
 * There is NOT one when every dimension is equal (no spread) or even the
 * lowest dimension is already strong. The single source of truth for the
 * result UI, the persisted row, and the WhatsApp follow-up - so a strong or
 * perfect attendee is never branded with a "weakest" marker or a limiting
 * archetype in any of them.
 */
export function hasClearWeakness(dimScores: DimScores): boolean {
  const values = Object.values(dimScores);
  const lo = Math.min(...values);
  const hi = Math.max(...values);
  const evenlyMatched = hi - lo < 1e-9;
  const strongAcross = lo >= STRONG_DIM_THRESHOLD;
  return !(evenlyMatched || strongAcross);
}

/** Full score result from the raw answers. */
export function score(answers: Answers): ScoreResult {
  const dimScores = computeDimScores(answers);
  const totalScore = computeTotalScore(answers);
  const weakestDim = getWeakestDim(dimScores);
  return {
    dimScores,
    totalScore,
    tier: getTier(totalScore),
    weakestDim,
    archetype: getArchetype(weakestDim).name,
    hasWeakness: hasClearWeakness(dimScores),
  };
}

/** Tier → brand token + one-line framing, for the result UI. */
export const TIER_META: Record<
  Tier,
  { color: "red" | "gold" | "green"; blurb: string }
> = {
  "Invisible to Recruiters": {
    color: "red",
    blurb: "Right now a German recruiter would scroll past you. That's fixable - and it's exactly what today is for.",
  },
  "Visible, Not Competitive": {
    color: "gold",
    blurb: "You'd get noticed, then lose to someone more sharply positioned. The gap is method, not talent.",
  },
  "Interview-Ready": {
    color: "gold",
    blurb: "You're in striking distance. Tighten the weak dimensions and interviews become repeatable.",
  },
  "Offer Magnet": {
    color: "green",
    blurb: "You're operating like someone who lands offers. Keep the system running - and help the room level up.",
  },
};

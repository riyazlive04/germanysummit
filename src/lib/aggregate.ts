/**
 * Room aggregate - the collective view for the 10:00 block big screen.
 *
 * Pure functions over decoded Submissions: the average pentagon radar, tier and
 * archetype breakdowns, a score distribution, and per-session rollups for the
 * on_arrival → end_of_day before/after shift. The app earns its place by doing
 * what paper can't - COMPUTE and AGGREGATE the room (CONTEXT.md §8.2).
 */
import { DIMENSIONS, type Answers, type DecodedSubmission, type DimScores } from "./submission";
import { getTier, type Tier } from "./scoring";
import { QUESTIONS } from "./questions";

export const TIERS: Tier[] = [
  "Invisible to Recruiters",
  "Visible, Not Competitive",
  "Interview-Ready",
  "Offer Magnet",
];

/** 5 even buckets of 20 across 0..100. */
export const DIST_BUCKETS = [
  { label: "0-19", min: 0, max: 19 },
  { label: "20-39", min: 20, max: 39 },
  { label: "40-59", min: 40, max: 59 },
  { label: "60-79", min: 60, max: 79 },
  { label: "80-100", min: 80, max: 100 },
];

export type Aggregate = {
  count: number; // total submissions in scope
  scored: number; // how many have a totalScore
  avgTotalScore: number | null;
  avgDimScores: DimScores | null;
  tierCounts: Record<Tier, number>;
  archetypeCounts: { name: string; count: number }[];
  distribution: number[]; // counts per DIST_BUCKETS bucket
};

/**
 * True before/after lift, computed from each person's score-history snapshots
 * (not the live row, which is overwritten on retake). "Retook" = took the Reality
 * Check 2+ times; lift compares their first take to their latest. Phase averages
 * are pooled across every snapshot, so a person who took it pre-event AND end-of-
 * day counts toward both phases - the honest before/after the room actually saw.
 */
export type ScoreLift = {
  retook: number;
  improved: number;
  declined: number;
  avgFirst: number | null;
  avgLast: number | null;
  avgDelta: number | null;
  topGain: number | null;
  phaseAverages: { session: string; avg: number | null; n: number }[];
};

const SESSION_ORDER = ["pre_event", "on_arrival", "end_of_day"] as const;

export function computeLift(subs: DecodedSubmission[]): ScoreLift {
  let improved = 0;
  let declined = 0;
  let firstSum = 0;
  let lastSum = 0;
  let retook = 0;
  let topGain: number | null = null;
  const phaseSum: Record<string, number> = {};
  const phaseN: Record<string, number> = {};

  for (const s of subs) {
    const h = s.scoreHistory;
    if (!h || h.length === 0) continue;

    for (const snap of h) {
      phaseSum[snap.session] = (phaseSum[snap.session] ?? 0) + snap.score;
      phaseN[snap.session] = (phaseN[snap.session] ?? 0) + 1;
    }

    if (h.length >= 2) {
      retook += 1;
      const first = h[0].score;
      const last = h[h.length - 1].score;
      firstSum += first;
      lastSum += last;
      const gain = last - first;
      if (gain > 0) improved += 1;
      else if (gain < 0) declined += 1;
      if (topGain === null || gain > topGain) topGain = gain;
    }
  }

  const phaseAverages = SESSION_ORDER.map((session) => ({
    session,
    avg: phaseN[session] ? Math.round(phaseSum[session] / phaseN[session]) : null,
    n: phaseN[session] ?? 0,
  }));

  return {
    retook,
    improved,
    declined,
    avgFirst: retook ? Math.round(firstSum / retook) : null,
    avgLast: retook ? Math.round(lastSum / retook) : null,
    avgDelta: retook ? Math.round((lastSum - firstSum) / retook) : null,
    topGain,
    phaseAverages,
  };
}

// ── Pre / post comparison ────────────────────────────────────────────────────

/** One person's full Reality Check take for a given phase. */
export type Take = { score: number; dimScores: DimScores | null; answers: Answers | null };

/** A matched person who took the check both pre-event and end-of-day. */
export type PersonDelta = {
  id: string;
  name: string | null;
  email: string;
  preScore: number;
  postScore: number;
  delta: number;
  preDim: DimScores | null;
  postDim: DimScores | null;
};

export type PrePost = {
  preSubs: DecodedSubmission[]; // synthetic rows carrying each person's pre take
  postSubs: DecodedSubmission[]; // synthetic rows carrying each person's post take
  matched: PersonDelta[]; // people with BOTH takes, biggest gain first
};

/**
 * The person's take for a phase, with full detail. Prefers the matching history
 * snapshot; falls back to the live row when it's still tagged that phase (covers
 * non-retakers and takes recorded before per-snapshot detail existed). Null when
 * they have no take for that phase.
 */
export function takeForSession(s: DecodedSubmission, session: string): Take | null {
  const snaps = (s.scoreHistory ?? []).filter((h) => h.session === session);
  const snap = snaps.length ? snaps[snaps.length - 1] : null;
  let score = snap?.score ?? null;
  let dimScores = snap?.dimScores ?? null;
  let answers = snap?.answers ?? null;
  if (s.session === session) {
    if (score == null && typeof s.totalScore === "number") score = s.totalScore;
    dimScores = dimScores ?? s.dimScores;
    answers = answers ?? s.answers;
  }
  if (score == null) return null;
  return { score, dimScores, answers };
}

/** A synthetic submission whose scored fields reflect one specific take. */
function asTake(s: DecodedSubmission, t: Take): DecodedSubmission {
  return { ...s, totalScore: t.score, dimScores: t.dimScores, answers: t.answers, tier: getTier(t.score) };
}

/**
 * Split the room into pre-event and end-of-day takes (per person), reusing the
 * same `aggregate` / `answerDistribution` over each side, plus a matched
 * per-person delta list for the people who did both.
 */
export function splitPrePost(subs: DecodedSubmission[]): PrePost {
  const preSubs: DecodedSubmission[] = [];
  const postSubs: DecodedSubmission[] = [];
  const matched: PersonDelta[] = [];
  for (const s of subs) {
    const pre = takeForSession(s, "pre_event");
    const post = takeForSession(s, "end_of_day");
    if (pre) preSubs.push(asTake(s, pre));
    if (post) postSubs.push(asTake(s, post));
    if (pre && post) {
      matched.push({
        id: s.id,
        name: s.name,
        email: s.email,
        preScore: pre.score,
        postScore: post.score,
        delta: post.score - pre.score,
        preDim: pre.dimScores,
        postDim: post.dimScores,
      });
    }
  }
  matched.sort((a, b) => b.delta - a.delta);
  return { preSubs, postSubs, matched };
}

/**
 * Live per-question answer distribution for the big-screen reveal. For each of
 * the 10 questions, how many people chose each option (A-D), as a count and a
 * percent of those who answered. Answers are stored as the chosen option's
 * POINTS, so each option is matched by its points value (unique per question),
 * which keeps the A-D mapping identical to what attendees saw in the quiz.
 */
export type AnswerOption = {
  letter: string; // A, B, C, D (display order)
  label: string;
  points: number;
  count: number;
  pct: number; // 0..100, of respondents
};
export type QuestionDistribution = {
  id: string;
  dimension: string;
  prompt: string;
  options: AnswerOption[];
};
export type AnswerDistribution = {
  respondents: number; // how many completed the Reality Check (have answers)
  questions: QuestionDistribution[];
};

export function answerDistribution(subs: DecodedSubmission[]): AnswerDistribution {
  const answered = subs.filter(
    (s) => Array.isArray(s.answers) && s.answers.length === QUESTIONS.length,
  );
  const respondents = answered.length;

  const questions: QuestionDistribution[] = QUESTIONS.map((q, qi) => {
    const options: AnswerOption[] = q.options.map((opt, oi) => {
      const count = answered.reduce(
        (acc, s) => acc + (s.answers![qi] === opt.points ? 1 : 0),
        0,
      );
      return {
        letter: String.fromCharCode(65 + oi),
        label: opt.label,
        points: opt.points,
        count,
        pct: respondents > 0 ? Math.round((count / respondents) * 100) : 0,
      };
    });
    return { id: q.id, dimension: q.dimension, prompt: q.prompt, options };
  });

  return { respondents, questions };
}

// ── Mindset pulse (consistency + years planning) ─────────────────────────────

export const YEARS_META: { value: string; label: string }[] = [
  { value: "lt1", label: "Under 1 year" },
  { value: "1to2", label: "1 to 2 years" },
  { value: "2to3", label: "2 to 3 years" },
  { value: "gt3", label: "3+ years" },
];

export type MindsetPulse = {
  consistency: {
    count: number;
    avg: number | null; // 0..10, one decimal
    below5: number;
    below5Pct: number;
    below3: number;
    below3Pct: number;
    distribution: number[]; // 11 counts, index = rating 0..10
  };
  years: { value: string; label: string; count: number; pct: number }[];
  yearsTwoPlusPct: number; // 2+ years (the stage debrief line)
};

export function mindsetPulse(subs: DecodedSubmission[]): MindsetPulse {
  const cons = subs
    .map((s) => s.consistency)
    .filter((v): v is number => typeof v === "number");
  const distribution = Array.from({ length: 11 }, () => 0);
  cons.forEach((v) => {
    if (v >= 0 && v <= 10) distribution[v] += 1;
  });
  const count = cons.length;
  const below5 = cons.filter((v) => v < 5).length;
  const below3 = cons.filter((v) => v < 3).length;
  const avg =
    count > 0 ? Math.round((cons.reduce((a, b) => a + b, 0) / count) * 10) / 10 : null;

  const yearsCounts = new Map<string, number>();
  let yearsTotal = 0;
  for (const s of subs) {
    if (s.yearsPlanning) {
      yearsCounts.set(s.yearsPlanning, (yearsCounts.get(s.yearsPlanning) ?? 0) + 1);
      yearsTotal += 1;
    }
  }
  const years = YEARS_META.map((y) => {
    const c = yearsCounts.get(y.value) ?? 0;
    return {
      value: y.value,
      label: y.label,
      count: c,
      pct: yearsTotal > 0 ? Math.round((c / yearsTotal) * 100) : 0,
    };
  });
  const twoPlus = (yearsCounts.get("2to3") ?? 0) + (yearsCounts.get("gt3") ?? 0);

  return {
    consistency: {
      count,
      avg,
      below5,
      below5Pct: count > 0 ? Math.round((below5 / count) * 100) : 0,
      below3,
      below3Pct: count > 0 ? Math.round((below3 / count) * 100) : 0,
      distribution,
    },
    years,
    yearsTwoPlusPct: yearsTotal > 0 ? Math.round((twoPlus / yearsTotal) * 100) : 0,
  };
}

// ── Enrollments (buying window) ──────────────────────────────────────────────

export type Enrollment = {
  count: number;
  buyers: { name: string; at: string }[]; // most recent first
};
export type EnrollmentSummary = { guided: Enrollment; solo: Enrollment };

/** Live counts + buyer names per program, derived from Submission.enrolledProgram. */
export function enrollmentSummary(subs: DecodedSubmission[]): EnrollmentSummary {
  const pick = (program: string): Enrollment => {
    const rows = subs
      .filter((s) => s.enrolledProgram === program)
      .sort((a, b) => {
        const ta = a.enrolledAt ? new Date(a.enrolledAt).getTime() : 0;
        const tb = b.enrolledAt ? new Date(b.enrolledAt).getTime() : 0;
        return tb - ta;
      });
    return {
      count: rows.length,
      buyers: rows.map((s) => ({
        name: s.name?.trim() || s.email,
        at: s.enrolledAt ? new Date(s.enrolledAt).toISOString() : "",
      })),
    };
  };
  return { guided: pick("guided"), solo: pick("solo") };
}

function emptyTierCounts(): Record<Tier, number> {
  return {
    "Invisible to Recruiters": 0,
    "Visible, Not Competitive": 0,
    "Interview-Ready": 0,
    "Offer Magnet": 0,
  };
}

export function aggregate(subs: DecodedSubmission[]): Aggregate {
  const tierCounts = emptyTierCounts();
  const archetypeMap = new Map<string, number>();
  const distribution = DIST_BUCKETS.map(() => 0);

  const dimSums = {} as Record<string, number>;
  DIMENSIONS.forEach((d) => (dimSums[d] = 0));
  let dimN = 0;

  let scoreSum = 0;
  let scored = 0;

  for (const s of subs) {
    if (typeof s.totalScore === "number") {
      scored += 1;
      scoreSum += s.totalScore;

      const tier = (s.tier as Tier) || getTier(s.totalScore);
      if (tier in tierCounts) tierCounts[tier] += 1;

      const bucket = DIST_BUCKETS.findIndex(
        (b) => s.totalScore! >= b.min && s.totalScore! <= b.max,
      );
      if (bucket >= 0) distribution[bucket] += 1;
    }

    if (s.dimScores) {
      dimN += 1;
      DIMENSIONS.forEach((d) => {
        dimSums[d] += s.dimScores![d] ?? 0;
      });
    }

    if (s.archetype) {
      archetypeMap.set(s.archetype, (archetypeMap.get(s.archetype) ?? 0) + 1);
    }
  }

  const avgDimScores =
    dimN > 0
      ? (Object.fromEntries(
          DIMENSIONS.map((d) => [d, dimSums[d] / dimN]),
        ) as DimScores)
      : null;

  const archetypeCounts = [...archetypeMap.entries()]
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count);

  return {
    count: subs.length,
    scored,
    avgTotalScore: scored > 0 ? Math.round(scoreSum / scored) : null,
    avgDimScores,
    tierCounts,
    archetypeCounts,
    distribution,
  };
}

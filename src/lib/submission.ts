/**
 * Typed (de)serialization seam for the Submission JSON columns.
 *
 * SQLite can't store native JSON, so `answers`, `dimScores`, `cvGaps`, and
 * `roadmap` live as JSON-encoded strings in the DB. Application code should
 * NEVER read those raw string fields directly - go through `decodeSubmission`
 * / the field codecs here so the rest of the app works with real typed objects.
 * When prod moves to Postgres + native Json, only this file changes.
 */
import type { Submission } from "@prisma/client";

// ── Domain types ────────────────────────────────────────────────────────────

/** The 5 scored dimensions - keys match CONTEXT.md §5 exactly. */
export const DIMENSIONS = [
  "Profile",
  "Strategy",
  "German & Skills",
  "Mindset",
  "90-Day Plan",
] as const;
export type Dimension = (typeof DIMENSIONS)[number];

/** 10 answers, each 0..3, indexed by question order. */
export type Answers = number[];

/** Per-dimension normalized score, each 0..1. */
export type DimScores = Record<Dimension, number>;

/** A point-in-time score, for re-analysis delta tracking. */
export type ScoreSnapshot = { score: number; at: string };

/** A Reality Check take, tagged with the event phase, for before/after lift. */
export type ReadinessSnapshot = { score: number; session: string; at: string };

export type CvSubScores = {
  keywords: number; // 0..100 each
  results: number;
  structure: number;
  germanFormat: number;
  seniority: number;
};

export type CvGaps = {
  subScores: CvSubScores;
  jdChecklist: { requirement: string; met: boolean }[]; // deterministic recruiter view
  missingKeywords: string[];
  weakBullets: { text: string; why: string }[];
  germanChecklist: { item: string; status: "pass" | "warn" | "fail"; note: string }[];
  quantification: { metriclessCount: number; pattern: string; note: string };
  topFixes: string[];
};

export type LinkedinSubScores = {
  headline: number; // 0..100 each
  hook: number;
  keywords: number;
  completeness: number;
  activity: number;
};

export type LinkedinGaps = {
  subScores: LinkedinSubScores;
  headlineRead: string; // one-line read on the headline
  missingKeywords: string[]; // recruiter-search terms missing
  sectionFlags: { section: string; issue: string }[]; // per-section weaknesses
  topFixes: string[]; // 3 directional fixes
};

export type RoadmapWeek = {
  week: number;
  focus: string;
  actions: string[];
};
export type RoadmapPhase = {
  phase: number; // 1..3 (each = 30 days)
  title: string;
  weeks: RoadmapWeek[];
};
export type Roadmap = {
  phases: RoadmapPhase[];
  closing?: string; // pointer to the matching summit session + sprint
};

// ── Codec helpers ────────────────────────────────────────────────────────────

function parse<T>(raw: string | null | undefined): T | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

/** Encode an object for storage. Returns null for null/undefined input. */
export function encode(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  return JSON.stringify(value);
}

/** A Submission row with the JSON columns decoded into real objects. */
export type DecodedSubmission = Omit<
  Submission,
  | "answers"
  | "dimScores"
  | "scoreHistory"
  | "cvGaps"
  | "cvHistory"
  | "linkedinReview"
  | "linkedinHistory"
  | "roadmap"
> & {
  answers: Answers | null;
  dimScores: DimScores | null;
  scoreHistory: ReadinessSnapshot[] | null;
  cvGaps: CvGaps | null;
  cvHistory: ScoreSnapshot[] | null;
  linkedinReview: LinkedinGaps | null;
  linkedinHistory: ScoreSnapshot[] | null;
  roadmap: Roadmap | null;
};

export function decodeSubmission(row: Submission): DecodedSubmission {
  return {
    ...row,
    answers: parse<Answers>(row.answers),
    dimScores: parse<DimScores>(row.dimScores),
    scoreHistory: parse<ReadinessSnapshot[]>(row.scoreHistory),
    cvGaps: parse<CvGaps>(row.cvGaps),
    cvHistory: parse<ScoreSnapshot[]>(row.cvHistory),
    linkedinReview: parse<LinkedinGaps>(row.linkedinReview),
    linkedinHistory: parse<ScoreSnapshot[]>(row.linkedinHistory),
    roadmap: parse<Roadmap>(row.roadmap),
  };
}

/**
 * Room aggregate - the collective view for the 10:00 block big screen.
 *
 * Pure functions over decoded Submissions: the average pentagon radar, tier and
 * archetype breakdowns, a score distribution, and per-session rollups for the
 * on_arrival → end_of_day before/after shift. The app earns its place by doing
 * what paper can't - COMPUTE and AGGREGATE the room (CONTEXT.md §8.2).
 */
import { DIMENSIONS, type DecodedSubmission, type DimScores } from "./submission";
import { getTier, type Tier } from "./scoring";

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

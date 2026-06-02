"use client";

import PentagonRadar from "@/components/PentagonRadar";
import DimBar from "./DimBar";
import { useCountUp } from "@/lib/useCountUp";
import { TIER_META, type ScoreResult } from "@/lib/scoring";
import { DIM_META } from "@/lib/dimensions";
import { getArchetype } from "@/lib/archetypes";
import ShareBar from "@/components/ShareBar";
import type { Dimension } from "@/lib/submission";

/**
 * The Reality Check result - laid out as Ameen's four worksheet components
 * around the pentagon radar (build prompt MODULE 1):
 *   · Germany Readiness Score   (hero: count-up + tier + radar)
 *   · Profile Assessment        (Profile, Strategy)
 *   · Skills Evaluation         (German & Skills)
 *   · Gap Analysis              (Mindset, 90-Day Plan + weakest-dim spotlight)
 *
 * Diagnosis only - it names what's weak and points to the fix (the summit / the
 * sprint), never a finished plan (CONTEXT.md §8). Archetype naming arrives in
 * Phase 3; persistence + webhook in Phase 2.
 */

const tierColorVar: Record<"red" | "gold" | "green", string> = {
  red: "var(--red)",
  gold: "var(--gold)",
  green: "var(--green)",
};

function BlockTitle({ n, title }: { n: string; title: string }) {
  return (
    <div className="mb-5 flex items-center gap-3">
      <span className="nums grid h-7 w-7 shrink-0 place-items-center rounded-md bg-[var(--anchor)] font-mono text-xs font-bold text-gold">
        {n}
      </span>
      <h3 className="font-display text-xl">{title}</h3>
      <span className="ml-1 h-px flex-1 bg-[var(--line)]" />
    </div>
  );
}

export default function ResultView({
  result,
  onRestart,
}: {
  result: ScoreResult;
  onRestart?: () => void;
}) {
  const { dimScores, totalScore, tier, weakestDim } = result;
  const animatedScore = useCountUp(totalScore);
  const tierMeta = TIER_META[tier];
  const accent = tierColorVar[tierMeta.color];
  const archetype = getArchetype(weakestDim);

  // When every dimension is equally high (no spread), or even the weakest one is
  // already strong, there is no single "weakest" to flag. Don't brand a strong or
  // perfect result with a limiting-belief archetype and a red "weakest" marker
  // (this is what made a 100/100 show "The Invisible Profile · Profile weakest").
  const dimValues = Object.values(dimScores);
  const lo = Math.min(...dimValues);
  const hi = Math.max(...dimValues);
  const strongAcross = lo >= 0.84;
  const noClearGap = hi - lo < 1e-9 || strongAcross;
  const showWeakest = !noClearGap;

  return (
    <div className="grid gap-5">
      {/* ── Germany Readiness Score (hero) ─────────────────────────────── */}
      <section className="card grid items-center gap-8 p-7 sm:grid-cols-[1fr_minmax(300px,420px)] sm:p-9">
        <div>
          <span className="eyebrow">Germany Readiness Score</span>
          <div className="mt-3 flex items-end gap-3">
            <span
              className="nums font-display text-8xl font-bold leading-[0.85] sm:text-9xl"
              style={{ color: accent }}
            >
              {animatedScore}
            </span>
            <span className="mb-2 font-mono text-sm text-muted">/ 100</span>
          </div>

          <div
            className="mt-5 inline-flex items-center gap-2 rounded-full px-3.5 py-1.5"
            style={{ backgroundColor: accent, color: "var(--gold-ink)" }}
          >
            <span className="text-sm font-bold">{tier}</span>
          </div>

          <p className="mt-5 max-w-md text-[15px] leading-relaxed text-muted">
            {tierMeta.blurb}
          </p>
        </div>

        <div className="mx-auto w-full max-w-[420px]">
          <PentagonRadar dimScores={dimScores} />
        </div>
      </section>

      {/* ── Archetype reveal, or the strong-across read when there's no gap ── */}
      {showWeakest ? (
        <section className="panel-anchor p-8 sm:p-10">
          <span className="eyebrow">Your Archetype</span>
          <h2 className="mt-3 font-display text-4xl text-gold sm:text-5xl">
            {archetype.name}
          </h2>
          <p className="mt-3 text-[15px] text-[color:rgba(245,242,234,0.7)]">
            Set by your weakest dimension - {DIM_META[weakestDim].short}. Name the
            pattern, and it stops running you.
          </p>

          <div className="mt-7 grid gap-4 sm:grid-cols-2">
            <div className="rounded-[14px] border border-[color:rgba(224,83,61,0.4)] bg-[color:rgba(224,83,61,0.1)] p-5">
              <span className="eyebrow !text-red">The belief holding you back</span>
              <p className="mt-2.5 font-display text-xl leading-snug text-on-anchor">
                &ldquo;{archetype.falseBelief}&rdquo;
              </p>
            </div>
            <div className="rounded-[14px] border border-[color:rgba(240,180,41,0.4)] bg-[color:rgba(240,180,41,0.1)] p-5">
              <span className="eyebrow !text-gold">The reframe</span>
              <p className="mt-2.5 text-[15px] leading-relaxed text-on-anchor">
                {archetype.reframe}
              </p>
            </div>
          </div>
        </section>
      ) : (
        <section className="panel-anchor p-8 sm:p-10">
          <span className="eyebrow">Your read</span>
          <h2 className="mt-3 font-display text-4xl text-gold sm:text-5xl">
            {strongAcross ? "Strong across the board." : "Evenly matched."}
          </h2>
          <p className="mt-3 text-[15px] text-[color:rgba(245,242,234,0.7)]">
            {strongAcross
              ? "All five dimensions are firing. There is no single gap dragging you down."
              : "Your five dimensions are level - no single weakest one to blame."}
          </p>
          <div className="mt-7 rounded-[14px] border border-[color:rgba(240,180,41,0.4)] bg-[color:rgba(240,180,41,0.1)] p-5">
            <span className="eyebrow !text-gold">What to do with this</span>
            <p className="mt-2.5 text-[15px] leading-relaxed text-on-anchor">
              {strongAcross
                ? "You're operating like someone who lands offers. Keep the system running week to week - and help the room level up."
                : "The lift comes from raising all five together, week by week - a written system, not a single fix."}
            </p>
          </div>
        </section>
      )}

      {/* ── Profile Assessment · Skills Evaluation ─────────────────────── */}
      <div className="grid gap-5 sm:grid-cols-2">
        <section className="card p-7">
          <BlockTitle n="A" title="Profile Assessment" />
          <p className="mb-5 text-sm leading-relaxed text-muted">
            How you show up and go to market - the recruiter&apos;s 10-second
            read and the system behind your outreach.
          </p>
          <div className="grid gap-5">
            <DimBar
              dim="Profile"
              score={dimScores["Profile"]}
              isWeakest={showWeakest && weakestDim === "Profile"}
            />
            <DimBar
              dim="Strategy"
              score={dimScores["Strategy"]}
              isWeakest={showWeakest && weakestDim === "Strategy"}
            />
          </div>
        </section>

        <section className="card p-7">
          <BlockTitle n="B" title="Skills Evaluation" />
          <p className="mb-5 text-sm leading-relaxed text-muted">
            What you can actually prove - German in real conversation and
            documented, market-ready technical skills.
          </p>
          <div className="grid gap-5">
            <DimBar
              dim="German & Skills"
              score={dimScores["German & Skills"]}
              isWeakest={showWeakest && weakestDim === "German & Skills"}
            />
          </div>
        </section>
      </div>

      {/* ── Gap Analysis ───────────────────────────────────────────────── */}
      <section className="card p-7">
        <BlockTitle n="C" title="Gap Analysis" />
        <div className="grid gap-7 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
          <div className="grid gap-5">
            <DimBar
              dim="Mindset"
              score={dimScores["Mindset"]}
              isWeakest={showWeakest && weakestDim === "Mindset"}
            />
            <DimBar
              dim="90-Day Plan"
              score={dimScores["90-Day Plan"]}
              isWeakest={showWeakest && weakestDim === "90-Day Plan"}
            />
          </div>

          {/* Spotlight: the weakest dimension when there's a real gap, otherwise
              a positive "no single gap" read for strong / balanced scores. */}
          {showWeakest ? (
            <div
              className="rounded-xl border p-5"
              style={{ borderColor: "var(--red)", background: "rgba(224,83,61,0.09)" }}
            >
              <span className="label-mono !text-red">Start here</span>
              <h4 className="mt-2 font-display text-lg">
                {weakestDimSpotlightTitle(weakestDim)}
              </h4>
              <p className="mt-2 text-sm leading-relaxed text-muted">
                {DIM_META[weakestDim].weak}
              </p>
              <p className="mt-4 text-sm leading-relaxed">
                This is the single dimension dragging your score down most. It&apos;s
                also exactly what the <span className="text-gold">Reality Check</span>{" "}
                and <span className="text-gold">90-Day Roadmap</span> blocks at the
                summit are built to fix - with the coach, not for you.
              </p>
            </div>
          ) : (
            <div
              className="rounded-xl border p-5"
              style={{ borderColor: "var(--green)", background: "rgba(54,179,126,0.09)" }}
            >
              <span className="label-mono" style={{ color: "var(--green)" }}>
                No single gap
              </span>
              <h4 className="mt-2 font-display text-lg">
                {strongAcross ? "You're strong everywhere." : "All five are level."}
              </h4>
              <p className="mt-2 text-sm leading-relaxed text-muted">
                {strongAcross
                  ? "No dimension is dragging your score down. The work now is keeping the system running."
                  : "No single dimension stands out as the drag - the gain is in lifting all five together."}
              </p>
              <p className="mt-4 text-sm leading-relaxed">
                That is exactly what the <span className="text-gold">summit</span> and
                the accountability sprint are built to sustain - with the coach.
              </p>
            </div>
          )}
        </div>
      </section>

      {/* Footer actions */}
      <div className="flex flex-wrap items-center justify-between gap-4 pt-2">
        <p className="max-w-md text-xs leading-relaxed text-muted">
          A mirror, not a verdict. Your score moves the moment you change the
          weakest dimension - that&apos;s the whole point of the day.
        </p>
        <div className="flex flex-wrap items-center gap-3">
          <ShareBar
            title="My Germany Readiness Score"
            summary={`My Germany Readiness Score: ${totalScore}/100 - ${tier}.${showWeakest ? ` Archetype: ${archetype.name}.` : ""} Where do you stand?`}
          />
          {onRestart && (
            <button
              onClick={onRestart}
              className="rounded-lg border border-[var(--hairline)] px-4 py-2 text-sm text-muted transition-colors hover:text-text"
            >
              Retake the Reality Check
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function weakestDimSpotlightTitle(dim: Dimension): string {
  switch (dim) {
    case "Profile":
      return "Your profile isn't landing in 10 seconds.";
    case "Strategy":
      return "You're applying without a targeted system.";
    case "German & Skills":
      return "Language + provable skills are the bottleneck.";
    case "Mindset":
      return "Silence is quietly eroding your momentum.";
    case "90-Day Plan":
      return "You have intentions, not a written plan.";
  }
}

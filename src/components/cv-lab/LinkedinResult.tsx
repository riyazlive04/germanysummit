"use client";

import { useCountUp } from "@/lib/useCountUp";
import type { LinkedinReview } from "@/lib/linkedin";
import ScoreBars, { DeltaBadge } from "./ScoreBars";

/**
 * Diagnosis-only output for the LinkedIn Optimizer. Names what's weak per section
 * and points to the fix; never writes the finished profile (CONTEXT.md §8).
 */

function band(score: number): { color: string; label: string } {
  if (score < 40)
    return { color: "var(--red)", label: "Recruiters searching for your role won't find you." };
  if (score < 70)
    return { color: "var(--gold)", label: "You're findable, but not compelling enough to act on." };
  return { color: "var(--green)", label: "Strong inbound profile - tighten the few flags below." };
}

export default function LinkedinResult({
  review,
  previousScore,
  delta,
  attempts,
  onRestart,
}: {
  review: LinkedinReview;
  previousScore?: number | null;
  delta?: number | null;
  attempts?: number;
  onRestart?: () => void;
}) {
  const animated = useCountUp(review.visibilityScore);
  const b = band(review.visibilityScore);

  return (
    <div className="grid gap-5">
      {/* Visibility score + delta */}
      <section className="card grid items-center gap-6 p-7 sm:grid-cols-[auto_1fr] sm:p-9">
        <div className="flex items-end gap-3">
          <span
            className="nums font-display text-7xl font-bold leading-[0.85] sm:text-8xl"
            style={{ color: b.color }}
          >
            {animated}
          </span>
          <span className="mb-2 font-mono text-sm text-muted">/ 100</span>
        </div>
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <span className="eyebrow">LinkedIn Visibility Score</span>
            <DeltaBadge previousScore={previousScore} delta={delta} attempts={attempts} />
          </div>
          <p className="mt-2 text-[15px] leading-relaxed text-muted">
            How discoverable and compelling your profile is to a German recruiter
            doing a search and a 10-second skim. {b.label}
          </p>
        </div>
      </section>

      {/* Rubric sub-scores */}
      {review.subScores && (
        <section className="card p-7">
          <h3 className="font-display text-lg">Score breakdown</h3>
          <p className="mb-4 mt-1.5 text-sm text-muted">Where the points come from.</p>
          <ScoreBars
            items={[
              { label: "Headline value-prop", score: review.subScores.headline },
              { label: "About hook", score: review.subScores.hook },
              { label: "Recruiter keywords", score: review.subScores.keywords },
              { label: "Profile completeness", score: review.subScores.completeness },
              { label: "Activity & engagement", score: review.subScores.activity },
            ]}
          />
        </section>
      )}

      {/* Headline read */}
      {review.headlineRead && (
        <section className="card p-7">
          <h3 className="font-display text-lg">Your headline</h3>
          <p className="mt-2 flex items-start gap-2 text-[15px] leading-relaxed">
            <span className="mt-1 text-gold">▸</span>
            <span>{review.headlineRead}</span>
          </p>
        </section>
      )}

      {/* Missing keywords */}
      <section className="card p-7">
        <h3 className="font-display text-lg">Missing recruiter keywords</h3>
        <p className="mt-1.5 text-sm text-muted">
          Terms a German recruiter searches that your profile doesn&apos;t surface.
        </p>
        {review.missingKeywords.length ? (
          <div className="mt-4 flex flex-wrap gap-2">
            {review.missingKeywords.map((k) => (
              <span
                key={k}
                className="rounded-full border px-3 py-1 text-xs"
                style={{ borderColor: "var(--red)", background: "rgba(224,83,61,0.1)" }}
              >
                {k}
              </span>
            ))}
          </div>
        ) : (
          <p className="mt-4 text-sm text-green">No major keyword gaps detected.</p>
        )}
      </section>

      {/* Section flags */}
      <section className="card p-7">
        <div className="flex items-baseline justify-between gap-3">
          <h3 className="font-display text-lg">Sections to strengthen</h3>
          <span className="label-mono !text-[0.68rem]">flagged, not rewritten</span>
        </div>
        {review.sectionFlags.length ? (
          <ul className="mt-4 grid gap-3">
            {review.sectionFlags.map((f, i) => (
              <li
                key={i}
                className="rounded-xl border border-[var(--line)] bg-surface-2 p-4"
              >
                <span className="eyebrow !text-gold-deep">{f.section}</span>
                <p className="mt-1.5 text-sm leading-relaxed">{f.issue}</p>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-4 text-sm text-green">No major section weaknesses flagged.</p>
        )}
      </section>

      {/* Top 3 fixes */}
      <section className="card p-7">
        <h3 className="font-display text-lg">Your top 3 fixes</h3>
        <p className="mt-1.5 text-sm text-muted">
          Prioritized and directional - what to change first, not the finished text.
        </p>
        <ol className="mt-4 grid gap-3">
          {review.topFixes.map((fix, i) => (
            <li key={i} className="flex items-start gap-3">
              <span className="nums mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full bg-gold font-mono text-xs text-[color:var(--gold-ink)]">
                {i + 1}
              </span>
              <span className="text-[15px] leading-relaxed">{fix}</span>
            </li>
          ))}
        </ol>
      </section>

      {/* Guardrail footer */}
      <div className="flex flex-wrap items-center justify-between gap-4 pt-1">
        <p className="max-w-lg text-xs leading-relaxed text-muted">
          A diagnosis, not a rewrite. The Optimizer shows what&apos;s costing you
          inbound interest - you rewrite it, with the coach and on stage. We never
          touch your account; this only reads what you paste or upload.
        </p>
        {onRestart && (
          <button onClick={onRestart} className="btn btn-ghost px-4 py-2 text-sm">
            Analyze again
          </button>
        )}
      </div>
    </div>
  );
}

"use client";

import { useCountUp } from "@/lib/useCountUp";
import type { CvReview } from "@/lib/cv";
import ScoreBars, { DeltaBadge } from "./ScoreBars";

/**
 * Diagnosis-only output for the CV Diagnosis (rubric v2). Names what's weak and
 * why, shows the recruiter's met/missing view, German conventions, and a
 * quantification coach - never the finished rewrite (CONTEXT.md §8).
 */

function band(score: number): { color: string; label: string } {
  if (score < 40)
    return { color: "var(--red)", label: "A German recruiter would screen this out." };
  if (score < 70)
    return { color: "var(--gold)", label: "Partial match - the gaps are costing you callbacks." };
  return { color: "var(--green)", label: "Strong alignment - tighten the few flags below." };
}

export default function CvResult({
  review,
  previousScore,
  delta,
  attempts,
  onRestart,
}: {
  review: CvReview;
  previousScore?: number | null;
  delta?: number | null;
  attempts?: number;
  onRestart?: () => void;
}) {
  const animated = useCountUp(review.cvAtsScore);
  const b = band(review.cvAtsScore);

  const metCount = review.jdChecklist?.filter((c) => c.met).length ?? 0;

  return (
    <div className="grid gap-5">
      {/* ATS score + delta */}
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
            <span className="eyebrow">ATS Match Score</span>
            <DeltaBadge previousScore={previousScore} delta={delta} attempts={attempts} />
          </div>
          <p className="mt-2 text-[15px] leading-relaxed text-muted">
            How well your résumé&apos;s keywords and structure line up with this
            German job description. {b.label}
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
              { label: "JD keyword match", score: review.subScores.keywords },
              { label: "Measurable results", score: review.subScores.results },
              { label: "Structure & clarity", score: review.subScores.structure },
              { label: "German CV format", score: review.subScores.germanFormat },
              { label: "Seniority fit", score: review.subScores.seniority },
            ]}
          />
        </section>
      )}

      {/* Recruiter view: JD requirement checklist */}
      {review.jdChecklist && review.jdChecklist.length > 0 && (
        <section className="card p-7">
          <div className="flex items-baseline justify-between gap-3">
            <h3 className="font-display text-lg">What this job asks for</h3>
            <span className="nums font-mono text-xs text-muted">
              {metCount}/{review.jdChecklist.length} covered
            </span>
          </div>
          <p className="mt-1.5 text-sm text-muted">
            Each requirement the JD lists, and whether your résumé shows it.
          </p>
          <ul className="mt-4 grid gap-2 sm:grid-cols-2">
            {review.jdChecklist.map((c, i) => (
              <li key={i} className="flex items-start gap-2.5 text-sm">
                <span
                  className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full text-xs"
                  style={{
                    backgroundColor: c.met ? "rgba(54,179,126,0.15)" : "rgba(224,83,61,0.12)",
                    color: c.met ? "var(--green)" : "var(--red)",
                  }}
                >
                  {c.met ? "✓" : "✕"}
                </span>
                <span className={c.met ? "" : "text-muted"}>{c.requirement}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Missing keywords */}
      <section className="card p-7">
        <h3 className="font-display text-lg">Missing or weak keywords</h3>
        <p className="mt-1.5 text-sm text-muted">
          Terms this job asks for that are absent or buried in your résumé.
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
          <p className="mt-4 text-sm text-green">No major keyword gaps detected against this JD.</p>
        )}
      </section>

      {/* Quantification coach */}
      {review.quantification && (
        <section className="card p-7">
          <div className="flex items-baseline justify-between gap-3">
            <h3 className="font-display text-lg">Quantify your impact</h3>
            {review.quantification.metriclessCount > 0 && (
              <span className="nums font-mono text-xs text-red">
                {review.quantification.metriclessCount} bullets with no number
              </span>
            )}
          </div>
          {review.quantification.note && (
            <p className="mt-2 text-sm leading-relaxed text-muted">
              {review.quantification.note}
            </p>
          )}
          {review.quantification.pattern && (
            <div className="mt-4 rounded-xl border border-[var(--line)] bg-surface-2 p-4">
              <span className="eyebrow !text-gold-deep">The pattern to use</span>
              <p className="mt-1.5 text-[15px] leading-relaxed">{review.quantification.pattern}</p>
            </div>
          )}
        </section>
      )}

      {/* Weak bullets */}
      <section className="card p-7">
        <div className="flex items-baseline justify-between gap-3">
          <h3 className="font-display text-lg">Bullets to strengthen</h3>
          <span className="label-mono !text-[0.6rem]">flagged, not rewritten</span>
        </div>
        <p className="mt-1.5 text-sm text-muted">
          Responsibility-style lines that should become measurable, result-based
          ones. The rewrite is yours to do - with the coach.
        </p>
        {review.weakBullets.length ? (
          <ul className="mt-4 grid gap-3">
            {review.weakBullets.map((wb, i) => (
              <li key={i} className="rounded-xl border border-[var(--line)] bg-surface-2 p-4">
                <p className="text-sm">&ldquo;{wb.text}&rdquo;</p>
                {wb.why && (
                  <p className="mt-2 flex items-start gap-2 text-xs text-muted">
                    <span className="mt-0.5 text-red">▸</span>
                    <span>{wb.why}</span>
                  </p>
                )}
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-4 text-sm text-green">No responsibility-only bullets flagged.</p>
        )}
      </section>

      {/* German conventions checklist */}
      {review.germanChecklist && review.germanChecklist.length > 0 && (
        <section className="card p-7">
          <h3 className="font-display text-lg">German CV conventions</h3>
          <p className="mt-1.5 text-sm text-muted">
            How your résumé reads against German (Lebenslauf) norms.
          </p>
          <ul className="mt-4 grid gap-3">
            {review.germanChecklist.map((g, i) => {
              const c =
                g.status === "pass"
                  ? "var(--green)"
                  : g.status === "fail"
                    ? "var(--red)"
                    : "var(--gold)";
              const mark = g.status === "pass" ? "✓" : g.status === "fail" ? "✕" : "!";
              return (
                <li key={i} className="flex items-start gap-3">
                  <span
                    className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full text-xs font-bold"
                    style={{ backgroundColor: "var(--surface-2)", color: c }}
                  >
                    {mark}
                  </span>
                  <span className="text-sm leading-relaxed">
                    <span className="font-medium">{g.item}.</span>{" "}
                    <span className="text-muted">{g.note}</span>
                  </span>
                </li>
              );
            })}
          </ul>
        </section>
      )}

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
          A diagnosis, not a rewrite. Fix the flags, then run it again to watch
          your score climb - that&apos;s the work you do with the coach, on stage,
          and in the sprint.
        </p>
        {onRestart && (
          <button onClick={onRestart} className="btn btn-ghost px-4 py-2 text-sm">
            Re-analyze an updated CV
          </button>
        )}
      </div>
    </div>
  );
}

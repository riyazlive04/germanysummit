"use client";

import type { Roadmap } from "@/lib/submission";
import { PHASE_RANGES } from "@/lib/roadmap";

/**
 * Visual week-by-week render mirroring the physical 90-Day Visual Roadmap:
 * three 30-day phases, each a column of week cards (focus + 1-3 actions), with
 * a closing card pointing to the Roadmap Reveal session + accountability sprint.
 */
export default function RoadmapTimeline({
  roadmap,
  onRestart,
  locked = false,
}: {
  roadmap: Roadmap;
  onRestart?: () => void;
  locked?: boolean;
}) {
  return (
    <div className="grid gap-6">
      {/* Shown only when printing / saving to PDF */}
      <div className="print-only">
        <h1 className="font-display text-2xl">Your 90-Day Roadmap</h1>
        <p className="text-sm text-muted">
          Germany Career Summit · B2 Consultants
        </p>
      </div>
      <div className="grid gap-6 lg:grid-cols-3">
        {roadmap.phases.map((phase) => (
          <section key={phase.phase} className="flex flex-col gap-4">
            {/* Phase header */}
            <div className="card p-5">
              <div className="flex items-baseline justify-between">
                <span className="label-mono !text-gold">
                  {PHASE_RANGES[phase.phase] ?? `Phase ${phase.phase}`}
                </span>
                <span className="font-mono text-xs text-muted">
                  0{phase.phase}
                </span>
              </div>
              <h3 className="mt-2 font-display text-xl leading-tight">
                {phase.title}
              </h3>
            </div>

            {/* Week cards */}
            <div className="relative grid gap-3 pl-4">
              {/* connecting rail */}
              <span
                aria-hidden
                className="absolute bottom-2 left-[3px] top-2 w-px bg-[var(--hairline)]"
              />
              {phase.weeks.map((w) => (
                <div key={w.week} className="relative">
                  <span
                    aria-hidden
                    className="absolute -left-4 top-3 h-2 w-2 rounded-full bg-gold ring-4 ring-[var(--bg)]"
                  />
                  <div className="card p-4">
                    <div className="flex items-baseline justify-between gap-2">
                      <span className="label-mono">Week {w.week}</span>
                      {w.focus && (
                        <span className="text-right text-xs font-medium text-muted">
                          {w.focus}
                        </span>
                      )}
                    </div>
                    <ul className="mt-2.5 grid gap-1.5">
                      {w.actions.map((a, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm leading-snug">
                          <span className="mt-1 h-1 w-1 shrink-0 rounded-full bg-gold" />
                          <span>{a}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              ))}
            </div>
          </section>
        ))}
      </div>

      {/* Closing - points to the summit session + sprint */}
      {roadmap.closing && (
        <section className="panel-anchor p-8 sm:p-10">
          <span className="eyebrow">Where this gets real</span>
          <p className="mt-3 max-w-3xl text-[17px] leading-relaxed text-on-anchor">
            {roadmap.closing}
          </p>
        </section>
      )}

      <div className="no-print flex flex-wrap items-center justify-between gap-4 pt-1">
        <p className="max-w-md text-xs leading-relaxed text-muted">
          A directional map, not finished work. Each action is yours to execute -
          the accountability sprint is what keeps you doing them, week after week.
        </p>
        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={() => window.print()}
            className="btn-gold px-5 py-2.5 text-sm"
          >
            ↓ Download as PDF
          </button>
          {!locked && onRestart && (
            <button onClick={onRestart} className="btn btn-ghost px-4 py-2 text-sm">
              Regenerate
            </button>
          )}
        </div>
      </div>

      {locked && (
        <p className="no-print -mt-2 text-xs text-muted">
          This is your saved 90-day plan. Each person gets one - to create a new
          version, ask the team to re-enable it for you.
        </p>
      )}
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";

/** "Up from X (+N since last time)" badge for re-analysis delta tracking. */
export function DeltaBadge({
  previousScore,
  delta,
  attempts,
}: {
  previousScore?: number | null;
  delta?: number | null;
  attempts?: number;
}) {
  if (delta == null || previousScore == null || !attempts || attempts < 2) return null;
  const up = delta > 0;
  const flat = delta === 0;
  const color = up ? "var(--green)" : flat ? "var(--muted)" : "var(--red)";
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold"
      style={{ backgroundColor: "var(--surface-2)", color }}
    >
      <span>{up ? "▲" : flat ? "→" : "▼"}</span>
      <span className="nums">
        {flat ? "No change" : `${up ? "+" : ""}${delta}`} from {previousScore}
      </span>
      <span className="font-normal text-muted">· attempt {attempts}</span>
    </span>
  );
}

function barColor(score: number): string {
  if (score < 40) return "var(--red)";
  if (score < 70) return "var(--gold)";
  return "var(--green)";
}

/** Animated rubric sub-score bars (each 0..100), colour-banded for a fast read. */
export default function ScoreBars({
  items,
}: {
  items: { label: string; score: number }[];
}) {
  const [grow, setGrow] = useState(false);
  useEffect(() => {
    const id = requestAnimationFrame(() => setGrow(true));
    return () => cancelAnimationFrame(id);
  }, []);

  return (
    <div className="grid gap-3.5">
      {items.map((it) => (
        <div key={it.label}>
          <div className="mb-1 flex items-baseline justify-between text-sm">
            <span>{it.label}</span>
            <span className="nums font-mono text-xs text-muted">{it.score}</span>
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-[var(--surface-2)]">
            <div
              className="h-full rounded-full transition-[width] duration-700 ease-out"
              style={{
                width: grow ? `${it.score}%` : 0,
                backgroundColor: barColor(it.score),
              }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

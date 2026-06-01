"use client";

import { useEffect, useState } from "react";
import type { Dimension } from "@/lib/submission";
import { DIM_META } from "@/lib/dimensions";

/**
 * A single dimension read: label, animated 0..100% bar, and the honest one-line
 * "mirror" (strong vs. weak read). The weakest dimension is flagged in red.
 */
export default function DimBar({
  dim,
  score, // 0..1
  isWeakest = false,
}: {
  dim: Dimension;
  score: number;
  isWeakest?: boolean;
}) {
  const [w, setW] = useState(0);
  useEffect(() => {
    const id = requestAnimationFrame(() => setW(Math.round(score * 100)));
    return () => cancelAnimationFrame(id);
  }, [score]);

  const meta = DIM_META[dim];
  const read = score >= 0.6 ? meta.strong : meta.weak;
  const pct = Math.round(score * 100);

  return (
    <div>
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-sm font-medium">
          {meta.short}
          {isWeakest && (
            <span className="label-mono ml-2 !text-[0.68rem] !text-red">
              weakest
            </span>
          )}
        </span>
        <span className="font-mono text-xs text-muted">{pct}</span>
      </div>
      <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-[var(--hairline)]">
        <div
          className="h-full rounded-full transition-[width] duration-[900ms] ease-out"
          style={{
            width: `${w}%`,
            backgroundColor: isWeakest ? "var(--red)" : "var(--gold)",
          }}
        />
      </div>
      <p className="mt-1.5 text-xs leading-relaxed text-muted">{read}</p>
    </div>
  );
}

import { useEffect, useRef, useState } from "react";

const easeOutCubic = (x: number) => 1 - Math.pow(1 - x, 3);

/**
 * Counts up from 0 to `target` over `durationMs`, eased to match the radar
 * draw-in so the score and the shape land together. Snaps instantly when the
 * user prefers reduced motion.
 */
export function useCountUp(target: number, durationMs = 1100): number {
  const [value, setValue] = useState(0);
  const raf = useRef<number | null>(null);

  useEffect(() => {
    const reduce =
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (reduce) {
      setValue(target);
      return;
    }

    let start: number | null = null;
    const tick = (ts: number) => {
      if (start === null) start = ts;
      const p = Math.min(1, (ts - start) / durationMs);
      setValue(Math.round(target * easeOutCubic(p)));
      if (p < 1) raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
    return () => {
      if (raf.current) cancelAnimationFrame(raf.current);
    };
  }, [target, durationMs]);

  return value;
}

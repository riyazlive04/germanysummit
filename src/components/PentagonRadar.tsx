"use client";

import { useEffect, useRef, useState } from "react";
import { DIMENSIONS, type DimScores } from "@/lib/submission";
import { DIM_META } from "@/lib/dimensions";

/**
 * The Germany Readiness pentagon radar.
 *
 * ONE orchestrated reveal (CONTEXT.md §8.5): the grid fades in, then the data
 * polygon draws itself from the centre outward with an ease-out. No scattered
 * effects. Honours prefers-reduced-motion by snapping to the final shape.
 *
 * Vertices follow DIMENSIONS order, starting at the top and going clockwise.
 */

const SIZE = 360;
const C = SIZE / 2;
const R = 116;
const LABEL_R = R + 26;
const LEVELS = [0.25, 0.5, 0.75, 1];

// Extra room around the chart so the side labels (STRATEGY, 90-DAY PLAN,
// GERMAN & SKILLS) are never clipped by the viewBox edge.
const PAD_X = 68;
const PAD_Y = 30;
const VIEW = {
  minX: -PAD_X,
  minY: -PAD_Y,
  w: SIZE + PAD_X * 2,
  h: SIZE + PAD_Y * 2,
};

const ANGLES = DIMENSIONS.map((_, i) => ((-90 + i * 72) * Math.PI) / 180);

function pointAt(angle: number, radius: number): [number, number] {
  return [C + radius * Math.cos(angle), C + radius * Math.sin(angle)];
}

function polygonPoints(radii: number[]): string {
  return ANGLES.map((a, i) => pointAt(a, radii[i]).join(",")).join(" ");
}

const easeOutCubic = (x: number) => 1 - Math.pow(1 - x, 3);

/** Split long labels onto two lines so they don't collide with the chart. */
function labelLines(short: string): string[] {
  if (short.length <= 9) return [short];
  const parts = short.split(" ");
  if (parts.length < 2) return [short];
  const mid = Math.ceil(parts.length / 2);
  return [parts.slice(0, mid).join(" "), parts.slice(mid).join(" ")];
}

export default function PentagonRadar({
  dimScores,
  durationMs = 1100,
  className,
}: {
  dimScores: DimScores;
  durationMs?: number;
  className?: string;
}) {
  const [t, setT] = useState(0);
  const raf = useRef<number | null>(null);

  useEffect(() => {
    const reduce =
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (reduce) {
      setT(1);
      return;
    }

    let start: number | null = null;
    const tick = (ts: number) => {
      if (start === null) start = ts;
      const p = Math.min(1, (ts - start) / durationMs);
      setT(p);
      if (p < 1) raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
    return () => {
      if (raf.current) cancelAnimationFrame(raf.current);
    };
  }, [durationMs]);

  const eased = easeOutCubic(t);
  const gridOpacity = Math.min(1, t * 2);

  const dataRadii = DIMENSIONS.map((dim) => R * (dimScores[dim] ?? 0) * eased);

  return (
    <svg
      viewBox={`${VIEW.minX} ${VIEW.minY} ${VIEW.w} ${VIEW.h}`}
      className={className}
      role="img"
      aria-label="Germany Readiness radar across five dimensions"
    >
      <defs>
        <radialGradient id="radarFill" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="var(--gold-soft)" stopOpacity="0.32" />
          <stop offset="100%" stopColor="var(--gold)" stopOpacity="0.1" />
        </radialGradient>
      </defs>

      {/* Grid rings */}
      <g opacity={gridOpacity}>
        {LEVELS.map((lvl) => (
          <polygon
            key={lvl}
            points={polygonPoints(ANGLES.map(() => R * lvl))}
            fill="none"
            stroke="var(--hairline)"
            strokeWidth={1}
          />
        ))}
        {/* Axes */}
        {ANGLES.map((a, i) => {
          const [x, y] = pointAt(a, R);
          return (
            <line
              key={i}
              x1={C}
              y1={C}
              x2={x}
              y2={y}
              stroke="var(--hairline)"
              strokeWidth={1}
            />
          );
        })}
      </g>

      {/* Data polygon (draws from centre outward) */}
      <polygon
        points={polygonPoints(dataRadii)}
        fill="url(#radarFill)"
        stroke="var(--gold)"
        strokeWidth={2}
        strokeLinejoin="round"
      />

      {/* Vertex dots */}
      {ANGLES.map((a, i) => {
        const [x, y] = pointAt(a, dataRadii[i]);
        return (
          <circle
            key={i}
            cx={x}
            cy={y}
            r={3.5}
            fill="var(--gold-soft)"
            opacity={t}
          />
        );
      })}

      {/* Labels */}
      <g opacity={t} className="font-mono">
        {DIMENSIONS.map((dim, i) => {
          const [x, y] = pointAt(ANGLES[i], LABEL_R);
          const anchor = x < C - 4 ? "end" : x > C + 4 ? "start" : "middle";
          const lines = labelLines(DIM_META[dim].short);
          const baseDy = lines.length > 1 ? -2 : 4;
          return (
            <text
              key={dim}
              x={x}
              y={y}
              textAnchor={anchor}
              fill="var(--muted)"
              fontSize={11}
              style={{ letterSpacing: "0.08em" }}
            >
              {lines.map((ln, j) => (
                <tspan key={j} x={x} dy={j === 0 ? baseDy : 12}>
                  {ln.toUpperCase()}
                </tspan>
              ))}
            </text>
          );
        })}
      </g>
    </svg>
  );
}

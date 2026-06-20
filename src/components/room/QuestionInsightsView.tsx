"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { QUESTIONS } from "@/lib/questions";
import { DIMENSIONS, type Dimension } from "@/lib/submission";
import { DIM_META } from "@/lib/dimensions";

/**
 * /room/insights - a single-page question navigator over everything attendees
 * answered. Enter the admin key ONCE, then switch between the five topics
 * (dimensions) with the nav links; each topic shows its two Reality Check
 * questions. Every question has a donut of the answer distribution, a labelled
 * bar breakdown, and an average-points gauge.
 *
 * One page, one fetch: switching topics is local state, so it never re-asks for
 * the key. Gated by ADMIN_KEY (shared with /room and /room/records via
 * localStorage); reads the full record set from /api/room/records.
 */

const STORAGE_KEY = "room_admin_key";

type Rec = {
  session: string;
  totalScore: number | null;
  answers: number[] | null;
};

type SessionFilter = "" | "pre_event" | "on_arrival" | "end_of_day";

const FILTERS: { value: SessionFilter; label: string }[] = [
  { value: "pre_event", label: "Pre-event" },
  { value: "end_of_day", label: "Post event" },
];

// Answer strength → brand colour, shared by the donut, bars, and gauge.
const POINT_COLOR: Record<number, string> = {
  3: "var(--green)",
  2: "var(--gold)",
  1: "var(--gold-deep)",
  0: "var(--red)",
};

export default function QuestionInsightsView({ initialKey }: { initialKey?: string }) {
  const [key, setKey] = useState(initialKey ?? "");
  const [authed, setAuthed] = useState<boolean | null>(null);
  const [records, setRecords] = useState<Rec[]>([]);
  const [filter, setFilter] = useState<SessionFilter>("pre_event");
  const [error, setError] = useState<string | null>(null);
  const [activeDim, setActiveDim] = useState<Dimension>(DIMENSIONS[0]);
  const keyRef = useRef(key);
  keyRef.current = key;

  useEffect(() => {
    if (!initialKey) {
      try {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) setKey(saved);
      } catch {
        /* ignore */
      }
    }
  }, [initialKey]);

  const load = useCallback(async () => {
    const k = keyRef.current;
    if (!k) return;
    try {
      const res = await fetch("/api/room/records", {
        headers: { "x-admin-key": k },
        cache: "no-store",
      });
      if (res.status === 401) {
        setAuthed(false);
        setError("Wrong key.");
        return;
      }
      const data = await res.json();
      if (data.ok) {
        setAuthed(true);
        setError(null);
        setRecords(data.records);
        try {
          localStorage.setItem(STORAGE_KEY, k);
        } catch {
          /* ignore */
        }
      } else {
        setError(data.error || "Failed to load.");
      }
    } catch {
      setError("Network error.");
    }
  }, []);

  useEffect(() => {
    if (authed === false || !key) return;
    void load();
  }, [authed, key, load]);

  // Arrow keys flip between topics once authed.
  useEffect(() => {
    if (authed !== true) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft")
        setActiveDim((d) => DIMENSIONS[Math.max(0, DIMENSIONS.indexOf(d) - 1)]);
      if (e.key === "ArrowRight")
        setActiveDim((d) => DIMENSIONS[Math.min(DIMENSIONS.length - 1, DIMENSIONS.indexOf(d) + 1)]);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [authed]);

  // ── Key gate ───────────────────────────────────────────────────────────────
  if (authed !== true) {
    return (
      <div className="mx-auto max-w-sm py-24">
        <span className="eyebrow">Question insights · protected</span>
        <h1 className="mt-3 font-display text-3xl">Enter the admin key</h1>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            setAuthed(null);
            void load();
          }}
          noValidate
          className="mt-6 grid gap-3"
        >
          <input
            type="password"
            value={key}
            onChange={(e) => setKey(e.target.value)}
            placeholder="ADMIN_KEY"
            className="input w-full"
            autoFocus
          />
          {error && <p className="text-sm text-red">{error}</p>}
          <button type="submit" className="btn-gold px-6 py-3 text-sm">
            Open insights →
          </button>
        </form>
      </div>
    );
  }

  const inFilter = filter ? records.filter((r) => r.session === filter) : records;
  const answered = inFilter.filter((r) => r.answers && r.answers.length > 0);

  const idx = DIMENSIONS.indexOf(activeDim);
  const topicQs = QUESTIONS.filter((q) => q.dimension === activeDim);
  const goPrev = () => setActiveDim(DIMENSIONS[Math.max(0, idx - 1)]);
  const goNext = () => setActiveDim(DIMENSIONS[Math.min(DIMENSIONS.length - 1, idx + 1)]);

  return (
    <div className="py-8">
      {/* Top bar */}
      <div className="mb-5 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl">Question insights</h1>
          <span className="eyebrow !text-muted">
            {answered.length} of {inFilter.length} answered
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          {FILTERS.map((f) => (
            <button
              key={f.value}
              onClick={() => setFilter(f.value)}
              className={`rounded-lg border px-3 py-1.5 text-xs transition-colors ${
                filter === f.value
                  ? "border-gold text-gold"
                  : "border-[var(--line)] text-muted hover:text-text"
              }`}
            >
              {f.label}
            </button>
          ))}
          <Link
            href="/room/insights"
            className="ml-1 rounded-lg border border-gold px-3 py-1.5 text-xs text-gold"
          >
            Insights →
          </Link>
          <Link
            href="/room/records"
            className="rounded-lg border border-[var(--line)] px-3 py-1.5 text-xs text-muted transition-colors hover:text-gold"
          >
            Records →
          </Link>
          <Link
            href="/room/feedback"
            className="rounded-lg border border-[var(--line)] px-3 py-1.5 text-xs text-muted transition-colors hover:text-gold"
          >
            Feedback →
          </Link>
        </div>
      </div>

      {/* Topic nav links — 5 dimensions, 2 questions each */}
      <nav className="mb-6 flex flex-wrap gap-2">
        {DIMENSIONS.map((d) => (
          <button
            key={d}
            onClick={() => setActiveDim(d)}
            aria-current={d === activeDim ? "page" : undefined}
            className={`rounded-lg border px-4 py-2 text-sm transition-colors ${
              d === activeDim
                ? "border-gold bg-gold text-gold-ink"
                : "border-[var(--line)] text-muted hover:border-gold hover:text-gold"
            }`}
          >
            {d}
          </button>
        ))}
      </nav>

      {/* Active topic header — what it measures + prev/next arrows top-right */}
      <div className="mb-3 flex items-end justify-between gap-3">
        <div>
          <span className="eyebrow !text-gold">{activeDim}</span>
          <p className="mt-1 max-w-xl text-sm text-muted">{DIM_META[activeDim].whatItMeasures}</p>
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          <button
            onClick={goPrev}
            disabled={idx === 0}
            aria-label="Previous topic"
            title="Previous topic (←)"
            className="grid h-9 w-9 place-items-center rounded-lg border border-[var(--line)] text-muted transition-colors hover:border-gold hover:text-gold disabled:opacity-30 disabled:hover:border-[var(--line)] disabled:hover:text-muted"
          >
            ←
          </button>
          <button
            onClick={goNext}
            disabled={idx === DIMENSIONS.length - 1}
            aria-label="Next topic"
            title="Next topic (→)"
            className="grid h-9 w-9 place-items-center rounded-lg border border-[var(--line)] text-muted transition-colors hover:border-gold hover:text-gold disabled:opacity-30 disabled:hover:border-[var(--line)] disabled:hover:text-muted"
          >
            →
          </button>
        </div>
      </div>

      {/* The topic's two questions */}
      {answered.length === 0 ? (
        <div className="card grid place-items-center p-20 text-center">
          <p className="text-muted">No answered submissions in this view yet.</p>
        </div>
      ) : (
        <div className="grid gap-4 xl:grid-cols-2">
          {topicQs.map((q) => {
            const i = QUESTIONS.indexOf(q);
            const counts = q.options.map((opt) => ({
              opt,
              count: answered.filter((r) => r.answers?.[i] === opt.points).length,
            }));
            const total = counts.reduce((s, c) => s + c.count, 0);
            return <QuestionCard key={q.id} q={q} counts={counts} total={total} />;
          })}
        </div>
      )}
    </div>
  );
}

type CountRow = { opt: { label: string; points: number }; count: number };

/** One question: donut distribution + labelled bars. */
function QuestionCard({
  q,
  counts,
  total,
}: {
  q: { id: string; prompt: string };
  counts: CountRow[];
  total: number;
}) {
  const segments = counts.map((c) => ({
    value: c.count,
    color: POINT_COLOR[c.opt.points] ?? "var(--surface-2)",
  }));
  return (
    <div className="card p-5">
      <div className="mb-4 flex items-start gap-2">
        <span className="mt-0.5 font-mono text-xs text-muted">{q.id}</span>
        <p className="text-base font-medium">{q.prompt}</p>
      </div>

      <div className="flex flex-wrap items-center gap-5">
        {/* Donut distribution */}
        <div className="relative shrink-0">
          <Donut segments={segments} size={120} thickness={18} />
          <div className="pointer-events-none absolute inset-0 grid place-items-center text-center">
            <div>
              <div className="nums font-display text-xl leading-none">{total}</div>
              <div className="font-mono text-[0.6rem] text-muted">replies</div>
            </div>
          </div>
        </div>

        {/* Labelled bars */}
        <div className="grid min-w-[200px] flex-1 gap-2">
          {counts.map(({ opt, count }) => {
            const pct = total > 0 ? Math.round((count / total) * 100) : 0;
            return (
              <div key={opt.label} className="grid gap-1">
                <div className="flex items-center justify-between gap-2 text-xs">
                  <span className="text-muted">
                    <span className="mr-1.5 font-mono text-[0.65rem]">{opt.points}</span>
                    {opt.label}
                  </span>
                  <span className="nums shrink-0 text-muted">
                    {count} · {pct}%
                  </span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-[var(--surface-2)]">
                  <div
                    className="h-full rounded-full"
                    style={{ width: `${pct}%`, backgroundColor: POINT_COLOR[opt.points] }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/** A donut chart from raw segment values (no library; pure SVG arcs). */
function Donut({
  segments,
  size = 104,
  thickness = 16,
}: {
  segments: { value: number; color: string }[];
  size?: number;
  thickness?: number;
}) {
  const total = segments.reduce((s, x) => s + x.value, 0);
  const r = (size - thickness) / 2;
  const circ = 2 * Math.PI * r;
  let offset = 0;
  return (
    <svg viewBox={`0 0 ${size} ${size}`} width={size} height={size}>
      <g transform={`rotate(-90 ${size / 2} ${size / 2})`}>
        {total === 0 ? (
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke="var(--surface-2)"
            strokeWidth={thickness}
          />
        ) : (
          segments.map((s, i) => {
            const len = (s.value / total) * circ;
            const el = (
              <circle
                key={i}
                cx={size / 2}
                cy={size / 2}
                r={r}
                fill="none"
                stroke={s.color}
                strokeWidth={thickness}
                strokeDasharray={`${len} ${circ - len}`}
                strokeDashoffset={-offset}
              />
            );
            offset += len;
            return el;
          })
        )}
      </g>
    </svg>
  );
}


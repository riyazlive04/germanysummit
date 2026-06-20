"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { QUESTIONS } from "@/lib/questions";
import { DIMENSIONS, type Dimension, type DimScores } from "@/lib/submission";
import { DIM_META } from "@/lib/dimensions";

/**
 * /room/compare - the pre-event vs end-of-day comparison.
 *
 *  • Details (admin): the room's morning→evening shift in score and dimensions,
 *    plus a matched per-person table of everyone who took it both phases.
 *  • Audience: the same per-question layout as /room/insights, shown twice -
 *    "This morning" vs "Right now" - so the room watches itself level up.
 *
 * Reads /api/room/compare (admin-key gated, shared key via localStorage).
 */

const STORAGE_KEY = "room_admin_key";

const POINT_COLOR: Record<number, string> = {
  3: "var(--green)",
  2: "var(--gold)",
  1: "var(--gold-deep)",
  0: "var(--red)",
};

type Opt = { letter: string; label: string; points: number; count: number; pct: number };
type QDist = { id: string; dimension: string; prompt: string; options: Opt[] };
type Dist = { respondents: number; questions: QDist[] };
type Agg = {
  count: number;
  scored: number;
  avgTotalScore: number | null;
  avgDimScores: DimScores | null;
};
type PersonDelta = {
  id: string;
  name: string | null;
  email: string;
  preScore: number;
  postScore: number;
  delta: number;
  preDim: DimScores | null;
  postDim: DimScores | null;
};
type Data = {
  generatedAt: string;
  pre: { agg: Agg; dist: Dist };
  post: { agg: Agg; dist: Dist };
  matched: PersonDelta[];
};

export default function CompareView({ initialKey }: { initialKey?: string }) {
  const [key, setKey] = useState(initialKey ?? "");
  const [authed, setAuthed] = useState<boolean | null>(null);
  const [data, setData] = useState<Data | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<"details" | "audience">("details");
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
      const res = await fetch("/api/room/compare", {
        headers: { "x-admin-key": k },
        cache: "no-store",
      });
      if (res.status === 401) {
        setAuthed(false);
        setError("Wrong key.");
        return;
      }
      const json = await res.json();
      if (json.ok) {
        setAuthed(true);
        setError(null);
        setData(json);
        try {
          localStorage.setItem(STORAGE_KEY, k);
        } catch {
          /* ignore */
        }
      } else {
        setError(json.error || "Failed to load.");
      }
    } catch {
      setError("Network error.");
    }
  }, []);

  useEffect(() => {
    if (authed === false || !key) return;
    void load();
  }, [authed, key, load]);

  // Arrow keys flip topics in the audience tab.
  useEffect(() => {
    if (authed !== true || tab !== "audience") return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft")
        setActiveDim((d) => DIMENSIONS[Math.max(0, DIMENSIONS.indexOf(d) - 1)]);
      if (e.key === "ArrowRight")
        setActiveDim((d) => DIMENSIONS[Math.min(DIMENSIONS.length - 1, DIMENSIONS.indexOf(d) + 1)]);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [authed, tab]);

  // ── Key gate ───────────────────────────────────────────────────────────────
  if (authed !== true) {
    return (
      <div className="mx-auto max-w-sm py-24">
        <span className="eyebrow">Pre / Post comparison · protected</span>
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
            Open comparison →
          </button>
        </form>
      </div>
    );
  }

  const matched = data?.matched ?? [];
  const improved = matched.filter((m) => m.delta > 0).length;
  const avgPre = matched.length
    ? Math.round(matched.reduce((a, m) => a + m.preScore, 0) / matched.length)
    : null;
  const avgPost = matched.length
    ? Math.round(matched.reduce((a, m) => a + m.postScore, 0) / matched.length)
    : null;
  const avgDelta = avgPre != null && avgPost != null ? avgPost - avgPre : null;

  // Audience: the two questions of the active topic, paired pre/post by id.
  const topicQs = QUESTIONS.filter((q) => q.dimension === activeDim);
  const distById = (dist: Dist | undefined, id: string) =>
    dist?.questions.find((q) => q.id === id);

  const idx = DIMENSIONS.indexOf(activeDim);

  return (
    <div className="py-8">
      {/* Top bar */}
      <div className="mb-5 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl">Pre → Post comparison</h1>
          <span className="eyebrow !text-muted">
            {data?.pre.agg.scored ?? 0} morning · {data?.post.agg.scored ?? 0} evening ·{" "}
            {matched.length} did both
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          <Link
            href="/room/insights"
            className="rounded-lg border border-[var(--line)] px-3 py-1.5 text-xs text-muted transition-colors hover:text-gold"
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
            href="/room/compare"
            className="rounded-lg border border-gold px-3 py-1.5 text-xs text-gold"
          >
            Compare →
          </Link>
        </div>
      </div>

      {/* Tabs */}
      <div className="mb-6 flex gap-1.5">
        {(["details", "audience"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`rounded-lg border px-4 py-2 text-sm capitalize transition-colors ${
              tab === t
                ? "border-gold bg-gold text-gold-ink"
                : "border-[var(--line)] text-muted hover:border-gold hover:text-gold"
            }`}
          >
            {t === "details" ? "Details (admin)" : "Audience"}
          </button>
        ))}
      </div>

      {matched.length === 0 && data?.post.agg.scored === 0 ? (
        <div className="card grid place-items-center p-20 text-center">
          <p className="text-muted">
            No end-of-day takes yet. The comparison fills in as the room retakes.
          </p>
        </div>
      ) : tab === "details" ? (
        // ── Details (admin) ──────────────────────────────────────────────────
        <div className="grid gap-4">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Stat label="Morning avg" value={avgPre != null ? String(avgPre) : "-"} hint="of those who did both" />
            <Stat
              label="Δ lift"
              value={avgDelta != null ? `${avgDelta >= 0 ? "+" : ""}${avgDelta}` : "-"}
              hint="evening − morning"
              accent
            />
            <Stat label="Evening avg" value={avgPost != null ? String(avgPost) : "-"} hint="of those who did both" />
            <Stat label="Improved" value={`${improved}/${matched.length}`} hint="scored higher" />
          </div>

          {/* Dimension shift (room average, morning vs now) */}
          <DimensionShift pre={data?.pre.agg.avgDimScores} post={data?.post.agg.avgDimScores} />

          {/* Matched per-person table */}
          <div className="card p-5">
            <span className="eyebrow !text-muted">Per person · biggest gain first</span>
            {matched.length === 0 ? (
              <p className="mt-3 text-sm text-muted">No one has taken both phases yet.</p>
            ) : (
              <div className="mt-3 overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-[var(--line)] text-left text-xs text-muted">
                      <th className="py-2 pr-3 font-normal">Name</th>
                      <th className="py-2 pr-3 text-center font-normal">Morning</th>
                      <th className="py-2 pr-3 text-center font-normal">Now</th>
                      <th className="py-2 pr-3 text-center font-normal">Δ</th>
                      <th className="py-2 pl-3 font-normal">Biggest dimension move</th>
                    </tr>
                  </thead>
                  <tbody>
                    {matched.map((m) => (
                      <tr key={m.id} className="border-b border-[var(--line)]">
                        <td className="py-2.5 pr-3">
                          {m.name || <span className="text-muted">{m.email}</span>}
                        </td>
                        <td className="nums py-2.5 pr-3 text-center text-muted">{m.preScore}</td>
                        <td className="nums py-2.5 pr-3 text-center">{m.postScore}</td>
                        <td
                          className={`nums py-2.5 pr-3 text-center font-medium ${
                            m.delta > 0 ? "text-green" : m.delta < 0 ? "text-red" : "text-muted"
                          }`}
                        >
                          {m.delta > 0 ? "+" : ""}
                          {m.delta}
                        </td>
                        <td className="py-2.5 pl-3 text-xs text-muted">
                          {topMove(m.preDim, m.postDim)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      ) : (
        // ── Audience (Question Insights, morning vs now) ─────────────────────
        <div>
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

          <div className="mb-3 flex items-end justify-between gap-3">
            <div>
              <span className="eyebrow !text-gold">{activeDim}</span>
              <p className="mt-1 max-w-xl text-sm text-muted">{DIM_META[activeDim].whatItMeasures}</p>
            </div>
            <div className="flex shrink-0 items-center gap-1.5">
              <button
                onClick={() => setActiveDim(DIMENSIONS[Math.max(0, idx - 1)])}
                disabled={idx === 0}
                aria-label="Previous topic"
                className="grid h-9 w-9 place-items-center rounded-lg border border-[var(--line)] text-muted transition-colors hover:border-gold hover:text-gold disabled:opacity-30"
              >
                ←
              </button>
              <button
                onClick={() => setActiveDim(DIMENSIONS[Math.min(DIMENSIONS.length - 1, idx + 1)])}
                disabled={idx === DIMENSIONS.length - 1}
                aria-label="Next topic"
                className="grid h-9 w-9 place-items-center rounded-lg border border-[var(--line)] text-muted transition-colors hover:border-gold hover:text-gold disabled:opacity-30"
              >
                →
              </button>
            </div>
          </div>

          <div className="grid gap-4">
            {topicQs.map((q) => (
              <QuestionCompareCard
                key={q.id}
                pre={distById(data?.pre.dist, q.id)}
                post={distById(data?.post.dist, q.id)}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/** "Biggest dimension move" for a person: largest absolute pre→post change. */
function topMove(pre: DimScores | null, post: DimScores | null): string {
  if (!pre || !post) return "—";
  let best: { dim: Dimension; d: number } | null = null;
  for (const dim of DIMENSIONS) {
    const d = Math.round((post[dim] - pre[dim]) * 100);
    if (best === null || Math.abs(d) > Math.abs(best.d)) best = { dim, d };
  }
  if (!best || best.d === 0) return "no change";
  return `${best.dim} ${best.d > 0 ? "+" : ""}${best.d}%`;
}

function Stat({
  label,
  value,
  hint,
  accent,
}: {
  label: string;
  value: string;
  hint: string;
  accent?: boolean;
}) {
  return (
    <div className="card p-4">
      <span className="eyebrow !text-muted">{label}</span>
      <div className={`nums mt-1 font-display text-3xl ${accent ? "text-gold" : ""}`}>{value}</div>
      <p className="mt-1 text-[11px] leading-snug text-muted">{hint}</p>
    </div>
  );
}

/** Room-average dimension scores, morning vs now, as paired bars. */
function DimensionShift({
  pre,
  post,
}: {
  pre: DimScores | null | undefined;
  post: DimScores | null | undefined;
}) {
  return (
    <div className="card p-5">
      <span className="eyebrow !text-muted">Room average by dimension · morning vs now</span>
      <div className="mt-4 grid gap-4">
        {DIMENSIONS.map((d) => {
          const a = pre ? Math.round(pre[d] * 100) : 0;
          const b = post ? Math.round(post[d] * 100) : 0;
          const delta = b - a;
          return (
            <div key={d}>
              <div className="mb-1.5 flex items-baseline justify-between text-sm">
                <span>{d}</span>
                <span className="nums text-muted">
                  {a}% → <span className="text-text">{b}%</span>{" "}
                  <span className={delta > 0 ? "text-green" : delta < 0 ? "text-red" : ""}>
                    ({delta > 0 ? "+" : ""}
                    {delta})
                  </span>
                </span>
              </div>
              <div className="relative h-2.5 w-full overflow-hidden rounded-full bg-[var(--surface-2)]">
                {/* morning (faint) underlay + now (gold) overlay */}
                <div
                  className="absolute inset-y-0 left-0 rounded-full bg-[var(--anchor-hi)]"
                  style={{ width: `${a}%` }}
                />
                <div
                  className="absolute inset-y-0 left-0 rounded-full bg-gold transition-[width] duration-700"
                  style={{ width: `${b}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
      <p className="mt-3 text-xs text-muted">
        Faint bar = this morning · gold bar = right now.
      </p>
    </div>
  );
}

/** One question, two distributions side by side (Morning / Now). */
function QuestionCompareCard({ pre, post }: { pre?: QDist; post?: QDist }) {
  const q = post ?? pre;
  if (!q) return null;
  const strongPre = strongPct(pre);
  const strongPost = strongPct(post);
  const shift = strongPre != null && strongPost != null ? strongPost - strongPre : null;
  return (
    <div className="card p-5">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div className="flex items-start gap-2">
          <span className="mt-0.5 font-mono text-xs text-muted">{q.id}</span>
          <p className="text-base font-medium">{q.prompt}</p>
        </div>
        {shift != null && (
          <span
            className={`shrink-0 rounded-full border px-2.5 py-1 text-xs nums ${
              shift > 0
                ? "border-green text-green"
                : shift < 0
                  ? "border-red text-red"
                  : "border-[var(--line)] text-muted"
            }`}
            title="Change in the share choosing the strongest answer"
          >
            best answer {strongPre ?? 0}% → {strongPost ?? 0}% ({shift > 0 ? "+" : ""}
            {shift})
          </span>
        )}
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <DistBlock title="This morning" q={pre} />
        <DistBlock title="Right now" q={post} highlight />
      </div>
    </div>
  );
}

/** Percent who chose the strongest option (points === 3). */
function strongPct(q?: QDist): number | null {
  if (!q) return null;
  const total = q.options.reduce((s, o) => s + o.count, 0);
  if (total === 0) return null;
  const strong = q.options.filter((o) => o.points === 3).reduce((s, o) => s + o.count, 0);
  return Math.round((strong / total) * 100);
}

/** Donut + labelled bars for one phase of one question (the Insights layout). */
function DistBlock({ title, q, highlight }: { title: string; q?: QDist; highlight?: boolean }) {
  const total = q ? q.options.reduce((s, o) => s + o.count, 0) : 0;
  const segments = q
    ? q.options.map((o) => ({ value: o.count, color: POINT_COLOR[o.points] ?? "var(--surface-2)" }))
    : [];
  return (
    <div className={`rounded-xl border p-4 ${highlight ? "border-gold/40" : "border-[var(--line)]"}`}>
      <div className="mb-3 flex items-center justify-between">
        <span className={`eyebrow ${highlight ? "!text-gold" : "!text-muted"}`}>{title}</span>
        <span className="label-mono">{total} replies</span>
      </div>
      {total === 0 ? (
        <p className="py-8 text-center text-sm text-muted">No answers this phase yet.</p>
      ) : (
        <div className="flex flex-wrap items-center gap-4">
          <div className="relative shrink-0">
            <Donut segments={segments} size={104} thickness={16} />
            <div className="pointer-events-none absolute inset-0 grid place-items-center text-center">
              <div className="nums font-display text-lg leading-none">{total}</div>
            </div>
          </div>
          <div className="grid min-w-[160px] flex-1 gap-1.5">
            {q!.options.map((o) => (
              <div key={o.label} className="grid gap-0.5">
                <div className="flex items-center justify-between gap-2 text-xs">
                  <span className="text-muted">
                    <span className="mr-1.5 font-mono text-[0.65rem]">{o.points}</span>
                    {o.label}
                  </span>
                  <span className="nums shrink-0 text-muted">{o.pct}%</span>
                </div>
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-[var(--surface-2)]">
                  <div
                    className="h-full rounded-full"
                    style={{ width: `${o.pct}%`, backgroundColor: POINT_COLOR[o.points] }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/** A donut chart from raw segment values (pure SVG arcs). */
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
          <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--surface-2)" strokeWidth={thickness} />
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

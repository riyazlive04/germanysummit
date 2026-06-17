"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import PentagonRadar from "@/components/PentagonRadar";
import { DIMENSIONS, type DimScores } from "@/lib/submission";
import { DIST_BUCKETS, TIERS, type Aggregate, type ScoreLift } from "@/lib/aggregate";
import type { Tier } from "@/lib/scoring";
import { formatISTTime } from "@/lib/datetime";

/**
 * /room - live big-screen aggregate for the 10:00 block. Polls /api/room every
 * few seconds (simple + robust), gated by ADMIN_KEY. Shows the average pentagon
 * radar, tier + archetype breakdowns, a score distribution, and the
 * on_arrival → end_of_day before/after shift.
 */

const POLL_MS = 5000;
const STORAGE_KEY = "room_admin_key";

type RoomData = {
  generatedAt: string;
  sessionFilter: string | null;
  overall: Aggregate;
  bySession: Record<string, Aggregate>;
  lift: ScoreLift;
  seats?: {
    guided: Program;
    solo: Program;
  };
};

type Program = { total: number; claimed: number; buyers: { name: string; at: string }[] };

type SessionFilter = "" | "pre_event" | "on_arrival" | "end_of_day";

const FILTERS: { value: SessionFilter; label: string }[] = [
  { value: "", label: "All" },
  { value: "pre_event", label: "Pre-event" },
  { value: "on_arrival", label: "On arrival" },
  { value: "end_of_day", label: "End of day" },
];

const TIER_COLOR: Record<Tier, string> = {
  "Invisible to Recruiters": "var(--red)",
  "Visible, Not Competitive": "var(--gold-soft)",
  "Interview-Ready": "var(--gold)",
  "Offer Magnet": "var(--green)",
};

export default function RoomDashboard({ initialKey }: { initialKey?: string }) {
  const [key, setKey] = useState(initialKey ?? "");
  const [authed, setAuthed] = useState<boolean | null>(null);
  const [data, setData] = useState<RoomData | null>(null);
  const [filter, setFilter] = useState<SessionFilter>("");
  const [error, setError] = useState<string | null>(null);
  const keyRef = useRef(key);
  keyRef.current = key;

  // Restore a previously-entered key on first mount.
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

  const fetchData = useCallback(async (sessionFilter: SessionFilter) => {
    const k = keyRef.current;
    if (!k) return;
    try {
      const qs = sessionFilter ? `?session=${sessionFilter}` : "";
      const res = await fetch(`/api/room${qs}`, {
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

  // Poll while authed.
  useEffect(() => {
    if (authed === false) return;
    if (!key) return;
    void fetchData(filter);
    const id = setInterval(() => void fetchData(filter), POLL_MS);
    return () => clearInterval(id);
  }, [authed, key, filter, fetchData]);

  // ── Key gate ───────────────────────────────────────────────────────────────
  if (authed !== true) {
    return (
      <div className="mx-auto max-w-sm py-24">
        <span className="label-mono">Room view · protected</span>
        <h1 className="mt-3 font-display text-3xl">Enter the admin key</h1>
        <p className="mt-2 text-sm text-muted">
          The live room aggregate is for the big screen during the 10:00 block.
        </p>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            setAuthed(null);
            void fetchData(filter);
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
            Open the room →
          </button>
        </form>
      </div>
    );
  }

  const overall = data?.overall;

  return (
    <div className="py-8">
      {/* Top bar */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="relative flex h-2.5 w-2.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green opacity-75" />
            <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-green" />
          </span>
          <h1 className="font-display text-2xl sm:text-3xl">The Room - live</h1>
          {data && (
            <span className="label-mono">
              updated {formatISTTime(data.generatedAt)} IST
            </span>
          )}
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
            href="/room/live"
            className="ml-1 rounded-lg border border-[var(--line)] px-3 py-1.5 text-xs text-muted transition-colors hover:text-gold"
          >
            Live answers →
          </Link>
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
        </div>
      </div>

      {!overall || overall.count === 0 ? (
        <div className="card grid place-items-center p-20 text-center">
          <p className="text-muted">No submissions in this view yet.</p>
        </div>
      ) : (
        <div className="grid gap-5">
          {/* Stat strip */}
          <div className="grid gap-5 sm:grid-cols-4">
            <Stat label="Attendees" value={String(overall.count)} />
            <Stat label="Scored" value={String(overall.scored)} />
            <Stat
              label="Avg readiness"
              value={overall.avgTotalScore != null ? String(overall.avgTotalScore) : "-"}
              suffix={overall.avgTotalScore != null ? "/100" : undefined}
            />
            <Stat
              label="Top archetype"
              value={overall.archetypeCounts[0]?.name ?? "-"}
              small
            />
          </div>

          {/* Seat scarcity (buying window) */}
          {data?.seats?.guided && <SeatScarcity seats={data.seats} />}

          {/* Radar + breakdowns */}
          <div className="grid gap-5 lg:grid-cols-[minmax(0,420px)_1fr]">
            <section className="card flex flex-col items-center p-7">
              <span className="label-mono self-start">Average room radar</span>
              {overall.avgDimScores ? (
                <div className="mt-2 w-full max-w-[400px]">
                  <PentagonRadar dimScores={overall.avgDimScores} />
                </div>
              ) : (
                <p className="py-16 text-sm text-muted">No scored radars yet.</p>
              )}
            </section>

            <div className="grid gap-5">
              {/* Tier breakdown */}
              <section className="card p-7">
                <h3 className="font-display text-lg">Tier breakdown</h3>
                <div className="mt-4 grid gap-3">
                  {TIERS.map((t) => (
                    <Bar
                      key={t}
                      label={t}
                      count={overall.tierCounts[t]}
                      total={overall.scored}
                      color={TIER_COLOR[t]}
                    />
                  ))}
                </div>
              </section>

              {/* Archetype counts */}
              <section className="card p-7">
                <h3 className="font-display text-lg">Archetypes in the room</h3>
                {overall.archetypeCounts.length ? (
                  <div className="mt-4 grid gap-3">
                    {overall.archetypeCounts.map((a) => (
                      <Bar
                        key={a.name}
                        label={a.name}
                        count={a.count}
                        total={overall.scored}
                        color="var(--gold)"
                      />
                    ))}
                  </div>
                ) : (
                  <p className="mt-3 text-sm text-muted">No archetypes yet.</p>
                )}
              </section>
            </div>
          </div>

          {/* Distribution */}
          <section className="card p-7">
            <h3 className="font-display text-lg">Score distribution</h3>
            <Histogram distribution={overall.distribution} />
          </section>

          {/* Before / after (who is in each phase right now) */}
          {data && (
            <BeforeAfter
              onArrival={data.bySession["on_arrival"]}
              endOfDay={data.bySession["end_of_day"]}
            />
          )}

          {/* True per-person lift (same people, first take vs latest) */}
          {data && data.lift.retook > 0 && <ScoreLiftPanel lift={data.lift} />}
        </div>
      )}
    </div>
  );
}

/** Live enrollment banner for the buying window (managed from /room/records).
 * Guided Mode is the scarcity hero; Solo Mode tracks alongside. Both show the
 * real names of who just joined - live social proof. */
function SeatScarcity({ seats }: { seats: { guided: Program; solo: Program } }) {
  const g = seats.guided;
  const s = seats.solo;
  const gLeft = Math.max(0, g.total - g.claimed);
  const gPct = g.total > 0 ? (g.claimed / g.total) * 100 : 0;
  return (
    <section className="panel-anchor grid gap-6 p-7 sm:grid-cols-[1.3fr_1fr] sm:p-8">
      {/* Guided Mode - the scarcity hero */}
      <div>
        <span className="eyebrow">Guided Mode · seats in this batch</span>
        <div className="mt-2 flex items-baseline gap-3">
          <span className="nums font-display text-6xl leading-none text-gold sm:text-7xl">
            {gLeft}
          </span>
          <span className="text-lg text-on-anchor">left of {g.total}</span>
        </div>
        <div className="mt-4 h-3 w-full overflow-hidden rounded-full bg-[color:rgba(0,0,0,0.25)]">
          <div
            className="h-full rounded-full bg-gold transition-[width] duration-700 ease-out"
            style={{ width: `${gPct}%` }}
          />
        </div>
        <BuyerNames buyers={g.buyers} />
      </div>

      {/* Solo Mode */}
      <div className="sm:border-l sm:border-[color:rgba(245,242,234,0.15)] sm:pl-6">
        <span className="eyebrow">Solo Mode</span>
        <div className="mt-2 flex items-baseline gap-2">
          <span className="nums font-display text-4xl leading-none text-on-anchor">
            {s.claimed}
          </span>
          <span className="text-on-anchor">joined of {s.total}</span>
        </div>
        <BuyerNames buyers={s.buyers} />
      </div>
    </section>
  );
}

function BuyerNames({ buyers }: { buyers: { name: string; at: string }[] }) {
  if (!buyers.length) return null;
  return (
    <div className="mt-4 flex flex-wrap gap-1.5">
      {buyers.slice(0, 12).map((b, i) => (
        <span
          key={i}
          className="rounded-full bg-[color:rgba(245,242,234,0.12)] px-2.5 py-1 text-xs text-on-anchor"
        >
          {b.name}
        </span>
      ))}
      {buyers.length > 12 && (
        <span className="px-1 py-1 text-xs text-[color:rgba(245,242,234,0.6)]">
          +{buyers.length - 12} more
        </span>
      )}
    </div>
  );
}

function Stat({
  label,
  value,
  suffix,
  small,
}: {
  label: string;
  value: string;
  suffix?: string;
  small?: boolean;
}) {
  return (
    <div className="card p-5">
      <span className="label-mono">{label}</span>
      <div className="mt-2 flex items-end gap-1.5">
        <span
          className={`font-display tabular-nums leading-none ${
            small ? "text-xl" : "text-4xl"
          }`}
        >
          {value}
        </span>
        {suffix && <span className="mb-1 font-mono text-xs text-muted">{suffix}</span>}
      </div>
    </div>
  );
}

function Bar({
  label,
  count,
  total,
  color,
}: {
  label: string;
  count: number;
  total: number;
  color: string;
}) {
  const pct = total > 0 ? Math.round((count / total) * 100) : 0;
  return (
    <div>
      <div className="mb-1 flex items-baseline justify-between gap-3 text-sm">
        <span>{label}</span>
        <span className="font-mono text-xs text-muted">
          {count} · {pct}%
        </span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-[var(--hairline)]">
        <div
          className="h-full rounded-full transition-[width] duration-500 ease-out"
          style={{ width: `${pct}%`, backgroundColor: color }}
        />
      </div>
    </div>
  );
}

function Histogram({ distribution }: { distribution: number[] }) {
  const max = Math.max(1, ...distribution);
  return (
    <div className="mt-5 flex items-end gap-3" style={{ height: 140 }}>
      {distribution.map((n, i) => (
        <div key={i} className="flex flex-1 flex-col items-center justify-end gap-2">
          <span className="font-mono text-xs text-muted">{n}</span>
          <div
            className="w-full rounded-t-md bg-gold transition-[height] duration-500 ease-out"
            style={{ height: `${(n / max) * 100}%`, minHeight: n > 0 ? 4 : 0 }}
          />
          <span className="label-mono !text-[0.68rem]">{DIST_BUCKETS[i].label}</span>
        </div>
      ))}
    </div>
  );
}

function BeforeAfter({
  onArrival,
  endOfDay,
}: {
  onArrival?: Aggregate;
  endOfDay?: Aggregate;
}) {
  const a = onArrival?.avgTotalScore ?? null;
  const b = endOfDay?.avgTotalScore ?? null;
  const delta = a != null && b != null ? b - a : null;

  return (
    <section className="card p-7">
      <div className="flex items-baseline justify-between gap-3">
        <h3 className="font-display text-lg">The room&apos;s shift</h3>
        <span className="label-mono">on arrival → end of day</span>
      </div>

      <div className="mt-5 grid items-center gap-6 sm:grid-cols-[1fr_auto_1fr]">
        <MiniSession title="On arrival" agg={onArrival} />
        <div className="text-center">
          <span className="label-mono">Δ readiness</span>
          <div
            className="mt-1 font-display text-4xl tabular-nums"
            style={{ color: delta != null && delta >= 0 ? "var(--green)" : "var(--muted)" }}
          >
            {delta != null ? `${delta >= 0 ? "+" : ""}${delta}` : "-"}
          </div>
        </div>
        <MiniSession title="End of day" agg={endOfDay} highlight />
      </div>
    </section>
  );
}

const PHASE_LABEL: Record<string, string> = {
  pre_event: "Pre-event",
  on_arrival: "On arrival",
  end_of_day: "End of day",
};

/**
 * The honest lift: same people, first take vs their latest, pooled across the
 * day from snapshot history. Only shown once at least one person has retaken.
 */
function ScoreLiftPanel({ lift }: { lift: ScoreLift }) {
  const up = lift.avgDelta != null && lift.avgDelta >= 0;
  return (
    <section className="panel-anchor p-7">
      <div className="flex items-baseline justify-between gap-3">
        <h3 className="font-display text-lg text-on-anchor">Score lift across the day</h3>
        <span className="label-mono !text-gold">same people, first take vs latest</span>
      </div>

      <div className="mt-5 grid items-center gap-6 sm:grid-cols-[1fr_auto_1fr]">
        <div className="text-center">
          <span className="label-mono">Avg first take</span>
          <div className="mt-1 font-display text-3xl tabular-nums text-on-anchor">
            {lift.avgFirst ?? "-"}
            {lift.avgFirst != null && (
              <span className="ml-1 font-mono text-xs text-muted">/100</span>
            )}
          </div>
        </div>
        <div className="text-center">
          <span className="label-mono">Δ lift</span>
          <div
            className="mt-1 font-display text-5xl tabular-nums"
            style={{ color: up ? "var(--gold)" : "var(--muted)" }}
          >
            {lift.avgDelta != null ? `${up ? "+" : ""}${lift.avgDelta}` : "-"}
          </div>
        </div>
        <div className="text-center">
          <span className="label-mono">Avg latest take</span>
          <div className="mt-1 font-display text-3xl tabular-nums text-gold">
            {lift.avgLast ?? "-"}
            {lift.avgLast != null && (
              <span className="ml-1 font-mono text-xs text-muted">/100</span>
            )}
          </div>
        </div>
      </div>

      <div className="mt-6 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-center text-sm text-on-anchor">
        <span>
          <strong className="font-display text-lg">{lift.retook}</strong> retook
        </span>
        <span>
          <strong className="font-display text-lg text-gold">{lift.improved}</strong> improved
        </span>
        {lift.topGain != null && lift.topGain > 0 && (
          <span>
            biggest jump <strong className="font-display text-lg text-gold">+{lift.topGain}</strong>
          </span>
        )}
      </div>

      {/* Pooled phase averages from every snapshot */}
      <div className="mt-6 grid grid-cols-3 gap-3">
        {lift.phaseAverages.map((p) => (
          <div key={p.session} className="rounded-xl border border-[var(--hairline)] p-3 text-center">
            <span className="label-mono">{PHASE_LABEL[p.session] ?? p.session}</span>
            <div className="mt-1 font-display text-2xl tabular-nums text-on-anchor">
              {p.avg ?? "-"}
            </div>
            <span className="font-mono text-[0.65rem] text-muted">{p.n} takes</span>
          </div>
        ))}
      </div>
    </section>
  );
}

function MiniSession({
  title,
  agg,
  highlight,
}: {
  title: string;
  agg?: Aggregate;
  highlight?: boolean;
}) {
  return (
    <div className="text-center">
      <span className="label-mono">{title}</span>
      <div
        className="mt-1 font-display text-3xl tabular-nums"
        style={{ color: highlight ? "var(--gold)" : "var(--text)" }}
      >
        {agg?.avgTotalScore ?? "-"}
        {agg?.avgTotalScore != null && (
          <span className="ml-1 font-mono text-xs text-muted">/100</span>
        )}
      </div>
      <span className="font-mono text-xs text-muted">{agg?.count ?? 0} in room</span>
      {agg?.avgDimScores && (
        <div className="mx-auto mt-2 max-w-[200px] opacity-90">
          <MiniRadar dimScores={agg.avgDimScores} />
        </div>
      )}
    </div>
  );
}

/** Tiny static radar (no labels) for the before/after comparison. */
function MiniRadar({ dimScores }: { dimScores: DimScores }) {
  const C = 60;
  const R = 48;
  const angles = DIMENSIONS.map((_, i) => ((-90 + i * 72) * Math.PI) / 180);
  const pts = angles
    .map((a, i) => {
      const r = R * (dimScores[DIMENSIONS[i]] ?? 0);
      return `${C + r * Math.cos(a)},${C + r * Math.sin(a)}`;
    })
    .join(" ");
  const grid = angles.map((a) => `${C + R * Math.cos(a)},${C + R * Math.sin(a)}`).join(" ");
  return (
    <svg viewBox="0 0 120 120" className="w-full">
      <polygon points={grid} fill="none" stroke="var(--hairline)" strokeWidth={1} />
      <polygon
        points={pts}
        fill="var(--gold)"
        fillOpacity={0.18}
        stroke="var(--gold)"
        strokeWidth={1.5}
      />
    </svg>
  );
}

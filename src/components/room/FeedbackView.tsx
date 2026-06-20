"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { formatISTDateTime } from "@/lib/datetime";

/**
 * /room/feedback - the admin read-out of the post-event /feedback survey.
 *
 * Enter the admin key once (shared with the other room views via localStorage),
 * then see the headline numbers: NPS, average rating, the "plan stuck" and
 * Guided Mode decision breakdowns, and every open-text answer. Reads the raw
 * rows from /api/room/feedback; a response can be deleted (spam / test).
 */

const STORAGE_KEY = "room_admin_key";

type Feedback = {
  id: string;
  nps: number;
  rating: number;
  valuable: string | null;
  improve: string | null;
  planStuck: string;
  guided: string;
  name: string | null;
  phone: string | null;
  session: string;
  createdAt: string;
};

const PLAN_LABELS: Record<string, string> = {
  lt3m: "Less than 3 months",
  "3to12m": "3 to 12 months",
  "1to2y": "1 to 2 years",
  gt2y: "More than 2 years",
};
const PLAN_ORDER = ["lt3m", "3to12m", "1to2y", "gt2y"];

const GUIDED_LABELS: Record<string, string> = {
  enrolled: "Enrolled",
  interested: "Interested, still thinking",
  need_time: "Need more time",
  not_for_me: "Not for me right now",
};
const GUIDED_ORDER = ["enrolled", "interested", "need_time", "not_for_me"];
// Decision strength → colour (warm = hotter lead).
const GUIDED_COLOR: Record<string, string> = {
  enrolled: "var(--green)",
  interested: "var(--gold)",
  need_time: "var(--gold-deep)",
  not_for_me: "var(--red)",
};

function avg(nums: number[]): number | null {
  if (!nums.length) return null;
  return Math.round((nums.reduce((a, b) => a + b, 0) / nums.length) * 10) / 10;
}

export default function FeedbackView({ initialKey }: { initialKey?: string }) {
  const [key, setKey] = useState(initialKey ?? "");
  const [authed, setAuthed] = useState<boolean | null>(null);
  const [rows, setRows] = useState<Feedback[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
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
      const res = await fetch("/api/room/feedback", {
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
        setRows(data.feedback);
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

  async function remove(id: string) {
    if (!window.confirm("Delete this response?")) return;
    setBusy(true);
    try {
      const res = await fetch("/api/room/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-admin-key": keyRef.current },
        body: JSON.stringify({ action: "delete", id }),
      });
      if (res.ok) setRows((rs) => rs.filter((r) => r.id !== id));
    } finally {
      setBusy(false);
    }
  }

  // ── Key gate ───────────────────────────────────────────────────────────────
  if (authed !== true) {
    return (
      <div className="mx-auto max-w-sm py-24">
        <span className="eyebrow">Feedback · protected</span>
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
            Open feedback →
          </button>
        </form>
      </div>
    );
  }

  const total = rows.length;
  const npsValues = rows.map((r) => r.nps);
  const promoters = npsValues.filter((n) => n >= 9).length;
  const passives = npsValues.filter((n) => n >= 7 && n <= 8).length;
  const detractors = npsValues.filter((n) => n <= 6).length;
  const nps = total ? Math.round(((promoters - detractors) / total) * 100) : 0;
  const avgRating = avg(rows.map((r) => r.rating));
  const enrolled = rows.filter((r) => r.guided === "enrolled").length;

  const planCounts = PLAN_ORDER.map((k) => ({
    key: k,
    label: PLAN_LABELS[k],
    count: rows.filter((r) => r.planStuck === k).length,
  }));
  const guidedCounts = GUIDED_ORDER.map((k) => ({
    key: k,
    label: GUIDED_LABELS[k],
    count: rows.filter((r) => r.guided === k).length,
  }));

  const valuableNotes = rows.filter((r) => r.valuable);
  const improveNotes = rows.filter((r) => r.improve);

  return (
    <div className="py-8">
      {/* Top bar */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl">Feedback</h1>
          <span className="eyebrow !text-muted">{total} responses</span>
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
            href="/room/feedback"
            className="rounded-lg border border-gold px-3 py-1.5 text-xs text-gold"
          >
            Feedback →
          </Link>
          <Link
            href="/room/compare"
            className="rounded-lg border border-[var(--line)] px-3 py-1.5 text-xs text-muted transition-colors hover:text-gold"
          >
            Compare →
          </Link>
        </div>
      </div>

      {total === 0 ? (
        <div className="card grid place-items-center p-20 text-center">
          <p className="text-muted">No feedback yet.</p>
        </div>
      ) : (
        <>
          {/* Headline stats */}
          <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Stat
              label="NPS"
              value={nps > 0 ? `+${nps}` : `${nps}`}
              hint={`${promoters} promoters · ${detractors} detractors`}
              accent
            />
            <Stat label="Avg rating" value={`${avgRating ?? "-"}`} hint="out of 10" />
            <Stat label="Avg NPS score" value={`${avg(npsValues) ?? "-"}`} hint="0-10 likelihood" />
            <Stat label="Enrolled" value={`${enrolled}`} hint="said yes to Guided" />
          </div>

          {/* NPS split */}
          <div className="card mb-4 p-5">
            <span className="eyebrow !text-muted">Recommendation split</span>
            <div className="mt-3 flex h-3 w-full overflow-hidden rounded-full bg-[var(--surface-2)]">
              <Seg n={promoters} total={total} color="var(--green)" />
              <Seg n={passives} total={total} color="var(--gold)" />
              <Seg n={detractors} total={total} color="var(--red)" />
            </div>
            <div className="mt-3 flex flex-wrap gap-4 text-xs text-muted">
              <Legend color="var(--green)" label={`Promoters (9-10) · ${promoters}`} />
              <Legend color="var(--gold)" label={`Passives (7-8) · ${passives}`} />
              <Legend color="var(--red)" label={`Detractors (0-6) · ${detractors}`} />
            </div>
          </div>

          {/* Two breakdowns */}
          <div className="mb-4 grid gap-4 lg:grid-cols-2">
            <Breakdown title="How long the plan had been stuck" rows={planCounts} total={total} />
            <Breakdown
              title="Guided Mode decision"
              rows={guidedCounts}
              total={total}
              colorFor={(k) => GUIDED_COLOR[k]}
            />
          </div>

          {/* Open text */}
          <div className="mb-4 grid gap-4 lg:grid-cols-2">
            <Notes title="Most valuable" rows={valuableNotes} pick={(r) => r.valuable} />
            <Notes title="What could be better" rows={improveNotes} pick={(r) => r.improve} />
          </div>

          {/* Full response list */}
          <div className="card p-5">
            <span className="eyebrow !text-muted">All responses</span>
            <div className="mt-3 overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[var(--line)] text-left text-xs text-muted">
                    <th className="py-2 pr-3 font-normal">When</th>
                    <th className="py-2 pr-3 font-normal">Name</th>
                    <th className="py-2 pr-3 font-normal">WhatsApp</th>
                    <th className="py-2 pr-3 text-center font-normal">NPS</th>
                    <th className="py-2 pr-3 text-center font-normal">Rating</th>
                    <th className="py-2 pr-3 font-normal">Guided</th>
                    <th className="py-2 pl-3" />
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr key={r.id} className="border-b border-[var(--line)] align-top">
                      <td className="whitespace-nowrap py-2.5 pr-3 text-xs text-muted">
                        {formatISTDateTime(r.createdAt)}
                      </td>
                      <td className="py-2.5 pr-3">{r.name || <span className="text-muted">—</span>}</td>
                      <td className="whitespace-nowrap py-2.5 pr-3 nums">
                        {r.phone || <span className="text-muted">—</span>}
                      </td>
                      <td className="nums py-2.5 pr-3 text-center">{r.nps}</td>
                      <td className="nums py-2.5 pr-3 text-center">{r.rating}</td>
                      <td className="py-2.5 pr-3 text-xs">{GUIDED_LABELS[r.guided] ?? r.guided}</td>
                      <td className="py-2.5 pl-3 text-right">
                        <button
                          onClick={() => remove(r.id)}
                          disabled={busy}
                          className="text-xs text-muted transition-colors hover:text-red disabled:opacity-40"
                          title="Delete response"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
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

function Seg({ n, total, color }: { n: number; total: number; color: string }) {
  if (n === 0) return null;
  return <div style={{ width: `${(n / total) * 100}%`, backgroundColor: color }} />;
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <span className="flex items-center gap-1.5">
      <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: color }} />
      {label}
    </span>
  );
}

function Breakdown({
  title,
  rows,
  total,
  colorFor,
}: {
  title: string;
  rows: { key: string; label: string; count: number }[];
  total: number;
  colorFor?: (key: string) => string;
}) {
  return (
    <div className="card p-5">
      <span className="eyebrow !text-muted">{title}</span>
      <div className="mt-3 grid gap-2.5">
        {rows.map((r) => {
          const pct = total > 0 ? Math.round((r.count / total) * 100) : 0;
          return (
            <div key={r.key} className="grid gap-1">
              <div className="flex items-baseline justify-between gap-2 text-sm">
                <span className="text-muted">{r.label}</span>
                <span className="nums shrink-0 text-muted">
                  {r.count} · {pct}%
                </span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-[var(--surface-2)]">
                <div
                  className="h-full rounded-full"
                  style={{ width: `${pct}%`, backgroundColor: colorFor?.(r.key) ?? "var(--gold)" }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function Notes({
  title,
  rows,
  pick,
}: {
  title: string;
  rows: Feedback[];
  pick: (r: Feedback) => string | null;
}) {
  return (
    <div className="card p-5">
      <div className="flex items-baseline justify-between">
        <span className="eyebrow !text-muted">{title}</span>
        <span className="label-mono">{rows.length}</span>
      </div>
      {rows.length === 0 ? (
        <p className="mt-3 text-sm text-muted">No notes yet.</p>
      ) : (
        <ul className="mt-3 grid max-h-80 gap-2.5 overflow-y-auto pr-1">
          {rows.map((r) => (
            <li key={r.id} className="border-l-2 border-[var(--line)] pl-3 text-sm">
              <p className="leading-snug">{pick(r)}</p>
              {r.name && <p className="mt-0.5 text-xs text-muted">— {r.name}</p>}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

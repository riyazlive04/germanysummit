"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { DIMENSIONS } from "@/lib/submission";
import { DIM_META } from "@/lib/dimensions";
import type {
  AnswerDistribution,
  MindsetPulse,
  QuestionDistribution,
} from "@/lib/aggregate";
import { STAGE_CAPTIONS, PAIN_MAX_POINTS } from "@/lib/stagelines";
import { formatISTTime } from "@/lib/datetime";

/**
 * /room/live - the big-screen, section-by-section answer reveal. Ameen walks the
 * five dimensions plus a Mindset pulse; at the end of each section this shows,
 * live, the percentage of the room that chose A / B / C / D. "Stage mode" turns
 * each question into a single full-screen "Room Truth" stat with a scripted line.
 * Gated by ADMIN_KEY, polls every few seconds.
 */

const POLL_MS = 5000;
const STORAGE_KEY = "room_admin_key";
const MINDSET_SECTION = DIMENSIONS.length; // index 5: the mindset pulse
const SECTION_COUNT = DIMENSIONS.length + 1;

type Data = AnswerDistribution & {
  generatedAt: string;
  sessionFilter: string | null;
  mindset: MindsetPulse;
};

type SessionFilter = "" | "pre_event" | "on_arrival" | "end_of_day";

const FILTERS: { value: SessionFilter; label: string }[] = [
  { value: "pre_event", label: "Pre-event" },
  { value: "end_of_day", label: "Post event" },
];

function painPct(q: QuestionDistribution): number {
  return q.options
    .filter((o) => o.points <= PAIN_MAX_POINTS)
    .reduce((a, o) => a + o.pct, 0);
}

export default function LivePoll({
  initialKey,
  initialSection,
  initialStage,
}: {
  initialKey?: string;
  initialSection?: number;
  initialStage?: boolean;
}) {
  const [key, setKey] = useState(initialKey ?? "");
  const [authed, setAuthed] = useState<boolean | null>(null);
  const [data, setData] = useState<Data | null>(null);
  const [filter, setFilter] = useState<SessionFilter>("pre_event");
  const [section, setSection] = useState(
    initialSection != null ? Math.max(0, Math.min(initialSection, SECTION_COUNT - 1)) : 0,
  ); // 0..5
  const [stage, setStage] = useState(!!initialStage); // "Room Truth" reveal mode
  const [error, setError] = useState<string | null>(null);
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

  const fetchData = useCallback(async (sessionFilter: SessionFilter) => {
    const k = keyRef.current;
    if (!k) return;
    try {
      const qs = sessionFilter ? `?session=${sessionFilter}` : "";
      const res = await fetch(`/api/room/answers${qs}`, {
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
    void fetchData(filter);
    const id = setInterval(() => void fetchData(filter), POLL_MS);
    return () => clearInterval(id);
  }, [authed, key, filter, fetchData]);

  // Keyboard: arrows change section, "S" toggles stage mode (handy from a clicker).
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "ArrowRight") setSection((s) => Math.min(s + 1, SECTION_COUNT - 1));
      if (e.key === "ArrowLeft") setSection((s) => Math.max(s - 1, 0));
      if (e.key.toLowerCase() === "s") setStage((v) => !v);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // ── Key gate ───────────────────────────────────────────────────────────────
  if (authed !== true) {
    return (
      <div className="mx-auto max-w-sm py-24">
        <span className="label-mono">Live reveal · protected</span>
        <h1 className="mt-3 font-display text-3xl">Enter the admin key</h1>
        <p className="mt-2 text-sm text-muted">
          The section-by-section answer reveal for the big screen.
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
            Open the reveal →
          </button>
        </form>
      </div>
    );
  }

  const isMindset = section === MINDSET_SECTION;
  const dim = isMindset ? null : DIMENSIONS[section];
  const meta = dim ? DIM_META[dim] : null;
  const title = isMindset ? "Mindset pulse" : meta!.short;
  const subtitle = isMindset
    ? "How consistent they've been, and how long they've been at it."
    : meta!.whatItMeasures;
  const qs: QuestionDistribution[] = data
    ? data.questions.slice(section * 2, section * 2 + 2)
    : [];

  return (
    <div className="py-8">
      {/* Top bar */}
      <div className="mb-7 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="relative flex h-2.5 w-2.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green opacity-75" />
            <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-green" />
          </span>
          <h1 className="font-display text-xl sm:text-2xl">Live answers</h1>
          {data && (
            <span className="label-mono">
              {data.respondents} answered · {formatISTTime(data.generatedAt)} IST
            </span>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            onClick={() => setStage((v) => !v)}
            className={`rounded-lg border px-3 py-1.5 text-xs transition-colors ${
              stage ? "border-gold bg-gold text-gold-ink" : "border-[var(--line)] text-muted hover:text-text"
            }`}
            title="Toggle the full-screen single-stat reveal (shortcut: S)"
          >
            Stage mode
          </button>
          <span className="mx-1 h-4 w-px bg-[var(--line)]" />
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
          <span className="mx-1 h-4 w-px bg-[var(--line)]" />
          <Link
            href="/room/live"
            className="rounded-lg border border-gold px-3 py-1.5 text-xs text-gold"
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
          <Link
            href="/room/feedback"
            className="rounded-lg border border-[var(--line)] px-3 py-1.5 text-xs text-muted transition-colors hover:text-gold"
          >
            Feedback →
          </Link>
        </div>
      </div>

      {/* Section header */}
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <span className="eyebrow">
            {isMindset ? "The pulse" : `Section ${section + 1} of ${DIMENSIONS.length}`}
          </span>
          <h2 className="mt-1 font-display text-3xl sm:text-5xl">{title}</h2>
          <p className="mt-2 max-w-2xl text-muted">{subtitle}</p>
        </div>
        <div className="flex items-center gap-1.5">
          {Array.from({ length: SECTION_COUNT }, (_, i) => (
            <button
              key={i}
              onClick={() => setSection(i)}
              aria-label={`Section ${i + 1}`}
              className={`h-2.5 rounded-full transition-all ${
                i === section ? "w-7 bg-gold" : "w-2.5 bg-[var(--surface-2)] hover:bg-[var(--anchor-hi)]"
              }`}
            />
          ))}
        </div>
      </div>

      {/* Body */}
      {!data || data.respondents === 0 ? (
        <div className="card grid place-items-center p-20 text-center">
          <p className="text-muted">No answers in this view yet.</p>
        </div>
      ) : isMindset ? (
        <MindsetPanel pulse={data.mindset} stage={stage} />
      ) : (
        <div className="grid gap-6 lg:grid-cols-2">
          {qs.map((q) =>
            stage ? (
              <RoomTruthCard key={q.id} q={q} />
            ) : (
              <QuestionCard key={q.id} q={q} />
            ),
          )}
        </div>
      )}

      {/* Nav */}
      <div className="mt-8 flex items-center justify-between">
        <button
          onClick={() => setSection((s) => Math.max(s - 1, 0))}
          disabled={section === 0}
          className="btn btn-ghost px-5 py-2.5 text-sm disabled:opacity-40"
        >
          ← Previous
        </button>
        <span className="label-mono">{title}</span>
        <button
          onClick={() => setSection((s) => Math.min(s + 1, SECTION_COUNT - 1))}
          disabled={section === SECTION_COUNT - 1}
          className="btn-gold px-6 py-2.5 text-sm disabled:opacity-40"
        >
          {section === DIMENSIONS.length - 1 ? "Mindset pulse →" : "Next →"}
        </button>
      </div>
    </div>
  );
}

/** Normal mode: the question with A-D bars and percentages. */
function QuestionCard({ q }: { q: QuestionDistribution }) {
  const top = Math.max(...q.options.map((o) => o.pct));
  return (
    <section className="card p-6 sm:p-7">
      <h3 className="font-display text-lg leading-snug sm:text-2xl">{q.prompt}</h3>
      <div className="mt-5 grid gap-3.5">
        {q.options.map((o) => {
          const leading = o.pct === top && top > 0;
          return (
            <div key={o.letter} className="flex items-center gap-3.5">
              <span
                className={`grid h-8 w-8 shrink-0 place-items-center rounded-full border-2 font-mono text-sm font-bold ${
                  leading ? "border-gold bg-gold text-gold-ink" : "border-[var(--line)] text-muted"
                }`}
              >
                {o.letter}
              </span>
              <div className="min-w-0 flex-1">
                <div className="mb-1 flex items-baseline justify-between gap-3">
                  <span className="truncate text-sm text-muted">{o.label}</span>
                  <span className="nums shrink-0 font-display text-2xl leading-none sm:text-3xl">
                    {o.pct}
                    <span className="ml-0.5 font-mono text-xs text-muted">%</span>
                  </span>
                </div>
                <div className="h-2.5 w-full overflow-hidden rounded-full bg-[var(--surface-2)]">
                  <div
                    className="h-full rounded-full transition-[width] duration-700 ease-out"
                    style={{
                      width: `${o.pct}%`,
                      backgroundColor: leading ? "var(--gold)" : "var(--anchor-hi)",
                    }}
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

/** Stage mode: one big "Room Truth" stat + the scripted Gap -> Pain line. */
function RoomTruthCard({ q }: { q: QuestionDistribution }) {
  const pain = painPct(q);
  const caption = STAGE_CAPTIONS[q.id] ?? "chose a weaker answer";
  return (
    <section className="panel-anchor flex flex-col justify-center p-9 text-center sm:p-12">
      <div className="nums font-display text-[5rem] leading-none text-gold sm:text-[7rem]">
        {pain}
        <span className="text-4xl">%</span>
      </div>
      <p className="mx-auto mt-4 max-w-md text-xl leading-snug text-on-anchor sm:text-2xl">
        of this room {caption}
      </p>
      <p className="mx-auto mt-5 max-w-md text-sm text-[color:rgba(245,242,234,0.6)]">
        {q.prompt}
      </p>
    </section>
  );
}

/** The mindset pulse: consistency rating + years planning. */
function MindsetPanel({ pulse, stage }: { pulse: MindsetPulse; stage: boolean }) {
  const c = pulse.consistency;
  if (stage) {
    return (
      <div className="grid gap-6 lg:grid-cols-2">
        <section className="panel-anchor flex flex-col justify-center p-9 text-center sm:p-12">
          <div className="nums font-display text-[5rem] leading-none text-gold sm:text-[7rem]">
            {c.below5Pct}
            <span className="text-4xl">%</span>
          </div>
          <p className="mx-auto mt-4 max-w-md text-xl leading-snug text-on-anchor sm:text-2xl">
            rated their consistency below 5 out of 10
          </p>
          <p className="mx-auto mt-5 max-w-md text-sm text-[color:rgba(245,242,234,0.6)]">
            Average across the room: {c.avg ?? "-"} / 10 · {c.below3Pct}% rated it below 3
          </p>
        </section>
        <section className="panel-anchor flex flex-col justify-center p-9 text-center sm:p-12">
          <div className="nums font-display text-[5rem] leading-none text-gold sm:text-[7rem]">
            {pulse.yearsTwoPlusPct}
            <span className="text-4xl">%</span>
          </div>
          <p className="mx-auto mt-4 max-w-md text-xl leading-snug text-on-anchor sm:text-2xl">
            have been planning this for 2+ years
          </p>
        </section>
      </div>
    );
  }

  const maxC = Math.max(1, ...c.distribution);
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <section className="card p-6 sm:p-7">
        <div className="flex items-baseline justify-between">
          <h3 className="font-display text-lg sm:text-xl">Consistency, last 6 months</h3>
          <span className="nums font-display text-3xl text-gold">
            {c.avg ?? "-"}
            <span className="ml-0.5 font-mono text-xs text-muted">/10 avg</span>
          </span>
        </div>
        <div className="mt-5 flex items-end gap-1.5" style={{ height: 120 }}>
          {c.distribution.map((n, i) => (
            <div key={i} className="flex flex-1 flex-col items-center justify-end gap-1.5">
              <span className="font-mono text-[0.65rem] text-muted">{n}</span>
              <div
                className="w-full rounded-t bg-gold transition-[height] duration-500"
                style={{ height: `${(n / maxC) * 100}%`, minHeight: n > 0 ? 3 : 0 }}
              />
              <span className="font-mono text-[0.65rem] text-muted">{i}</span>
            </div>
          ))}
        </div>
        <p className="mt-4 text-sm text-muted">
          <strong className="text-text">{c.below5Pct}%</strong> rated below 5 ·{" "}
          <strong className="text-text">{c.below3Pct}%</strong> below 3 · {c.count} answered
        </p>
      </section>

      <section className="card p-6 sm:p-7">
        <h3 className="font-display text-lg sm:text-xl">How long they&apos;ve been planning</h3>
        <div className="mt-5 grid gap-3.5">
          {pulse.years.map((y) => {
            const top = Math.max(...pulse.years.map((x) => x.pct));
            const leading = y.pct === top && top > 0;
            return (
              <div key={y.value}>
                <div className="mb-1 flex items-baseline justify-between gap-3 text-sm">
                  <span className="text-muted">{y.label}</span>
                  <span className="nums font-display text-xl">
                    {y.pct}
                    <span className="ml-0.5 font-mono text-xs text-muted">%</span>
                  </span>
                </div>
                <div className="h-2.5 w-full overflow-hidden rounded-full bg-[var(--surface-2)]">
                  <div
                    className="h-full rounded-full transition-[width] duration-700 ease-out"
                    style={{
                      width: `${y.pct}%`,
                      backgroundColor: leading ? "var(--gold)" : "var(--anchor-hi)",
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>
        <p className="mt-4 text-sm text-muted">
          <strong className="text-text">{pulse.yearsTwoPlusPct}%</strong> have been at it 2+ years
        </p>
      </section>
    </div>
  );
}

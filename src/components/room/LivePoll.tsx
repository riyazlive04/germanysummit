"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { DIMENSIONS } from "@/lib/submission";
import { DIM_META } from "@/lib/dimensions";
import type { AnswerDistribution, QuestionDistribution } from "@/lib/aggregate";
import { formatISTTime } from "@/lib/datetime";

/**
 * /room/live - the big-screen, section-by-section answer reveal. Ameen walks the
 * five dimensions; at the end of each section this shows, live, the percentage
 * of the room that chose A / B / C / D for that section's two questions. Gated by
 * ADMIN_KEY, polls every few seconds.
 */

const POLL_MS = 5000;
const STORAGE_KEY = "room_admin_key";

type Data = AnswerDistribution & {
  generatedAt: string;
  sessionFilter: string | null;
};

type SessionFilter = "" | "pre_event" | "on_arrival" | "end_of_day";

const FILTERS: { value: SessionFilter; label: string }[] = [
  { value: "", label: "All" },
  { value: "pre_event", label: "Pre-event" },
  { value: "on_arrival", label: "On arrival" },
  { value: "end_of_day", label: "End of day" },
];

export default function LivePoll({ initialKey }: { initialKey?: string }) {
  const [key, setKey] = useState(initialKey ?? "");
  const [authed, setAuthed] = useState<boolean | null>(null);
  const [data, setData] = useState<Data | null>(null);
  const [filter, setFilter] = useState<SessionFilter>("");
  const [section, setSection] = useState(0); // 0..4 (the five dimensions)
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

  // Keyboard: arrow keys to advance sections (handy from a clicker on stage).
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "ArrowRight") setSection((s) => Math.min(s + 1, DIMENSIONS.length - 1));
      if (e.key === "ArrowLeft") setSection((s) => Math.max(s - 1, 0));
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

  const dim = DIMENSIONS[section];
  const meta = DIM_META[dim];
  // Two questions per dimension, in order: indexes 2*section, 2*section+1.
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
            href="/room"
            className="ml-1 rounded-lg border border-[var(--line)] px-3 py-1.5 text-xs text-muted transition-colors hover:text-gold"
          >
            Room →
          </Link>
        </div>
      </div>

      {/* Section header */}
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <span className="eyebrow">
            Section {section + 1} of {DIMENSIONS.length}
          </span>
          <h2 className="mt-1 font-display text-3xl sm:text-5xl">{meta.short}</h2>
          <p className="mt-2 max-w-2xl text-muted">{meta.whatItMeasures}</p>
        </div>
        <div className="flex items-center gap-1.5">
          {DIMENSIONS.map((d, i) => (
            <button
              key={d}
              onClick={() => setSection(i)}
              aria-label={`Section ${i + 1}`}
              className={`h-2.5 rounded-full transition-all ${
                i === section ? "w-7 bg-gold" : "w-2.5 bg-[var(--surface-2)] hover:bg-[var(--anchor-hi)]"
              }`}
            />
          ))}
        </div>
      </div>

      {/* The two questions */}
      {data && data.respondents === 0 ? (
        <div className="card grid place-items-center p-20 text-center">
          <p className="text-muted">No answers in this view yet.</p>
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-2">
          {qs.map((q) => (
            <QuestionCard key={q.id} q={q} />
          ))}
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
        <span className="label-mono">{meta.short}</span>
        <button
          onClick={() => setSection((s) => Math.min(s + 1, DIMENSIONS.length - 1))}
          disabled={section === DIMENSIONS.length - 1}
          className="btn-gold px-6 py-2.5 text-sm disabled:opacity-40"
        >
          Next section →
        </button>
      </div>
    </div>
  );
}

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

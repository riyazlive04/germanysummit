"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { QUESTIONS, TOTAL_QUESTIONS } from "@/lib/questions";
import { score, type ScoreResult } from "@/lib/scoring";
import { DIM_META } from "@/lib/dimensions";
import ResultView from "./ResultView";
import CaptureGate, { type Identity } from "./CaptureGate";

/**
 * The Reality Check flow: intro → 10 questions → (capture, if needed) → result.
 *
 * Capture: if FlexiFunnels passed an email (ff props), the gate is skipped and
 * we greet by first name; otherwise a minimal email gate runs before the result.
 * On reaching the result we persist to the shared Submission and fire the n8n
 * webhook in the background - the result ALWAYS renders, even if the save or
 * webhook fails (CONTEXT.md §8 / integration contract).
 */

type Phase = "intro" | "quiz" | "context" | "capture" | "result" | "locked";
type SaveStatus = "idle" | "saving" | "saved" | "error";

const YEARS_OPTIONS: { value: string; label: string }[] = [
  { value: "lt1", label: "Under 1 year" },
  { value: "1to2", label: "1 to 2 years" },
  { value: "2to3", label: "2 to 3 years" },
  { value: "gt3", label: "3+ years" },
];

export default function QuizFlow({
  ff,
  session,
  source,
}: {
  ff?: { name?: string; email?: string; phone?: string };
  session?: string;
  source?: string;
}) {
  const [phase, setPhase] = useState<Phase>("intro");
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<(number | null)[]>(
    Array(TOTAL_QUESTIONS).fill(null),
  );
  const [result, setResult] = useState<ScoreResult | null>(null);
  // Emotional-context inputs collected after the 10 questions (stage playbook).
  const [consistency, setConsistency] = useState<number | null>(null);
  const [yearsPlanning, setYearsPlanning] = useState<string | null>(null);
  // Event-day re-score: this person's previous answers, shown under each question.
  const [previousAnswers, setPreviousAnswers] = useState<number[] | null>(null);
  const [locked, setLocked] = useState(false);
  const [identity, setIdentity] = useState<Identity>({
    name: ff?.name,
    email: ff?.email ?? "",
    phone: ff?.phone,
  });
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const [checking, setChecking] = useState(false);

  const firstName = identity.name?.trim().split(/\s+/)[0];

  // Pre-check the retake lock for FlexiFunnels users (email known up front), so
  // someone who already took it lands on the locked screen instead of the quiz.
  useEffect(() => {
    if (!ff?.email) return;
    void fetchStatus(ff.email, ff.phone).then((s) => {
      if (s.locked) setPhase("locked");
      else if (s.previousAnswers) setPreviousAnswers(s.previousAnswers);
    });
    // run once on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  type Status = { locked: boolean; previousAnswers: number[] | null };

  async function fetchStatus(email: string, phone?: string): Promise<Status> {
    try {
      const res = await fetch("/api/reality-check/status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, phone }),
      });
      const data = await res.json();
      return {
        locked: !!data.locked,
        previousAnswers: Array.isArray(data.previousAnswers) ? data.previousAnswers : null,
      };
    } catch {
      return { locked: false, previousAnswers: null }; // fail open; server still gates on save
    }
  }

  async function save(finalAnswers: number[], id: Identity) {
    setSaveStatus("saving");
    try {
      const res = await fetch("/api/reality-check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...id,
          answers: finalAnswers,
          consistency,
          yearsPlanning,
          session: session ?? "pre_event",
          source: source ?? "reality-check",
        }),
      });
      const data = await res.json().catch(() => ({ ok: false }));
      // Server-side backstop: if the gate blocks it, hide the result.
      if (res.status === 403 && data.locked) {
        setPhase("locked");
        return;
      }
      setSaveStatus(res.ok && data.ok ? "saved" : "error");
    } catch {
      setSaveStatus("error");
    }
  }

  function reset() {
    setAnswers(Array(TOTAL_QUESTIONS).fill(null));
    setIndex(0);
    setResult(null);
    setConsistency(null);
    setYearsPlanning(null);
    setPreviousAnswers(null);
    setLocked(false);
    setSaveStatus("idle");
    setPhase("intro");
  }

  // Identify BEFORE the quiz: if we already have an email (FlexiFunnels), check
  // the lock now; otherwise collect email/phone first. This way a returning or
  // locked person is recognized up front and never re-answers the questions.
  async function beginQuiz() {
    // All three identity fields are required. Only skip the capture gate when a
    // FlexiFunnels pass-through already gave us name, email, AND phone.
    const phoneDigits = (identity.phone ?? "").replace(/\D/g, "");
    if (identity.name?.trim() && identity.email && phoneDigits.length >= 10) {
      setChecking(true);
      const s = await fetchStatus(identity.email, identity.phone);
      setChecking(false);
      if (s.locked) {
        setPhase("locked");
      } else {
        setPreviousAnswers(s.previousAnswers);
        setPhase("quiz");
      }
    } else {
      setPhase("capture");
    }
  }

  // By the time the quiz finishes, the email is already captured and the lock
  // already cleared - so just compute, show, and save.
  function finish(finalAnswers: number[]) {
    const r = score(finalAnswers);
    setResult(r);
    setPhase("result");
    void save(finalAnswers, identity);
  }

  function select(points: number) {
    if (locked) return;
    const next = [...answers];
    next[index] = points;
    setAnswers(next);
    setLocked(true);

    window.setTimeout(() => {
      if (index < TOTAL_QUESTIONS - 1) {
        setIndex(index + 1);
        setLocked(false);
      } else {
        // After the last scored question, collect the two context inputs.
        setPhase("context");
        setLocked(false);
      }
    }, 150);
  }

  function submitContext() {
    if (consistency === null || !yearsPlanning) return;
    void finish(answers as number[]);
  }

  function back() {
    if (index === 0) {
      setPhase("intro");
      return;
    }
    setIndex(index - 1);
    setLocked(false);
  }

  // ── Intro ────────────────────────────────────────────────────────────────
  if (phase === "intro") {
    return (
      <div className="mx-auto max-w-2xl animate-rise py-14">
        <span className="eyebrow">Module 01 · The Reality Check</span>
        <h1 className="mt-5 font-display text-[2.4rem] leading-[1.02] sm:text-6xl">
          {firstName ? (
            <>
              {firstName}, where do you actually stand on{" "}
              <span className="text-gold">Germany</span>?
            </>
          ) : (
            <>
              Where do you actually stand on{" "}
              <span className="text-gold">Germany</span>?
            </>
          )}
        </h1>
        <p className="mt-6 text-lg leading-relaxed text-muted">
          Ten honest questions across the five dimensions that decide whether a
          German recruiter calls back. No motivation, no flattery - a mirror, and
          a clear picture of the one thing to fix first.
        </p>
        <ul className="mt-8 grid gap-3 text-[15px]">
          {[
            "Takes about 90 seconds",
            "A 0-100 Germany Readiness Score + your pentagon radar",
            "Answer honestly - it only helps if it's true",
          ].map((t) => (
            <li key={t} className="flex items-center gap-3">
              <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-[var(--anchor)] text-xs text-gold">
                ✓
              </span>
              <span className="text-muted">{t}</span>
            </li>
          ))}
        </ul>
        <button
          onClick={beginQuiz}
          disabled={checking}
          className="btn-gold mt-10 px-8 py-4 text-[15px] disabled:opacity-60"
        >
          {checking ? "Checking…" : "Start the Reality Check →"}
        </button>
      </div>
    );
  }

  // ── Capture (email gate, BEFORE the quiz) ─────────────────────────────────
  if (phase === "capture") {
    return (
      <CaptureGate
        defaults={identity}
        onSubmit={async (id) => {
          setIdentity(id);
          const s = await fetchStatus(id.email, id.phone);
          if (s.locked) {
            setPhase("locked");
            return;
          }
          setPreviousAnswers(s.previousAnswers);
          setPhase("quiz");
        }}
      />
    );
  }

  // ── Locked (already taken; retake is admin-controlled) ────────────────────
  if (phase === "locked") {
    const lookupHref = identity.email
      ? `/my-results?email=${encodeURIComponent(identity.email)}`
      : "/my-results";
    return (
      <div className="mx-auto max-w-xl animate-rise py-16 text-center">
        <span className="eyebrow">Already completed</span>
        <h1 className="mt-4 font-display text-4xl sm:text-5xl">
          You&apos;ve taken your Reality Check.
        </h1>
        <p className="mt-5 text-[15px] leading-relaxed text-muted">
          Everyone takes the readiness score once. To see your score, archetype,
          and plan, look up your result below. Need to retake it? The team can
          re-enable it for you.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link href={lookupHref} className="btn-gold px-7 py-3.5 text-[15px]">
            View my result →
          </Link>
          <Link href="/" className="btn btn-ghost px-6 py-3.5 text-[15px]">
            Back to start
          </Link>
        </div>
      </div>
    );
  }

  // ── Result ─────────────────────────────────────────────────────────────────
  if (phase === "result" && result) {
    return (
      <div className="animate-rise py-8">
        <ResultView result={result} onRestart={reset} />
        <DeliveryNote status={saveStatus} hasPhone={!!identity.phone} />
      </div>
    );
  }

  // ── Context (consistency + years, after the 10 questions) ─────────────────
  if (phase === "context") {
    return (
      <div className="mx-auto max-w-2xl animate-rise py-12">
        <span className="eyebrow">Last two — be honest</span>
        <h1 className="mt-4 font-display text-3xl leading-tight sm:text-4xl">
          Before your score, two honest reads.
        </h1>

        {/* Consistency 0-10 */}
        <div className="mt-9">
          <p className="font-display text-xl leading-snug">
            Over the last 6 months, how consistent have you been with your Germany
            plan?
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            {Array.from({ length: 11 }, (_, n) => (
              <button
                key={n}
                onClick={() => setConsistency(n)}
                className={`nums h-11 w-11 rounded-xl border-2 font-display text-lg transition-all ${
                  consistency === n
                    ? "border-gold bg-gold text-gold-ink"
                    : "border-[var(--line)] text-muted hover:border-[var(--anchor-hi)]"
                }`}
              >
                {n}
              </button>
            ))}
          </div>
          <div className="mt-2 flex justify-between text-xs text-muted">
            <span>0 — barely touched it</span>
            <span>10 — every single week</span>
          </div>
        </div>

        {/* Years planning */}
        <div className="mt-9">
          <p className="font-display text-xl leading-snug">
            How long have you been planning a German career?
          </p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {YEARS_OPTIONS.map((o) => (
              <button
                key={o.value}
                onClick={() => setYearsPlanning(o.value)}
                className={`rounded-[14px] border-2 p-4 text-left text-[15px] transition-all ${
                  yearsPlanning === o.value
                    ? "border-gold bg-[var(--gold-glow)] font-medium text-text"
                    : "border-[var(--line)] text-muted hover:border-[var(--anchor-hi)]"
                }`}
              >
                {o.label}
              </button>
            ))}
          </div>
        </div>

        <button
          onClick={submitContext}
          disabled={consistency === null || !yearsPlanning}
          className="btn-gold mt-10 px-8 py-4 text-[15px] disabled:opacity-50"
        >
          See my Readiness Score →
        </button>
      </div>
    );
  }

  // ── Quiz ─────────────────────────────────────────────────────────────────
  const q = QUESTIONS[index];
  const progress = ((index + 1) / TOTAL_QUESTIONS) * 100;
  const selected = answers[index];

  return (
    <div className="mx-auto max-w-2xl py-10">
      {/* Progress */}
      <div className="mb-9">
        <div className="mb-2.5 flex items-center justify-between">
          <span className="eyebrow !text-gold-deep">{DIM_META[q.dimension].short}</span>
          <span className="nums font-mono text-xs text-muted">
            {String(index + 1).padStart(2, "0")} / {TOTAL_QUESTIONS}
          </span>
        </div>
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-[var(--surface-2)]">
          <div
            className="h-full rounded-full bg-gold transition-[width] duration-500 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Question - re-keyed so it re-runs the rise animation each step */}
      <div key={index} className="animate-rise">
        <h2 className="font-display text-[1.7rem] leading-tight sm:text-4xl">
          {q.prompt}
        </h2>

        <div className="mt-8 grid gap-3">
          {q.options.map((opt, i) => {
            const isSelected = selected === opt.points;
            const letter = String.fromCharCode(65 + i); // A, B, C, D
            return (
              <button
                key={opt.label}
                onClick={() => select(opt.points)}
                disabled={locked}
                className={`group flex items-center gap-3.5 rounded-[14px] border-2 p-5 text-left transition-all disabled:cursor-default ${
                  isSelected
                    ? "border-gold bg-[var(--gold-glow)]"
                    : "border-[var(--line)] bg-surface hover:border-[var(--anchor-hi)] hover:bg-surface-2"
                }`}
              >
                {/* Letter badge (A-D): the shared reference for the live room reveal. */}
                <span
                  className={`grid h-7 w-7 shrink-0 place-items-center rounded-full border-2 font-mono text-xs font-bold transition-colors ${
                    isSelected
                      ? "border-gold bg-gold text-gold-ink"
                      : "border-muted text-muted group-hover:border-gold"
                  }`}
                >
                  {letter}
                </span>
                <span
                  className={`text-[15px] ${isSelected ? "font-medium text-text" : "text-muted"}`}
                >
                  {opt.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Event-day re-score: the answer this person gave earlier */}
      {previousAnswers &&
        (() => {
          const prev = previousAnswers[index];
          const optIdx = q.options.findIndex((o) => o.points === prev);
          if (optIdx < 0) return null;
          const letter = String.fromCharCode(65 + optIdx);
          return (
            <div className="mt-7 rounded-[14px] border border-dashed border-[var(--gold-deep)] bg-[var(--gold-glow)] p-4">
              <span className="label-mono !text-gold-deep">Your earlier answer</span>
              <p className="mt-1.5 flex items-start gap-2 text-sm">
                <span className="font-mono font-bold text-gold-deep">{letter}</span>
                <span className="text-text">{q.options[optIdx].label}</span>
              </p>
            </div>
          );
        })()}

      {/* Back */}
      <div className="mt-9">
        <button
          onClick={back}
          className="text-sm font-medium text-muted transition-colors hover:text-text"
        >
          ← Back
        </button>
      </div>
    </div>
  );
}

/** Subtle, non-blocking confirmation that the result was saved / will be sent. */
function DeliveryNote({
  status,
  hasPhone,
}: {
  status: SaveStatus;
  hasPhone: boolean;
}) {
  if (status === "idle") return null;

  const map: Record<Exclude<SaveStatus, "idle">, { dot: string; text: string }> =
    {
      saving: { dot: "var(--muted)", text: "Saving your result…" },
      saved: {
        dot: "var(--green)",
        text: hasPhone
          ? "Saved. Your summary is on its way to WhatsApp."
          : "Saved. Your result is recorded for the summit.",
      },
      error: {
        dot: "var(--gold)",
        text: "Your result is shown above - we'll retry delivery in the background.",
      },
    };
  const m = map[status];

  return (
    <div className="mx-auto mt-6 flex max-w-md items-center justify-center gap-2 text-xs text-muted">
      <span
        className="h-1.5 w-1.5 rounded-full"
        style={{ backgroundColor: m.dot }}
      />
      {m.text}
    </div>
  );
}

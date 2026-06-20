"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

/**
 * /feedback - the closing "two-minute" survey, rebuilt from the Google Form as a
 * branded, on-stage-friendly page that ends the event on a warm note.
 *
 * Six questions (four required), then a celebratory thank-you state. Posts to
 * /api/feedback, which persists the row and best-effort fires the n8n webhook.
 * The navbar CTA is hidden so the page reads as a clean closing moment.
 */

type PlanStuck = "lt3m" | "3to12m" | "1to2y" | "gt2y";
type Guided = "enrolled" | "interested" | "need_time" | "not_for_me";

const PLAN_OPTIONS: { value: PlanStuck; label: string }[] = [
  { value: "lt3m", label: "Less than 3 months" },
  { value: "3to12m", label: "3 to 12 months" },
  { value: "1to2y", label: "1 to 2 years" },
  { value: "gt2y", label: "More than 2 years" },
];

const GUIDED_OPTIONS: { value: Guided; label: string }[] = [
  { value: "enrolled", label: "Yes — I enrolled" },
  { value: "interested", label: "Yes — interested, still thinking" },
  { value: "need_time", label: "Not yet — need more time" },
  { value: "not_for_me", label: "Not for me right now" },
];

export default function FeedbackForm() {
  const [nps, setNps] = useState<number | null>(null);
  const [valuable, setValuable] = useState("");
  const [improve, setImprove] = useState("");
  const [planStuck, setPlanStuck] = useState<PlanStuck | null>(null);
  const [guided, setGuided] = useState<Guided | null>(null);
  const [rating, setRating] = useState<number | null>(null);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");

  const [phase, setPhase] = useState<"form" | "done">("form");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // Hide the navbar's "Start free" CTA - this is a closing page, not a funnel.
  useEffect(() => {
    if (typeof document === "undefined") return;
    const root = document.documentElement;
    root.setAttribute("data-hide-cta", "true");
    return () => root.removeAttribute("data-hide-cta");
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (nps === null) return fail("Pick how likely you are to recommend the summit.");
    if (!planStuck) return fail("Tell us how long your Germany plan had been stuck.");
    if (!guided) return fail("Tell us about your Guided Mode decision.");
    if (rating === null) return fail("Give today's summit an overall rating.");

    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nps,
          rating,
          planStuck,
          guided,
          valuable: valuable.trim() || undefined,
          improve: improve.trim() || undefined,
          name: name.trim() || undefined,
          phone: phone.trim() || undefined,
          source: "feedback",
        }),
      });
      const data = await res.json().catch(() => ({ ok: false }));
      if (res.ok && data.ok) {
        setPhase("done");
        window.scrollTo({ top: 0, behavior: "smooth" });
      } else {
        fail(data.error || "Something went wrong. Please try again.");
      }
    } catch {
      fail("Network error. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  function fail(msg: string) {
    setError(msg);
  }

  // ── Closing note ────────────────────────────────────────────────────────────
  if (phase === "done") {
    return (
      <div className="animate-rise py-10 sm:py-16">
        <section className="relative overflow-hidden rounded-3xl bg-[var(--anchor)] px-6 py-16 text-center sm:px-12 sm:py-20">
          <span className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-[var(--gold-glow)] blur-2xl" />
          <span className="pointer-events-none absolute -bottom-20 -left-12 h-56 w-56 rounded-full bg-[var(--gold-glow)] blur-2xl" />

          <span className="relative mx-auto grid h-16 w-16 place-items-center rounded-full border border-[color:rgba(240,180,41,0.35)] bg-[color:rgba(0,0,0,0.25)] text-3xl text-gold">
            ✓
          </span>
          <span className="eyebrow mt-6 block !text-gold-soft">Germany Career Summit 2026</span>
          <h1 className="mt-3 font-display text-4xl leading-[1.05] text-on-anchor sm:text-5xl">
            Thank you.
          </h1>
          <p className="mx-auto mt-4 max-w-lg text-[15px] leading-relaxed text-[color:rgba(245,242,234,0.78)] sm:text-base">
            Your honest words just made the next summit better. And this isn&apos;t the
            end of anything — it&apos;s <span className="text-gold">day one</span> of your
            Germany plan. You walked in with a dream; you&apos;re walking out with a system.
          </p>
          <p className="mx-auto mt-5 max-w-md font-display text-lg text-on-anchor">
            See you in Germany. 🇩🇪
          </p>
          <p className="mt-1 text-xs text-[color:rgba(245,242,234,0.55)]">
            — Ameen &amp; the B2 Consultants team
          </p>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Link href="/pre-order" className="btn-gold px-6 py-3 text-sm">
              Get The Secret Playbook →
            </Link>
            <Link
              href="/my-results"
              className="rounded-xl border border-[color:rgba(245,242,234,0.2)] px-6 py-3 text-sm text-on-anchor transition-colors hover:border-gold hover:text-gold"
            >
              See my results
            </Link>
          </div>
        </section>
      </div>
    );
  }

  // ── The form ────────────────────────────────────────────────────────────────
  return (
    <div className="animate-rise py-8 sm:py-10">
      {/* Intro */}
      <header className="mb-8 text-center">
        <span className="eyebrow">Germany Career Summit 2026</span>
        <h1 className="mt-3 font-display text-3xl leading-tight sm:text-4xl">
          Before you go — <span className="text-gold">two minutes.</span>
        </h1>
        <p className="mx-auto mt-3 max-w-xl text-[15px] leading-relaxed text-muted">
          Your honest answer helps us make the next summit better. No wrong answers —
          just tell us the truth.
        </p>
      </header>

      <form onSubmit={submit} noValidate className="grid gap-4">
        {/* 1 · NPS */}
        <Field n={1} required label="How likely are you to recommend this summit to a friend or colleague?">
          <Scale
            min={0}
            max={10}
            value={nps}
            onChange={setNps}
            lowLabel="Not at all"
            highLabel="Absolutely"
          />
        </Field>

        {/* 2 · Most valuable */}
        <Field n={2} label="What was the most valuable part of today for you?">
          <textarea
            value={valuable}
            onChange={(e) => setValuable(e.target.value)}
            rows={3}
            maxLength={2000}
            placeholder="The moment, session, or insight that landed…"
            className="input w-full resize-y"
          />
        </Field>

        {/* 3 · Could be better */}
        <Field n={3} label="What could have been better?">
          <textarea
            value={improve}
            onChange={(e) => setImprove(e.target.value)}
            rows={3}
            maxLength={2000}
            placeholder="Be candid — this is how we improve."
            className="input w-full resize-y"
          />
        </Field>

        {/* 4 · Plan stuck */}
        <Field n={4} required label="Before today, how long had your Germany plan been stuck?">
          <Choices
            options={PLAN_OPTIONS}
            value={planStuck}
            onChange={(v) => {
              setPlanStuck(v);
              setError(null);
            }}
          />
        </Field>

        {/* 5 · Guided Mode decision */}
        <Field n={5} required label="Did you make a decision about Guided Mode today?">
          <Choices
            options={GUIDED_OPTIONS}
            value={guided}
            onChange={(v) => {
              setGuided(v);
              setError(null);
            }}
          />
        </Field>

        {/* 6 · Overall rating */}
        <Field n={6} required label="Overall, how would you rate today's summit?">
          <Scale
            min={1}
            max={10}
            value={rating}
            onChange={setRating}
            lowLabel="Poor"
            highLabel="Outstanding"
          />
        </Field>

        {/* Optional follow-up */}
        <Field n={7} label="Your name and WhatsApp number">
          <p className="-mt-1 mb-3 text-xs text-muted">
            Optional — only if you&apos;d like us to follow up with you personally.
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="First name"
              className="input w-full"
              autoComplete="given-name"
            />
            <input
              type="tel"
              inputMode="numeric"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="WhatsApp number"
              className="input w-full"
              autoComplete="tel"
            />
          </div>
        </Field>

        {error && (
          <p className="rounded-lg border border-[color:rgba(224,83,61,0.4)] bg-[color:rgba(224,83,61,0.08)] px-4 py-3 text-sm text-red">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={busy}
          className="btn-gold mt-1 px-7 py-3.5 text-[15px] disabled:opacity-60"
        >
          {busy ? "Sending…" : "Send feedback →"}
        </button>
        <p className="text-center text-xs text-muted">
          Takes 2 minutes · your answers are private.
        </p>
      </form>
    </div>
  );
}

/** A numbered question block with an optional required marker. */
function Field({
  n,
  label,
  required,
  children,
}: {
  n: number;
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <section className="card p-5 sm:p-6">
      <div className="mb-4 flex gap-3">
        <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full border border-[var(--line)] font-mono text-xs text-gold">
          {n}
        </span>
        <h2 className="text-[15px] font-medium leading-snug sm:text-base">
          {label}
          {required && <span className="ml-1 text-gold">*</span>}
        </h2>
      </div>
      {children}
    </section>
  );
}

/** A 0–10 / 1–10 numeric scale with endpoint captions. */
function Scale({
  min,
  max,
  value,
  onChange,
  lowLabel,
  highLabel,
}: {
  min: number;
  max: number;
  value: number | null;
  onChange: (n: number) => void;
  lowLabel: string;
  highLabel: string;
}) {
  const nums = Array.from({ length: max - min + 1 }, (_, i) => min + i);
  // 0–10 → 6 per row on mobile, all 11 on desktop. 1–10 → 5 then 10.
  const cols = nums.length === 11 ? "grid-cols-6 sm:grid-cols-11" : "grid-cols-5 sm:grid-cols-10";
  return (
    <div>
      <div className={`grid gap-1.5 ${cols}`}>
        {nums.map((n) => {
          const active = value === n;
          return (
            <button
              key={n}
              type="button"
              onClick={() => onChange(n)}
              aria-pressed={active}
              className={`nums grid aspect-square place-items-center rounded-lg border text-sm font-medium transition-colors ${
                active
                  ? "border-gold bg-gold text-gold-ink"
                  : "border-[var(--line)] text-muted hover:border-gold hover:text-gold"
              }`}
            >
              {n}
            </button>
          );
        })}
      </div>
      <div className="mt-2 flex justify-between text-xs text-muted">
        <span>{lowLabel}</span>
        <span>{highLabel}</span>
      </div>
    </div>
  );
}

/** Single-select option cards. */
function Choices<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { value: T; label: string }[];
  value: T | null;
  onChange: (v: T) => void;
}) {
  return (
    <div className="grid gap-2 sm:grid-cols-2">
      {options.map((o) => {
        const active = value === o.value;
        return (
          <button
            key={o.value}
            type="button"
            onClick={() => onChange(o.value)}
            aria-pressed={active}
            className={`flex items-center gap-3 rounded-xl border px-4 py-3 text-left text-sm transition-colors ${
              active
                ? "border-gold bg-[var(--gold-glow)] text-text"
                : "border-[var(--line)] text-muted hover:border-gold hover:text-text"
            }`}
          >
            <span
              className={`grid h-4 w-4 shrink-0 place-items-center rounded-full border-2 ${
                active ? "border-gold" : "border-[var(--line)]"
              }`}
            >
              {active && <span className="h-2 w-2 rounded-full bg-gold" />}
            </span>
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

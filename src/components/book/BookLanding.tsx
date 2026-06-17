"use client";

import { useEffect, useState } from "react";
import { isValidEmail } from "@/lib/validate";

/**
 * Compact sales landing for "The Secret Playbook" - a free, email-gated PDF.
 *
 * One hero (hook + capture form over the brand anchor panel, with Ameen
 * presenting the book), a slim credibility strip, and a tight "what's inside"
 * list. On submit we tag the lead via /api/playbook and start the download;
 * the success state is just the link.
 */

const FILE_NAME = "The-Secret-Playbook.pdf";

const STATS = [
  { n: "617,000", label: "jobs unfilled in Germany, 2026" },
  { n: "90,000", label: "skilled-worker visas/yr for Indians" },
  { n: "~11 sec", label: "a recruiter spends on your CV" },
  { n: "80–85%", label: "placement with a structured approach" },
];

const INSIDE = [
  { t: "The Germany Hiring Pyramid", d: "how employers really evaluate you" },
  { t: "The Impact Bullet Formula", d: "a Lebenslauf that earns interview calls" },
  { t: "LinkedIn & Xing visibility", d: "surface in recruiter searches" },
  { t: "The four job markets", d: "work the channels nobody else does" },
  { t: "Inside the German interview", d: "the S.A.R. method + all 14 questions" },
  { t: "Salary, Blue Card & the 90-day plan", d: "benchmarks, scripts, visa pathways" },
];

export default function BookLanding({
  ff,
  session,
  source,
}: {
  ff?: { name?: string; email?: string; phone?: string };
  session?: string;
  source?: string;
}) {
  const [name, setName] = useState(ff?.name ?? "");
  const [email, setEmail] = useState(ff?.email ?? "");
  const [phase, setPhase] = useState<"form" | "done">("form");
  const [file, setFile] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // Hide the navbar's "Start free" CTA on this page - it points to the Reality
  // Check and only distracts from the download. The Header lives outside this
  // tree, so we coordinate through a data attribute on <html> (see globals.css).
  useEffect(() => {
    if (typeof document === "undefined") return;
    const root = document.documentElement;
    root.setAttribute("data-hide-cta", "true");
    return () => root.removeAttribute("data-hide-cta");
  }, []);

  function triggerDownload(href: string) {
    const a = document.createElement("a");
    a.href = href;
    a.download = FILE_NAME;
    document.body.appendChild(a);
    a.click();
    a.remove();
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = email.trim().toLowerCase();
    if (!isValidEmail(trimmed)) {
      setError("Enter a valid email to get the book.");
      return;
    }
    setBusy(true);
    try {
      const res = await fetch("/api/playbook", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: trimmed,
          name: name.trim() || undefined,
          phone: ff?.phone,
          session,
          source: source ?? "book",
        }),
      });
      const data = await res.json().catch(() => ({ ok: false }));
      if (res.ok && data.ok && data.file) {
        setFile(data.file);
        setPhase("done");
        triggerDownload(data.file);
      } else {
        setError(data.error || "Something went wrong. Please try again.");
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  // ── Success: just the link ──────────────────────────────────────────────────
  if (phase === "done" && file) {
    return (
      <div className="mx-auto max-w-md animate-rise py-24 text-center">
        <span className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-[var(--anchor)] text-2xl text-gold">
          ✓
        </span>
        <h1 className="mt-5 font-display text-3xl sm:text-4xl">Here&apos;s your book.</h1>
        <a
          href={file}
          download={FILE_NAME}
          onClick={() => triggerDownload(file)}
          className="btn-gold mt-6 inline-flex px-7 py-3.5 text-sm"
        >
          ↓ Download The Secret Playbook
        </a>
        <p className="mt-3 text-xs text-muted">Didn&apos;t start automatically? Tap the button.</p>
      </div>
    );
  }

  const captureForm = (
    <form onSubmit={submit} noValidate className="grid gap-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="First name (optional)"
          className="input w-full"
          autoComplete="given-name"
        />
        <input
          type="email"
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
            setError(null);
          }}
          placeholder="you@email.com"
          className="input w-full"
          autoComplete="email"
          required
        />
      </div>
      {error && <p className="text-sm text-red">{error}</p>}
      <button
        type="submit"
        disabled={busy}
        className="btn-gold px-7 py-3.5 text-[15px] disabled:opacity-60"
      >
        {busy ? "Preparing your download…" : "Get the book (free)↓"}
      </button>
      <p className="text-xs text-muted">
        Instant PDF · 14 chapters · no spam.
      </p>
    </form>
  );

  return (
    <div className="animate-rise">
      {/* Hero - fills the viewport below the sticky header so the whole banner is
          visible without scrolling; degrades gracefully (grows) on short screens. */}
      <section className="relative mb-10 mt-4 overflow-hidden rounded-3xl bg-[var(--anchor)]">
        <div className="grid items-stretch gap-2 lg:min-h-[calc(100svh-92px)] lg:grid-cols-[1.05fr_0.95fr]">
          {/* Copy + capture form, vertically centered */}
          <div className="relative z-10 flex flex-col justify-center px-6 py-8 sm:px-10 sm:py-10">
            <span className="eyebrow !text-gold-soft">Free download · Germany Career Summit 2026</span>
            <h1 className="mt-3 font-display text-[1.95rem] leading-[1.04] tracking-tight text-on-anchor sm:text-[2.6rem] lg:text-5xl">
              The Secret <span className="text-gold">Playbook</span> to crack the Germany job market.
            </h1>
            <p className="mt-3 max-w-xl text-[14px] leading-relaxed text-[color:rgba(245,242,234,0.74)] sm:text-base">
              You sent 150 applications and heard nothing. The problem isn&apos;t your
              experience - it&apos;s that Germany can&apos;t see it. Ameen&apos;s
              inside-Germany system, free in one PDF.
            </p>

            <div className="card mt-5 max-w-md p-5">{captureForm}</div>

            <p className="mt-3 text-xs text-[color:rgba(245,242,234,0.6)]">
              By Ameen · Founder, B2 Consultants · 350+ engineers coached into Germany.
            </p>
          </div>

          {/* Transparent figure: fixed compact height on mobile, fills the band on desktop */}
          <div className="relative h-[260px] w-full sm:h-[320px] lg:h-auto">
            <div
              className="absolute inset-0 bg-contain bg-bottom bg-no-repeat lg:bg-right-bottom"
              style={{ backgroundImage: "url('/brand/ameen-book.png')" }}
            />
          </div>
        </div>
      </section>

      {/* Slim credibility strip */}
      <section className="mb-10 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {STATS.map((s) => (
          <div key={s.label} className="card p-4">
            <div className="nums font-display text-2xl text-gold">{s.n}</div>
            <p className="mt-1 text-[12px] leading-snug text-muted">{s.label}</p>
          </div>
        ))}
      </section>

      {/* What's inside - tight list */}
      <section className="pb-14">
        <span className="eyebrow">What&apos;s inside</span>
        <h2 className="mt-3 font-display text-2xl sm:text-3xl">14 chapters. One complete system.</h2>
        <ul className="mt-6 grid gap-x-8 gap-y-2.5 sm:grid-cols-2">
          {INSIDE.map((it) => (
            <li key={it.t} className="flex gap-2.5 border-b border-[var(--line)] pb-2.5 text-[14px]">
              <span className="mt-0.5 text-gold">→</span>
              <span>
                <span className="font-medium">{it.t}</span>
                <span className="text-muted"> — {it.d}</span>
              </span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

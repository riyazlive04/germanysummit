"use client";

import { useEffect } from "react";

/**
 * Pre-order landing for "The Secret Playbook" - a paid pre-order that checks out
 * on Razorpay (no email gate; payment captures the buyer).
 *
 * Mirrors the free /book page's visual system - one anchor-panel hero with Ameen
 * presenting the book, a slim credibility strip, and a tight "what's inside"
 * list - but the CTA is an external link to the Razorpay checkout instead of a
 * download form. A second presenting photo anchors the closing pre-order band.
 */

const CHECKOUT_URL = "https://rzp.io/rzp/gcs-secret-book";

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

export default function PreOrderLanding() {
  // Hide the navbar's "Start free" CTA on this page - it points to the Reality
  // Check and only distracts from the pre-order. The Header lives outside this
  // tree, so we coordinate through a data attribute on <html> (see globals.css).
  useEffect(() => {
    if (typeof document === "undefined") return;
    const root = document.documentElement;
    root.setAttribute("data-hide-cta", "true");
    return () => root.removeAttribute("data-hide-cta");
  }, []);

  const ctaButton = (
    <a
      href={CHECKOUT_URL}
      target="_blank"
      rel="noopener noreferrer"
      className="btn-gold inline-flex items-center justify-center px-7 py-3.5 text-[15px]"
    >
      Pre-order now →
    </a>
  );

  return (
    <div className="animate-rise">
      {/* Hero - fills the viewport below the sticky header so the whole banner is
          visible without scrolling; degrades gracefully (grows) on short screens. */}
      <section className="relative mb-10 mt-4 overflow-hidden rounded-3xl bg-[var(--anchor)]">
        <div className="grid items-stretch gap-2 lg:min-h-[calc(100svh-92px)] lg:grid-cols-[1.05fr_0.95fr]">
          {/* Copy + CTA, vertically centered */}
          <div className="relative z-10 flex flex-col justify-center px-6 py-8 sm:px-10 sm:py-10">
            <span className="eyebrow !text-gold-soft">Pre-order · Germany Career Summit 2026</span>
            <h1 className="mt-3 font-display text-[1.95rem] leading-[1.04] tracking-tight text-on-anchor sm:text-[2.6rem] lg:text-5xl">
              The Secret <span className="text-gold">Playbook</span> to crack the Germany job market.
            </h1>
            <p className="mt-3 max-w-xl text-[14px] leading-relaxed text-[color:rgba(245,242,234,0.74)] sm:text-base">
              Your path to the right future starts here. Ameen&apos;s
              inside-Germany system - the exact method that gets Indian engineers
              seen, shortlisted, and hired - in one book. Reserve your copy now.
            </p>

            <div className="card mt-5 max-w-md p-5">
              <div className="flex flex-col gap-3">
                {ctaButton}
                <p className="text-xs text-muted">
                  Secure checkout via Razorpay · 14 chapters · ships 20 days from now.
                </p>
              </div>
            </div>

            <p className="mt-3 text-xs text-[color:rgba(245,242,234,0.6)]">
              By Ameen · Founder, B2 Consultants · 350+ engineers coached into Germany.
            </p>
          </div>

          {/* Transparent figure: fixed compact height on mobile, fills the band on desktop */}
          <div className="relative h-[300px] w-full sm:h-[380px] lg:h-auto">
            <div
              className="absolute inset-0 bg-contain bg-bottom bg-no-repeat lg:[background-position:55%_100%]"
              style={{ backgroundImage: "url('/brand/ameen-preorder-1.png')" }}
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
      <section className="pb-12">
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

      {/* Closing pre-order band - presenting photo + final CTA */}
      <section className="mb-14 overflow-hidden rounded-3xl bg-[var(--anchor)]">
        <div className="grid items-center gap-2 lg:grid-cols-[0.95fr_1.05fr]">
          {/* Presenting figure */}
          <div className="relative h-[280px] w-full sm:h-[360px] lg:h-[440px]">
            <div
              className="absolute inset-0 bg-contain bg-bottom bg-no-repeat lg:[background-position:45%_100%]"
              style={{ backgroundImage: "url('/brand/ameen-preorder-2.png')" }}
            />
          </div>

          <div className="flex flex-col justify-center px-6 py-8 sm:px-10 sm:py-12">
            <span className="eyebrow !text-gold-soft">20 days from now</span>
            <h2 className="mt-3 font-display text-2xl text-on-anchor sm:text-3xl lg:text-4xl">
              Reserve your copy before it ships.
            </h2>
            <p className="mt-3 max-w-md text-[14px] leading-relaxed text-[color:rgba(245,242,234,0.74)] sm:text-base">
              Stop sending applications into the black hole. Pre-order The Secret
              Playbook and walk into the German job market with a system, not hope.
            </p>
            <div className="mt-6">{ctaButton}</div>
          </div>
        </div>
      </section>
    </div>
  );
}

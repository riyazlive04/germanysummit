"use client";

import { useState } from "react";
import Link from "next/link";
import ResultView from "@/components/reality-check/ResultView";
import CvResult from "@/components/cv-lab/CvResult";
import LinkedinResult from "@/components/cv-lab/LinkedinResult";
import RoadmapTimeline from "@/components/roadmap/RoadmapTimeline";
import type { ScoreResult, Tier } from "@/lib/scoring";
import type { CvReview } from "@/lib/cv";
import type { LinkedinReview } from "@/lib/linkedin";
import type { DecodedSubmission, Dimension } from "@/lib/submission";

/**
 * Audience self-service: enter your email (+ phone if you registered one) and see
 * your own saved result - the readiness score/archetype, CV diagnosis, and
 * 90-day roadmap, whichever you've completed. Read-only; no retaking here.
 */
export default function MyResultsView({
  defaultEmail,
}: {
  defaultEmail?: string;
}) {
  const [email, setEmail] = useState(defaultEmail ?? "");
  const [phone, setPhone] = useState("");
  const [needsPhone, setNeedsPhone] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sub, setSub] = useState<DecodedSubmission | null>(null);

  async function lookup() {
    setError(null);
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setError("Enter the email you used.");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/my-results", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), phone: phone.trim() || undefined }),
      });
      const data = await res.json();
      if (res.ok && data.ok) {
        setSub(data.submission);
      } else {
        setError(data.error || "Could not find your result.");
        setNeedsPhone(!!data.needsPhone);
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  // ── Result view ────────────────────────────────────────────────────────────
  if (sub) {
    const score: ScoreResult | null =
      sub.totalScore != null && sub.dimScores
        ? {
            dimScores: sub.dimScores,
            totalScore: sub.totalScore,
            tier: (sub.tier ?? "") as Tier,
            weakestDim: (sub.weakestDim ?? "Profile") as Dimension,
            archetype: sub.archetype ?? "",
          }
        : null;

    const cv: CvReview | null =
      sub.cvAtsScore != null && sub.cvGaps
        ? { cvAtsScore: sub.cvAtsScore, ...sub.cvGaps }
        : null;

    const li: LinkedinReview | null =
      sub.linkedinScore != null && sub.linkedinReview
        ? { visibilityScore: sub.linkedinScore, ...sub.linkedinReview }
        : null;

    const first = sub.name?.trim().split(/\s+/)[0];

    return (
      <div className="animate-rise py-10">
        <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <div>
            <span className="eyebrow">Your saved result</span>
            <h1 className="mt-2 font-display text-3xl sm:text-4xl">
              {first ? `Welcome back, ${first}.` : "Welcome back."}
            </h1>
          </div>
          <button
            onClick={() => {
              setSub(null);
              setPhone("");
            }}
            className="btn btn-ghost px-4 py-2 text-sm"
          >
            Look up another
          </button>
        </div>

        {score && (
          <section className="mb-12">
            <ResultView result={score} />
          </section>
        )}

        {cv && (
          <section className="mb-12">
            <h2 className="mb-5 font-display text-2xl">CV diagnosis</h2>
            <CvResult review={cv} />
          </section>
        )}

        {li && (
          <section className="mb-12">
            <h2 className="mb-5 font-display text-2xl">LinkedIn optimizer</h2>
            <LinkedinResult review={li} />
          </section>
        )}

        {sub.roadmap && (
          <section className="mb-6">
            <h2 className="mb-5 font-display text-2xl">Your 90-Day Roadmap</h2>
            <RoadmapTimeline roadmap={sub.roadmap} />
          </section>
        )}

        {!score && !cv && !li && !sub.roadmap && (
          <p className="text-muted">
            We found your profile, but you haven&apos;t completed any module yet.{" "}
            <Link href="/reality-check" className="text-gold underline">
              Start the Reality Check
            </Link>
            .
          </p>
        )}
      </div>
    );
  }

  // ── Lookup form ────────────────────────────────────────────────────────────
  return (
    <div className="mx-auto max-w-md animate-rise py-16">
      <span className="eyebrow">Your result</span>
      <h1 className="mt-4 font-display text-4xl sm:text-5xl">
        See your saved result.
      </h1>
      <p className="mt-4 text-[15px] leading-relaxed text-muted">
        Already taken the Reality Check, CV Lab, or Roadmap? Enter your email to
        pull up everything you&apos;ve done.
      </p>

      <div className="mt-7 grid gap-4">
        <label className="grid gap-1.5">
          <span className="eyebrow !text-muted">Email</span>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@email.com"
            className="input w-full"
            autoComplete="email"
          />
        </label>

        {needsPhone && (
          <label className="grid gap-1.5">
            <span className="eyebrow !text-muted">Phone on your registration</span>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+91 …"
              className="input w-full"
              autoComplete="tel"
            />
          </label>
        )}

        {error && <p className="text-sm text-red">{error}</p>}

        <button
          onClick={lookup}
          disabled={loading}
          className="btn-gold px-7 py-3.5 text-[15px] disabled:opacity-60"
        >
          {loading ? "Looking up…" : "Show my result →"}
        </button>
        <p className="text-xs text-muted">
          New here?{" "}
          <Link href="/reality-check" className="text-gold underline">
            Take the Reality Check
          </Link>{" "}
          first.
        </p>
      </div>
    </div>
  );
}

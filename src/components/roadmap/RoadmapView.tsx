"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import type { Roadmap } from "@/lib/submission";
import LoadingBlock from "@/components/LoadingBlock";

// The week-by-week timeline is only shown after a plan is generated, so defer
// its bundle until then.
const RoadmapTimeline = dynamic(() => import("./RoadmapTimeline"), {
  loading: () => <LoadingBlock />,
});

/**
 * Module 3 UI - generates the 90-Day Roadmap from the saved readiness profile
 * (keyed by email). If no profile exists yet, it points the attendee to the
 * Reality Check first rather than inventing a plan from nothing.
 */

type Phase = "form" | "loading" | "result";

export default function RoadmapView({
  ff,
  session,
  source,
}: {
  ff?: { name?: string; email?: string; phone?: string };
  session?: string;
  source?: string;
}) {
  const [phase, setPhase] = useState<Phase>("form");
  const [email, setEmail] = useState(ff?.email ?? "");
  const [targetRole, setTargetRole] = useState("");
  const [roadmap, setRoadmap] = useState<Roadmap | null>(null);
  const [regenLocked, setRegenLocked] = useState(false);
  const [isExisting, setIsExisting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [needsRealityCheck, setNeedsRealityCheck] = useState(false);

  async function generate() {
    setError(null);
    setNeedsRealityCheck(false);
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setError("Enter the email you used for your Reality Check.");
      return;
    }

    setPhase("loading");
    try {
      const res = await fetch("/api/roadmap", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim(),
          targetRole: targetRole.trim() || undefined,
          name: ff?.name,
          phone: ff?.phone,
          session: session ?? "pre_event",
          source: source ?? "roadmap",
        }),
      });
      const data = await res.json();
      if (res.ok && data.ok && data.roadmap) {
        setRoadmap(data.roadmap);
        setRegenLocked(!!data.regenLocked);
        setIsExisting(!!data.existing);
        setPhase("result");
      } else {
        setError(data.error || "Could not build the roadmap. Please try again.");
        setNeedsRealityCheck(!!data.needsRealityCheck);
        setPhase("form");
      }
    } catch {
      setError("Network error. Please try again.");
      setPhase("form");
    }
  }

  // ── Result ────────────────────────────────────────────────────────────────
  if (phase === "result" && roadmap) {
    return (
      <div className="animate-rise py-8">
        <div className="mb-7 max-w-2xl">
          <span className="eyebrow">Module 03 · Your 90-Day Roadmap</span>
          <h1 className="mt-3 font-display text-3xl leading-tight sm:text-4xl">
            {isExisting
              ? "Your saved 90-day plan."
              : "Twelve weeks, front-loaded on what's holding you back."}
          </h1>
        </div>
        <RoadmapTimeline
          roadmap={roadmap}
          locked={regenLocked}
          onRestart={() => {
            setRoadmap(null);
            setPhase("form");
          }}
        />
      </div>
    );
  }

  // ── Loading ───────────────────────────────────────────────────────────────
  if (phase === "loading") {
    return (
      <div className="mx-auto max-w-md animate-rise py-24 text-center">
        <div className="mx-auto h-10 w-10 animate-spin rounded-full border-2 border-[var(--hairline)] border-t-gold" />
        <h2 className="mt-6 font-display text-2xl">Building your 90 days…</h2>
        <p className="mt-2 text-sm text-muted">
          Sequencing the next 12 weeks around your weakest two dimensions.
        </p>
      </div>
    );
  }

  // ── Form ──────────────────────────────────────────────────────────────────
  return (
    <div className="mx-auto max-w-2xl animate-rise py-10">
      <span className="label-mono">Module 03 · 90-Day Roadmap</span>
      <h1 className="mt-4 font-display text-4xl leading-[1.1] sm:text-5xl">
        Turn your Reality Check into a week-by-week plan.
      </h1>
      <p className="mt-5 text-lg leading-relaxed text-muted">
        We build a directional 90-day plan from your readiness profile - and your
        CV gaps, if you&apos;ve run the Lab - front-loading the two dimensions
        dragging your score down. A map, not the finished work.
      </p>

      <div className="mt-8 grid gap-6">
        <label className="grid gap-1.5">
          <span className="label-mono">Email</span>
          <span className="-mt-1 text-xs text-muted">
            Use the same email as your Reality Check so we can read your profile
          </span>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@email.com"
            className="input w-full"
            autoComplete="email"
          />
        </label>

        <label className="grid gap-1.5">
          <span className="label-mono">Target role (optional)</span>
          <span className="-mt-1 text-xs text-muted">
            Sharpens the plan - e.g. &ldquo;Backend Engineer, Munich&rdquo;
          </span>
          <input
            type="text"
            value={targetRole}
            onChange={(e) => setTargetRole(e.target.value)}
            placeholder="The role you're aiming for"
            className="input w-full"
          />
        </label>

        {error && (
          <div className="text-sm text-red">
            {error}
            {needsRealityCheck && (
              <>
                {" "}
                <Link href="/reality-check" className="text-gold underline">
                  Take the Reality Check →
                </Link>
              </>
            )}
          </div>
        )}

        <button onClick={generate} className="btn-gold px-7 py-3.5 text-sm">
          Generate my 90-Day Roadmap →
        </button>
        <p className="text-xs leading-relaxed text-muted">
          Directional only. The roadmap shows the path - the accountability sprint
          is where you walk it, with the coach.
        </p>
      </div>
    </div>
  );
}

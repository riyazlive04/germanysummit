"use client";

import { useRef, useState } from "react";
import dynamic from "next/dynamic";
import type { CvReview } from "@/lib/cv";
import LoadingBlock from "@/components/LoadingBlock";

// The diagnosis result is only shown after a submission, so lazy-load it.
const CvResult = dynamic(() => import("./CvResult"), {
  loading: () => <LoadingBlock />,
});

/**
 * Module 2 UI - paste or upload (.txt/.pdf) a résumé, optionally a LinkedIn
 * "About", and a target German JD; get a diagnosis-only read. Email is optional
 * but, when supplied (ideally the same one used for the Reality Check), the
 * result compounds onto the shared profile.
 */

type Phase = "form" | "loading" | "result";

export default function CvLabForm({
  ff,
  session,
  source,
}: {
  ff?: { name?: string; email?: string; phone?: string };
  session?: string;
  source?: string;
}) {
  const [phase, setPhase] = useState<Phase>("form");
  const [resume, setResume] = useState("");
  const [linkedin, setLinkedin] = useState("");
  const [jd, setJd] = useState("");
  const [email, setEmail] = useState(ff?.email ?? "");
  const [fileName, setFileName] = useState<string | null>(null);
  const [extracting, setExtracting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [review, setReview] = useState<CvReview | null>(null);
  const [meta, setMeta] = useState<{
    previousScore: number | null;
    delta: number | null;
    attempts: number;
  }>({ previousScore: null, delta: null, attempts: 1 });
  const fileInput = useRef<HTMLInputElement>(null);

  // Send a file to a server extraction route and drop the returned text into the box.
  async function serverExtract(file: File, endpoint: string) {
    setExtracting(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch(endpoint, { method: "POST", body: fd });
      const data = await res.json();
      if (data.ok && data.text) {
        setResume(data.text.trim());
      } else {
        setError(data.error || "Could not extract text. Paste it instead.");
        setFileName(null);
      }
    } catch {
      setError("Upload failed. Paste your résumé text instead.");
      setFileName(null);
    } finally {
      setExtracting(false);
    }
  }

  async function handleFile(file: File) {
    setError(null);
    setFileName(file.name);
    const ext = file.name.toLowerCase().split(".").pop();

    if (ext === "txt" || file.type === "text/plain") {
      const text = await file.text();
      setResume(text.trim());
      return;
    }
    if (ext === "pdf" || file.type === "application/pdf") {
      await serverExtract(file, "/api/extract-pdf");
      return;
    }
    if (
      ext === "docx" ||
      file.type ===
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    ) {
      await serverExtract(file, "/api/extract-docx");
      return;
    }
    if (ext === "doc") {
      setError("Old .doc files aren't supported. Save as .docx or PDF, or paste the text.");
      setFileName(null);
      return;
    }

    setError("Unsupported file. Upload a .txt, .pdf, or .docx, or paste the text.");
    setFileName(null);
  }

  async function submit() {
    setError(null);
    if (resume.trim().length < 40) {
      setError("Paste (or upload) more of your résumé to diagnose it.");
      return;
    }
    if (jd.trim().length < 40) {
      setError("Paste the target German job description to compare against.");
      return;
    }

    setPhase("loading");
    try {
      const res = await fetch("/api/cv-review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          resume,
          linkedin: linkedin || undefined,
          jd,
          email: email.trim() || ff?.email || undefined,
          name: ff?.name,
          phone: ff?.phone,
          session: session ?? "pre_event",
          source: source ?? "cv-lab",
        }),
      });
      const data = await res.json();
      if (res.ok && data.ok && data.review) {
        setReview(data.review);
        setMeta({
          previousScore: data.previousScore ?? null,
          delta: data.delta ?? null,
          attempts: data.attempts ?? 1,
        });
        setPhase("result");
      } else {
        setError(data.error || "Diagnosis failed. Please try again.");
        setPhase("form");
      }
    } catch {
      setError("Network error. Please try again.");
      setPhase("form");
    }
  }

  function reset() {
    setReview(null);
    setPhase("form");
    setError(null);
  }

  // ── Result ────────────────────────────────────────────────────────────────
  if (phase === "result" && review) {
    return (
      <div className="animate-rise py-8">
        <CvResult
          review={review}
          previousScore={meta.previousScore}
          delta={meta.delta}
          attempts={meta.attempts}
          onRestart={reset}
        />
      </div>
    );
  }

  // ── Loading ───────────────────────────────────────────────────────────────
  if (phase === "loading") {
    return (
      <div className="mx-auto max-w-md animate-rise py-24 text-center">
        <div className="mx-auto h-10 w-10 animate-spin rounded-full border-2 border-[var(--hairline)] border-t-gold" />
        <h2 className="mt-6 font-display text-2xl">Reading it like a recruiter…</h2>
        <p className="mt-2 text-sm text-muted">
          Matching your résumé against the job description for the German market.
          This takes a few seconds.
        </p>
      </div>
    );
  }

  // ── Form ──────────────────────────────────────────────────────────────────
  return (
    <div className="mx-auto max-w-2xl animate-rise">
      <h2 className="font-display text-3xl sm:text-4xl">
        What a German recruiter sees in 8 seconds.
      </h2>
      <p className="mt-4 text-[15px] leading-relaxed text-muted">
        Paste your résumé and the job you&apos;re targeting. You&apos;ll get an
        ATS match score, the keywords you&apos;re missing, and the bullets that
        are holding you back - named, not rewritten. The fix is yours to make.
      </p>

      <div className="mt-8 grid gap-6">
        {/* Résumé */}
        <Field
          label="Your résumé"
          hint="Paste the text, or upload a .txt / .pdf / .docx"
        >
          <div className="mb-2 flex items-center gap-3">
            <button
              type="button"
              onClick={() => fileInput.current?.click()}
              className="rounded-lg border border-[var(--hairline)] px-3 py-1.5 text-xs text-muted transition-colors hover:text-gold"
            >
              {extracting ? "Extracting…" : "Upload .txt / .pdf / .docx"}
            </button>
            {fileName && !extracting && (
              <span className="font-mono text-xs text-muted">{fileName}</span>
            )}
            <input
              ref={fileInput}
              type="file"
              accept=".txt,.pdf,.docx,text/plain,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) void handleFile(f);
                e.target.value = "";
              }}
            />
          </div>
          <textarea
            value={resume}
            onChange={(e) => setResume(e.target.value)}
            placeholder="Paste your résumé text here…"
            rows={8}
            className="input w-full resize-y font-body"
          />
        </Field>

        {/* Target JD */}
        <Field
          label="Target German job description"
          hint="The role you actually want - paste the posting"
        >
          <textarea
            value={jd}
            onChange={(e) => setJd(e.target.value)}
            placeholder="Paste the German job description here…"
            rows={6}
            className="input w-full resize-y font-body"
          />
        </Field>

        {/* LinkedIn (optional) */}
        <Field label="LinkedIn “About” (optional)" hint="Helps sharpen the read">
          <textarea
            value={linkedin}
            onChange={(e) => setLinkedin(e.target.value)}
            placeholder="Paste your LinkedIn summary (optional)…"
            rows={4}
            className="input w-full resize-y font-body"
          />
        </Field>

        {/* Email (optional, compounds the profile) */}
        <Field
          label="Email (optional)"
          hint="Use your Reality Check email so your results compound"
        >
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@email.com"
            className="input w-full"
            autoComplete="email"
          />
        </Field>

        {error && <p className="text-sm text-red">{error}</p>}

        <button
          onClick={submit}
          disabled={extracting}
          className="btn-gold px-7 py-3.5 text-sm disabled:opacity-60"
        >
          Diagnose my CV →
        </button>
        <p className="text-xs leading-relaxed text-muted">
          Diagnosis only. The Lab never rewrites your CV - it shows you what to
          fix, with the coach and on stage.
        </p>
      </div>
    </div>
  );
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="grid gap-1.5">
      <span className="label-mono">{label}</span>
      {hint && <span className="-mt-1 text-xs text-muted">{hint}</span>}
      {children}
    </label>
  );
}

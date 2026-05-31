"use client";

import { useRef, useState } from "react";
import type { LinkedinReview } from "@/lib/linkedin";
import LinkedinResult from "./LinkedinResult";
import Modal from "@/components/Modal";

/**
 * LinkedIn Optimizer UI. Paste your headline + About, or upload your own LinkedIn
 * "Save to PDF" export (which we extract) - we never scrape or log in. Diagnosis
 * only. Email optional; when given, it compounds onto the shared profile.
 */

type Phase = "form" | "loading" | "result";

export default function LinkedinForm({
  ff,
  session,
  source,
}: {
  ff?: { name?: string; email?: string; phone?: string };
  session?: string;
  source?: string;
}) {
  const [phase, setPhase] = useState<Phase>("form");
  const [headline, setHeadline] = useState("");
  const [profile, setProfile] = useState("");
  const [targetRole, setTargetRole] = useState("");
  const [email, setEmail] = useState(ff?.email ?? "");
  const [fileName, setFileName] = useState<string | null>(null);
  const [extracting, setExtracting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [review, setReview] = useState<LinkedinReview | null>(null);
  const [meta, setMeta] = useState<{
    previousScore: number | null;
    delta: number | null;
    attempts: number;
  }>({ previousScore: null, delta: null, attempts: 1 });
  const [showHelp, setShowHelp] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);

  async function serverExtract(file: File, endpoint: string) {
    setExtracting(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch(endpoint, { method: "POST", body: fd });
      const data = await res.json();
      if (data.ok && data.text) {
        setProfile(data.text.trim());
      } else {
        setError(data.error || "Could not extract text. Paste it instead.");
        setFileName(null);
      }
    } catch {
      setError("Upload failed. Paste your profile text instead.");
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
      setProfile((await file.text()).trim());
      return;
    }
    if (ext === "pdf" || file.type === "application/pdf") {
      await serverExtract(file, "/api/extract-pdf");
      return;
    }
    if (ext === "docx") {
      await serverExtract(file, "/api/extract-docx");
      return;
    }
    setError("Upload your LinkedIn 'Save to PDF' export (.pdf), or paste the text.");
    setFileName(null);
  }

  async function submit() {
    setError(null);
    if (headline.trim().length + profile.trim().length < 60) {
      setError("Add your headline and About (or upload your LinkedIn PDF) to analyze.");
      return;
    }
    setPhase("loading");
    try {
      const res = await fetch("/api/linkedin-review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          headline,
          profile,
          targetRole: targetRole || undefined,
          email: email.trim() || ff?.email || undefined,
          name: ff?.name,
          phone: ff?.phone,
          session: session ?? "pre_event",
          source: source ?? "linkedin-lab",
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
        setError(data.error || "Analysis failed. Please try again.");
        setPhase("form");
      }
    } catch {
      setError("Network error. Please try again.");
      setPhase("form");
    }
  }

  if (phase === "result" && review) {
    return (
      <div className="animate-rise">
        <LinkedinResult
          review={review}
          previousScore={meta.previousScore}
          delta={meta.delta}
          attempts={meta.attempts}
          onRestart={() => {
            setReview(null);
            setPhase("form");
          }}
        />
      </div>
    );
  }

  if (phase === "loading") {
    return (
      <div className="mx-auto max-w-md animate-rise py-24 text-center">
        <div className="mx-auto h-10 w-10 animate-spin rounded-full border-2 border-[var(--line)] border-t-gold" />
        <h2 className="mt-6 font-display text-2xl">Reading your profile like a recruiter…</h2>
        <p className="mt-2 text-sm text-muted">
          Checking discoverability, hook, and keywords for the German market.
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl animate-rise">
      <h2 className="font-display text-3xl sm:text-4xl">
        Get found by German recruiters.
      </h2>
      <p className="mt-4 text-[15px] leading-relaxed text-muted">
        Paste your headline and About, or upload your LinkedIn{" "}
        <span className="text-text">Save to PDF</span> export (Profile → More →
        Save to PDF). We never log in or scrape - we only read what you give us.
      </p>

      <div className="mt-7 grid gap-6">
        <Field label="Your LinkedIn headline">
          <input
            type="text"
            value={headline}
            onChange={(e) => setHeadline(e.target.value)}
            placeholder="e.g. Backend Engineer | Java, Spring Boot, Kubernetes"
            className="input w-full"
          />
        </Field>

        <Field
          label="Your About + profile"
          hint="Paste your About (and skills/experience), or upload your LinkedIn PDF"
        >
          <div className="mb-2 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => fileInput.current?.click()}
              className="rounded-lg border border-[var(--line)] px-3 py-1.5 text-xs text-muted transition-colors hover:text-gold"
            >
              {extracting ? "Extracting…" : "Upload LinkedIn PDF / .txt / .docx"}
            </button>
            <button
              type="button"
              onClick={() => setShowHelp(true)}
              className="text-xs font-medium text-gold underline-offset-2 hover:underline"
            >
              How do I download my LinkedIn profile?
            </button>
            {fileName && !extracting && (
              <span className="font-mono text-xs text-muted">{fileName}</span>
            )}
            <input
              ref={fileInput}
              type="file"
              accept=".pdf,.txt,.docx,application/pdf,text/plain,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) void handleFile(f);
                e.target.value = "";
              }}
            />
          </div>
          <textarea
            value={profile}
            onChange={(e) => setProfile(e.target.value)}
            placeholder="Paste your LinkedIn About, skills, and experience here…"
            rows={8}
            className="input w-full resize-y font-body"
          />
        </Field>

        <Field label="Target role (optional)">
          <input
            type="text"
            value={targetRole}
            onChange={(e) => setTargetRole(e.target.value)}
            placeholder="The role you're aiming for in Germany"
            className="input w-full"
          />
        </Field>

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
          className="btn-gold px-7 py-3.5 text-[15px] disabled:opacity-60"
        >
          Analyze my LinkedIn →
        </button>
        <p className="text-xs leading-relaxed text-muted">
          Diagnosis only, zero account access. We never connect to LinkedIn - it
          reads only the text you paste or upload.
        </p>
      </div>

      <Modal
        open={showHelp}
        onClose={() => setShowHelp(false)}
        title="Get your LinkedIn profile as a PDF"
      >
        <p className="text-[15px] leading-relaxed text-muted">
          LinkedIn lets you download your own profile as a PDF in a few taps - no
          tools needed. Then upload it here and it fills in automatically.
        </p>

        <div className="mt-6">
          <span className="eyebrow">On a computer</span>
          <ol className="mt-3 grid gap-2.5">
            {[
              <>Open LinkedIn and go to your profile (click <b className="text-text">Me</b> at the top, then <b className="text-text">View Profile</b>).</>,
              <>Just under your name and headline, click the <b className="text-text">More</b> button.</>,
              <>Choose <b className="text-text">Save to PDF</b>. Your profile downloads as a PDF file.</>,
              <>Come back here, click <b className="text-text">Upload</b>, and pick that PDF.</>,
            ].map((step, i) => (
              <li key={i} className="flex items-start gap-3 text-[15px] leading-relaxed">
                <span className="nums mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full bg-[var(--anchor)] font-mono text-xs text-gold">
                  {i + 1}
                </span>
                <span>{step}</span>
              </li>
            ))}
          </ol>
        </div>

        <div className="mt-6">
          <span className="eyebrow">On the LinkedIn app (phone)</span>
          <ol className="mt-3 grid gap-2.5">
            {[
              <>Open the LinkedIn app and tap your <b className="text-text">profile photo</b> → <b className="text-text">View Profile</b>.</>,
              <>Tap the <b className="text-text">More</b> (•••) button near your name.</>,
              <>Tap <b className="text-text">Save to PDF</b>, then save the file to your phone.</>,
              <>Back here, tap <b className="text-text">Upload</b> and choose that PDF.</>,
            ].map((step, i) => (
              <li key={i} className="flex items-start gap-3 text-[15px] leading-relaxed">
                <span className="nums mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full bg-[var(--anchor)] font-mono text-xs text-gold">
                  {i + 1}
                </span>
                <span>{step}</span>
              </li>
            ))}
          </ol>
        </div>

        <div className="mt-6 rounded-xl border border-[var(--line)] bg-surface-2 p-4">
          <p className="text-sm leading-relaxed text-muted">
            <b className="text-text">Don&apos;t want to download?</b> Just paste your
            headline and your <b className="text-text">About</b> section into the
            boxes - that works too. We never log in or touch your account.
          </p>
        </div>

        <button
          onClick={() => setShowHelp(false)}
          className="btn-gold mt-6 w-full px-6 py-3 text-sm"
        >
          Got it
        </button>
      </Modal>
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
      <span className="eyebrow !text-muted">{label}</span>
      {hint && <span className="-mt-1 text-xs text-muted">{hint}</span>}
      {children}
    </label>
  );
}

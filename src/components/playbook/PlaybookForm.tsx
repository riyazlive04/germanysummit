"use client";

import { useState } from "react";

/**
 * Lead-magnet form for "The Secret Playbook" free download. Collect an email
 * (first name optional), capture it, then start the PDF download. Low friction
 * by design - one required field.
 */

const FILE_NAME = "The-Secret-Playbook.pdf";

export default function PlaybookForm({
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
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      setError("Enter a valid email to get the playbook.");
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
          source: source ?? "playbook",
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

  if (phase === "done" && file) {
    return (
      <div className="mx-auto max-w-md animate-rise py-16 text-center">
        <span className="grid mx-auto h-14 w-14 place-items-center rounded-full bg-[var(--anchor)] text-2xl text-gold">
          ✓
        </span>
        <h1 className="mt-5 font-display text-3xl sm:text-4xl">Your playbook is downloading.</h1>
        <p className="mt-3 text-[15px] leading-relaxed text-muted">
          If it didn&apos;t start, tap the button below. Keep it on your phone for
          the summit.
        </p>
        <a
          href={file}
          download={FILE_NAME}
          onClick={() => triggerDownload(file)}
          className="btn-gold mt-7 inline-flex px-7 py-3.5 text-sm"
        >
          ↓ Download the playbook
        </a>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-md animate-rise py-12">
      <span className="eyebrow">Free for summit attendees</span>
      <h1 className="mt-3 font-display text-4xl leading-[1.05] sm:text-5xl">
        The Secret Playbook
      </h1>
      <p className="mt-4 text-lg leading-relaxed text-muted">
        Ameen&apos;s inside-Germany method, in one PDF - the moves that get Indian
        engineers seen, shortlisted, and hired. Enter your email and it&apos;s
        yours.
      </p>

      <form onSubmit={submit} className="mt-8 grid gap-4">
        <label className="grid gap-1.5">
          <span className="label-mono">First name (optional)</span>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Priya"
            className="input"
            autoComplete="given-name"
          />
        </label>

        <label className="grid gap-1.5">
          <span className="label-mono">Email</span>
          <input
            type="email"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              setError(null);
            }}
            placeholder="you@email.com"
            className="input"
            autoComplete="email"
            required
          />
        </label>

        {error && <p className="text-sm text-red">{error}</p>}

        <button type="submit" disabled={busy} className="btn-gold mt-1 px-6 py-3.5 text-sm disabled:opacity-60">
          {busy ? "Preparing…" : "Send me the playbook →"}
        </button>
        <p className="text-center text-xs text-muted">
          No spam. Your email is used to send your result and the summit follow-up.
        </p>
      </form>
    </div>
  );
}

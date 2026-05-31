"use client";

import { useState } from "react";

export type Identity = { name?: string; email: string; phone?: string };

/**
 * Minimal email gate - shown only as a fallback when FlexiFunnels did NOT pass
 * an email (ff_email). One required field (email); name/phone optional. Honest
 * framing: this is how the result follows you home (WhatsApp), not a paywall.
 */
export default function CaptureGate({
  defaults,
  onSubmit,
}: {
  defaults?: Partial<Identity>;
  onSubmit: (identity: Identity) => void;
}) {
  const [name, setName] = useState(defaults?.name ?? "");
  const [email, setEmail] = useState(defaults?.email ?? "");
  const [phone, setPhone] = useState(defaults?.phone ?? "");
  const [error, setError] = useState<string | null>(null);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      setError("Enter a valid email so we can send your result.");
      return;
    }
    onSubmit({
      name: name.trim() || undefined,
      email: trimmed,
      phone: phone.trim() || undefined,
    });
  }

  return (
    <div className="mx-auto max-w-md animate-rise py-12">
      <span className="eyebrow">Before you begin</span>
      <h2 className="mt-3 font-display text-3xl leading-tight">
        Where should we send your result?
      </h2>
      <p className="mt-3 text-sm leading-relaxed text-muted">
        Answer 10 quick questions next. We&apos;ll show your Germany Readiness
        Score and send a copy - with your 90-day next step - to WhatsApp. No spam,
        just your result.
      </p>

      <form onSubmit={submit} className="mt-7 grid gap-4">
        <Field label="First name (optional)">
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Priya"
            className="input"
            autoComplete="given-name"
          />
        </Field>

        <Field label="Email">
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
        </Field>

        <Field label="WhatsApp number (optional)">
          <input
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="+91 …"
            className="input"
            autoComplete="tel"
          />
        </Field>

        {error && <p className="text-sm text-red">{error}</p>}

        <button type="submit" className="btn-gold mt-1 px-6 py-3 text-sm">
          Start the questions →
        </button>
        <p className="text-center text-xs text-muted">
          A mirror, not a mailing list. Used to deliver your result and the
          summit follow-up.
        </p>
      </form>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="grid gap-1.5">
      <span className="label-mono">{label}</span>
      {children}
    </label>
  );
}

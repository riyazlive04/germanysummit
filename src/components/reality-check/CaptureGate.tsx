"use client";

import { useState } from "react";
import { PHONE_DIGITS, digitsOnly, isValidEmail, isValidPhone } from "@/lib/validate";

export type Identity = { name?: string; email: string; phone?: string };

/**
 * Identity gate before the quiz. All three fields are required: first name,
 * email, and a WhatsApp number - this is how the result follows them home and
 * how the team reaches them. Honest framing: not a paywall, just delivery.
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
  // Phone is held as bare digits, capped at 10 - the only shape we accept.
  const [phone, setPhone] = useState(digitsOnly(defaults?.phone).slice(0, PHONE_DIGITS));
  const [error, setError] = useState<string | null>(null);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const trimmedName = name.trim();
    const trimmedEmail = email.trim().toLowerCase();

    if (!trimmedName) {
      setError("Enter your first name.");
      return;
    }
    if (!isValidEmail(trimmedEmail)) {
      setError("Enter a valid email so we can send your result.");
      return;
    }
    if (!isValidPhone(phone)) {
      setError(`Enter your ${PHONE_DIGITS}-digit WhatsApp number.`);
      return;
    }
    onSubmit({ name: trimmedName, email: trimmedEmail, phone });
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

      {/* noValidate: suppress the browser's native validation bubbles so the
          app's own branded inline errors below are the single, consistent
          validation UI (the fields keep `required` for assistive tech). */}
      <form onSubmit={submit} noValidate className="mt-7 grid gap-4">
        <Field label="First name">
          <input
            type="text"
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              setError(null);
            }}
            placeholder="Priya"
            className="input w-full"
            autoComplete="given-name"
            required
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
            className="input w-full"
            autoComplete="email"
            required
          />
        </Field>

        <Field label="WhatsApp number">
          <input
            type="tel"
            inputMode="numeric"
            value={phone}
            onChange={(e) => {
              // Keep only digits, capped at 10 - the field can't hold anything else.
              setPhone(digitsOnly(e.target.value).slice(0, PHONE_DIGITS));
              setError(null);
            }}
            placeholder="10-digit mobile number"
            className="input w-full"
            autoComplete="tel-national"
            maxLength={PHONE_DIGITS}
            required
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

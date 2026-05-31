"use client";

import { useEffect } from "react";
import Link from "next/link";

/**
 * Route-level error boundary. Keeps the brand tone (honest, not alarming) and
 * always gives a way forward - the attendee never hits a dead end on event day.
 */
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="mx-auto grid min-h-screen max-w-xl place-items-center px-5">
      <div className="text-center">
        <span className="label-mono">Something slipped</span>
        <h1 className="mt-3 font-display text-4xl">That didn&apos;t load right.</h1>
        <p className="mt-3 text-muted">
          Not your fault. Try again - your progress and results are safe.
        </p>
        <div className="mt-7 flex flex-wrap justify-center gap-3">
          <button onClick={reset} className="btn-gold px-6 py-3 text-sm">
            Try again
          </button>
          <Link
            href="/"
            className="rounded-lg border border-[var(--hairline)] px-6 py-3 text-sm text-muted transition-colors hover:text-text"
          >
            Back to start
          </Link>
        </div>
      </div>
    </main>
  );
}

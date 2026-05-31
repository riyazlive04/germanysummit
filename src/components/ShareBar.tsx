"use client";

import { useState } from "react";

/**
 * Share action for a result. Uses the native Web Share sheet on mobile; falls
 * back to copying a one-line summary + link to the clipboard on desktop. No
 * dependency, graceful when neither API is available.
 */
export default function ShareBar({
  title,
  summary,
  url,
}: {
  title: string;
  summary: string;
  url?: string;
}) {
  const [copied, setCopied] = useState(false);

  const shareUrl =
    url ?? (typeof window !== "undefined" ? window.location.href : "");
  const text = `${summary}`;

  async function share() {
    // Native share sheet (mobile / supported browsers).
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({ title, text, url: shareUrl });
        return;
      } catch {
        /* user cancelled or unsupported - fall through to copy */
      }
    }
    // Clipboard fallback.
    try {
      await navigator.clipboard.writeText(`${text}\n${shareUrl}`);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard blocked - nothing we can do silently */
    }
  }

  return (
    <button
      onClick={share}
      className="inline-flex items-center gap-2 rounded-lg border border-[var(--hairline)] px-4 py-2 text-sm text-muted transition-colors hover:text-gold"
    >
      <svg
        width="15"
        height="15"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <circle cx="18" cy="5" r="3" />
        <circle cx="6" cy="12" r="3" />
        <circle cx="18" cy="19" r="3" />
        <path d="M8.59 13.51l6.83 3.98M15.41 6.51l-6.82 3.98" />
      </svg>
      {copied ? "Copied!" : "Share result"}
    </button>
  );
}

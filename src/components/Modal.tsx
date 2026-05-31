"use client";

import { useEffect } from "react";

/**
 * Lightweight accessible modal: backdrop click, Esc to close, body-scroll lock.
 */
export default function Modal({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="card animate-rise relative z-10 max-h-[85vh] w-full max-w-lg overflow-y-auto p-6 sm:p-8">
        <div className="mb-5 flex items-start justify-between gap-4">
          <h3 className="font-display text-2xl">{title}</h3>
          <button
            onClick={onClose}
            aria-label="Close"
            className="grid h-8 w-8 shrink-0 place-items-center rounded-lg border border-[var(--line)] text-muted transition-colors hover:text-text"
          >
            ✕
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

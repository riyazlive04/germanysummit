"use client";

import { useState } from "react";
import CvLabForm from "./CvLabForm";
import LinkedinForm from "./LinkedinForm";

type Tab = "cv" | "linkedin";

const TABS: { value: Tab; label: string }[] = [
  { value: "cv", label: "CV Diagnosis" },
  { value: "linkedin", label: "LinkedIn Optimizer" },
];

/**
 * Module 2 shell: two diagnosis-only tools sharing one profile - the CV
 * Diagnosis and the LinkedIn Optimizer.
 */
export default function LabTabs(props: {
  ff?: { name?: string; email?: string; phone?: string };
  session?: string;
  source?: string;
}) {
  const [tab, setTab] = useState<Tab>("cv");

  return (
    <div className="py-10">
      <div className="mx-auto mb-9 max-w-2xl">
        <span className="eyebrow">Module 02 · CV &amp; LinkedIn Lab</span>
        <div className="mt-4 inline-flex rounded-full border border-[var(--line)] bg-surface p-1">
          {TABS.map((t) => (
            <button
              key={t.value}
              onClick={() => setTab(t.value)}
              className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                tab === t.value
                  ? "bg-gold text-[color:var(--gold-ink)]"
                  : "text-muted hover:text-text"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {tab === "cv" ? <CvLabForm {...props} /> : <LinkedinForm {...props} />}
    </div>
  );
}

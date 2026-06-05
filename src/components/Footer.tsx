export default function Footer() {
  return (
    <footer className="no-print mt-28 border-t border-[var(--line)]">
      <div className="mx-auto max-w-6xl px-5 py-12">
        <div className="grid gap-8 sm:grid-cols-[1.5fr_1fr]">
          <p className="max-w-xl text-[15px] leading-relaxed text-muted">
            A <span className="font-semibold text-text">mirror</span>, not a
            shortcut. The suite diagnoses, scores, and points you to the fix -
            the work still happens with the coach, on stage, and in the sprint.
            Additive to your paper Germany Readiness Worksheet.
          </p>
          <div className="flex flex-col gap-2 text-sm text-muted sm:items-end">
            <span className="eyebrow !text-muted">B2 Consultants · German Note</span>
            <span>MMA Hall, Chennai</span>
            <span>20 June 2026 · 10:00-16:00 IST</span>
          </div>
        </div>

        <div className="mt-10 border-t border-[var(--line)] pt-6 text-center text-xs text-muted">
          Developed by{" "}
          <a
            href="https://sirahdigital.in/"
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium text-text underline-offset-2 transition-colors hover:text-gold"
          >
            Sirah Digital
          </a>
        </div>
      </div>
    </footer>
  );
}

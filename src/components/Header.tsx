import Link from "next/link";
import Image from "next/image";
import ThemeToggle from "./ThemeToggle";

// For the summit, the suite leads with the Reality Check - a single CTA, shown
// on every device. The CV & LinkedIn Lab and the 90-Day Roadmap are intentionally
// not surfaced here (Lab hidden; roadmap shared later as a direct link). Their
// routes still work.
export default function Header() {
  return (
    <header className="no-print sticky top-0 z-30 border-b border-[var(--line)] bg-[var(--header-bg)] backdrop-blur-xl">
      <div className="mx-auto flex h-[68px] max-w-6xl items-center justify-between px-5">
        <Link
          href="/"
          aria-label="Germany Career Summit - home"
          className="flex items-center"
        >
          {/* Official summit wordmark, transparent so it floats free on both
              the light and dark themes. */}
          <Image
            src="/brand/summit-logo.png"
            alt="Germany Career Summit · Chennai 2026"
            width={279}
            height={100}
            priority
            className="h-10 w-auto sm:h-12"
          />
        </Link>

        <div className="flex items-center gap-3 sm:gap-4">
          {/* Hidden on the info-collection (capture) step - see globals.css
              [data-hide-cta]; the quiz toggles it so the gate stays focused. */}
          <Link
            href="/reality-check"
            className="header-cta btn-gold inline-flex px-3.5 py-2 text-[13px] sm:px-4"
          >
            Start free →
          </Link>
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}

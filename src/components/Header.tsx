import Link from "next/link";
import Image from "next/image";
import ThemeToggle from "./ThemeToggle";

// For the summit, the suite leads with the Reality Check. The CV & LinkedIn Lab
// and the 90-Day Roadmap are intentionally not surfaced here: the Lab is hidden,
// and the roadmap is shared later as a direct link. Their routes still work.
const NAV = [{ href: "/reality-check", label: "Reality Check" }];

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

        <div className="flex items-center gap-5">
          <nav className="hidden items-center gap-7 text-sm font-medium text-muted md:flex">
            {NAV.map((n) => (
              <Link
                key={n.href}
                href={n.href}
                className="transition-colors hover:text-text"
              >
                {n.label}
              </Link>
            ))}
          </nav>
          <Link
            href="/reality-check"
            className="btn-gold hidden px-4 py-2 text-[13px] sm:inline-flex"
          >
            Start free →
          </Link>
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}

import Link from "next/link";
import Image from "next/image";
import ThemeToggle from "./ThemeToggle";

const NAV = [
  { href: "/reality-check", label: "Reality Check" },
  { href: "/cv-lab", label: "CV & LinkedIn Lab" },
  { href: "/roadmap", label: "90-Day Roadmap" },
];

export default function Header() {
  return (
    <header className="no-print sticky top-0 z-30 border-b border-[var(--line)] bg-[var(--header-bg)] backdrop-blur-xl">
      <div className="mx-auto flex h-[68px] max-w-6xl items-center justify-between px-5">
        <Link href="/" className="flex items-center gap-3">
          <Image
            src="/brand/b2-logo.png"
            alt="B2 Consultants"
            width={40}
            height={40}
            priority
            className="brand-logo h-9 w-9 object-contain"
          />
          <span className="flex flex-col leading-none">
            <span className="font-display text-[15px] font-bold tracking-tight">
              Germany Readiness Suite
            </span>
            <span className="eyebrow mt-1.5 !text-[0.58rem] !text-muted">
              B2 Consultants · 20 Jun 2026
            </span>
          </span>
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

      {/* Mobile module nav */}
      <nav className="flex items-center gap-5 overflow-x-auto border-t border-[var(--line)] px-5 py-2.5 text-xs font-medium text-muted md:hidden">
        {NAV.map((n) => (
          <Link
            key={n.href}
            href={n.href}
            className="whitespace-nowrap transition-colors hover:text-text"
          >
            {n.label}
          </Link>
        ))}
      </nav>
    </header>
  );
}

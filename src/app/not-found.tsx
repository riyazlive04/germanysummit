import Link from "next/link";
import Header from "@/components/Header";

export default function NotFound() {
  return (
    <>
      <Header />
      <main className="mx-auto grid max-w-xl place-items-center px-5 py-32 text-center">
        <div>
          <span className="label-mono">404</span>
          <h1 className="mt-3 font-display text-5xl">This page isn&apos;t here.</h1>
          <p className="mt-3 text-muted">
            But your next step toward Germany is. Start with the Reality Check.
          </p>
          <div className="mt-7 flex flex-wrap justify-center gap-3">
            <Link href="/reality-check" className="btn-gold px-6 py-3 text-sm">
              Start the Reality Check →
            </Link>
            <Link
              href="/"
              className="rounded-lg border border-[var(--hairline)] px-6 py-3 text-sm text-muted transition-colors hover:text-text"
            >
              Home
            </Link>
          </div>
        </div>
      </main>
    </>
  );
}

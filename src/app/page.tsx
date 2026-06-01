import Link from "next/link";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

const MODULES = [
  {
    n: "01",
    name: "Reality Check",
    line: "Ten honest questions across five dimensions. Your position on Germany, computed - not guessed.",
    payoff: "Pentagon radar · score 0-100 · tier · your archetype",
    href: "/reality-check",
  },
  {
    n: "02",
    name: "CV & LinkedIn Lab",
    line: "Paste your résumé and a target German JD. We name what a recruiter won't say out loud.",
    payoff: "ATS match · keyword gaps · weak-bullet flags · top 3 fixes",
    href: "/cv-lab",
  },
  {
    n: "03",
    name: "90-Day Roadmap",
    line: "A directional, week-by-week plan built from your readiness profile and CV gaps.",
    payoff: "12 weeks · 3 phases · front-loaded on your weak spots",
    href: "/roadmap",
  },
];

export default function Home() {
  return (
    <>
      <Header />

      <main className="mx-auto max-w-6xl px-5">
        {/* Hero. Sizes + spacing tuned so the whole pitch (headline, sub, both
            CTAs, and the trust line) clears the fold on phone and laptop, while
            keeping the headline bold and body text at readable sizes. */}
        <section className="grid items-center gap-8 pb-14 pt-8 sm:gap-12 sm:pb-20 sm:pt-12 lg:grid-cols-[1.35fr_0.85fr]">
          <div>
            <span className="eyebrow">The Reality Check · Germany Career Summit 2026</span>
            <h1 className="mt-4 font-display text-[2.05rem] leading-[1.03] tracking-tight sm:mt-5 sm:text-5xl lg:text-6xl">
              See exactly where you stand on{" "}
              <span className="text-gold">Germany</span> - before you change a
              thing.
            </h1>
            <p className="mt-4 max-w-xl text-base leading-relaxed text-muted sm:mt-5 sm:text-lg">
              For Indian engineers who&apos;ve applied to dozens of German jobs and
              heard nothing back. Not motivation - a mirror. Score your readiness,
              see what&apos;s breaking your CV, and leave with a 90-day plan.
            </p>

            <div className="mt-6 flex flex-wrap items-center gap-3 sm:mt-7 sm:gap-4">
              <Link href="/reality-check" className="btn-gold px-7 py-3.5 text-[15px]">
                Start the Reality Check →
              </Link>
              <Link href="/my-results" className="btn btn-ghost px-6 py-3.5 text-[15px]">
                View my result
              </Link>
            </div>
            <span className="eyebrow mt-4 block !text-muted">
              5 dimensions · ~90 seconds · powered by Ameen&apos;s inside-Germany method
            </span>
          </div>

          {/* Portrait card. A transparent cutout of Ameen sits on the green panel;
              we fit his whole figure (book + hands included) and lay only a slim
              caption bar at the very bottom. Fills from /brand/ameen.png. */}
          <div className="panel-anchor relative mx-auto hidden aspect-[4/5] w-full max-w-[420px] overflow-hidden lg:block">
            <div
              className="absolute inset-0 bg-no-repeat"
              style={{
                backgroundImage: "url('/brand/ameen.png')",
                backgroundSize: "auto 118%",
                backgroundPosition: "center top",
              }}
            />
            <div
              className="absolute inset-x-0 bottom-0 flex h-[26%] flex-col justify-end p-5"
              style={{
                background:
                  "linear-gradient(to top, var(--anchor) 0%, var(--anchor) 45%, rgba(15,61,46,0.55) 75%, rgba(15,61,46,0) 100%)",
              }}
            >
              <span className="eyebrow !text-gold-soft">Ameen Rahaman</span>
              <p className="mt-1 text-sm text-on-anchor">
                Founder, B2 Consultants · 350+ engineers coached into Germany.
              </p>
            </div>
          </div>
        </section>

        {/* Modules */}
        <section className="grid gap-4 pb-6 lg:grid-cols-3">
          {MODULES.map((m) => (
            <Link
              key={m.n}
              href={m.href}
              className="card group flex flex-col gap-5 p-7 transition-all hover:-translate-y-1 hover:border-[var(--gold)]"
            >
              <div className="flex items-center justify-between">
                <span className="nums font-display text-5xl font-bold text-[var(--anchor-hi)] transition-colors group-hover:text-gold">
                  {m.n}
                </span>
                <span className="text-2xl text-muted transition-transform group-hover:translate-x-1 group-hover:text-gold">
                  →
                </span>
              </div>
              <h2 className="font-display text-2xl">{m.name}</h2>
              <p className="text-[15px] leading-relaxed text-muted">{m.line}</p>
              <p className="eyebrow mt-auto !text-[0.7rem] !text-muted">{m.payoff}</p>
            </Link>
          ))}
        </section>

        {/* Anchor CTA band */}
        <section className="panel-anchor mt-8 overflow-hidden p-9 sm:p-12">
          <div className="grid items-center gap-8 sm:grid-cols-[1.6fr_1fr]">
            <div>
              <span className="eyebrow">Your plan, not a paycheck</span>
              <h2 className="mt-4 font-display text-3xl leading-tight text-on-anchor sm:text-4xl">
                One day in Chennai. A system you can run for 90.
              </h2>
              <p className="mt-4 max-w-xl text-[15px] leading-relaxed text-[color:rgba(245,242,234,0.72)]">
                The suite powers the summit&apos;s agenda - the morning Reality
                Check, the live CV transformation, and the 1:30 Roadmap Reveal.
                Honest, computed, and yours to take home.
              </p>
            </div>
            <div className="flex flex-col gap-3 sm:items-end">
              <Link
                href="/reality-check"
                className="btn-gold px-7 py-3.5 text-[15px]"
              >
                Take the Reality Check →
              </Link>
              <span className="eyebrow !text-[color:rgba(245,242,234,0.6)]">
                20 Jun 2026 · MMA Hall · 10:00 IST
              </span>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </>
  );
}

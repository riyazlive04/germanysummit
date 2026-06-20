import Link from "next/link";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

export const metadata = {
  title: "Next Steps — Germany Career Summit 2026",
  description:
    "Still deciding? Book a call with the team for Guided Mode, or talk to Ameen about Solo Mode.",
  robots: { index: false, follow: false },
};

const GUIDED_URL = "https://optin.b2consultants.de/apply";
const SOLO_URL = "https://optin.b2consultants.de/sss";

export default function NextStepsPage() {
  return (
    <>
      <Header />
      <main className="mx-auto max-w-3xl px-5">
        <section className="relative my-10 overflow-hidden rounded-3xl bg-[var(--anchor)] px-6 py-14 text-center sm:px-12 sm:py-20">
          <span className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-[var(--gold-glow)] blur-2xl" />
          <span className="pointer-events-none absolute -bottom-20 -left-12 h-56 w-56 rounded-full bg-[var(--gold-glow)] blur-2xl" />

          <span className="eyebrow !text-gold-soft">Germany Career Summit 2026 · Next steps</span>
          <h1 className="mt-3 font-display text-3xl leading-tight text-on-anchor sm:text-4xl lg:text-5xl">
            Still deciding? Let&apos;s talk.
          </h1>
          <p className="mx-auto mt-4 max-w-lg text-[15px] leading-relaxed text-[color:rgba(245,242,234,0.78)] sm:text-base">
            If you haven&apos;t joined Guided Mode yet but still have questions, book a
            quick call with the team - or talk to Ameen directly about the solo path.
          </p>

          <div className="mx-auto mt-9 grid max-w-md gap-3">
            <a
              href={GUIDED_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-gold px-7 py-4 text-[15px]"
            >
              Book a Guided Mode call →
            </a>
            <a
              href={SOLO_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-xl border border-[color:rgba(245,242,234,0.25)] px-7 py-4 text-[15px] text-on-anchor transition-colors hover:border-gold hover:text-gold"
            >
              Talk to Ameen - Solo Mode →
            </a>
          </div>

          <p className="mt-7 text-xs text-[color:rgba(245,242,234,0.6)]">
            Prefer to read first?{" "}
            <Link href="/pre-order" className="text-gold-soft transition-colors hover:text-gold">
              Get The Secret Playbook →
            </Link>
          </p>
        </section>
      </main>
      <Footer />
    </>
  );
}

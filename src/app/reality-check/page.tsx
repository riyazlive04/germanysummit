import Header from "@/components/Header";
import Footer from "@/components/Footer";
import QuizFlow from "@/components/reality-check/QuizFlow";

export const metadata = {
  title: "Reality Check - Germany Readiness Score",
  description:
    "Ten honest questions across five dimensions. Get your 0-100 Germany Readiness Score, pentagon radar, and the one gap to fix first.",
};

// FlexiFunnels pass-through (CONTEXT.md §9): ff_name / ff_email / ff_phone arrive
// as URL params. `session` lets the on-arrival / end-of-day pulses tag the row.
function first(v: string | string[] | undefined): string | undefined {
  return Array.isArray(v) ? v[0] : v;
}

export default function RealityCheckPage({
  searchParams,
}: {
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const ff = {
    name: first(searchParams.ff_name),
    email: first(searchParams.ff_email),
    phone: first(searchParams.ff_phone),
  };
  const session = first(searchParams.session);
  const source = first(searchParams.source) ?? first(searchParams.utm_source);

  return (
    <>
      <Header />
      <main className="mx-auto max-w-6xl px-5">
        <QuizFlow ff={ff} session={session} source={source} />
      </main>
      <Footer />
    </>
  );
}

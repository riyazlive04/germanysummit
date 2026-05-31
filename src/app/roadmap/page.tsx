import Header from "@/components/Header";
import Footer from "@/components/Footer";
import RoadmapView from "@/components/roadmap/RoadmapView";

export const metadata = {
  title: "90-Day Roadmap - Germany Career Summit",
  description:
    "Turn your Germany Readiness profile into a directional, week-by-week 90-day plan - front-loaded on your weakest two dimensions.",
};

function first(v: string | string[] | undefined): string | undefined {
  return Array.isArray(v) ? v[0] : v;
}

export default function RoadmapPage({
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
        <RoadmapView ff={ff} session={session} source={source} />
      </main>
      <Footer />
    </>
  );
}

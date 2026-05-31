import Header from "@/components/Header";
import Footer from "@/components/Footer";
import LabTabs from "@/components/cv-lab/LabTabs";

export const metadata = {
  title: "CV & LinkedIn Lab - Germany Career Summit",
  description:
    "Paste your résumé and a target German job description. Get an ATS match score, missing keywords, weak-bullet flags, and your top 3 fixes - diagnosis only.",
};

function first(v: string | string[] | undefined): string | undefined {
  return Array.isArray(v) ? v[0] : v;
}

export default function CvLabPage({
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
        <LabTabs ff={ff} session={session} source={source} />
      </main>
      <Footer />
    </>
  );
}

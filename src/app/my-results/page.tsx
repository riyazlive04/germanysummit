import Header from "@/components/Header";
import Footer from "@/components/Footer";
import MyResultsView from "@/components/my-results/MyResultsView";

export const metadata = {
  title: "My Result — Germany Readiness Suite",
  description: "Look up your saved Germany Readiness Score, CV diagnosis, and 90-day roadmap.",
  robots: { index: false, follow: false },
};

function first(v: string | string[] | undefined): string | undefined {
  return Array.isArray(v) ? v[0] : v;
}

export default function MyResultsPage({
  searchParams,
}: {
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const email = first(searchParams.email) ?? first(searchParams.ff_email);

  return (
    <>
      <Header />
      <main className="mx-auto max-w-6xl px-5">
        <MyResultsView defaultEmail={email} />
      </main>
      <Footer />
    </>
  );
}

import Header from "@/components/Header";
import QuestionInsightsView from "@/components/room/QuestionInsightsView";

export const metadata = {
  title: "Question Insights — Admin",
  robots: { index: false, follow: false },
};

function first(v: string | string[] | undefined): string | undefined {
  return Array.isArray(v) ? v[0] : v;
}

export default function InsightsPage({
  searchParams,
}: {
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const initialKey = first(searchParams.key);
  return (
    <>
      <Header />
      <main className="mx-auto max-w-6xl px-5">
        <QuestionInsightsView initialKey={initialKey} />
      </main>
    </>
  );
}

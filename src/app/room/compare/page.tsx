import Header from "@/components/Header";
import CompareView from "@/components/room/CompareView";

export const metadata = {
  title: "Pre / Post Comparison — Admin",
  robots: { index: false, follow: false },
};

function first(v: string | string[] | undefined): string | undefined {
  return Array.isArray(v) ? v[0] : v;
}

export default function ComparePage({
  searchParams,
}: {
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const initialKey = first(searchParams.key);
  return (
    <>
      <Header />
      <main className="mx-auto max-w-6xl px-5">
        <CompareView initialKey={initialKey} />
      </main>
    </>
  );
}

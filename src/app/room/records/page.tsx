import Header from "@/components/Header";
import RecordsTable from "@/components/room/RecordsTable";

export const metadata = {
  title: "Records — Admin",
  robots: { index: false, follow: false },
};

function first(v: string | string[] | undefined): string | undefined {
  return Array.isArray(v) ? v[0] : v;
}

export default function RecordsPage({
  searchParams,
}: {
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const initialKey = first(searchParams.key);
  return (
    <>
      <Header />
      <main className="mx-auto max-w-6xl px-5">
        <RecordsTable initialKey={initialKey} />
      </main>
    </>
  );
}

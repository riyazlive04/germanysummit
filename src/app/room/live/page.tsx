import Header from "@/components/Header";
import LivePoll from "@/components/room/LivePoll";

export const metadata = {
  title: "Live Answers - The Room",
  robots: { index: false, follow: false },
};

function first(v: string | string[] | undefined): string | undefined {
  return Array.isArray(v) ? v[0] : v;
}

export default function LivePollPage({
  searchParams,
}: {
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const initialKey = first(searchParams.key);

  return (
    <>
      <Header />
      <main className="mx-auto max-w-6xl px-5">
        <LivePoll initialKey={initialKey} />
      </main>
    </>
  );
}

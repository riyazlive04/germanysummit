import Header from "@/components/Header";
import RoomDashboard from "@/components/room/RoomDashboard";

export const metadata = {
  title: "The Room - Live Aggregate",
  robots: { index: false, follow: false },
};

function first(v: string | string[] | undefined): string | undefined {
  return Array.isArray(v) ? v[0] : v;
}

export default function RoomPage({
  searchParams,
}: {
  searchParams: Record<string, string | string[] | undefined>;
}) {
  // Allow ?key=... for a one-tap big-screen bookmark; otherwise the dashboard
  // shows a key gate.
  const initialKey = first(searchParams.key);

  return (
    <>
      <Header />
      <main className="mx-auto max-w-6xl px-5">
        <RoomDashboard initialKey={initialKey} />
      </main>
    </>
  );
}

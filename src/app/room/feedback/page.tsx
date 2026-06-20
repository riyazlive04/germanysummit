import Header from "@/components/Header";
import FeedbackView from "@/components/room/FeedbackView";

export const metadata = {
  title: "Feedback — Admin",
  robots: { index: false, follow: false },
};

function first(v: string | string[] | undefined): string | undefined {
  return Array.isArray(v) ? v[0] : v;
}

export default function FeedbackAdminPage({
  searchParams,
}: {
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const initialKey = first(searchParams.key);
  return (
    <>
      <Header />
      <main className="mx-auto max-w-6xl px-5">
        <FeedbackView initialKey={initialKey} />
      </main>
    </>
  );
}

import Header from "@/components/Header";
import Footer from "@/components/Footer";
import PlaybookForm from "@/components/playbook/PlaybookForm";

export const metadata = {
  title: "The Secret Playbook - Free Download",
  description:
    "Get Ameen's inside-Germany method as a free PDF. Enter your email and download The Secret Playbook.",
};

function first(v: string | string[] | undefined): string | undefined {
  return Array.isArray(v) ? v[0] : v;
}

export default function PlaybookPage({
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
        <PlaybookForm ff={ff} session={session} source={source} />
      </main>
      <Footer />
    </>
  );
}

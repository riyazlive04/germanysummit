import Header from "@/components/Header";
import Footer from "@/components/Footer";
import BookLanding from "@/components/book/BookLanding";

export const metadata = {
  title: "The Secret Playbook - Free Download",
  description:
    "Ameen's inside-Germany system in one free PDF: the exact method that gets Indian engineers seen, shortlisted, and hired. Enter your email and download The Secret Playbook.",
};

function first(v: string | string[] | undefined): string | undefined {
  return Array.isArray(v) ? v[0] : v;
}

export default function BookPage({
  searchParams,
}: {
  searchParams: Record<string, string | string[] | undefined>;
}) {
  // Prefill from share links (e.g. WhatsApp / QR) so attendees skip typing.
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
        <BookLanding ff={ff} session={session} source={source} />
      </main>
      <Footer />
    </>
  );
}

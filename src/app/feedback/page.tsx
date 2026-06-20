import Header from "@/components/Header";
import Footer from "@/components/Footer";
import FeedbackForm from "@/components/feedback/FeedbackForm";

export const metadata = {
  title: "Quick Feedback — Germany Career Summit 2026",
  description:
    "Two minutes. Your honest answer helps us make the next Germany Career Summit better.",
  robots: { index: false, follow: false },
};

export default function FeedbackPage() {
  return (
    <>
      <Header />
      <main className="mx-auto max-w-3xl px-5">
        <FeedbackForm />
      </main>
      <Footer />
    </>
  );
}

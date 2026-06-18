import Header from "@/components/Header";
import Footer from "@/components/Footer";
import PreOrderLanding from "@/components/preorder/PreOrderLanding";

export const metadata = {
  title: "Pre-order The Secret Playbook",
  description:
    "Pre-order The Secret Playbook - Ameen's inside-Germany system that gets Indian engineers seen, shortlisted, and hired. Reserve your copy now; secure checkout via Razorpay.",
};

export default function PreOrderPage() {
  return (
    <>
      <Header />
      <main className="mx-auto max-w-6xl px-5">
        <PreOrderLanding />
      </main>
      <Footer />
    </>
  );
}

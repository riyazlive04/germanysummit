import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { fireN8n } from "@/lib/n8n";
import { normalizePhone } from "@/lib/phone";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Option keys must stay in lockstep with the labels in
// src/components/feedback/FeedbackForm.tsx.
const PLAN_STUCK = ["lt3m", "3to12m", "1to2y", "gt2y"] as const;
const GUIDED = ["enrolled", "interested", "need_time", "not_for_me"] as const;
const TEXT_MAX = 2000;

type Body = {
  nps?: unknown;
  rating?: unknown;
  valuable?: unknown;
  improve?: unknown;
  planStuck?: unknown;
  guided?: unknown;
  name?: unknown;
  phone?: unknown;
  source?: unknown;
};

function intInRange(v: unknown, lo: number, hi: number): number | null {
  return typeof v === "number" && Number.isInteger(v) && v >= lo && v <= hi ? v : null;
}

function cleanText(v: unknown): string | undefined {
  if (typeof v !== "string") return undefined;
  const t = v.trim().slice(0, TEXT_MAX);
  return t || undefined;
}

/**
 * Persist one post-event feedback response. The four required questions (NPS,
 * overall rating, "plan stuck" duration, Guided Mode decision) are validated
 * server-side; the two open-text answers and the name/WhatsApp are optional.
 * Delivery to n8n is best-effort and never blocks the thank-you response.
 */
export async function POST(req: Request) {
  let body: Body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
  }

  const nps = intInRange(body.nps, 0, 10);
  if (nps === null) {
    return NextResponse.json(
      { ok: false, error: "Please pick how likely you are to recommend (0–10)." },
      { status: 400 },
    );
  }

  const rating = intInRange(body.rating, 1, 10);
  if (rating === null) {
    return NextResponse.json(
      { ok: false, error: "Please rate today's summit (1–10)." },
      { status: 400 },
    );
  }

  const planStuck =
    typeof body.planStuck === "string" &&
    (PLAN_STUCK as readonly string[]).includes(body.planStuck)
      ? body.planStuck
      : null;
  if (!planStuck) {
    return NextResponse.json(
      { ok: false, error: "Please tell us how long your Germany plan had been stuck." },
      { status: 400 },
    );
  }

  const guided =
    typeof body.guided === "string" && (GUIDED as readonly string[]).includes(body.guided)
      ? body.guided
      : null;
  if (!guided) {
    return NextResponse.json(
      { ok: false, error: "Please tell us about your Guided Mode decision." },
      { status: 400 },
    );
  }

  const valuable = cleanText(body.valuable);
  const improve = cleanText(body.improve);
  const name = cleanText(body.name);
  const phoneRaw = cleanText(body.phone);
  const phone = phoneRaw ? phoneRaw.slice(0, 32) : undefined;
  const phoneNorm = phone ? normalizePhone(phone) : undefined;
  const source = cleanText(body.source);

  let row;
  try {
    row = await prisma.feedback.create({
      data: {
        nps,
        rating,
        planStuck,
        guided,
        ...(valuable ? { valuable } : {}),
        ...(improve ? { improve } : {}),
        ...(name ? { name } : {}),
        ...(phone ? { phone } : {}),
        ...(phoneNorm ? { phoneNorm } : {}),
        ...(source ? { source } : {}),
      },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "DB error";
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }

  // Best-effort fan-out (Sheets + WhatsApp). Failures are logged, never surfaced.
  const delivery = await fireN8n({ module: "feedback", feedback: row });
  if (!delivery.ok && !("skipped" in delivery)) {
    console.warn("[n8n] feedback delivery failed:", delivery.error);
  }

  return NextResponse.json({ ok: true, id: row.id });
}

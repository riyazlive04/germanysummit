import { NextResponse } from "next/server";
import { normalizePhone } from "@/lib/phone";
import { evaluateLock } from "@/lib/gating";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function validEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

/**
 * Lightweight pre-check so the client can gate the Reality Check BEFORE revealing
 * a freshly computed result: has this person (by email or phone) already taken
 * it, and are they allowed to (re)take right now?
 */
export async function POST(req: Request) {
  let body: { email?: string; phone?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
  }

  const email = (body.email ?? "").trim().toLowerCase();
  if (!email || !validEmail(email)) {
    return NextResponse.json(
      { ok: false, error: "A valid email is required." },
      { status: 400 },
    );
  }

  const lock = await evaluateLock(email, normalizePhone(body.phone));
  return NextResponse.json({
    ok: true,
    taken: lock.taken,
    allowed: lock.allowed,
    locked: lock.taken && !lock.allowed,
  });
}

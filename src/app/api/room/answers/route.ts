import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { decodeSubmission } from "@/lib/submission";
import { answerDistribution } from "@/lib/aggregate";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SESSIONS = ["pre_event", "on_arrival", "end_of_day"] as const;

function authorized(req: Request): boolean {
  const expected = process.env.ADMIN_KEY;
  if (!expected) return false;
  const url = new URL(req.url);
  const provided = req.headers.get("x-admin-key") ?? url.searchParams.get("key");
  return provided === expected;
}

/**
 * Live per-question answer distribution for the /room/live big-screen reveal.
 * Protected by ADMIN_KEY. Optional `?session=` scopes to a phase. Polled by the
 * presenter view; Ameen reveals A/B/C/D percentages section by section.
 */
export async function GET(req: Request) {
  if (!authorized(req)) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(req.url);
  const sessionFilter = url.searchParams.get("session") ?? undefined;
  const validFilter =
    sessionFilter && (SESSIONS as readonly string[]).includes(sessionFilter)
      ? sessionFilter
      : undefined;

  let rows;
  try {
    rows = await prisma.submission.findMany({ orderBy: { createdAt: "desc" } });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "DB error";
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }

  const all = rows.map(decodeSubmission);
  const scoped = validFilter ? all.filter((s) => s.session === validFilter) : all;

  return NextResponse.json({
    ok: true,
    generatedAt: new Date().toISOString(),
    sessionFilter: validFilter ?? null,
    ...answerDistribution(scoped),
  });
}

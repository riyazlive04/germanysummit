import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { decodeSubmission } from "@/lib/submission";
import { aggregate, answerDistribution, splitPrePost } from "@/lib/aggregate";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function authorized(req: Request): boolean {
  const expected = process.env.ADMIN_KEY;
  if (!expected) return false;
  const url = new URL(req.url);
  const provided = req.headers.get("x-admin-key") ?? url.searchParams.get("key");
  return provided === expected;
}

/**
 * Pre-event vs end-of-day comparison for /room/compare. Returns the aggregate
 * for each phase, the per-question answer distribution for each phase (audience
 * "Question Insights" reveal), and a matched per-person delta list (people who
 * took the Reality Check both phases). Protected by ADMIN_KEY.
 */
export async function GET(req: Request) {
  if (!authorized(req)) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  let rows;
  try {
    rows = await prisma.submission.findMany({ orderBy: { createdAt: "desc" } });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "DB error";
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }

  const all = rows.map(decodeSubmission);
  const { preSubs, postSubs, matched } = splitPrePost(all);

  return NextResponse.json({
    ok: true,
    generatedAt: new Date().toISOString(),
    pre: { agg: aggregate(preSubs), dist: answerDistribution(preSubs) },
    post: { agg: aggregate(postSubs), dist: answerDistribution(postSubs) },
    matched,
  });
}

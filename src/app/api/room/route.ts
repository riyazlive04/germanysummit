import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { decodeSubmission } from "@/lib/submission";
import { aggregate, computeLift } from "@/lib/aggregate";
import { getAppConfig } from "@/lib/config";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SESSIONS = ["pre_event", "on_arrival", "end_of_day"] as const;

function authorized(req: Request): boolean {
  const expected = process.env.ADMIN_KEY;
  if (!expected) return false; // no key configured → locked by default
  const url = new URL(req.url);
  const provided = req.headers.get("x-admin-key") ?? url.searchParams.get("key");
  return provided === expected;
}

/**
 * Live room aggregate for the /room big-screen view. Protected by ADMIN_KEY
 * (header `x-admin-key` or `?key=`). Returns the overall aggregate (optionally
 * filtered by `?session=`) plus a per-session rollup so the UI can render the
 * on_arrival → end_of_day before/after shift. Polled by the dashboard.
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

  const bySession = Object.fromEntries(
    SESSIONS.map((s) => [s, aggregate(all.filter((r) => r.session === s))]),
  );

  const config = await getAppConfig();

  return NextResponse.json({
    ok: true,
    generatedAt: new Date().toISOString(),
    sessionFilter: validFilter ?? null,
    overall: aggregate(scoped),
    bySession,
    // True before/after lift, computed from per-person snapshots across ALL rows
    // (independent of the session filter, since it spans the whole day).
    lift: computeLift(all),
    seats: { total: config.seatsTotal, claimed: config.seatsClaimed },
  });
}

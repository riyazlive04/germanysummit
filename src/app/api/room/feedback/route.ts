import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function authorized(req: Request): boolean {
  const expected = process.env.ADMIN_KEY;
  if (!expected) return false;
  const url = new URL(req.url);
  const provided = req.headers.get("x-admin-key") ?? url.searchParams.get("key");
  return provided === expected;
}

/** List all post-event feedback responses for the admin dashboard. */
export async function GET(req: Request) {
  if (!authorized(req)) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }
  const rows = await prisma.feedback.findMany({ orderBy: { createdAt: "desc" } });
  return NextResponse.json({ ok: true, feedback: rows });
}

type Action = { action: "delete"; id: string };

/** Admin mutations: delete a response (spam / test rows). */
export async function POST(req: Request) {
  if (!authorized(req)) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  let body: Action;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
  }

  try {
    if (body.action === "delete") {
      await prisma.feedback.delete({ where: { id: body.id } });
    } else {
      return NextResponse.json({ ok: false, error: "Unknown action" }, { status: 400 });
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Action failed";
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

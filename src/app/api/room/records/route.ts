import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { decodeSubmission } from "@/lib/submission";
import { enrollmentSummary } from "@/lib/aggregate";
import {
  getAppConfig,
  setAllowAllRetakes,
  setEventDayMode,
  setSeatsTotal,
  setSoloTotal,
} from "@/lib/config";
import { intentScore, buildMirror, buildFollowup } from "@/lib/insights";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function authorized(req: Request): boolean {
  const expected = process.env.ADMIN_KEY;
  if (!expected) return false;
  const url = new URL(req.url);
  const provided = req.headers.get("x-admin-key") ?? url.searchParams.get("key");
  return provided === expected;
}

function slim(row: ReturnType<typeof decodeSubmission>) {
  const intent = intentScore(row);
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    phone: row.phone,
    session: row.session,
    totalScore: row.totalScore,
    tier: row.tier,
    archetype: row.archetype,
    enrolledProgram: row.enrolledProgram,
    weakestDim: row.weakestDim,
    consistency: row.consistency,
    yearsPlanning: row.yearsPlanning,
    intentScore: intent.score,
    intentLabel: intent.label,
    mirror: buildMirror(row),
    followup: buildFollowup(row),
    retakeAllowed: row.retakeAllowed,
    roadmapRegenAllowed: row.roadmapRegenAllowed,
    hasReality: row.totalScore != null,
    hasCv: row.cvAtsScore != null,
    hasLinkedin: row.linkedinScore != null,
    hasRoadmap: row.roadmap != null,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

/** List all submissions + config for the admin records table. */
export async function GET(req: Request) {
  if (!authorized(req)) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }
  const rows = await prisma.submission.findMany({ orderBy: { createdAt: "desc" } });
  const config = await getAppConfig();
  const decoded = rows.map(decodeSubmission);
  const enroll = enrollmentSummary(decoded);
  return NextResponse.json({
    ok: true,
    allowAllRetakes: config.allowAllRetakes,
    eventDayMode: config.eventDayMode,
    seats: {
      guided: { total: config.seatsTotal, claimed: enroll.guided.count, buyers: enroll.guided.buyers },
      solo: { total: config.soloTotal, claimed: enroll.solo.count, buyers: enroll.solo.buyers },
    },
    records: decoded.map(slim),
  });
}

type Action =
  | { action: "allowRetake"; id: string }
  | { action: "lock"; id: string }
  | { action: "allowRoadmap"; id: string }
  | { action: "lockRoadmap"; id: string }
  | { action: "delete"; id: string }
  | { action: "setGlobalAllow"; value: boolean }
  | { action: "setEventDay"; value: boolean }
  | { action: "setSeatsTotal"; value: number }
  | { action: "setSoloTotal"; value: number }
  | { action: "enroll"; id: string; program: "guided" | "solo" | null }
  | { action: "resetAll" };

/** Admin mutations: per-user retake allow/lock, delete, global allow, reset all. */
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
    switch (body.action) {
      case "allowRetake":
        await prisma.submission.update({
          where: { id: body.id },
          data: { retakeAllowed: true },
        });
        break;
      case "lock":
        await prisma.submission.update({
          where: { id: body.id },
          data: { retakeAllowed: false },
        });
        break;
      case "allowRoadmap":
        await prisma.submission.update({
          where: { id: body.id },
          data: { roadmapRegenAllowed: true },
        });
        break;
      case "lockRoadmap":
        await prisma.submission.update({
          where: { id: body.id },
          data: { roadmapRegenAllowed: false },
        });
        break;
      case "delete":
        await prisma.submission.delete({ where: { id: body.id } });
        break;
      case "setGlobalAllow":
        await setAllowAllRetakes(!!body.value);
        break;
      case "setEventDay":
        await setEventDayMode(!!body.value);
        break;
      case "setSeatsTotal":
        await setSeatsTotal(Number(body.value) || 0);
        break;
      case "setSoloTotal":
        await setSoloTotal(Number(body.value) || 0);
        break;
      case "enroll": {
        const program = body.program === "guided" || body.program === "solo" ? body.program : null;
        await prisma.submission.update({
          where: { id: body.id },
          data: { enrolledProgram: program, enrolledAt: program ? new Date() : null },
        });
        break;
      }
      case "resetAll":
        // Turn the global overrides off AND re-lock everyone (fresh state).
        await setAllowAllRetakes(false);
        await setEventDayMode(false);
        await prisma.submission.updateMany({
          data: { retakeAllowed: false, roadmapRegenAllowed: false },
        });
        break;
      default:
        return NextResponse.json(
          { ok: false, error: "Unknown action" },
          { status: 400 },
        );
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Action failed";
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
